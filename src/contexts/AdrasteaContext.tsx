import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { AuthUser } from '../contexts/AuthContext';
import type { DockviewApi } from 'dockview';
import type { BoardHandle } from '../components/Adrastea/Board';
import { GRID_SIZE } from '../components/Adrastea/Board';
import type {
  Piece,
  Room,
  ChatMessage,
  Scene,
  Character,
  BoardObject,
  ScenarioText,
  Cutin,
  UserProfile,
  ChatChannel,
} from '../types/adrastea.types';
import { useAdrastea } from '../hooks/useAdrastea';
import { useAdrasteaChat } from '../hooks/useAdrasteaChat';
import { useScenes } from '../hooks/useScenes';
import { useCharacters } from '../hooks/useCharacters';
import { useObjects } from '../hooks/useObjects';
import { useScenarioTexts } from '../hooks/useScenarioTexts';
import { useCutins } from '../hooks/useCutins';
import { useBgms } from '../hooks/useBgms';
import { useChannels } from '../hooks/useChannels';
import { preloadImageBlobs } from '../components/Adrastea/DomObjectOverlay';
import type { BgmTrack } from '../types/adrastea.types';
import { useAuth } from './AuthContext';
import { RoomDataContext, UIStateContext } from './AdrasteaContexts';
import type { RoomDataContextValue, UIStateContextValue } from './AdrasteaContexts';
import { checkPermission, type PermissionKey } from '../config/permissions';
import { useToast } from '../components/Adrastea/ui/Toast';
import { useUndoRedo, type UndoRedoHandle } from '../hooks/useUndoRedo';
import { computeDiffs, type UndoEntry } from '../utils/undoDiff';

// ---------------------------------------------------------------------------
// Panel selection types
// ---------------------------------------------------------------------------

export type PanelSelectionType = 'scene' | 'character' | 'layer';
export interface PanelSelection {
  panel: PanelSelectionType;
  ids: string[];
}

// ---------------------------------------------------------------------------
// Pending edits types
// ---------------------------------------------------------------------------

export interface PendingEdit {
  type: 'scene' | 'object';
  id: string | null;
  data: Record<string, unknown>;
}

export type RoomRole = 'owner' | 'sub_owner' | 'user' | 'guest';

export interface AdrasteaContextValue {
  // --- roomId ---
  roomId: string;
  roomRole: RoomRole;

  // --- useAdrastea ---
  pieces: Piece[];
  room: Room | null;
  movePiece: ReturnType<typeof useAdrastea>['movePiece'];
  addPiece: ReturnType<typeof useAdrastea>['addPiece'];
  removePiece: ReturnType<typeof useAdrastea>['removePiece'];
  updatePiece: ReturnType<typeof useAdrastea>['updatePiece'];
  updateRoom: ReturnType<typeof useAdrastea>['updateRoom'];
  deleteRoom: () => Promise<void>;

  // --- useAdrasteaChat ---
  messages: ChatMessage[];
  chatLoading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  sendMessage: ReturnType<typeof useAdrasteaChat>['sendMessage'];
  loadMore: ReturnType<typeof useAdrasteaChat>['loadMore'];
  clearMessages: ReturnType<typeof useAdrasteaChat>['clearMessages'];
  handleSendMessage: (
    content: string,
    messageType: ChatMessage['message_type'],
    characterName?: string,
    characterAvatar?: string | null,
    channelOverride?: string,
  ) => void;

  // --- Active speaker character ---
  activeSpeakerCharId: string | null;
  setActiveSpeakerCharId: React.Dispatch<React.SetStateAction<string | null>>;

  // --- Active chat channel ---
  activeChatChannel: string;
  setActiveChatChannel: (channel: string) => void;

  // --- Chat input inject ---
  chatInjectText: string | null;
  setChatInjectText: (text: string | null) => void;

  // --- useChannels ---
  channels: ChatChannel[];
  upsertChannel: (channel: ChatChannel) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;

  // --- useScenes ---
  scenes: Scene[];
  addScene: ReturnType<typeof useScenes>['addScene'];
  updateScene: ReturnType<typeof useScenes>['updateScene'];
  removeScene: ReturnType<typeof useScenes>['removeScene'];
  reorderScenes: ReturnType<typeof useScenes>['reorderScenes'];
  activateScene: ReturnType<typeof useScenes>['activateScene'];

  // --- useCharacters ---
  characters: Character[];
  addCharacter: ReturnType<typeof useCharacters>['addCharacter'];
  updateCharacter: ReturnType<typeof useCharacters>['updateCharacter'];
  moveCharacter: (charId: string, updates: { board_x?: number; board_y?: number }) => Promise<void>;
  removeCharacter: ReturnType<typeof useCharacters>['removeCharacter'];
  reorderCharacters: ReturnType<typeof useCharacters>['reorderCharacters'];
  layerOrderedCharacters: Character[];
  reorderLayerCharacters: ReturnType<typeof useCharacters>['reorderLayerCharacters'];

  // --- useObjects ---
  allObjects: BoardObject[];
  activeObjects: BoardObject[];
  addObject: (data: Partial<BoardObject>) => Promise<string>;
  updateObject: (id: string, data: Partial<BoardObject>) => Promise<void>;
  moveObject: (id: string, data: Partial<BoardObject>) => Promise<void>;
  removeObject: (id: string) => Promise<void>;
  reorderObjects: (orderedIds: string[]) => Promise<void>;
  batchUpdateSort: (updates: { id: string; sort: number }[]) => Promise<void>;
  injectOptimistic: (objects: BoardObject[]) => void;

  // --- useScenarioTexts ---
  scenarioTexts: ScenarioText[];
  addScenarioText: ReturnType<typeof useScenarioTexts>['addScenarioText'];
  updateScenarioText: ReturnType<typeof useScenarioTexts>['updateScenarioText'];
  removeScenarioText: ReturnType<typeof useScenarioTexts>['removeScenarioText'];
  reorderScenarioTexts: ReturnType<typeof useScenarioTexts>['reorderScenarioTexts'];

  // --- useCutins ---
  cutins: Cutin[];
  addCutin: ReturnType<typeof useCutins>['addCutin'];
  updateCutin: ReturnType<typeof useCutins>['updateCutin'];
  removeCutin: ReturnType<typeof useCutins>['removeCutin'];
  reorderCutins: ReturnType<typeof useCutins>['reorderCutins'];
  triggerCutin: ReturnType<typeof useCutins>['triggerCutin'];
  clearCutin: ReturnType<typeof useCutins>['clearCutin'];

  // --- useBgms ---
  bgms: BgmTrack[];
  addBgm: (data: Partial<Omit<BgmTrack, 'id'>>) => Promise<string>;
  updateBgm: (id: string, data: Partial<BgmTrack>) => Promise<void>;
  removeBgm: (id: string) => Promise<void>;
  reorderBgms: (orderedIds: string[]) => Promise<void>;

  // --- BGM master volume ---
  masterVolume: number;
  setMasterVolume: (v: number) => void;
  bgmMuted: boolean;
  setBgmMuted: (v: boolean) => void;

  // --- UI editing state ---
  editingScene: Scene | null | undefined;
  setEditingScene: React.Dispatch<React.SetStateAction<Scene | null | undefined>>;
  editingCharacter: Character | null | undefined;
  setEditingCharacter: React.Dispatch<React.SetStateAction<Character | null | undefined>>;
  characterToOpenModal: Character | null;
  setCharacterToOpenModal: (char: Character | null) => void;
  editingCutin: Cutin | null | undefined;
  setEditingCutin: React.Dispatch<React.SetStateAction<Cutin | null | undefined>>;
  editingBgmId: string | null;
  setEditingBgmId: React.Dispatch<React.SetStateAction<string | null>>;
  editingScenarioTextId: string | null;
  setEditingScenarioTextId: React.Dispatch<React.SetStateAction<string | null>>;
  editingPieceId: string | null;
  setEditingPieceId: React.Dispatch<React.SetStateAction<string | null>>;
  editingObjectId: string | null | undefined;
  setEditingObjectId: React.Dispatch<React.SetStateAction<string | null | undefined>>;
  selectedObjectIds: string[];
  setSelectedObjectIds: React.Dispatch<React.SetStateAction<string[]>>;
  panelSelection: PanelSelection | null;
  setPanelSelection: React.Dispatch<React.SetStateAction<PanelSelection | null>>;
  showRoomSettings: boolean;
  setShowRoomSettings: (v: boolean) => void;
  showProfileEdit: boolean;
  setShowProfileEdit: (v: boolean) => void;
  showSettings: boolean;
  settingsSection: 'room' | 'layout' | 'user';
  setShowSettings: (show: boolean, section?: 'room' | 'layout' | 'user') => void;

  // --- Derived values ---
  activeScene: Scene | null;
  // --- Auth ---
  profile: UserProfile | null;
  user: AuthUser | null;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>) => Promise<void>;

  // --- Shortcut callbacks ---
  onAddObject: () => void;

  // --- Board ref ---
  boardRef: React.RefObject<BoardHandle | null>;
  getBoardCenter: () => { x: number; y: number };

  // --- Grid ---
  gridVisible: boolean;
  setGridVisible: React.Dispatch<React.SetStateAction<boolean>>;

  // --- Dockview ---
  dockviewApi: DockviewApi | null;
  setDockviewApi: React.Dispatch<React.SetStateAction<DockviewApi | null>>;

  // --- Loading ---
  isLoading: boolean;
  loadingProgress: number;
  loadingSteps: { label: string; done: boolean }[];

  // --- Auto-save edits ---
  setPendingEdit: (key: string, edit: PendingEdit | null) => void;

  // --- 排他編集リセット ---
  clearAllEditing: () => void;

  // --- パネル登録（遅延リスナー用） ---
  registerPanel: (panelId: string) => void;
  unregisterPanel: (panelId: string) => void;

  // --- Toast ---
  toasts: { id: string; message: string; type: 'success' | 'error' }[];
  showToast: (message: string, type: 'success' | 'error') => void;

  // --- Undo/Redo ---
  undoRedo: UndoRedoHandle;

  // --- Demo mode ---
  isDemo?: boolean;
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
  roomRole: RoomRole;
}

export const AdrasteaProvider: React.FC<AdrasteaProviderProps> = ({ children, roomId, roomRole }) => {
  const { user, profile, signOut, updateProfile: updateProfileFromAuth } = useAuth();
  const updateProfile = updateProfileFromAuth ?? (async () => {});

  const { toasts, showToast } = useToast();

  // --- Convex mutations ---
  const removeRoom = useMutation(api.rooms.remove);

  // --- パネルのマウント状態追跡（遅延リスナー用） ---
  const [activePanels, setActivePanels] = useState<Set<string>>(new Set());
  const registerPanel = useCallback((panelId: string) => {
    setActivePanels(prev => { const next = new Set(prev); next.add(panelId); return next; });
  }, []);
  const unregisterPanel = useCallback((panelId: string) => {
    setActivePanels(prev => { const next = new Set(prev); next.delete(panelId); return next; });
  }, []);

  // --- onObjectsCreated コールバック用 Ref（循環依存を回避） ---
  const objectsCreatedRef = useRef<((objects: BoardObject[]) => void) | null>(null);
  const handleObjectsCreated = useCallback((objects: BoardObject[]) => {
    objectsCreatedRef.current?.(objects);
  }, []);

  // --- Data hooks ---

  const {
    pieces, room, loading: adrasteaLoading, movePiece, addPiece, removePiece, updatePiece, updateRoom,
  } = useAdrastea(roomId);

  const {
    messages, loading: chatLoading, loadingMore, hasMore, sendMessage, loadMore, clearMessages,
  } = useAdrasteaChat(roomId);

  const {
    channels, upsertChannel, deleteChannel, loading: channelsLoading,
  } = useChannels(room?.id ?? '');

  // onRoomUpdate コールバック（useCutins → useAdrastea）
  const handleRoomUpdate = useCallback((updates: Record<string, unknown>) => {
    updateRoom(updates as Partial<Room>);
  }, [updateRoom]);

  const { scenes, loading: scenesLoading, addScene, updateScene, removeScene, reorderScenes, activateScene } = useScenes(roomId, { onObjectsCreated: handleObjectsCreated });
  const { characters, layerOrderedCharacters, loading: charactersLoading, addCharacter, updateCharacter, moveCharacter, removeCharacter, reorderCharacters, reorderLayerCharacters } = useCharacters(roomId);

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
    allObjects, activeObjects, loading: objectsLoading,
    addObject, updateObject, removeObject, reorderObjects, batchUpdateSort, injectOptimistic,
  } = useObjects(roomId, effectiveSceneId);

  // objectsCreatedRef に injectOptimistic を設定
  useEffect(() => {
    objectsCreatedRef.current = injectOptimistic;
  }, [injectOptimistic]);

  const scenarioTextsEnabled = activePanels.has('scenarioText');
  const cutinsEnabled = activePanels.has('cutin');
  const { scenarioTexts, loading: scenarioTextsLoading, addScenarioText, updateScenarioText, removeScenarioText, reorderScenarioTexts } = useScenarioTexts(roomId, scenarioTextsEnabled);
  const { cutins, loading: cutinsLoading, addCutin, updateCutin, removeCutin, reorderCutins, triggerCutin, clearCutin } = useCutins(roomId, cutinsEnabled, handleRoomUpdate);
  const { bgms, loading: bgmsLoading, addBgm, updateBgm, removeBgm, reorderBgms } = useBgms(roomId);

  // --- Loading steps ---
  const loadingSteps = useMemo(() => [
    { label: 'ルーム', done: !adrasteaLoading },
    { label: 'シーン', done: !scenesLoading },
    { label: 'キャラクター', done: !charactersLoading },
    { label: 'オブジェクト', done: !objectsLoading },
    { label: 'チャット', done: !chatLoading },
    { label: 'チャンネル', done: !channelsLoading },
    { label: 'BGM', done: !bgmsLoading },
    { label: 'カットイン', done: !cutinsEnabled || !cutinsLoading },
    { label: 'シナリオテキスト', done: !scenarioTextsEnabled || !scenarioTextsLoading },
  ], [adrasteaLoading, scenesLoading, charactersLoading, objectsLoading, chatLoading, channelsLoading, bgmsLoading, cutinsLoading, scenarioTextsLoading, cutinsEnabled, scenarioTextsEnabled]);

  // 初回ロード完了後はローディング画面を二度と出さない
  // （シーン切り替え時の objectsLoading 等で全画面ローディングが再表示されるのを防ぐ）
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const allStepsDone = loadingSteps.every(s => s.done);
  useEffect(() => {
    if (allStepsDone && !initialLoadDone) setInitialLoadDone(true);
  }, [allStepsDone, initialLoadDone]);

  const isLoading = !initialLoadDone && loadingSteps.some(s => !s.done);
  const loadingProgress = loadingSteps.filter(s => s.done).length / loadingSteps.length;

  // スナップショット復元後、active_scene_id が未設定ならシーンを自動アクティベート
  useEffect(() => {
    if (!initialLoadDone) return;
    if (effectiveSceneId) return; // すでにアクティブなシーンがある
    if (scenes.length > 0) {
      setOptimisticSceneId(scenes[0].id);
      updateRoom({ active_scene_id: scenes[0].id });
    }
  }, [initialLoadDone, effectiveSceneId, scenes, updateRoom]);

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
  }, [initialLoadDone, bgms, removeBgm]);

  // --- Undo/Redo ---
  const undoRedo = useUndoRedo();
  const prevObjectsRef = useRef<typeof allObjects>([]);
  const prevCharactersRef = useRef<typeof characters>([]);
  const prevScenesRef = useRef<typeof scenes>([]);
  const prevBgmsRef = useRef<typeof bgms>([]);
  const prevPiecesRef = useRef<typeof pieces>([]);
  const undoReadyRef = useRef(false);

  // initialLoadDone 時に prev を現在値で初期化（初期ロードの diff を積まない）
  useEffect(() => {
    if (!initialLoadDone || undoReadyRef.current) return;
    prevObjectsRef.current = allObjects;
    prevCharactersRef.current = characters;
    prevScenesRef.current = scenes;
    prevBgmsRef.current = bgms;
    prevPiecesRef.current = pieces;
    undoReadyRef.current = true;
  }, [initialLoadDone, allObjects, characters, scenes, bgms, pieces]);

  useEffect(() => {
    if (!undoReadyRef.current) return;
    if (undoRedo.isOperatingRef.current) { prevObjectsRef.current = allObjects; return; }
    computeDiffs('object', prevObjectsRef.current, allObjects).forEach(d => undoRedo.push(d));
    prevObjectsRef.current = allObjects;
  }, [allObjects]);

  useEffect(() => {
    if (!undoReadyRef.current) return;
    if (undoRedo.isOperatingRef.current) { prevCharactersRef.current = characters; return; }
    computeDiffs('character', prevCharactersRef.current, characters).forEach(d => undoRedo.push(d));
    prevCharactersRef.current = characters;
  }, [characters]);

  useEffect(() => {
    if (!undoReadyRef.current) return;
    if (undoRedo.isOperatingRef.current) { prevScenesRef.current = scenes; return; }
    computeDiffs('scene', prevScenesRef.current, scenes).forEach(d => undoRedo.push(d));
    prevScenesRef.current = scenes;
  }, [scenes]);

  useEffect(() => {
    if (!undoReadyRef.current) return;
    if (undoRedo.isOperatingRef.current) { prevBgmsRef.current = bgms; return; }
    computeDiffs('bgm', prevBgmsRef.current, bgms).forEach(d => undoRedo.push(d));
    prevBgmsRef.current = bgms;
  }, [bgms]);

  useEffect(() => {
    if (!undoReadyRef.current) return;
    if (undoRedo.isOperatingRef.current) { prevPiecesRef.current = pieces; return; }
    computeDiffs('piece', prevPiecesRef.current, pieces).forEach(d => undoRedo.push(d));
    prevPiecesRef.current = pieces;
  }, [pieces]);

  // undo/redo 実行
  const executeUndoEntry = useCallback(async (entry: UndoEntry, direction: 'undo' | 'redo') => {
    undoRedo.isOperatingRef.current = true;
    const data = direction === 'undo' ? entry.before : entry.after;
    try {
      if (direction === 'undo' && entry.operation === 'add') {
        // undo add = remove
        switch (entry.entityType) {
          case 'object': await removeObject(entry.entityId); break;
          case 'character': await removeCharacter(entry.entityId); break;
          case 'scene': await removeScene(entry.entityId); break;
          case 'bgm': await removeBgm(entry.entityId); break;
          case 'piece': await removePiece(entry.entityId); break;
        }
      } else if (direction === 'undo' && entry.operation === 'remove') {
        // undo remove = re-add with same ID
        switch (entry.entityType) {
          case 'object': await addObject(data as Partial<BoardObject>); break;
          case 'character': await addCharacter(data as Partial<Character>); break;
          case 'scene': await addScene(data as Partial<Scene>); break;
          case 'bgm': await addBgm(data as Partial<BgmTrack>); break;
          case 'piece': {
            const p = data as Partial<Piece>;
            await addPiece(p.label ?? '', p.color ?? '#888', p.x ?? 0, p.y ?? 0);
            break;
          }
        }
      } else if (direction === 'redo' && entry.operation === 'add') {
        // redo add = re-add
        switch (entry.entityType) {
          case 'object': await addObject(data as Partial<BoardObject>); break;
          case 'character': await addCharacter(data as Partial<Character>); break;
          case 'scene': await addScene(data as Partial<Scene>); break;
          case 'bgm': await addBgm(data as Partial<BgmTrack>); break;
          case 'piece': {
            const p = data as Partial<Piece>;
            await addPiece(p.label ?? '', p.color ?? '#888', p.x ?? 0, p.y ?? 0);
            break;
          }
        }
      } else if (direction === 'redo' && entry.operation === 'remove') {
        // redo remove = remove again
        switch (entry.entityType) {
          case 'object': await removeObject(entry.entityId); break;
          case 'character': await removeCharacter(entry.entityId); break;
          case 'scene': await removeScene(entry.entityId); break;
          case 'bgm': await removeBgm(entry.entityId); break;
          case 'piece': await removePiece(entry.entityId); break;
        }
      } else {
        // update (undo = before, redo = after)
        switch (entry.entityType) {
          case 'object': await updateObject(entry.entityId, data as Partial<BoardObject>); break;
          case 'character': await updateCharacter(entry.entityId, data as Partial<Character>); break;
          case 'scene': await updateScene(entry.entityId, data as Partial<Scene>); break;
          case 'bgm': await updateBgm(entry.entityId, data as Partial<BgmTrack>); break;
          case 'piece': await updatePiece(entry.entityId, data as Partial<Piece>); break;
        }
      }
    } finally {
      setTimeout(() => { undoRedo.isOperatingRef.current = false; }, 500);
    }
  }, [addObject, removeObject, updateObject, addCharacter, removeCharacter, updateCharacter,
      addScene, removeScene, updateScene, addBgm, removeBgm, updateBgm, addPiece, removePiece, updatePiece]);

  const handleUndo = useCallback(() => {
    const entry = undoRedo.undo();
    if (entry) executeUndoEntry(entry, 'undo');
  }, [undoRedo, executeUndoEntry]);

  const handleRedo = useCallback(() => {
    const entry = undoRedo.redo();
    if (entry) executeUndoEntry(entry, 'redo');
  }, [undoRedo, executeUndoEntry]);

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

  // --- UI state ---
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null);
  const [showSettings, setShowSettingsState] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'room' | 'layout' | 'user'>('room');

  const setShowSettings = useCallback((show: boolean, section: 'room' | 'layout' | 'user' = 'room') => {
    setShowSettingsState(show);
    if (show) setSettingsSection(section);
  }, []);

  const [panelSelection, setPanelSelection] = useState<PanelSelection | null>(null);
  const selectedObjectIds = panelSelection?.panel === 'layer' ? panelSelection.ids : [];
  const setSelectedObjectIds: React.Dispatch<React.SetStateAction<string[]>> = useCallback((action) => {
    setPanelSelection(prev => {
      const prevIds = prev?.panel === 'layer' ? prev.ids : [];
      const newIds = typeof action === 'function' ? action(prevIds) : action;
      return newIds.length > 0 ? { panel: 'layer', ids: newIds } : null;
    });
  }, []);

  const [editingScene, setEditingScene] = useState<Scene | null | undefined>(undefined);
  const [editingCharacter, setEditingCharacter] = useState<Character | null | undefined>(undefined);
  const [characterToOpenModal, setCharacterToOpenModal] = useState<Character | null>(null);
  const [editingObjectId, setEditingObjectId] = useState<string | null | undefined>(undefined);
  const [editingCutin, setEditingCutin] = useState<Cutin | null | undefined>(undefined);
  const [editingBgmId, setEditingBgmId] = useState<string | null>(null);
  const [editingScenarioTextId, setEditingScenarioTextId] = useState<string | null>(null);
  const [activeSpeakerCharId, setActiveSpeakerCharId] = useState<string | null>(null);
  const [activeChatChannel, setActiveChatChannel] = useState<string>('main');
  const [chatInjectText, setChatInjectText] = useState<string | null>(null);

  // --- Board ref ---
  const boardRef = useRef<BoardHandle | null>(null);
  const getBoardCenter = useCallback(() => {
    const board = boardRef.current;
    if (!board) return { x: 0, y: 0 };
    const stage = board.getStage();
    if (!stage) return { x: 0, y: 0 };
    const scale = board.getScale();
    const stagePos = stage.position();
    const w = stage.width();
    const h = stage.height();
    if (!w || !h) return { x: 0, y: 0 };
    return {
      x: Math.round(((w / 2) - stagePos.x) / scale / GRID_SIZE),
      y: Math.round(((h / 2) - stagePos.y) / scale / GRID_SIZE),
    };
  }, []);

  // --- Dockview ---
  const [dockviewApi, setDockviewApi] = useState<DockviewApi | null>(null);

  // --- Grid visibility ---
  const [gridVisible, setGridVisible] = useState(false);

  // --- BGM master volume (localStorage) ---
  const [masterVolume, setMasterVolumeState] = useState(() => {
    const saved = localStorage.getItem('adrastea-master-volume');
    return saved !== null ? Number(saved) : 0.5;
  });
  const [bgmMuted, setBgmMutedState] = useState(() => {
    return localStorage.getItem('adrastea-bgm-muted') === 'true';
  });
  const setMasterVolume = useCallback((v: number) => {
    setMasterVolumeState(v);
    localStorage.setItem('adrastea-master-volume', String(v));
  }, []);
  const setBgmMuted = useCallback((v: boolean) => {
    setBgmMutedState(v);
    localStorage.setItem('adrastea-bgm-muted', String(v));
  }, []);

  // --- Auto-save edits (debounced) ---
  const [localSceneOverrides, setLocalSceneOverrides] = useState<Map<string, Partial<Scene>>>(new Map());
  const [localObjectOverrides, setLocalObjectOverrides] = useState<Map<string, Partial<BoardObject>>>(new Map());
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingEditsRef = useRef<Map<string, PendingEdit>>(new Map());

  // アンマウント時にデバウンスタイマーをクリア
  useEffect(() => {
    return () => {
      for (const timer of debounceTimersRef.current.values()) clearTimeout(timer);
      debounceTimersRef.current.clear();
    };
  }, []);

  // 背景/前景オブジェクトのimage_url変更時にSceneドキュメントに同期
  const syncObjectImageToScene = useCallback(async (objData: Partial<BoardObject>, objId: string | null) => {
    if (!effectiveSceneId) return;
    const objType = objData.type ?? (objId ? activeObjects.find(o => o.id === objId)?.type : null);
    if (!objType || (objType !== 'background' && objType !== 'foreground')) return;
    if (!('image_url' in objData)) return;

    const sceneField = objType === 'background' ? 'background_url' : 'foreground_url';
    await updateScene(effectiveSceneId, { [sceneField]: objData.image_url ?? null } as Partial<Scene>);
  }, [effectiveSceneId, activeObjects, updateScene]);

  const flushEdit = useCallback(async (edit: PendingEdit) => {
    if (edit.type === 'scene') {
      if (edit.id) {
        await updateScene(edit.id, edit.data as Partial<Scene>);
      } else {
        await addScene(edit.data as Partial<Scene>);
      }
    } else if (edit.type === 'object') {
      if (edit.id) {
        await updateObject(edit.id, edit.data as Partial<BoardObject>);
      } else {
        await addObject(edit.data as Partial<BoardObject>);
      }
      await syncObjectImageToScene(edit.data as Partial<BoardObject>, edit.id);
    }
  }, [updateScene, addScene, updateObject, addObject, syncObjectImageToScene]);

  const setPendingEdit = useCallback((key: string, edit: PendingEdit | null) => {
    if (!edit) {
      // タイマークリア
      const timer = debounceTimersRef.current.get(key);
      if (timer) clearTimeout(timer);
      debounceTimersRef.current.delete(key);
      pendingEditsRef.current.delete(key);
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
      // bg/fg の image_url 変更時は localSceneOverrides にも反映
      // → effectiveActiveObjects のシーン URL オーバーレイが最新値を返すようにする
      if ('image_url' in edit.data && effectiveSceneId) {
        const objType = (edit.data as Partial<BoardObject>).type
          ?? activeObjects.find(o => o.id === edit.id)?.type;
        if (objType === 'background' || objType === 'foreground') {
          const sceneField = objType === 'background' ? 'background_url' : 'foreground_url';
          setLocalSceneOverrides(prev => {
            const next = new Map(prev);
            const existing = next.get(effectiveSceneId!) ?? {};
            next.set(effectiveSceneId!, { ...existing, [sceneField]: (edit.data as Partial<BoardObject>).image_url ?? null });
            return next;
          });
        }
      }
    }

    const clearLocalOverride = (e: PendingEdit) => {
      if (!e.id) return;
      if (e.type === 'scene') {
        setLocalSceneOverrides(prev => {
          if (!prev.has(e.id!)) return prev;
          const next = new Map(prev);
          next.delete(e.id!);
          return next;
        });
      } else if (e.type === 'object') {
        setLocalObjectOverrides(prev => {
          if (!prev.has(e.id!)) return prev;
          const next = new Map(prev);
          next.delete(e.id!);
          return next;
        });
      }
    };

    // デバウンス付きDB保存
    const existing = debounceTimersRef.current.get(key);
    if (existing) clearTimeout(existing);
    pendingEditsRef.current.set(key, edit);
    debounceTimersRef.current.set(key, setTimeout(async () => {
      debounceTimersRef.current.delete(key);
      pendingEditsRef.current.delete(key);
      try {
        await flushEdit(edit);
        clearLocalOverride(edit);
      } catch (err) {
        console.error('pendingEdit flush失敗:', err);
        clearLocalOverride(edit);
      }
    }, 500));
  }, [flushEdit, effectiveSceneId, activeObjects]);

  // --- Derived values (with local overrides) ---
  // effectiveActiveObjects でシーン URL をオーバーレイするため、ローカルオーバーライド適用済みの activeScene を先に計算
  const activeSceneRaw = useMemo(() => {
    if (!effectiveSceneId) return null;
    const base = scenes.find(s => s.id === effectiveSceneId) ?? null;
    if (!base) return null;
    const override = localSceneOverrides.get(base.id);
    return override ? { ...base, ...override } : base;
  }, [effectiveSceneId, scenes, localSceneOverrides]);

  const effectiveScenes = useMemo(() => {
    let result = scenes;
    if (localSceneOverrides.size > 0) {
      result = result.map(s => {
        const override = localSceneOverrides.get(s.id);
        return override ? { ...s, ...override } : s;
      });
    }
    return [...result].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [scenes, localSceneOverrides]);

  const effectiveActiveObjects = useMemo(() => {
    let result = activeObjects;

    // bg/fg の image_url をアクティブ Scene の URL で上書き
    if (activeSceneRaw) {
      result = result.map(o => {
        if (o.type === 'background' && activeSceneRaw.background_url !== undefined) {
          return { ...o, image_url: activeSceneRaw.background_url };
        }
        if (o.type === 'foreground' && activeSceneRaw.foreground_url !== undefined) {
          return { ...o, image_url: activeSceneRaw.foreground_url };
        }
        return o;
      });
    }

    // 既存のローカルオーバーライド適用
    if (localObjectOverrides.size > 0) {
      result = result.map(o => {
        const override = localObjectOverrides.get(o.id);
        return override ? { ...o, ...override } : o;
      });
    }

    return result;
  }, [activeObjects, activeSceneRaw, localObjectOverrides]);

  const activeScene = useMemo(() => {
    if (!effectiveSceneId) return null;
    return effectiveScenes.find((s) => s.id === effectiveSceneId) ?? null;
  }, [effectiveSceneId, effectiveScenes]);


  // シーン切替時のみグリッド表示をシーン設定から反映
  const prevSceneIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeScene?.id !== prevSceneIdRef.current) {
      setGridVisible(activeScene?.grid_visible ?? false);
      prevSceneIdRef.current = activeScene?.id ?? null;
    }
  }, [activeScene?.id, activeScene?.grid_visible]);

  // --- Permission guard ref ---
  const roomRoleRef = useRef(roomRole);
  roomRoleRef.current = roomRole;

  /** パーミッションチェック付きで関数を実行。権限なしの場合はwarnしてno-op */
  const withPermission = useCallback(<F extends (...args: any[]) => any>(
    permission: PermissionKey,
    fn: F,
  ): F => ((...args: Parameters<F>) => {
    if (!checkPermission(roomRoleRef.current, permission)) {
      console.warn(`[Permission] denied: ${permission} (role: ${roomRoleRef.current})`);
      return;
    }
    return fn(...args);
  }) as F, []);

  // --- Callbacks ---
  const handleSendMessage = useCallback(
    (
      content: string,
      messageType: ChatMessage['message_type'],
      characterName?: string,
      characterAvatar?: string | null,
      channelOverride?: string,
    ) => {
      const senderName = characterName ?? profile?.display_name ?? 'ユーザー';
      const senderAvatar = characterAvatar !== undefined ? characterAvatar : profile?.avatar_url;
      sendMessage(
        senderName,
        content,
        messageType,
        user?.uid,
        senderAvatar,
        room?.dice_system,
        channelOverride ?? activeChatChannel,
      );
    },
    [sendMessage, profile, user, room?.dice_system, activeChatChannel],
  );

  const safeActivateScene = useCallback(async (sceneId: string | null) => {
    // pending なデバウンス編集を即時 flush（データ消失防止）
    for (const timer of debounceTimersRef.current.values()) clearTimeout(timer);
    debounceTimersRef.current.clear();
    const pendingEntries = Array.from(pendingEditsRef.current.values());
    pendingEditsRef.current.clear();
    for (const edit of pendingEntries) {
      try {
        await flushEdit(edit);
      } catch (err) {
        console.error('シーン切替時の pendingEdit flush 失敗:', err);
      }
    }
    // 楽観的にシーンを即座に切り替え（Convex 反映を待たない）
    setOptimisticSceneId(sceneId);
    setLocalSceneOverrides(new Map());
    setLocalObjectOverrides(new Map());
    // シーン切替時の編集状態制御
    // オブジェクト: global/テキストは維持、前景/背景は遷移先の同タイプにアタッチ、それ以外はシーン存在チェック
    setEditingObjectId(prev => {
      if (!prev) return prev;
      const obj = allObjects.find(o => o.id === prev);
      if (!obj) return undefined;
      if (obj.global || obj.type === 'text') return prev;
      // 前景/背景: 遷移先シーンの同タイプオブジェクトに切り替え
      if ((obj.type === 'foreground' || obj.type === 'background') && sceneId) {
        const counterpart = allObjects.find(o => o.type === obj.type && o.scene_ids.includes(sceneId));
        return counterpart?.id ?? undefined;
      }
      // その他: 遷移先シーンにも存在すれば維持
      if (sceneId && obj.scene_ids.includes(sceneId)) return prev;
      return undefined;
    });
    // BGM: 遷移先シーンにも設定されてれば維持
    setEditingBgmId(prev => {
      if (!prev || !sceneId) return null;
      const bgm = bgms.find(b => b.id === prev);
      return bgm?.scene_ids.includes(sceneId) ? prev : null;
    });
    // room.active_scene_id を更新（スナップショット保存に反映）
    updateRoom({ active_scene_id: sceneId });
    // ローカルstateを更新
    activateScene(sceneId);
  }, [activateScene, updateRoom, flushEdit]);

  // updateObjectラッパー: 背景/前景のimage_url変更時にSceneも同期 + ローカルオーバーライドをクリア
  const syncedUpdateObject = useCallback(async (id: string, data: Partial<BoardObject>) => {
    // ローカルオーバーライドをクリア（Convexの値を優先させる）
    setLocalObjectOverrides(prev => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    // bg/fg の image_url 変更時はシーンのローカルオーバーライドもクリア
    if ('image_url' in data && effectiveSceneId) {
      setLocalSceneOverrides(prev => {
        if (!prev.has(effectiveSceneId)) return prev;
        const next = new Map(prev);
        next.delete(effectiveSceneId);
        return next;
      });
    }
    // デバウンスタイマーもクリア
    const timerKey = `object:${id}`;
    const timer = debounceTimersRef.current.get(timerKey);
    if (timer) {
      clearTimeout(timer);
      debounceTimersRef.current.delete(timerKey);
    }

    await updateObject(id, data);
    await syncObjectImageToScene(data, id);
  }, [updateObject, syncObjectImageToScene, effectiveSceneId]);

  const deleteRoom = useCallback(async () => {
    if (!room) return;
    await removeRoom({ id: room.id });
    // ルーム一覧に戻る
    window.location.href = '/adrastea/';
  }, [room, removeRoom]);

  const clearAllEditing = useCallback(() => {
    setEditingPieceId(null);
    setEditingObjectId(undefined);
    setPanelSelection(null);
    setEditingScene(undefined);
    setEditingCharacter(undefined);
    setEditingCutin(undefined);
    setEditingBgmId(null);
    setEditingScenarioTextId(null);
  }, []);

  const onAddObject = useCallback(() => {
    setEditingObjectId(null);
  }, []);

  // --- Permission guarded functions ---
  const guardedAddScene       = withPermission('scene_edit',     addScene);
  const guardedUpdateScene    = withPermission('scene_edit',     updateScene);
  const guardedRemoveScene    = withPermission('scene_edit',     removeScene);
  const guardedReorderScenes  = withPermission('scene_edit',     reorderScenes);
  const guardedAddObject      = withPermission('object_edit',    addObject);
  const guardedUpdateObject   = withPermission('object_edit',    syncedUpdateObject);
  const guardedMoveObject     = withPermission('object_move',    syncedUpdateObject);
  const guardedRemoveObject   = withPermission('object_edit',    removeObject);
  const guardedReorderObjects = withPermission('object_edit',    reorderObjects);
  const guardedBatchSort      = withPermission('object_edit',    batchUpdateSort);
  const guardedAddCharacter   = withPermission('character_edit', (data: any) => addCharacter({ ...data, owner_id: user?.uid ?? '' }));
  const guardedUpdateCharacter= withPermission('character_edit', updateCharacter);
  const guardedMoveCharacter  = withPermission('object_move', moveCharacter);
  const guardedRemoveCharacter= withPermission('character_edit', removeCharacter);
  const guardedAddBgm         = withPermission('bgm_manage',     addBgm);
  const guardedUpdateBgm      = withPermission('bgm_manage',     updateBgm);
  const guardedRemoveBgm      = withPermission('bgm_manage',     removeBgm);
  const guardedAddCutin       = withPermission('cutin_manage',   addCutin);
  const guardedUpdateCutin    = withPermission('cutin_manage',   updateCutin);
  const guardedRemoveCutin    = withPermission('cutin_manage',   removeCutin);
  const guardedTriggerCutin   = withPermission('cutin_manage',   triggerCutin);
  const guardedSendMessage    = withPermission('chat_send',      handleSendMessage);

  // --- Context value ---
  const value = useMemo<AdrasteaContextValue>(
    () => ({
      roomId,
      roomRole,

      // useAdrastea
      pieces, room, movePiece, addPiece, removePiece, updatePiece, updateRoom, deleteRoom,

      // useAdrasteaChat
      messages, chatLoading, loadingMore, hasMore, sendMessage, loadMore, clearMessages, handleSendMessage,
      activeSpeakerCharId, setActiveSpeakerCharId,
      activeChatChannel, setActiveChatChannel,
      chatInjectText, setChatInjectText,

      // useChannels
      channels, upsertChannel, deleteChannel,

      // useScenes
      scenes: effectiveScenes, addScene: guardedAddScene,
      updateScene: guardedUpdateScene,
      removeScene: guardedRemoveScene,
      reorderScenes: guardedReorderScenes,
      activateScene: safeActivateScene,

      // useCharacters
      characters, addCharacter: guardedAddCharacter,
      updateCharacter: guardedUpdateCharacter,
      moveCharacter: guardedMoveCharacter,
      removeCharacter: guardedRemoveCharacter,
      reorderCharacters,
      layerOrderedCharacters,
      reorderLayerCharacters,

      // useObjects
      allObjects, activeObjects: effectiveActiveObjects,
      addObject: guardedAddObject,
      updateObject: guardedUpdateObject,
      moveObject: guardedMoveObject,
      removeObject: guardedRemoveObject,
      reorderObjects: guardedReorderObjects,
      batchUpdateSort: guardedBatchSort,
      injectOptimistic,

      // useScenarioTexts
      scenarioTexts, addScenarioText, updateScenarioText, removeScenarioText, reorderScenarioTexts,

      // useCutins
      cutins, addCutin: guardedAddCutin, updateCutin: guardedUpdateCutin, removeCutin: guardedRemoveCutin, reorderCutins, triggerCutin: guardedTriggerCutin, clearCutin,

      // useBgms
      bgms, addBgm: guardedAddBgm,
      updateBgm: guardedUpdateBgm,
      removeBgm: guardedRemoveBgm,
      reorderBgms: withPermission('bgm_manage', reorderBgms) as any,
      masterVolume, setMasterVolume, bgmMuted, setBgmMuted,

      // UI state
      editingScene, setEditingScene,
      editingCharacter, setEditingCharacter,
      characterToOpenModal, setCharacterToOpenModal,
      editingCutin, setEditingCutin,
      editingBgmId, setEditingBgmId,
      editingScenarioTextId, setEditingScenarioTextId,
      editingPieceId, setEditingPieceId,
      editingObjectId, setEditingObjectId,
      selectedObjectIds, setSelectedObjectIds,
      panelSelection, setPanelSelection,
      showRoomSettings: showSettings && settingsSection === 'room',
      setShowRoomSettings: (v: boolean) => setShowSettings(v, 'room'),
      showProfileEdit: showSettings && settingsSection === 'user',
      setShowProfileEdit: (v: boolean) => setShowSettings(v, 'user'),
      showSettings,
      settingsSection,
      setShowSettings,

      // Derived
      activeScene,

      // Auth
      profile, user, signOut, updateProfile,

      // Shortcut callbacks
      onAddObject,

      // Board
      boardRef, getBoardCenter,
      gridVisible, setGridVisible,

      // Dockview
      dockviewApi, setDockviewApi,

      // Loading
      isLoading, loadingProgress, loadingSteps,

      // Auto-save edits
      setPendingEdit,

      // 排他編集リセット
      clearAllEditing,

      // パネル登録
      registerPanel, unregisterPanel,

      // Toast
      toasts, showToast,
      // Undo/Redo
      undoRedo: { ...undoRedo, undo: handleUndo, redo: handleRedo } as UndoRedoHandle,
    }),
    [
      roomId, roomRole,
      pieces, room, movePiece, addPiece, removePiece, updatePiece, updateRoom, deleteRoom,
      messages, chatLoading, loadingMore, hasMore, sendMessage, loadMore, clearMessages, handleSendMessage,
      activeSpeakerCharId, setActiveSpeakerCharId,
      activeChatChannel, setActiveChatChannel,
      chatInjectText, setChatInjectText,
      channels, upsertChannel, deleteChannel,
      effectiveScenes, guardedAddScene, guardedUpdateScene, guardedRemoveScene, guardedReorderScenes, safeActivateScene,
      characters, guardedAddCharacter, guardedUpdateCharacter, guardedMoveCharacter, guardedRemoveCharacter, reorderCharacters,
      allObjects, effectiveActiveObjects,
      guardedAddObject, guardedUpdateObject, guardedMoveObject, guardedRemoveObject, guardedReorderObjects, guardedBatchSort, injectOptimistic,
      scenarioTexts, addScenarioText, updateScenarioText, removeScenarioText, reorderScenarioTexts,
      cutins, guardedAddCutin, guardedUpdateCutin, guardedRemoveCutin, reorderCutins, guardedTriggerCutin, clearCutin,
      bgms, guardedAddBgm, guardedUpdateBgm, guardedRemoveBgm, reorderBgms,
      masterVolume, setMasterVolume, bgmMuted, setBgmMuted,
      editingScene, editingCharacter, characterToOpenModal, editingCutin, editingBgmId,
      editingPieceId, editingObjectId, panelSelection,
      showSettings, settingsSection, setShowSettings, activeSpeakerCharId, setActiveSpeakerCharId,
      activeScene,
      profile, user, signOut, updateProfile,
      onAddObject,
      boardRef, getBoardCenter,
      gridVisible,
      dockviewApi,

      isLoading, loadingProgress, loadingSteps,
      setPendingEdit,
      clearAllEditing,
      registerPanel, unregisterPanel,
      toasts, showToast,
      undoRedo, handleUndo, handleRedo,
    ],
  );

  // --- Split value objects for new contexts ---
  const roomDataValue = useMemo<RoomDataContextValue>(() => ({
    // Rooms/Pieces
    pieces, room, movePiece, addPiece, removePiece, updatePiece, updateRoom,
    // Chat
    messages, chatLoading, loadingMore, hasMore, sendMessage, loadMore, clearMessages, handleSendMessage: guardedSendMessage,
    activeSpeakerCharId, setActiveSpeakerCharId,
    // Scenes
    scenes: effectiveScenes, addScene: guardedAddScene, updateScene: guardedUpdateScene, removeScene: guardedRemoveScene, reorderScenes: guardedReorderScenes, activateScene: safeActivateScene,
    // Characters
    characters, layerOrderedCharacters, addCharacter: guardedAddCharacter, updateCharacter: guardedUpdateCharacter, removeCharacter: guardedRemoveCharacter, reorderCharacters: withPermission('character_edit', reorderCharacters), reorderLayerCharacters,
    // Objects
    allObjects, activeObjects: effectiveActiveObjects, addObject: guardedAddObject, updateObject: guardedUpdateObject, moveObject: guardedMoveObject, removeObject: guardedRemoveObject, reorderObjects: guardedReorderObjects, batchUpdateSort: guardedBatchSort, injectOptimistic,
    // ScenarioTexts
    scenarioTexts, addScenarioText, updateScenarioText, removeScenarioText, reorderScenarioTexts,
    // Cutins
    cutins, addCutin: guardedAddCutin, updateCutin: guardedUpdateCutin, removeCutin: guardedRemoveCutin, reorderCutins, triggerCutin: guardedTriggerCutin, clearCutin,
    // BGMs
    bgms, addBgm: guardedAddBgm, updateBgm: guardedUpdateBgm, removeBgm: guardedRemoveBgm, reorderBgms: withPermission('bgm_manage', reorderBgms),
    // Derived
    activeScene,
  }), [
    pieces, room, movePiece, addPiece, removePiece, updatePiece, updateRoom,
    messages, chatLoading, loadingMore, hasMore, sendMessage, loadMore, clearMessages, guardedSendMessage,
    activeSpeakerCharId, setActiveSpeakerCharId,
    effectiveScenes, guardedAddScene, guardedUpdateScene, guardedRemoveScene, guardedReorderScenes, safeActivateScene,
    characters, guardedAddCharacter, guardedUpdateCharacter, guardedRemoveCharacter, reorderCharacters,
    allObjects, effectiveActiveObjects, guardedAddObject, guardedUpdateObject, guardedMoveObject, guardedRemoveObject, guardedReorderObjects, guardedBatchSort, injectOptimistic,
    scenarioTexts, addScenarioText, updateScenarioText, removeScenarioText, reorderScenarioTexts,
    cutins, guardedAddCutin, guardedUpdateCutin, guardedRemoveCutin, reorderCutins, guardedTriggerCutin, clearCutin,
    bgms, guardedAddBgm, guardedUpdateBgm, guardedRemoveBgm, reorderBgms,
    activeScene,
  ]);

  const uiStateValue = useMemo<UIStateContextValue>(() => ({
    // UI editing state
    editingScene, setEditingScene, editingCharacter, setEditingCharacter, editingCutin, setEditingCutin,
    editingBgmId, setEditingBgmId, editingScenarioTextId, setEditingScenarioTextId, editingPieceId, setEditingPieceId, editingObjectId, setEditingObjectId,
    selectedObjectIds, setSelectedObjectIds,
    panelSelection, setPanelSelection,
    showRoomSettings: showSettings && settingsSection === 'room',
    setShowRoomSettings: (v: boolean) => setShowSettings(v, 'room'),
    showProfileEdit: showSettings && settingsSection === 'user',
    setShowProfileEdit: (v: boolean) => setShowSettings(v, 'user'),
    showSettings,
    settingsSection,
    setShowSettings,
    // BGM master volume
    masterVolume, setMasterVolume, bgmMuted, setBgmMuted,
    // Grid
    gridVisible, setGridVisible,
    // Dockview
    dockviewApi, setDockviewApi,
    // Auto-save edits
    setPendingEdit,
    // 排他編集リセット
    clearAllEditing,
  }), [
    editingScene, editingCharacter, editingCutin, editingBgmId, editingScenarioTextId, editingPieceId, editingObjectId, panelSelection,
    showSettings, settingsSection, setShowSettings,
    masterVolume, bgmMuted, gridVisible, dockviewApi, setPendingEdit, clearAllEditing, setSelectedObjectIds,
  ]);

  return (
    <AdrasteaContext.Provider value={value}>
      <RoomDataContext.Provider value={roomDataValue}>
        <UIStateContext.Provider value={uiStateValue}>
          {children}
        </UIStateContext.Provider>
      </RoomDataContext.Provider>
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
