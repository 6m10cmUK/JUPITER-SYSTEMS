import React, { useState, useCallback, useRef } from 'react';
import { AdrasteaContext } from './AdrasteaContext';
import type { AdrasteaContextValue, RoomRole, PanelSelection, PendingEdit } from './AdrasteaContext';
import { useMockAdrasteaState } from '../hooks/useMockAdrasteaState';
import type { DockviewApi } from 'dockview';
import type { BoardHandle } from '../components/Adrastea/Board';
import { useToast } from '../components/Adrastea/ui/Toast';

const DEMO_USER = {
  uid: 'demo-user',
  displayName: 'デモユーザー',
  avatarUrl: null,
};

const DEMO_PROFILE = {
  uid: 'demo-user',
  display_name: 'デモユーザー',
  avatar_url: null,
  created_at: Date.now(),
  updated_at: Date.now(),
};

interface MockAdrasteaProviderProps {
  children: React.ReactNode;
  roomId?: string;
}

export const MockAdrasteaProvider: React.FC<MockAdrasteaProviderProps> = ({
  children,
  roomId = 'demo-room-001',
}) => {
  const mock = useMockAdrasteaState();
  const { toasts, showToast } = useToast();

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
  const [activeSpeakerCharId, setActiveSpeakerCharId] = useState<string | null>(null);
  const [activeChatChannel, setActiveChatChannel] = useState('main');
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
    mock.addObject({
      type: 'panel',
      name: '新規panel',
      x: center.x,
      y: center.y,
      width: 4,
      height: 4,
      scene_ids: mock.activeScene ? [mock.activeScene.id] : [],
    });
  }, [mock, getBoardCenter]);

  const handleSendMessage = useCallback(
    (
      content: string,
      _messageType: string,
      _characterName?: string,
      _characterAvatar?: string | null,
    ) => {
      mock.sendMessage({
        content,
        character_id: activeSpeakerCharId ?? undefined,
        channel: activeChatChannel,
        message_type: activeSpeakerCharId ? 'chat' : 'chat',
      });
    },
    [mock, activeSpeakerCharId, activeChatChannel],
  );

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

  const value = {
    roomId,
    roomRole: 'owner' as RoomRole,

    // Data from useMockAdrasteaState
    pieces: mock.pieces,
    room: mock.room,
    scenes: mock.scenes,
    characters: mock.characters,
    layerOrderedCharacters: mock.layerOrderedCharacters,
    allObjects: mock.allObjects,
    activeObjects: mock.activeObjects,
    activeScene: mock.activeScene,
    bgms: mock.bgms,
    cutins: mock.cutins,
    scenarioTexts: mock.scenarioTexts,
    messages: mock.messages,
    chatLoading: false,
    loadingMore: false,
    hasMore: false,
    channels: [{ id: 'main', name: 'メイン', room_id: roomId }],

    // Mutations from useMockAdrasteaState
    addScene: mock.addScene,
    updateScene: mock.updateScene,
    removeScene: mock.removeScene,
    reorderScenes: mock.reorderScenes,
    activateScene: mock.activateScene,
    addObject: mock.addObject,
    updateObject: mock.updateObject,
    moveObject: mock.moveObject,
    removeObject: mock.removeObject,
    reorderObjects: mock.reorderObjects,
    batchUpdateSort: mock.batchUpdateSort,
    injectOptimistic: mock.injectOptimistic,
    addCharacter: mock.addCharacter,
    updateCharacter: mock.updateCharacter,
    moveCharacter: mock.moveCharacter,
    removeCharacter: mock.removeCharacter,
    reorderCharacters: mock.reorderCharacters,
    reorderLayerCharacters: mock.reorderLayerCharacters,
    addBgm: mock.addBgm,
    updateBgm: mock.updateBgm,
    removeBgm: mock.removeBgm,
    reorderBgms: mock.reorderBgms,
    addCutin: mock.addCutin,
    updateCutin: mock.updateCutin,
    removeCutin: mock.removeCutin,
    reorderCutins: mock.reorderCutins,
    triggerCutin: mock.triggerCutin,
    clearCutin: mock.clearCutin,
    sendMessage: mock.sendMessage,
    loadMore: mock.loadMore,
    clearMessages: mock.clearMessages,
    handleSendMessage,
    addScenarioText: mock.addScenarioText,
    updateScenarioText: mock.updateScenarioText,
    removeScenarioText: mock.removeScenarioText,
    reorderScenarioTexts: mock.reorderScenarioTexts,
    movePiece: mock.movePiece,
    addPiece: mock.addPiece,
    removePiece: mock.removePiece,
    updatePiece: mock.updatePiece,
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

    // Toast (required by AdrasteaContextValue)
    toasts,
    showToast,
  } as unknown as AdrasteaContextValue;

  return <AdrasteaContext.Provider value={value}>{children}</AdrasteaContext.Provider>;
};
