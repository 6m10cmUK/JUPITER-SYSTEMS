import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { AuthUser } from '../services/auth';
import type { DockviewApi } from 'dockview';
import type { BoardHandle } from '../components/Adrastea/Board';
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
} from '../types/adrastea.types';
import { useAdrastea } from '../hooks/useAdrastea';
import { useAdrasteaChat } from '../hooks/useAdrasteaChat';
import { useScenes } from '../hooks/useScenes';
import { useCharacters } from '../hooks/useCharacters';
import { useObjects } from '../hooks/useObjects';
import { useScenarioTexts } from '../hooks/useScenarioTexts';
import { useCutins } from '../hooks/useCutins';
import { useBgms } from '../hooks/useBgms';
import { preloadImageBlobs } from '../components/Adrastea/DomObjectOverlay';
import type { BgmTrack } from '../types/adrastea.types';
import { useAuth } from './AuthContext';
import { apiFetch, API_BASE_URL, getAccessToken } from '../config/api';

// ---------------------------------------------------------------------------
// Snapshot type
// ---------------------------------------------------------------------------

interface RoomSnapshot {
  room: { active_scene_id: string | null; active_cutin: any; foreground_url: string | null };
  scenes: Scene[];
  objects: BoardObject[];
  characters: Character[];
  bgms: BgmTrack[];
  cutins: Cutin[];
  scenarioTexts: ScenarioText[];
  pieces: Piece[];
  messages: ChatMessage[];
}

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
}

export type RoomRole = 'owner' | 'user' | 'guest';

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

  // --- useAdrasteaChat ---
  messages: ChatMessage[];
  chatLoading: boolean;
  hasMore: boolean;
  sendMessage: ReturnType<typeof useAdrasteaChat>['sendMessage'];
  loadMore: ReturnType<typeof useAdrasteaChat>['loadMore'];
  clearMessages: ReturnType<typeof useAdrasteaChat>['clearMessages'];
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
  reorderScenes: ReturnType<typeof useScenes>['reorderScenes'];
  activateScene: ReturnType<typeof useScenes>['activateScene'];

  // --- useCharacters ---
  characters: Character[];
  addCharacter: ReturnType<typeof useCharacters>['addCharacter'];
  updateCharacter: ReturnType<typeof useCharacters>['updateCharacter'];
  removeCharacter: ReturnType<typeof useCharacters>['removeCharacter'];
  reorderCharacters: ReturnType<typeof useCharacters>['reorderCharacters'];

  // --- useObjects ---
  allObjects: BoardObject[];
  activeObjects: BoardObject[];
  addObject: (data: Partial<BoardObject>) => Promise<string>;
  updateObject: (id: string, data: Partial<BoardObject>) => Promise<void>;
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
  editingCutin: Cutin | null | undefined;
  setEditingCutin: React.Dispatch<React.SetStateAction<Cutin | null | undefined>>;
  editingBgmId: string | null;
  setEditingBgmId: React.Dispatch<React.SetStateAction<string | null>>;
  editingPieceId: string | null;
  setEditingPieceId: React.Dispatch<React.SetStateAction<string | null>>;
  editingObjectId: string | null | undefined;
  setEditingObjectId: React.Dispatch<React.SetStateAction<string | null | undefined>>;
  selectedObjectIds: string[];
  setSelectedObjectIds: React.Dispatch<React.SetStateAction<string[]>>;
  showRoomSettings: boolean;
  setShowRoomSettings: React.Dispatch<React.SetStateAction<boolean>>;
  showProfileEdit: boolean;
  setShowProfileEdit: React.Dispatch<React.SetStateAction<boolean>>;

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
  const { user, profile, signOut, updateProfile } = useAuth();

  // --- スナップショット読み込み ---
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null | undefined>(undefined); // undefined=loading

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/rooms/${roomId}/snapshot`)
      .then(res => res.json())
      .then(result => {
        if (!cancelled) setSnapshot(result.data ?? null);
      })
      .catch(err => {
        console.error('スナップショット読み込み失敗:', err);
        if (!cancelled) setSnapshot(null); // 空で開始
      });
    return () => { cancelled = true; };
  }, [roomId]);

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
  } = useAdrastea(roomId, snapshot ? { room: snapshot.room as any, pieces: snapshot.pieces } : undefined);

  const {
    messages, loading: chatLoading, hasMore, sendMessage, loadMore, clearMessages,
  } = useAdrasteaChat(roomId, snapshot?.messages);

  // onRoomUpdate コールバック（useCutins → useAdrastea）
  const handleRoomUpdate = useCallback((updates: Record<string, unknown>) => {
    updateRoom(updates as Partial<Room>);
  }, [updateRoom]);

  const { scenes, loading: scenesLoading, addScene, updateScene, removeScene, reorderScenes, activateScene } = useScenes(roomId, snapshot?.scenes, handleObjectsCreated);
  const { characters, loading: charactersLoading, addCharacter, updateCharacter, removeCharacter, reorderCharacters } = useCharacters(roomId, snapshot?.characters);

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
  } = useObjects(roomId, effectiveSceneId, snapshot?.objects);

  // objectsCreatedRef に injectOptimistic を設定
  useEffect(() => {
    objectsCreatedRef.current = injectOptimistic;
  }, [injectOptimistic]);

  const scenarioTextsEnabled = activePanels.has('scenarioText');
  const cutinsEnabled = activePanels.has('cutin');
  const { scenarioTexts, loading: scenarioTextsLoading, addScenarioText, updateScenarioText, removeScenarioText, reorderScenarioTexts } = useScenarioTexts(roomId, scenarioTextsEnabled, snapshot?.scenarioTexts);
  const { cutins, loading: cutinsLoading, addCutin, updateCutin, removeCutin, reorderCutins, triggerCutin, clearCutin } = useCutins(roomId, cutinsEnabled, snapshot?.cutins, handleRoomUpdate);
  const { bgms, loading: bgmsLoading, addBgm, updateBgm, removeBgm, reorderBgms } = useBgms(roomId, snapshot?.bgms);

  // --- スナップショット保存 ---
  const snapshotLoading = snapshot === undefined;

  const buildSnapshot = useCallback((): RoomSnapshot => ({
    room: {
      active_scene_id: room?.active_scene_id ?? null,
      active_cutin: room?.active_cutin ?? null,
      foreground_url: room?.foreground_url ?? null,
    },
    scenes,
    objects: allObjects,
    characters,
    bgms,
    cutins,
    scenarioTexts,
    pieces,
    messages,
  }), [room, scenes, allObjects, characters, bgms, cutins, scenarioTexts, pieces, messages]);

  // 定期保存（30秒ごと、オーナーのみ）
  useEffect(() => {
    if (roomRole !== 'owner') return;
    const timer = setInterval(() => {
      const data = buildSnapshot();
      apiFetch(`/api/rooms/${roomId}/snapshot`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      }).catch(err => console.error('スナップショット保存失敗:', err));
    }, 30000);
    return () => clearInterval(timer);
  }, [roomId, roomRole, buildSnapshot]);

  // beforeunload 時の保存（オーナーのみ）
  const buildSnapshotRef = useRef(buildSnapshot);
  buildSnapshotRef.current = buildSnapshot;

  useEffect(() => {
    if (roomRole !== 'owner') return;
    const handleUnload = () => {
      const data = buildSnapshotRef.current();
      const token = getAccessToken();
      fetch(`${API_BASE_URL}/api/rooms/${roomId}/snapshot`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ data }),
        keepalive: true,
      }).catch(() => {});
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [roomId, roomRole]);

  // --- Loading steps ---
  const loadingSteps = useMemo(() => [
    { label: 'スナップショット', done: !snapshotLoading },
    { label: 'ルーム', done: !adrasteaLoading },
    { label: 'シーン', done: !scenesLoading },
    { label: 'キャラクター', done: !charactersLoading },
    { label: 'オブジェクト', done: !objectsLoading },
    { label: 'チャット', done: !chatLoading },
    { label: 'BGM', done: !bgmsLoading },
    { label: 'カットイン', done: !cutinsEnabled || !cutinsLoading },
    { label: 'シナリオテキスト', done: !scenarioTextsEnabled || !scenarioTextsLoading },
  ], [snapshotLoading, adrasteaLoading, scenesLoading, charactersLoading, objectsLoading, chatLoading, bgmsLoading, cutinsLoading, scenarioTextsLoading]);

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

  // 背景/前景はシーンごとに useScenes.ts の addScene で作成される

  // --- Image preload（スナップショット読み込み後に全画像を blobCache にプリロード） ---
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
    if (urls.length > 0) preloadImageBlobs(urls); // TODO: プリロードがアニメ継続を壊してないか確認
  }, [initialLoadDone, scenes, allObjects]);

  // --- UI state ---
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null | undefined>(undefined);
  const [editingCharacter, setEditingCharacter] = useState<Character | null | undefined>(undefined);
  const [editingObjectId, setEditingObjectId] = useState<string | null | undefined>(undefined);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [editingCutin, setEditingCutin] = useState<Cutin | null | undefined>(undefined);
  const [editingBgmId, setEditingBgmId] = useState<string | null>(null);

  // --- Board ref ---
  const boardRef = useRef<BoardHandle | null>(null);
  const getBoardCenter = useCallback(() => {
    return { x: 0, y: 0 };
  }, []);

  // --- Dockview ---
  const [dockviewApi, setDockviewApi] = useState<DockviewApi | null>(null);

  // --- Grid visibility ---
  const [gridVisible, setGridVisible] = useState(true);

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
            next.set(effectiveSceneId!, { ...existing, [sceneField]: (edit.data as any).image_url ?? null });
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
    debounceTimersRef.current.set(key, setTimeout(async () => {
      debounceTimersRef.current.delete(key);
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

  const safeActivateScene = useCallback(async (sceneId: string | null) => {
    // デバウンスタイマーをすべてクリア
    for (const timer of debounceTimersRef.current.values()) clearTimeout(timer);
    debounceTimersRef.current.clear();
    // 楽観的にシーンを即座に切り替え（Firestore 反映を待たない）
    setOptimisticSceneId(sceneId);
    setLocalSceneOverrides(new Map());
    setLocalObjectOverrides(new Map());
    // 編集状態をクリア
    setEditingPieceId(null);
    setEditingObjectId(undefined);
    setSelectedObjectIds([]);
    setEditingScene(undefined);
    setEditingCharacter(undefined);
    setEditingCutin(undefined);
    setEditingBgmId(null);
    // room.active_scene_id を更新（スナップショット保存に反映）
    updateRoom({ active_scene_id: sceneId } );
    // ローカルstateを更新
    activateScene(sceneId);
  }, [activateScene, updateRoom]);

  // updateObjectラッパー: 背景/前景のimage_url変更時にSceneも同期 + ローカルオーバーライドをクリア
  const syncedUpdateObject = useCallback(async (id: string, data: Partial<BoardObject>) => {
    // ローカルオーバーライドをクリア（Firestoreの値を優先させる）
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

  const clearAllEditing = useCallback(() => {
    setEditingPieceId(null);
    setEditingObjectId(undefined);
    setSelectedObjectIds([]);
    setEditingScene(undefined);
    setEditingCharacter(undefined);
    setEditingCutin(undefined);
    setEditingBgmId(null);
  }, []);

  const onAddObject = useCallback(() => {
    setEditingObjectId(null);
  }, []);

  // --- Context value ---
  const value = useMemo<AdrasteaContextValue>(
    () => ({
      roomId,
      roomRole,

      // useAdrastea
      pieces, room, movePiece, addPiece, removePiece, updatePiece, updateRoom,

      // useAdrasteaChat
      messages, chatLoading, hasMore, sendMessage, loadMore, clearMessages, handleSendMessage,

      // useScenes
      scenes: effectiveScenes, addScene, updateScene, removeScene, reorderScenes,
      activateScene: safeActivateScene,

      // useCharacters
      characters, addCharacter, updateCharacter, removeCharacter, reorderCharacters,

      // useObjects
      allObjects, activeObjects: effectiveActiveObjects,
      addObject, updateObject: syncedUpdateObject, removeObject, reorderObjects, batchUpdateSort, injectOptimistic,

      // useScenarioTexts
      scenarioTexts, addScenarioText, updateScenarioText, removeScenarioText, reorderScenarioTexts,

      // useCutins
      cutins, addCutin, updateCutin, removeCutin, reorderCutins, triggerCutin, clearCutin,

      // useBgms
      bgms, addBgm, updateBgm, removeBgm, reorderBgms,
      masterVolume, setMasterVolume, bgmMuted, setBgmMuted,

      // UI state
      editingScene, setEditingScene,
      editingCharacter, setEditingCharacter,
      editingCutin, setEditingCutin,
      editingBgmId, setEditingBgmId,
      editingPieceId, setEditingPieceId,
      editingObjectId, setEditingObjectId,
      selectedObjectIds, setSelectedObjectIds,
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
    }),
    [
      roomId, roomRole,
      pieces, room, movePiece, addPiece, removePiece, updatePiece, updateRoom,
      messages, chatLoading, hasMore, sendMessage, loadMore, clearMessages, handleSendMessage,
      effectiveScenes, addScene, updateScene, removeScene, reorderScenes, safeActivateScene,
      characters, addCharacter, updateCharacter, removeCharacter, reorderCharacters,
      allObjects, effectiveActiveObjects,
      addObject, syncedUpdateObject, removeObject, reorderObjects, batchUpdateSort, injectOptimistic,
      scenarioTexts, addScenarioText, updateScenarioText, removeScenarioText, reorderScenarioTexts,
      cutins, addCutin, updateCutin, removeCutin, reorderCutins, triggerCutin, clearCutin,
      bgms, addBgm, updateBgm, removeBgm, reorderBgms,
      masterVolume, setMasterVolume, bgmMuted, setBgmMuted,
      editingScene, editingCharacter, editingCutin, editingBgmId,
      editingPieceId, editingObjectId, selectedObjectIds,
      showRoomSettings, showProfileEdit,
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
