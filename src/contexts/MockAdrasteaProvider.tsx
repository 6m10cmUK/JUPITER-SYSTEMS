import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { AdrasteaContext } from './AdrasteaContext';
import type { AdrasteaContextValue, RoomRole, PanelSelection, PendingEdit } from './AdrasteaContext';
import { useMockAdrasteaState } from '../hooks/useMockAdrasteaState';
import { useScenes } from '../hooks/useScenes';
import { useObjects } from '../hooks/useObjects';
import { useCharacters } from '../hooks/useCharacters';
import { useBgms } from '../hooks/useBgms';
import { useCutins } from '../hooks/useCutins';
import { useAdrasteaChat } from '../hooks/useAdrasteaChat';
import type { DockviewApi } from 'dockview';
import type { BoardHandle } from '../components/Adrastea/Board';
import type { Room } from '../types/adrastea.types';
import { useToast } from '../components/Adrastea/ui/Toast';

const DEMO_ROOM_ID = 'demo-room-001';

const DEMO_PROFILE = {
  uid: 'demo-user',
  display_name: 'デモユーザー',
  avatar_url: null,
  created_at: Date.now(),
  updated_at: Date.now(),
};

const DEMO_USER = {
  uid: 'demo-user',
  displayName: 'デモユーザー',
  avatarUrl: null,
};

interface MockAdrasteaProviderProps {
  children: React.ReactNode;
  roomId?: string;
}

export const MockAdrasteaProvider: React.FC<MockAdrasteaProviderProps> = ({
  children,
  roomId = DEMO_ROOM_ID,
}) => {
  const mock = useMockAdrasteaState();
  const { toasts, showToast } = useToast();

  // activeSceneId は room.active_scene_id から決定
  const activeSceneId = mock.room?.active_scene_id ?? null;

  // handleRoomUpdate (useCutins の onRoomUpdate コールバック)
  const handleRoomUpdate = useCallback((updates: Record<string, unknown>) => {
    mock.updateRoom(updates as Partial<Room>);
  }, [mock]);

  // 各 hook を inject 付きで呼ぶ
  const {
    scenes,
    addScene, updateScene, removeScene, reorderScenes,
  } = useScenes(roomId, { inject: mock.scenesInject });

  const {
    allObjects, activeObjects,
    addObject, updateObject, removeObject, reorderObjects, batchUpdateSort, injectOptimistic,
  } = useObjects(roomId, activeSceneId, { inject: mock.objectsInject });

  const {
    characters, layerOrderedCharacters,
    addCharacter, updateCharacter, moveCharacter, removeCharacter, reorderCharacters, reorderLayerCharacters,
  } = useCharacters(roomId, { inject: mock.charactersInject });

  const {
    bgms, addBgm, updateBgm, removeBgm, reorderBgms,
  } = useBgms(roomId, { inject: mock.bgmsInject });

  const {
    cutins, addCutin, updateCutin, removeCutin, reorderCutins, triggerCutin, clearCutin,
  } = useCutins(roomId, true, handleRoomUpdate, { inject: mock.cutinsInject });

  const {
    messages, sendMessage, loadMore, clearMessages,
  } = useAdrasteaChat(roomId, { inject: mock.chatInject });

  // activeScene
  const activeScene = useMemo(
    () => scenes.find(s => s.id === activeSceneId) ?? null,
    [scenes, activeSceneId]
  );

  // activateScene: room.active_scene_id を更新
  const activateScene = useCallback(async (sceneId: string | null) => {
    mock.updateRoom({ active_scene_id: sceneId ?? undefined });
  }, [mock]);

  // 初回マウント時にデフォルトシーン「メイン」を作成（本番の addRoom と同じ挙動）
  useEffect(() => {
    if (scenes.length > 0) return; // 既にシーンがあればスキップ
    addScene({ name: 'メイン' }).then(({ scene }) => {
      activateScene(scene.id);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // moveObject: updateObject を代用
  const moveObject = updateObject;

  // handleSendMessage
  const [activeSpeakerCharId, setActiveSpeakerCharId] = useState<string | null>(null);
  const [activeChatChannel, setActiveChatChannel] = useState('main');

  const handleSendMessage = useCallback(
    (
      content: string,
      _messageType: string,
      characterName?: string,
      characterAvatar?: string | null,
    ) => {
      const senderName = characterName ?? 'デモユーザー';
      sendMessage(senderName, content, 'chat', 'demo-user', characterAvatar ?? null, undefined, activeChatChannel);
    },
    [sendMessage, activeChatChannel],
  );

  // UI State
  const [editingScene, setEditingScene] = useState<any>(undefined);
  const [editingCharacter, setEditingCharacter] = useState<any>(undefined);
  const [characterToOpenModal, setCharacterToOpenModal] = useState<any>(null);
  const [editingCutin, setEditingCutin] = useState<any>(undefined);
  const [editingBgmId, setEditingBgmId] = useState<string | null>(null);
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null);
  const [editingObjectId, setEditingObjectId] = useState<string | null | undefined>(undefined);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [panelSelection, setPanelSelection] = useState<PanelSelection | null>(null);
  const [showSettings, setShowSettingsState] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'room' | 'layout' | 'user'>('room');
  const [gridVisible, setGridVisible] = useState(true);
  const [dockviewApi, setDockviewApi] = useState<DockviewApi | null>(null);
  const [masterVolume, setMasterVolume] = useState(0.5);
  const [bgmMuted, setBgmMuted] = useState(false);
  const [chatInjectText, setChatInjectText] = useState<string | null>(null);

  const boardRef = useRef<BoardHandle | null>(null);

  const clearAllEditing = useCallback(() => {
    setEditingScene(undefined);
    setEditingCharacter(undefined);
    setEditingCutin(undefined);
    setEditingBgmId(null);
    setEditingPieceId(null);
    setEditingObjectId(undefined);
    setSelectedObjectIds([]);
    setPanelSelection(null);
  }, []);

  const handleSetShowSettings = useCallback((show: boolean, section?: 'room' | 'layout' | 'user') => {
    setShowSettingsState(show);
    if (section) setSettingsSection(section);
  }, []);

  const getBoardCenter = useCallback(() => ({ x: 15, y: 15 }), []);

  const onAddObject = useCallback(() => {
    const center = getBoardCenter();
    addObject({
      type: 'panel',
      name: '新規panel',
      x: center.x,
      y: center.y,
      width: 4,
      height: 4,
      scene_ids: activeScene ? [activeScene.id] : [],
    });
  }, [addObject, getBoardCenter, activeScene]);

  const registerPanel = useCallback(() => {}, []);
  const unregisterPanel = useCallback(() => {}, []);

  const pendingEditsRef = useRef<Map<string, PendingEdit>>(new Map());
  const setPendingEdit = useCallback((key: string, edit: PendingEdit | null) => {
    if (edit === null) {
      pendingEditsRef.current.delete(key);
    } else {
      pendingEditsRef.current.set(key, edit);
    }
  }, []);

  // addPiece wrapper (AdrasteaContextValue の signature に合わせる)
  const addPiece = useCallback(
    (label: string, color: string, x: number, y: number) => {
      return mock.addPiece(label, color, x, y);
    },
    [mock]
  );

  const value = {
    roomId,
    roomRole: 'owner' as RoomRole,

    // Data
    pieces: mock.pieces,
    room: mock.room,
    scenes,
    characters,
    layerOrderedCharacters,
    allObjects,
    activeObjects,
    activeScene,
    bgms,
    cutins,
    scenarioTexts: mock.scenarioTexts,
    messages,
    chatLoading: false,
    loadingMore: false,
    hasMore: false,
    channels: [{ id: 'main', name: 'メイン', room_id: roomId }],

    // Mutations: Scene
    addScene, updateScene, removeScene, reorderScenes, activateScene,

    // Mutations: Object
    addObject, updateObject, moveObject, removeObject, reorderObjects, batchUpdateSort, injectOptimistic,

    // Mutations: Character
    addCharacter, updateCharacter, moveCharacter, removeCharacter, reorderCharacters, reorderLayerCharacters,

    // Mutations: BGM
    addBgm, updateBgm, removeBgm, reorderBgms,

    // Mutations: Cutin
    addCutin, updateCutin, removeCutin, reorderCutins, triggerCutin, clearCutin,

    // Mutations: Message
    sendMessage, loadMore, clearMessages, handleSendMessage,

    // Mutations: ScenarioText
    addScenarioText: mock.addScenarioText,
    updateScenarioText: mock.updateScenarioText,
    removeScenarioText: mock.removeScenarioText,
    reorderScenarioTexts: mock.reorderScenarioTexts,

    // Mutations: Piece
    movePiece: mock.movePiece,
    addPiece,
    removePiece: mock.removePiece,
    updatePiece: mock.updatePiece,

    // Mutations: Room
    updateRoom: mock.updateRoom,
    deleteRoom: async () => {},
    upsertChannel: async () => {},
    deleteChannel: async () => {},

    // UI State
    activeSpeakerCharId,
    setActiveSpeakerCharId,
    activeChatChannel,
    setActiveChatChannel,
    chatInjectText,
    setChatInjectText,
    editingScene,
    setEditingScene,
    editingCharacter,
    setEditingCharacter,
    characterToOpenModal,
    setCharacterToOpenModal,
    editingCutin,
    setEditingCutin,
    editingBgmId,
    setEditingBgmId,
    editingPieceId,
    setEditingPieceId,
    editingObjectId,
    setEditingObjectId,
    selectedObjectIds,
    setSelectedObjectIds,
    panelSelection,
    setPanelSelection,
    showRoomSettings: false,
    setShowRoomSettings: () => {},
    showProfileEdit: false,
    setShowProfileEdit: () => {},
    showSettings,
    settingsSection,
    setShowSettings: handleSetShowSettings,
    masterVolume,
    setMasterVolume,
    bgmMuted,
    setBgmMuted,
    gridVisible,
    setGridVisible,
    dockviewApi,
    setDockviewApi,

    // Auth
    profile: DEMO_PROFILE,
    user: DEMO_USER,
    signOut: async () => {},
    updateProfile: async () => {},

    // Derived
    boardRef,
    getBoardCenter,
    onAddObject,
    clearAllEditing,
    setPendingEdit,
    registerPanel,
    unregisterPanel,

    // Loading
    isLoading: false,
    loadingProgress: 1,
    loadingSteps: [],

    // Toast
    toasts,
    showToast,

    // Demo mode
    isDemo: true,
  } as unknown as AdrasteaContextValue;

  return <AdrasteaContext.Provider value={value}>{children}</AdrasteaContext.Provider>;
};
