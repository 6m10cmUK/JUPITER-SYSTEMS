import React, { useContext, useState, useMemo, useRef, useEffect } from 'react';
import type {
  ChatMessage,
  BoardObject,
} from '../types/adrastea.types';
import { useAdrastea } from '../hooks/useAdrastea';
import { useAdrasteaChat } from '../hooks/useAdrasteaChat';
import { useScenes } from '../hooks/useScenes';
import { useCharacters } from '../hooks/useCharacters';
import { useObjects } from '../hooks/useObjects';
import { useBgms } from '../hooks/useBgms';
import { preloadImageBlobs } from '../components/Adrastea/DomObjectOverlay';
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
  activeSpeakerCharId: string | null;
  setActiveSpeakerCharId: React.Dispatch<React.SetStateAction<string | null>>;
  handleSendMessage: (
    content: string,
    messageType: ChatMessage['message_type'],
    characterName?: string,
    characterAvatar?: string | null,
  ) => void;
}

export const RoomDataProvider: React.FC<RoomDataProviderProps> = ({
  children,
  roomId,
  initialLoadDone,
  withPermission,
  activeSpeakerCharId: propActiveSpeakerCharId,
  setActiveSpeakerCharId: propSetActiveSpeakerCharId,
  handleSendMessage: propHandleSendMessage,
}) => {
  // --- onObjectsCreated コールバック用 Ref（循環依存を回避） ---
  const objectsCreatedRef = useRef<((objects: BoardObject[]) => void) | null>(null);

  // --- Data hooks ---

  const {
    pieces,
    room,
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
  } = useAdrasteaChat(roomId);

  // NOTE: channels, upsertChannel, deleteChannel は AdrasteaContext で管理される

  const {
    scenes,
    addScene,
    updateScene,
    removeScene,
    reorderScenes,
    activateScene,
  } = useScenes(roomId, { onObjectsCreated: (objs) => objectsCreatedRef.current?.(objs) });

  const {
    characters,
    addCharacter,
    updateCharacter,
    removeCharacter,
    reorderCharacters,
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
    removeObject,
    reorderObjects,
    batchUpdateSort,
    injectOptimistic,
  } = useObjects(roomId, effectiveSceneId);

  // objectsCreatedRef に injectOptimistic を設定
  useEffect(() => {
    objectsCreatedRef.current = injectOptimistic;
  }, [injectOptimistic]);

  // NOTE: scenarioTexts と cutins は AdrasteaContext で管理される
  // （lazy loading のため、UIState の activePanels に依存）

  const {
    bgms,
    addBgm,
    updateBgm,
    removeBgm,
    reorderBgms,
  } = useBgms(roomId);

  // --- Image preload（ローカルストレージ読み込み後に全画像を blobCache にプリロード） ---
  const preloadDoneRef = useRef(false);
  useEffect(() => {
    if (preloadDoneRef.current || !initialLoadDone) return;
    preloadDoneRef.current = true;
    const urls: string[] = [];
    // シーンの bg/fg URL
    for (const s of scenes) {
      if (s.background_url) urls.push(s.background_url);
      if (s.foreground_url) urls.push(s.foreground_url);
    }
    // オブジェクトの画像
    for (const o of allObjects) {
      if (o.image_url) urls.push(o.image_url);
    }
    if (urls.length > 0) preloadImageBlobs(urls);
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
            locked: false,
            position_locked: true,
            size_locked: true,
            image_url: null,
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
  const bgmCleanupDoneRef = useRef(false);
  useEffect(() => {
    if (bgmCleanupDoneRef.current || !initialLoadDone) return;
    bgmCleanupDoneRef.current = true;
    const sceneIdSet = new Set(scenes.map(s => s.id));
    const orphans = bgms.filter(b =>
      b.scene_ids.length === 0 || b.scene_ids.every(sid => !sceneIdSet.has(sid))
    );
    if (orphans.length > 0) {
      Promise.all(orphans.map(b => removeBgm(b.id)));
    }
  }, [initialLoadDone, bgms, removeBgm, scenes]);

  // スナップショット復元後、active_scene_id が未設定ならシーンを自動アクティベート
  useEffect(() => {
    if (!initialLoadDone) return;
    if (effectiveSceneId) return; // すでにアクティブなシーンがある
    if (scenes.length > 0) {
      setOptimisticSceneId(scenes[0].id);
      updateRoom({ active_scene_id: scenes[0].id });
    }
  }, [initialLoadDone, effectiveSceneId, scenes, updateRoom]);

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
  const guardedAddObject = withPermission('object_edit', addObject);
  const guardedUpdateObject = withPermission('object_edit', updateObject);
  const guardedMoveObject = withPermission('object_move', updateObject);
  const guardedRemoveObject = withPermission('object_edit', removeObject);
  const guardedReorderObjects = withPermission('object_edit', reorderObjects);
  const guardedBatchSort = withPermission('object_edit', batchUpdateSort);
  const guardedAddCharacter = withPermission('character_edit', addCharacter);
  const guardedUpdateCharacter = withPermission('character_edit', updateCharacter);
  const guardedRemoveCharacter = withPermission('character_edit', removeCharacter);
  const guardedReorderCharacters = withPermission('character_edit', reorderCharacters);
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
      handleSendMessage: propHandleSendMessage,
      activeSpeakerCharId: propActiveSpeakerCharId,
      setActiveSpeakerCharId: propSetActiveSpeakerCharId,

      // Scenes
      scenes,
      addScene: guardedAddScene,
      updateScene: guardedUpdateScene,
      removeScene: guardedRemoveScene,
      reorderScenes: guardedReorderScenes,
      activateScene: activateScene as any,

      // Characters
      characters,
      addCharacter: guardedAddCharacter,
      updateCharacter: guardedUpdateCharacter,
      removeCharacter: guardedRemoveCharacter,
      reorderCharacters: guardedReorderCharacters,

      // Objects
      allObjects,
      activeObjects,
      addObject: guardedAddObject,
      updateObject: guardedUpdateObject,
      moveObject: guardedMoveObject,
      removeObject: guardedRemoveObject,
      reorderObjects: guardedReorderObjects,
      batchUpdateSort: guardedBatchSort,
      injectOptimistic,

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
      propHandleSendMessage,
      propActiveSpeakerCharId,
      propSetActiveSpeakerCharId,
      scenes,
      guardedAddScene,
      guardedUpdateScene,
      guardedRemoveScene,
      guardedReorderScenes,
      activateScene,
      characters,
      guardedAddCharacter,
      guardedUpdateCharacter,
      guardedRemoveCharacter,
      guardedReorderCharacters,
      allObjects,
      activeObjects,
      guardedAddObject,
      guardedUpdateObject,
      guardedMoveObject,
      guardedRemoveObject,
      guardedReorderObjects,
      guardedBatchSort,
      injectOptimistic,
      bgms,
      withPermission,
      addBgm,
      updateBgm,
      removeBgm,
      guardedReorderBgms,
      activeScene,
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
