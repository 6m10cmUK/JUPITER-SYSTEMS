import React, { useContext, useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type {
  ChatMessage,
  BoardObject,
} from '../types/adrastea.types';
import type { AuthUser } from './AuthContext';
import { useAdrastea } from '../hooks/useAdrastea';
import { useAdrasteaChat } from '../hooks/useAdrasteaChat';
import { useScenes } from '../hooks/useScenes';
import { useCharacters } from '../hooks/useCharacters';
import { useObjects } from '../hooks/useObjects';
import { useBgms } from '../hooks/useBgms';
import { useAssets, resolveAssetId } from '../hooks/useAssets';
import { resolveTemplateVars } from '../components/Adrastea/utils/chatEditorUtils';
import type { RoomDataContextValue } from './AdrasteaContexts';
import { RoomDataContext } from './AdrasteaContexts';

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface RoomDataProviderProps {
  children: React.ReactNode;
  roomId: string;
  initialLoadDone: boolean;
  withPermission: <F extends (...args: any[]) => any>(
    permission: string,
    fn: F,
  ) => F;
  user: AuthUser | null;
  activeChatChannel: string;
}

export const RoomDataProvider: React.FC<RoomDataProviderProps> = ({
  children,
  roomId,
  initialLoadDone,
  withPermission,
  user,
  activeChatChannel,
}) => {
  // --- Chat state management ---
  const [activeSpeakerCharId, setActiveSpeakerCharId] = useState<string | null>(null);

  // --- onObjectsCreated コールバック用 Ref（循環依存を回避） ---
  const objectsCreatedRef = useRef<((objects: BoardObject[]) => void) | null>(null);

  // --- Data hooks ---

  const {
    pieces,
    room,
    loading: roomLoading,
    movePiece,
    addPiece,
    removePiece,
    updatePiece,
    updateRoom,
  } = useAdrastea(roomId);

  const {
    messages,
    loading: chatLoading,
    loadingMore,
    hasMore,
    sendMessage,
    loadMore,
    clearMessages,
    openSecretDice,
  } = useAdrasteaChat(roomId);

  // NOTE: channels, upsertChannel, deleteChannel は AdrasteaContext で管理される

  const {
    scenes,
    loading: scenesLoading,
    addScene,
    updateScene,
    removeScene,
    reorderScenes,
    activateScene,
  } = useScenes(roomId, {
    onObjectsCreated: (objs) => objectsCreatedRef.current?.(objs),
    onActivateScene: async (sceneId) => {
      setOptimisticSceneId(sceneId);
      await updateRoom({ active_scene_id: sceneId });
    },
  });

  const {
    characters,
    layerOrderedCharacters,
    loading: charsLoading,
    addCharacter,
    updateCharacter,
    moveCharacter,
    removeCharacter,
    reorderCharacters,
    reorderLayerCharacters,
  } = useCharacters(roomId);

  // 楽観的 activeSceneId: ローカルstate反映を待たずシーン切り替えを即座に反映
  const [optimisticSceneId, setOptimisticSceneId] = useState<string | null>(null);
  const effectiveSceneId = optimisticSceneId ?? room?.active_scene_id ?? null;

  // ローカルstateが追いついたら楽観値をクリア
  useEffect(() => {
    if (optimisticSceneId && room?.active_scene_id === optimisticSceneId) {
      setOptimisticSceneId(null);
    }
  }, [room?.active_scene_id, optimisticSceneId]);

  const {
    allObjects,
    activeObjects,
    loading: objectsLoading,
    addObject,
    updateObject,
    localUpdateObject,
    removeObject,
    reorderObjects,
    batchUpdateSort,
  } = useObjects(roomId, effectiveSceneId);


  // NOTE: scenarioTexts と cutins は AdrasteaContext で管理される
  // （lazy loading のため、UIState の activePanels に依存）

  const {
    bgms,
    loading: bgmsLoading,
    addBgm,
    updateBgm,
    removeBgm,
    reorderBgms,
  } = useBgms(roomId);

  const { loading: assetsLoading } = useAssets();

  // --- handleSendMessage: sendMessage の wrapper ---
  const handleSendMessage = useCallback(
    (
      content: string,
      messageType: ChatMessage['message_type'],
      characterName?: string,
      characterAvatarAssetId?: string | null,
      channel?: string,
    ) => {
      const senderName = characterName ?? 'noname';
      const senderUid = user?.uid;
      // キャラクター名からキャラクターを検索し、テンプレート変数を展開
      const character = characterName ? (characters.find(c => c.name === characterName) ?? null) : null;
      const resolved = resolveTemplateVars(content, character);
      sendMessage(senderName, resolved, messageType, senderUid, characterAvatarAssetId ?? null, room?.dice_system, channel ?? activeChatChannel);
    },
    [sendMessage, user?.uid, activeChatChannel, room?.dice_system, characters],
  );

  // --- Image preload（ローカルストレージ読み込み後に全画像を blobCache にプリロード） ---
  const preloadDoneRef = useRef(false);
  useEffect(() => {
    if (preloadDoneRef.current || !initialLoadDone) return;
    preloadDoneRef.current = true;
    const assetIds: string[] = [];
    // シーンの bg/fg asset_id
    for (const s of scenes) {
      if (s.background_asset_id) assetIds.push(s.background_asset_id);
      if (s.foreground_asset_id) assetIds.push(s.foreground_asset_id);
    }
    // オブジェクトの画像 asset_id
    for (const o of allObjects) {
      if (o.image_asset_id) assetIds.push(o.image_asset_id);
    }
    // TODO: asset_id から URL を解決してプリロード
    // if (assetIds.length > 0) preloadImageBlobs(assetIds);
  }, [initialLoadDone, scenes, allObjects]);


  // --- characters_layer 自動生成 ---
  // ルーム入室後、characters_layer オブジェクトがなければ自動作成
  const charactersLayerCreatedRef = useRef(false);
  useEffect(() => {
    if (!initialLoadDone || objectsLoading) return;
    if (charactersLayerCreatedRef.current) return;
    const hasCharactersLayer = allObjects.some(o => o.type === 'characters_layer');
    if (!hasCharactersLayer) {
      charactersLayerCreatedRef.current = true;
      (async () => {
        try {
          await addObject({
            type: 'characters_layer',
            name: 'キャラクター',
            global: true,
            scene_ids: [],
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            visible: true,
            opacity: 1,
            sort_order: 9999,
            position_locked: true,
            size_locked: true,
            image_asset_id: null,
            background_color: 'transparent',
            image_fit: 'contain',
            text_content: null,
            font_size: 16,
            font_family: 'sans-serif',
            letter_spacing: 0,
            line_height: 1.2,
            auto_size: false,
            text_align: 'left',
            text_vertical_align: 'top',
            text_color: '#ffffff',
            scale_x: 1,
            scale_y: 1,
          });
        } catch (e) {
          charactersLayerCreatedRef.current = false;
        }
      })();
    } else {
      const existingCharactersLayer = allObjects.find(o => o.type === 'characters_layer');
      if (existingCharactersLayer && !existingCharactersLayer.visible) {
        updateObject(existingCharactersLayer.id, { visible: true });
      }
    }
  }, [initialLoadDone, objectsLoading, allObjects, addObject, updateObject]);

  // --- 浮きBGMトラックの自動クリーンアップ ---
  // scenes と bgms の両方がロード完了してから実行（scenes 空状態での誤削除を防ぐ）
  const bgmCleanupDoneRef = useRef(false);
  const allLoaded = initialLoadDone && !scenesLoading && !bgmsLoading;
  useEffect(() => {
    if (bgmCleanupDoneRef.current || !allLoaded || scenes.length === 0) return;
    bgmCleanupDoneRef.current = true;
    const sceneIdSet = new Set(scenes.map(s => s.id));
    const orphans = bgms.filter(b =>
      b.scene_ids.length === 0 || b.scene_ids.every(sid => !sceneIdSet.has(sid))
    );
    if (orphans.length > 0) {
      (async () => {
        await Promise.all(orphans.map(b => removeBgm(b.id)));
      })();
    }
  }, [allLoaded, bgms, removeBgm, scenes]);

  // シーン削除後のorphan BGM即時削除（初回クリーンアップ後のみ）
  useEffect(() => {
    if (!bgmCleanupDoneRef.current) return;
    const sceneIdSet = new Set(scenes.map(s => s.id));
    const orphans = bgms.filter(b =>
      b.scene_ids.length === 0 || b.scene_ids.every(sid => !sceneIdSet.has(sid))
    );
    if (orphans.length > 0) {
      (async () => {
        await Promise.all(orphans.map(b => removeBgm(b.id)));
      })();
    }
  }, [scenes, bgms, removeBgm]);

  // スナップショット復元後、active_scene_id が未設定ならシーンを自動アクティベート
  useEffect(() => {
    if (!initialLoadDone) return;
    if (effectiveSceneId) return; // すでにアクティブなシーンがある
    if (scenes.length > 0) {
      setOptimisticSceneId(scenes[0].id);
      updateRoom({ active_scene_id: scenes[0].id });
    }
  }, [initialLoadDone, effectiveSceneId, scenes, updateRoom]);

  // --- Loading state aggregate ---
  const [imagesReady, setImagesReady] = useState(false);
  const dataQueryReady = !roomLoading && !scenesLoading && !charsLoading && !objectsLoading && !bgmsLoading && !assetsLoading;

  // アクティブシーンの bg/fg 画像フェッチ完了を待つ
  useEffect(() => {
    if (!dataQueryReady || imagesReady) return;

    // アクティブシーンの背景/前景オブジェクトの画像を先にfetch
    const bgObj = activeObjects.find(o => o.type === 'background');
    const fgObj = activeObjects.find(o => o.type === 'foreground');

    const urls: string[] = [];
    if (bgObj?.image_asset_id && !bgObj.color_enabled) {
      const url = resolveAssetId(bgObj.image_asset_id);
      if (url) urls.push(url);
    }
    if (fgObj?.image_asset_id && !fgObj.color_enabled) {
      const url = resolveAssetId(fgObj.image_asset_id);
      if (url) urls.push(url);
    }

    if (urls.length === 0) {
      setImagesReady(true);
      return;
    }

    // 全画像の fetch 完了を待つ
    Promise.all(urls.map(url => fetch(url).then(r => r.blob()).catch(() => null)))
      .then(() => setImagesReady(true));
  }, [dataQueryReady, imagesReady, activeObjects]);

  const dataReady = dataQueryReady && imagesReady;

  // --- Derived values ---
  const activeScene = useMemo(() => {
    if (!effectiveSceneId) return null;
    return scenes.find(s => s.id === effectiveSceneId) ?? null;
  }, [effectiveSceneId, scenes]);

  // Permission-guarded functions
  const guardedAddScene = withPermission('scene_edit', addScene);
  const guardedUpdateScene = withPermission('scene_edit', updateScene);
  const guardedRemoveScene = withPermission('scene_edit', removeScene);
  const guardedReorderScenes = withPermission('scene_edit', reorderScenes);
  const guardedActivateScene = withPermission('scene_edit', activateScene);
  const guardedAddObject = withPermission('object_edit', addObject);
  // updateObject をラップ: fg/bg の image_asset_id 変更時にシーンのサムネイル asset_id を同期
  const updateObjectWithThumbnailSync = useCallback(
    async (id: string, updates: Partial<BoardObject>): Promise<void> => {
      await updateObject(id, updates);
      if ('image_asset_id' in updates) {
        const obj = allObjects.find(o => o.id === id);
        if (obj && (obj.type === 'foreground' || obj.type === 'background')) {
          const sceneId = obj.scene_ids[0];
          if (sceneId) {
            const field = obj.type === 'foreground' ? 'foreground_asset_id' : 'background_asset_id';
            updateScene(sceneId, { [field]: updates.image_asset_id ?? null });
          }
        }
      }
    },
    [updateObject, allObjects, updateScene]
  );
  const guardedUpdateObject = withPermission('object_edit', updateObjectWithThumbnailSync);
  const guardedMoveObject = withPermission('object_move', updateObject);
  const guardedLocalUpdateObject = withPermission('object_move', localUpdateObject);
  const guardedRemoveObject = withPermission('object_edit', removeObject);
  const guardedReorderObjects = withPermission('object_edit', reorderObjects);
  const guardedBatchSort = withPermission('object_edit', batchUpdateSort);
  const guardedAddCharacter = withPermission('character_edit', addCharacter);
  const guardedUpdateCharacter = withPermission('character_edit', updateCharacter);
  const guardedRemoveCharacter = withPermission('character_edit', removeCharacter);
  const guardedReorderCharacters = withPermission('character_edit', reorderCharacters);
  const guardedReorderLayerCharacters = withPermission('character_edit', reorderLayerCharacters);
  const guardedReorderBgms = withPermission('bgm_manage', reorderBgms);

  // --- Context value ---
  const value = useMemo<RoomDataContextValue>(
    () => ({
      // Rooms/Pieces
      pieces,
      room,
      movePiece,
      addPiece,
      removePiece,
      updatePiece,
      updateRoom,

      // Chat
      messages,
      chatLoading,
      loadingMore,
      hasMore,
      sendMessage,
      loadMore,
      clearMessages,
      openSecretDice,
      handleSendMessage,
      activeSpeakerCharId,
      setActiveSpeakerCharId,

      // Scenes
      scenes,
      addScene: guardedAddScene,
      updateScene: guardedUpdateScene,
      removeScene: guardedRemoveScene,
      reorderScenes: guardedReorderScenes,
      activateScene: guardedActivateScene,

      // Characters
      characters,
      layerOrderedCharacters,
      addCharacter: guardedAddCharacter,
      updateCharacter: guardedUpdateCharacter,
      moveCharacter,
      removeCharacter: guardedRemoveCharacter,
      reorderCharacters: guardedReorderCharacters,
      reorderLayerCharacters: guardedReorderLayerCharacters,

      // Objects
      allObjects,
      activeObjects,
      addObject: guardedAddObject,
      updateObject: guardedUpdateObject,
      moveObject: guardedMoveObject,
      localUpdateObject: guardedLocalUpdateObject,
      removeObject: guardedRemoveObject,
      reorderObjects: guardedReorderObjects,
      batchUpdateSort: guardedBatchSort,

      // ScenarioTexts (lazy-loaded, provided by AdrasteaContext)
      scenarioTexts: [] as any,
      addScenarioText: (async () => '') as any,
      updateScenarioText: (async () => {}) as any,
      removeScenarioText: (async () => {}) as any,
      reorderScenarioTexts: (async () => {}) as any,

      // Cutins (lazy-loaded, provided by AdrasteaContext)
      cutins: [] as any,
      addCutin: (async () => '') as any,
      updateCutin: (async () => {}) as any,
      removeCutin: (async () => {}) as any,
      reorderCutins: (async () => {}) as any,
      triggerCutin: (async () => {}) as any,
      clearCutin: (async () => {}) as any,

      // BGMs
      bgms,
      addBgm: withPermission('bgm_manage', addBgm),
      updateBgm: withPermission('bgm_manage', updateBgm),
      removeBgm: withPermission('bgm_manage', removeBgm),
      reorderBgms: guardedReorderBgms,

      // Derived
      activeScene,
      dataReady,
    }),
    [
      pieces,
      room,
      movePiece,
      addPiece,
      removePiece,
      updatePiece,
      updateRoom,
      messages,
      chatLoading,
      loadingMore,
      hasMore,
      sendMessage,
      loadMore,
      clearMessages,
      openSecretDice,
      handleSendMessage,
      activeSpeakerCharId,
      setActiveSpeakerCharId,
      scenes,
      guardedAddScene,
      guardedUpdateScene,
      guardedRemoveScene,
      guardedReorderScenes,
      activateScene,
      characters,
      layerOrderedCharacters,
      guardedAddCharacter,
      guardedUpdateCharacter,
      moveCharacter,
      guardedRemoveCharacter,
      guardedReorderCharacters,
      guardedReorderLayerCharacters,
      allObjects,
      activeObjects,
      guardedAddObject,
      guardedUpdateObject,
      guardedMoveObject,
      guardedRemoveObject,
      guardedReorderObjects,
      guardedBatchSort,
      bgms,
      withPermission,
      addBgm,
      updateBgm,
      removeBgm,
      guardedReorderBgms,
      activeScene,
      dataReady,
      imagesReady,
    ]
  );

  return (
    <RoomDataContext.Provider value={value}>
      {children}
    </RoomDataContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Consumer hook
// ---------------------------------------------------------------------------

export function useRoomData(): RoomDataContextValue {
  const ctx = useContext(RoomDataContext);
  if (!ctx) {
    throw new Error('useRoomData must be used within RoomDataProvider');
  }
  return ctx;
}
