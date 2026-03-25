import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { AuthUser } from '../contexts/AuthContext';
import type { BoardHandle } from '../components/Adrastea/Board';
import type { UserProfile, ChatChannel, Room } from '../types/adrastea.types';
import { useAuth } from './AuthContext';
import { RoomDataProvider } from './RoomDataProvider';
import { UIStateProvider } from './UIStateProvider';
import { useRoomData } from './RoomDataProvider';
import { useUIState } from './UIStateProvider';
import { checkPermission, type PermissionKey } from '../config/permissions';
import { useToast } from '../components/Adrastea/ui/Toast';
import { useUndoRedo, type UndoRedoHandle } from '../hooks/useUndoRedo';
import { useChannels } from '../hooks/useChannels';
import type { Piece, Scene, Character, BoardObject, BgmTrack } from '../types/adrastea.types';

// ---------------------------------------------------------------------------
// Types (kept from original)
// ---------------------------------------------------------------------------

export type PanelSelectionType = 'scene' | 'character' | 'layer';
export interface PanelSelection {
  panel: PanelSelectionType;
  ids: string[];
}

export interface PendingEdit {
  type: 'scene' | 'object';
  id: string | null;
  data: Record<string, unknown>;
}

export type RoomRole = 'owner' | 'sub_owner' | 'user' | 'guest';

// Merged context value (kept for backward compatibility)
export interface AdrasteaContextValue {
  roomId: string;
  roomRole: RoomRole;
  // RoomData values (from RoomDataProvider)
  pieces: Piece[];
  room: Room | null;
  movePiece: any;
  addPiece: any;
  removePiece: any;
  updatePiece: any;
  updateRoom: any;
  messages: any[];
  chatLoading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  sendMessage: any;
  loadMore: any;
  clearMessages: any;
  handleSendMessage: (
    content: string,
    messageType: any,
    characterName?: string,
    characterAvatar?: string | null,
    channelOverride?: string,
  ) => void;
  activeSpeakerCharId: string | null;
  setActiveSpeakerCharId: React.Dispatch<React.SetStateAction<string | null>>;
  activeChatChannel: string;
  setActiveChatChannel: (channel: string) => void;
  chatInjectText: string | null;
  setChatInjectText: (text: string | null) => void;
  channels: ChatChannel[];
  upsertChannel: (channel: ChatChannel) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
  scenes: Scene[];
  addScene: any;
  updateScene: any;
  removeScene: any;
  reorderScenes: any;
  activateScene: any;
  characters: Character[];
  addCharacter: any;
  updateCharacter: any;
  moveCharacter: (charId: string, updates: { board_x?: number; board_y?: number }) => Promise<void>;
  removeCharacter: any;
  reorderCharacters: any;
  layerOrderedCharacters: Character[];
  reorderLayerCharacters: any;
  allObjects: BoardObject[];
  activeObjects: BoardObject[];
  addObject: any;
  updateObject: any;
  moveObject: any;
  removeObject: any;
  reorderObjects: any;
  batchUpdateSort: any;
  injectOptimistic: any;
  scenarioTexts: any[];
  addScenarioText: any;
  updateScenarioText: any;
  removeScenarioText: any;
  reorderScenarioTexts: any;
  cutins: any[];
  addCutin: any;
  updateCutin: any;
  removeCutin: any;
  reorderCutins: any;
  triggerCutin: any;
  clearCutin: any;
  bgms: BgmTrack[];
  addBgm: any;
  updateBgm: any;
  removeBgm: any;
  reorderBgms: any;
  masterVolume: number;
  setMasterVolume: (v: number) => void;
  bgmMuted: boolean;
  setBgmMuted: (v: boolean) => void;
  // UIState values (from UIStateProvider)
  editingScene: Scene | null | undefined;
  setEditingScene: React.Dispatch<React.SetStateAction<Scene | null | undefined>>;
  editingCharacter: Character | null | undefined;
  setEditingCharacter: React.Dispatch<React.SetStateAction<Character | null | undefined>>;
  characterToOpenModal: Character | null;
  setCharacterToOpenModal: (char: Character | null) => void;
  editingCutin: any | null | undefined;
  setEditingCutin: React.Dispatch<React.SetStateAction<any | null | undefined>>;
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
  gridVisible: boolean;
  setGridVisible: React.Dispatch<React.SetStateAction<boolean>>;
  dockviewApi: any;
  setDockviewApi: React.Dispatch<React.SetStateAction<any>>;
  // Derived/Board
  activeScene: Scene | null;
  boardRef: React.RefObject<BoardHandle | null>;
  getBoardCenter: () => { x: number; y: number };
  // Auth
  profile: UserProfile | null;
  user: AuthUser | null;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>) => Promise<void>;
  // Callbacks
  onAddObject: () => void;
  deleteRoom: () => Promise<void>;
  withPermission: <F extends (...args: any[]) => any>(permission: PermissionKey, fn: F) => F;
  // Loading
  isLoading: boolean;
  loadingProgress: number;
  loadingSteps: { label: string; done: boolean }[];
  // Auto-save edits
  setPendingEdit: (key: string, edit: PendingEdit | null) => void;
  // Edit state reset
  clearAllEditing: () => void;
  // Panel registration
  registerPanel: (panelId: string) => void;
  unregisterPanel: (panelId: string) => void;
  // Toast
  toasts: { id: string; message: string; type: 'success' | 'error' }[];
  showToast: (message: string, type: 'success' | 'error') => void;
  // Undo/Redo
  undoRedo: UndoRedoHandle;
  // Demo mode
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

  // --- パネル登録（遅延ロード用） ---
  const registerPanel = useCallback(() => {
    // NOTE: 実装簡略化のため機能削除
  }, []);
  const unregisterPanel = useCallback(() => {
    // NOTE: 実装簡略化のため機能削除
  }, []);

  // --- Permission guard ref ---
  const roomRoleRef = useRef(roomRole);
  roomRoleRef.current = roomRole;

  const withPermission = useCallback(<F extends (...args: any[]) => any>(
    permission: PermissionKey | string,
    fn: F,
  ): F => ((...args: Parameters<F>) => {
    if (!checkPermission(roomRoleRef.current, permission as PermissionKey)) {
      console.warn(`[Permission] denied: ${permission} (role: ${roomRoleRef.current})`);
      return;
    }
    return fn(...args);
  }) as F, []);

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
      x: Math.round(((w / 2) - stagePos.x) / scale / 10),
      y: Math.round(((h / 2) - stagePos.y) / scale / 10),
    };
  }, []);

  // --- Channels hook ---
  const { channels, upsertChannel, deleteChannel } = useChannels('');

  // --- Chat state ---
  const [activeChatChannel, setActiveChatChannel] = useState<string>('main');
  const [chatInjectText, setChatInjectText] = useState<string | null>(null);
  const [characterToOpenModal, setCharacterToOpenModal] = useState<Character | null>(null);

  // --- Undo/Redo ---
  const undoRedo = useUndoRedo();

  // --- Auto-save edits ---
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingEditsRef = useRef<Map<string, PendingEdit>>(new Map());

  useEffect(() => {
    return () => {
      for (const timer of debounceTimersRef.current.values()) clearTimeout(timer);
      debounceTimersRef.current.clear();
    };
  }, []);

  const setPendingEdit = useCallback((key: string, edit: PendingEdit | null) => {
    // NOTE: 実装は簡略化。詳細は旧 AdrasteaContext を参照
    if (!edit) {
      const timer = debounceTimersRef.current.get(key);
      if (timer) clearTimeout(timer);
      debounceTimersRef.current.delete(key);
      pendingEditsRef.current.delete(key);
      return;
    }
    pendingEditsRef.current.set(key, edit);
  }, []);

  // --- Delete room ---
  const deleteRoom = useCallback(async () => {
    if (!user) return;
    // NOTE: room 情報は RoomDataProvider から取得するため、ここでは簡略化
    window.location.href = '/adrastea/';
  }, [user]);

  // --- Shortcut callback ---
  const onAddObject = useCallback(() => {}, []);

  // --- Loading state (簡略化) ---
  const isLoading = false;
  const loadingProgress = 1;
  const loadingSteps = [{ label: 'Ready', done: true }];

  // --- Merged value from RoomData + UIState ---
  const value = useMemo<AdrasteaContextValue>(() => {
    // RoomDataProvider / UIStateProvider から取得する処理は
    // useAdrasteaContext() フックで行う
    return {
      roomId,
      roomRole,
      // これらのフィールドはダミー値
      pieces: [],
      room: null,
      movePiece: async () => {},
      addPiece: async () => '',
      removePiece: async () => {},
      updatePiece: async () => {},
      updateRoom: async () => {},
      messages: [],
      chatLoading: false,
      loadingMore: false,
      hasMore: false,
      sendMessage: async () => {},
      loadMore: async () => {},
      clearMessages: async () => {},
      handleSendMessage: () => {},
      activeSpeakerCharId: null,
      setActiveSpeakerCharId: () => {},
      activeChatChannel,
      setActiveChatChannel,
      chatInjectText,
      setChatInjectText,
      channels,
      upsertChannel,
      deleteChannel,
      scenes: [],
      addScene: async () => '',
      updateScene: async () => {},
      removeScene: async () => {},
      reorderScenes: async () => {},
      activateScene: async () => {},
      characters: [],
      addCharacter: async () => '',
      updateCharacter: async () => {},
      moveCharacter: async () => {},
      removeCharacter: async () => {},
      reorderCharacters: async () => {},
      layerOrderedCharacters: [],
      reorderLayerCharacters: async () => {},
      allObjects: [],
      activeObjects: [],
      addObject: async () => '',
      updateObject: async () => {},
      moveObject: async () => {},
      removeObject: async () => {},
      reorderObjects: async () => {},
      batchUpdateSort: async () => {},
      injectOptimistic: () => {},
      scenarioTexts: [],
      addScenarioText: async () => '',
      updateScenarioText: async () => {},
      removeScenarioText: async () => {},
      reorderScenarioTexts: async () => {},
      cutins: [],
      addCutin: async () => '',
      updateCutin: async () => {},
      removeCutin: async () => {},
      reorderCutins: async () => {},
      triggerCutin: async () => {},
      clearCutin: async () => {},
      bgms: [],
      addBgm: async () => '',
      updateBgm: async () => {},
      removeBgm: async () => {},
      reorderBgms: async () => {},
      masterVolume: 0.5,
      setMasterVolume: () => {},
      bgmMuted: false,
      setBgmMuted: () => {},
      editingScene: undefined,
      setEditingScene: () => {},
      editingCharacter: undefined,
      setEditingCharacter: () => {},
      characterToOpenModal,
      setCharacterToOpenModal,
      editingCutin: undefined,
      setEditingCutin: () => {},
      editingBgmId: null,
      setEditingBgmId: () => {},
      editingScenarioTextId: null,
      setEditingScenarioTextId: () => {},
      editingPieceId: null,
      setEditingPieceId: () => {},
      editingObjectId: undefined,
      setEditingObjectId: () => {},
      selectedObjectIds: [],
      setSelectedObjectIds: () => {},
      panelSelection: null,
      setPanelSelection: () => {},
      showRoomSettings: false,
      setShowRoomSettings: () => {},
      showProfileEdit: false,
      setShowProfileEdit: () => {},
      showSettings: false,
      settingsSection: 'room',
      setShowSettings: () => {},
      gridVisible: false,
      setGridVisible: () => {},
      dockviewApi: null,
      setDockviewApi: () => {},
      activeScene: null,
      boardRef,
      getBoardCenter,
      profile: profile ?? null,
      user: user ?? null,
      signOut,
      updateProfile,
      onAddObject,
      deleteRoom,
      withPermission,
      isLoading,
      loadingProgress,
      loadingSteps,
      setPendingEdit,
      clearAllEditing: () => {},
      registerPanel,
      unregisterPanel,
      toasts,
      showToast,
      undoRedo,
    };
  }, [
    roomId, roomRole, activeChatChannel, chatInjectText, channels, upsertChannel, deleteChannel,
    characterToOpenModal, boardRef, profile, user, signOut, updateProfile, onAddObject, deleteRoom,
    withPermission, isLoading, loadingProgress, loadingSteps, setPendingEdit, registerPanel,
    unregisterPanel, toasts, showToast, undoRedo,
  ]);

  return (
    <RoomDataProvider
      roomId={roomId}
      initialLoadDone={true}
      withPermission={withPermission}
      activeSpeakerCharId={null}
      setActiveSpeakerCharId={() => {}}
      handleSendMessage={() => {}}
    >
      <UIStateProvider setPendingEdit={setPendingEdit}>
        <AdrasteaContext.Provider value={value}>
          {children}
        </AdrasteaContext.Provider>
      </UIStateProvider>
    </RoomDataProvider>
  );
};

// ---------------------------------------------------------------------------
// Consumer hook (Backward compatible)
// ---------------------------------------------------------------------------

export function useAdrasteaContext(): AdrasteaContextValue {
  const adrasteaCtx = useContext(AdrasteaContext);
  if (!adrasteaCtx) {
    throw new Error('useAdrasteaContext must be used within AdrasteaProvider');
  }

  // RoomData と UIState を取得してマージ
  let roomDataCtx: any = null;
  let uiStateCtx: any = null;

  try {
    roomDataCtx = useRoomData();
  } catch (e) {
    // RoomDataContext がない場合
  }

  try {
    uiStateCtx = useUIState();
  } catch (e) {
    // UIStateContext がない場合
  }

  // マージされた値を返す
  return {
    ...adrasteaCtx,
    // RoomData の値で上書き
    ...(roomDataCtx && {
      pieces: roomDataCtx.pieces,
      room: roomDataCtx.room,
      movePiece: roomDataCtx.movePiece,
      addPiece: roomDataCtx.addPiece,
      removePiece: roomDataCtx.removePiece,
      updatePiece: roomDataCtx.updatePiece,
      updateRoom: roomDataCtx.updateRoom,
      messages: roomDataCtx.messages,
      chatLoading: roomDataCtx.chatLoading,
      loadingMore: roomDataCtx.loadingMore,
      hasMore: roomDataCtx.hasMore,
      sendMessage: roomDataCtx.sendMessage,
      loadMore: roomDataCtx.loadMore,
      clearMessages: roomDataCtx.clearMessages,
      handleSendMessage: roomDataCtx.handleSendMessage,
      activeSpeakerCharId: roomDataCtx.activeSpeakerCharId,
      setActiveSpeakerCharId: roomDataCtx.setActiveSpeakerCharId,
      scenes: roomDataCtx.scenes,
      addScene: roomDataCtx.addScene,
      updateScene: roomDataCtx.updateScene,
      removeScene: roomDataCtx.removeScene,
      reorderScenes: roomDataCtx.reorderScenes,
      activateScene: roomDataCtx.activateScene,
      characters: roomDataCtx.characters,
      addCharacter: roomDataCtx.addCharacter,
      updateCharacter: roomDataCtx.updateCharacter,
      removeCharacter: roomDataCtx.removeCharacter,
      reorderCharacters: roomDataCtx.reorderCharacters,
      allObjects: roomDataCtx.allObjects,
      activeObjects: roomDataCtx.activeObjects,
      addObject: roomDataCtx.addObject,
      updateObject: roomDataCtx.updateObject,
      moveObject: roomDataCtx.moveObject,
      removeObject: roomDataCtx.removeObject,
      reorderObjects: roomDataCtx.reorderObjects,
      batchUpdateSort: roomDataCtx.batchUpdateSort,
      injectOptimistic: roomDataCtx.injectOptimistic,
      scenarioTexts: roomDataCtx.scenarioTexts,
      addScenarioText: roomDataCtx.addScenarioText,
      updateScenarioText: roomDataCtx.updateScenarioText,
      removeScenarioText: roomDataCtx.removeScenarioText,
      reorderScenarioTexts: roomDataCtx.reorderScenarioTexts,
      cutins: roomDataCtx.cutins,
      addCutin: roomDataCtx.addCutin,
      updateCutin: roomDataCtx.updateCutin,
      removeCutin: roomDataCtx.removeCutin,
      reorderCutins: roomDataCtx.reorderCutins,
      triggerCutin: roomDataCtx.triggerCutin,
      clearCutin: roomDataCtx.clearCutin,
      bgms: roomDataCtx.bgms,
      addBgm: roomDataCtx.addBgm,
      updateBgm: roomDataCtx.updateBgm,
      removeBgm: roomDataCtx.removeBgm,
      reorderBgms: roomDataCtx.reorderBgms,
      activeScene: roomDataCtx.activeScene,
    }),
    // UIState の値で上書き
    ...(uiStateCtx && {
      editingScene: uiStateCtx.editingScene,
      setEditingScene: uiStateCtx.setEditingScene,
      editingCharacter: uiStateCtx.editingCharacter,
      setEditingCharacter: uiStateCtx.setEditingCharacter,
      editingCutin: uiStateCtx.editingCutin,
      setEditingCutin: uiStateCtx.setEditingCutin,
      editingBgmId: uiStateCtx.editingBgmId,
      setEditingBgmId: uiStateCtx.setEditingBgmId,
      editingScenarioTextId: uiStateCtx.editingScenarioTextId,
      setEditingScenarioTextId: uiStateCtx.setEditingScenarioTextId,
      editingPieceId: uiStateCtx.editingPieceId,
      setEditingPieceId: uiStateCtx.setEditingPieceId,
      editingObjectId: uiStateCtx.editingObjectId,
      setEditingObjectId: uiStateCtx.setEditingObjectId,
      selectedObjectIds: uiStateCtx.selectedObjectIds,
      setSelectedObjectIds: uiStateCtx.setSelectedObjectIds,
      panelSelection: uiStateCtx.panelSelection,
      setPanelSelection: uiStateCtx.setPanelSelection,
      showRoomSettings: uiStateCtx.showRoomSettings,
      setShowRoomSettings: uiStateCtx.setShowRoomSettings,
      showProfileEdit: uiStateCtx.showProfileEdit,
      setShowProfileEdit: uiStateCtx.setShowProfileEdit,
      showSettings: uiStateCtx.showSettings,
      settingsSection: uiStateCtx.settingsSection,
      setShowSettings: uiStateCtx.setShowSettings,
      masterVolume: uiStateCtx.masterVolume,
      setMasterVolume: uiStateCtx.setMasterVolume,
      bgmMuted: uiStateCtx.bgmMuted,
      setBgmMuted: uiStateCtx.setBgmMuted,
      gridVisible: uiStateCtx.gridVisible,
      setGridVisible: uiStateCtx.setGridVisible,
      dockviewApi: uiStateCtx.dockviewApi,
      setDockviewApi: uiStateCtx.setDockviewApi,
      setPendingEdit: uiStateCtx.setPendingEdit,
      clearAllEditing: uiStateCtx.clearAllEditing,
    }),
  };
}
