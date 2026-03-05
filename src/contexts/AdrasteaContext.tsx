import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import type { User } from 'firebase/auth';
import { type Model, type Layout } from 'flexlayout-react';
import type { BoardHandle } from '../components/Adrastea/Board';
import { getViewportCenter } from '../components/Adrastea/Board';
import type {
  Piece,
  Room,
  ChatMessage,
  Scene,
  Character,
  BoardObject,
  BoardObjectScope,
  ScenarioText,
  Cutin,
  UserProfile,
} from '../types/adrastea.types';
import { useAdrastea } from '../hooks/useAdrastea';
import { useAdrasteaChat } from '../hooks/useAdrasteaChat';
import { useScenes } from '../hooks/useScenes';
import { useCharacters } from '../hooks/useCharacters';
import { useObjects } from '../hooks/useObjects';
import { useScenarioTexts } from '../hooks/useScenarioTexts';
import { useCutins } from '../hooks/useCutins';
import { useAuth } from './AuthContext';

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Pending edits types
// ---------------------------------------------------------------------------

export interface PendingEdit {
  type: 'scene' | 'object';
  id: string | null;
  data: Record<string, unknown>;
  scope?: BoardObjectScope;
}

export interface AdrasteaContextValue {
  // --- roomId ---
  roomId: string;

  // --- useAdrastea ---
  pieces: Piece[];
  room: Room | null;
  movePiece: ReturnType<typeof useAdrastea>['movePiece'];
  addPiece: ReturnType<typeof useAdrastea>['addPiece'];
  removePiece: ReturnType<typeof useAdrastea>['removePiece'];
  updatePiece: ReturnType<typeof useAdrastea>['updatePiece'];
  updateRoom: ReturnType<typeof useAdrastea>['updateRoom'];

  // --- useAdrasteaChat ---
  messages: ChatMessage[];
  chatLoading: boolean;
  hasMore: boolean;
  sendMessage: ReturnType<typeof useAdrasteaChat>['sendMessage'];
  loadMore: ReturnType<typeof useAdrasteaChat>['loadMore'];
  handleSendMessage: (
    content: string,
    messageType: ChatMessage['message_type'],
    characterName?: string,
    characterAvatar?: string | null,
  ) => void;

  // --- useScenes ---
  scenes: Scene[];
  addScene: ReturnType<typeof useScenes>['addScene'];
  updateScene: ReturnType<typeof useScenes>['updateScene'];
  removeScene: ReturnType<typeof useScenes>['removeScene'];
  activateScene: ReturnType<typeof useScenes>['activateScene'];

  // --- useCharacters ---
  characters: Character[];
  addCharacter: ReturnType<typeof useCharacters>['addCharacter'];
  updateCharacter: ReturnType<typeof useCharacters>['updateCharacter'];
  removeCharacter: ReturnType<typeof useCharacters>['removeCharacter'];

  // --- useObjects ---
  roomObjects: BoardObject[];
  sceneObjects: BoardObject[];
  mergedObjects: BoardObject[];
  addObject: (scope: BoardObjectScope, data: Partial<BoardObject>) => Promise<string>;
  updateObject: (scope: BoardObjectScope, id: string, data: Partial<BoardObject>) => Promise<void>;
  removeObject: (scope: BoardObjectScope, id: string) => Promise<void>;
  reorderObjects: (scope: BoardObjectScope, orderedIds: string[]) => Promise<void>;

  // --- useScenarioTexts ---
  scenarioTexts: ScenarioText[];
  addScenarioText: ReturnType<typeof useScenarioTexts>['addScenarioText'];
  updateScenarioText: ReturnType<typeof useScenarioTexts>['updateScenarioText'];
  removeScenarioText: ReturnType<typeof useScenarioTexts>['removeScenarioText'];

  // --- useCutins ---
  cutins: Cutin[];
  addCutin: ReturnType<typeof useCutins>['addCutin'];
  updateCutin: ReturnType<typeof useCutins>['updateCutin'];
  removeCutin: ReturnType<typeof useCutins>['removeCutin'];
  triggerCutin: ReturnType<typeof useCutins>['triggerCutin'];
  clearCutin: ReturnType<typeof useCutins>['clearCutin'];

  // --- UI editing state ---
  editingScene: Scene | null | undefined;
  setEditingScene: React.Dispatch<React.SetStateAction<Scene | null | undefined>>;
  editingCharacter: Character | null | undefined;
  setEditingCharacter: React.Dispatch<React.SetStateAction<Character | null | undefined>>;
  editingCutin: Cutin | null | undefined;
  setEditingCutin: React.Dispatch<React.SetStateAction<Cutin | null | undefined>>;
  editingPieceId: string | null;
  setEditingPieceId: React.Dispatch<React.SetStateAction<string | null>>;
  editingObjectId: string | null | undefined;
  setEditingObjectId: React.Dispatch<React.SetStateAction<string | null | undefined>>;
  selectedObjectIds: string[];
  setSelectedObjectIds: React.Dispatch<React.SetStateAction<string[]>>;
  editingObjectScope: BoardObjectScope;
  setEditingObjectScope: React.Dispatch<React.SetStateAction<BoardObjectScope>>;
  showRoomSettings: boolean;
  setShowRoomSettings: React.Dispatch<React.SetStateAction<boolean>>;
  showProfileEdit: boolean;
  setShowProfileEdit: React.Dispatch<React.SetStateAction<boolean>>;

  // --- Derived values ---
  activeScene: Scene | null;
  // --- Auth ---
  profile: UserProfile | null;
  user: User | null;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>) => Promise<void>;

  // --- Shortcut callbacks ---
  onAddObject: (scope?: BoardObjectScope) => void;

  // --- Board ref ---
  boardRef: React.RefObject<BoardHandle | null>;
  getBoardCenter: () => { x: number; y: number };

  // --- Grid ---
  gridVisible: boolean;
  setGridVisible: React.Dispatch<React.SetStateAction<boolean>>;

  // --- FlexLayout ---
  flexModel: Model | null;
  setFlexModel: React.Dispatch<React.SetStateAction<Model | null>>;
  flexLayoutRef: React.RefObject<Layout | null>;
  setFlexLayoutRef: (ref: React.RefObject<Layout | null>) => void;
  nestedDockModel: Model | null;
  setNestedDockModel: React.Dispatch<React.SetStateAction<Model | null>>;

  // --- Auto-save edits ---
  setPendingEdit: (key: string, edit: PendingEdit | null) => void;

  // --- 排他編集リセット ---
  clearAllEditing: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const AdrasteaContext = createContext<AdrasteaContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AdrasteaProviderProps {
  children: React.ReactNode;
  roomId: string;
}

export const AdrasteaProvider: React.FC<AdrasteaProviderProps> = ({ children, roomId }) => {
  const { user, profile, signOut, updateProfile } = useAuth();

  // --- Data hooks ---
  const {
    pieces, room, movePiece, addPiece, removePiece, updatePiece, updateRoom,
  } = useAdrastea(roomId);

  const {
    messages, loading: chatLoading, hasMore, sendMessage, loadMore,
  } = useAdrasteaChat(roomId);

  const { scenes, addScene, updateScene, removeScene, activateScene } = useScenes(roomId);
  const { characters, addCharacter, updateCharacter, removeCharacter } = useCharacters(roomId);
  const {
    roomObjects, sceneObjects, mergedObjects, loading: objectsLoading,
    addObject, updateObject, removeObject, reorderObjects,
  } = useObjects(roomId, room?.active_scene_id ?? null);
  const { scenarioTexts, addScenarioText, updateScenarioText, removeScenarioText } = useScenarioTexts(roomId);
  const { cutins, addCutin, updateCutin, removeCutin, triggerCutin, clearCutin } = useCutins(roomId);

  // --- UI state ---
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null | undefined>(undefined);
  const [editingCharacter, setEditingCharacter] = useState<Character | null | undefined>(undefined);
  const [editingObjectId, setEditingObjectId] = useState<string | null | undefined>(undefined);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [editingObjectScope, setEditingObjectScope] = useState<BoardObjectScope>('scene');
  const [editingCutin, setEditingCutin] = useState<Cutin | null | undefined>(undefined);

  // --- Board ref ---
  const boardRef = useRef<BoardHandle | null>(null);
  const getBoardCenter = useCallback(() => {
    return getViewportCenter(boardRef.current?.getStage() ?? null);
  }, []);

  // --- FlexLayout ---
  const [flexModel, setFlexModel] = useState<Model | null>(null);
  const [nestedDockModel, setNestedDockModel] = useState<Model | null>(null);
  const flexLayoutRefState = useRef<React.RefObject<Layout | null>>({ current: null });
  const setFlexLayoutRef = useCallback((ref: React.RefObject<Layout | null>) => {
    flexLayoutRefState.current = ref;
  }, []);

  // --- Grid visibility ---
  const [gridVisible, setGridVisible] = useState(true);

  // --- Auto-save edits (debounced) ---
  const [localSceneOverrides, setLocalSceneOverrides] = useState<Map<string, Partial<Scene>>>(new Map());
  const [localObjectOverrides, setLocalObjectOverrides] = useState<Map<string, Partial<BoardObject>>>(new Map());
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // シーンオブジェクト(背景/前景)のimage_urlをSceneドキュメントに同期
  const syncObjectImageToScene = useCallback(async (objData: Partial<BoardObject>, objId: string | null) => {
    if (!room?.active_scene_id) return;
    const objType = objData.type ?? (objId ? sceneObjects.find(o => o.id === objId)?.type : null);
    if (!objType || (objType !== 'background' && objType !== 'foreground')) return;
    if (!('image_url' in objData)) return;

    const sceneField = objType === 'background' ? 'background_url' : 'foreground_url';
    await updateScene(room.active_scene_id, { [sceneField]: objData.image_url ?? null } as Partial<Scene>);
  }, [room?.active_scene_id, sceneObjects, updateScene]);

  const flushEdit = useCallback(async (edit: PendingEdit) => {
    if (edit.type === 'scene') {
      if (edit.id) {
        await updateScene(edit.id, edit.data as Partial<Scene>);
      } else {
        await addScene(edit.data as Partial<Scene>);
      }
    } else if (edit.type === 'object') {
      const scope = edit.scope ?? 'scene';
      if (edit.id) {
        await updateObject(scope, edit.id, edit.data as Partial<BoardObject>);
      } else {
        await addObject(scope, edit.data as Partial<BoardObject>);
      }
      // シーンスコープの背景/前景はサムネイル同期
      if (scope === 'scene') {
        await syncObjectImageToScene(edit.data as Partial<BoardObject>, edit.id);
      }
    }
  }, [updateScene, addScene, updateObject, addObject, syncObjectImageToScene]);

  const setPendingEdit = useCallback((key: string, edit: PendingEdit | null) => {
    if (!edit) {
      // タイマークリア
      const timer = debounceTimersRef.current.get(key);
      if (timer) clearTimeout(timer);
      debounceTimersRef.current.delete(key);
      return;
    }

    // ローカルオーバーライド即反映（Board描画用）
    if (edit.type === 'scene' && edit.id) {
      setLocalSceneOverrides(prev => {
        const next = new Map(prev);
        next.set(edit.id!, edit.data as Partial<Scene>);
        return next;
      });
    } else if (edit.type === 'object' && edit.id) {
      setLocalObjectOverrides(prev => {
        const next = new Map(prev);
        next.set(edit.id!, edit.data as Partial<BoardObject>);
        return next;
      });
    }

    // デバウンス付きDB保存
    const existing = debounceTimersRef.current.get(key);
    if (existing) clearTimeout(existing);
    debounceTimersRef.current.set(key, setTimeout(() => {
      debounceTimersRef.current.delete(key);
      flushEdit(edit);
    }, 500));
  }, [flushEdit]);

  // --- Derived values (with local overrides) ---
  const effectiveScenes = useMemo(() => {
    if (localSceneOverrides.size === 0) return scenes;
    return scenes.map(s => {
      const override = localSceneOverrides.get(s.id);
      return override ? { ...s, ...override } : s;
    });
  }, [scenes, localSceneOverrides]);

  const effectiveMergedObjects = useMemo(() => {
    if (localObjectOverrides.size === 0) return mergedObjects;
    return mergedObjects.map(o => {
      const override = localObjectOverrides.get(o.id);
      return override ? { ...o, ...override } : o;
    });
  }, [mergedObjects, localObjectOverrides]);

  const effectiveSceneObjects = useMemo(() => {
    if (localObjectOverrides.size === 0) return sceneObjects;
    return sceneObjects.map(o => {
      const override = localObjectOverrides.get(o.id);
      return override ? { ...o, ...override } : o;
    });
  }, [sceneObjects, localObjectOverrides]);

  const activeScene = useMemo(() => {
    if (!room?.active_scene_id) return null;
    return effectiveScenes.find((s) => s.id === room.active_scene_id) ?? null;
  }, [room?.active_scene_id, effectiveScenes]);


  // --- Callbacks ---
  const handleSendMessage = useCallback(
    (
      content: string,
      messageType: ChatMessage['message_type'],
      characterName?: string,
      characterAvatar?: string | null,
    ) => {
      sendMessage(
        characterName ?? profile?.display_name ?? 'ユーザー',
        content,
        messageType,
        user?.uid,
        characterAvatar !== undefined ? characterAvatar : profile?.avatar_url,
      );
    },
    [sendMessage, profile, user],
  );

  const safeActivateScene = useCallback((sceneId: string | null) => {
    // デバウンスタイマーをすべてクリア
    for (const timer of debounceTimersRef.current.values()) clearTimeout(timer);
    debounceTimersRef.current.clear();
    setLocalSceneOverrides(new Map());
    setLocalObjectOverrides(new Map());
    activateScene(sceneId);
  }, [activateScene]);

  // updateObjectラッパー: 背景/前景のimage_url変更時にSceneも同期 + ローカルオーバーライドをクリア
  const syncedUpdateObject = useCallback(async (scope: BoardObjectScope, id: string, data: Partial<BoardObject>) => {
    // ローカルオーバーライドをクリア（Firestoreの値を優先させる）
    setLocalObjectOverrides(prev => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    // デバウンスタイマーもクリア
    const timerKey = `object:${id}`;
    const timer = debounceTimersRef.current.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      debounceTimersRef.current.delete(timerKey);
    }

    await updateObject(scope, id, data);
    if (scope === 'scene') {
      await syncObjectImageToScene(data, id);
    }
  }, [updateObject, syncObjectImageToScene]);

  const clearAllEditing = useCallback(() => {
    setEditingPieceId(null);
    setEditingObjectId(undefined);
    setSelectedObjectIds([]);
    setEditingScene(undefined);
    setEditingCharacter(undefined);
    setEditingCutin(undefined);
  }, []);

  const onAddObject = useCallback((scope: BoardObjectScope = 'scene') => {
    setEditingObjectScope(scope);
    setEditingObjectId(null);
  }, []);

  // --- Context value ---
  const value = useMemo<AdrasteaContextValue>(
    () => ({
      roomId,

      // useAdrastea
      pieces, room, movePiece, addPiece, removePiece, updatePiece, updateRoom,

      // useAdrasteaChat
      messages, chatLoading, hasMore, sendMessage, loadMore, handleSendMessage,

      // useScenes
      scenes: effectiveScenes, addScene, updateScene, removeScene,
      activateScene: safeActivateScene,

      // useCharacters
      characters, addCharacter, updateCharacter, removeCharacter,

      // useObjects
      roomObjects, sceneObjects: effectiveSceneObjects, mergedObjects: effectiveMergedObjects,
      addObject, updateObject: syncedUpdateObject, removeObject, reorderObjects,

      // useScenarioTexts
      scenarioTexts, addScenarioText, updateScenarioText, removeScenarioText,

      // useCutins
      cutins, addCutin, updateCutin, removeCutin, triggerCutin, clearCutin,

      // UI state
      editingScene, setEditingScene,
      editingCharacter, setEditingCharacter,
      editingCutin, setEditingCutin,
      editingPieceId, setEditingPieceId,
      editingObjectId, setEditingObjectId,
      selectedObjectIds, setSelectedObjectIds,
      editingObjectScope, setEditingObjectScope,
      showRoomSettings, setShowRoomSettings,
      showProfileEdit, setShowProfileEdit,

      // Derived
      activeScene,

      // Auth
      profile, user, signOut, updateProfile,

      // Shortcut callbacks
      onAddObject,

      // Board
      boardRef, getBoardCenter,
      gridVisible, setGridVisible,

      // FlexLayout
      flexModel, setFlexModel,
      flexLayoutRef: flexLayoutRefState.current,
      setFlexLayoutRef,
      nestedDockModel, setNestedDockModel,

      // Auto-save edits
      setPendingEdit,

      // 排他編集リセット
      clearAllEditing,
    }),
    [
      roomId,
      pieces, room, movePiece, addPiece, removePiece, updatePiece, updateRoom,
      messages, chatLoading, hasMore, sendMessage, loadMore, handleSendMessage,
      effectiveScenes, addScene, updateScene, removeScene, safeActivateScene,
      characters, addCharacter, updateCharacter, removeCharacter,
      roomObjects, effectiveSceneObjects, effectiveMergedObjects,
      addObject, syncedUpdateObject, removeObject, reorderObjects,
      scenarioTexts, addScenarioText, updateScenarioText, removeScenarioText,
      cutins, addCutin, updateCutin, removeCutin, triggerCutin, clearCutin,
      editingScene, editingCharacter, editingCutin,
      editingPieceId, editingObjectId, selectedObjectIds, editingObjectScope,
      showRoomSettings, showProfileEdit,
      activeScene,
      profile, user, signOut, updateProfile,
      onAddObject,
      boardRef, getBoardCenter,
      gridVisible,
      flexModel, setFlexLayoutRef, nestedDockModel,

      setPendingEdit,
      clearAllEditing,
    ],
  );

  return (
    <AdrasteaContext.Provider value={value}>
      {children}
    </AdrasteaContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Consumer hook
// ---------------------------------------------------------------------------

export function useAdrasteaContext(): AdrasteaContextValue {
  const ctx = useContext(AdrasteaContext);
  if (!ctx) {
    throw new Error('useAdrasteaContext must be used within AdrasteaProvider');
  }
  return ctx;
}
