import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { DockviewApi } from 'dockview-react';
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
  editingObjectScope: BoardObjectScope;
  setEditingObjectScope: React.Dispatch<React.SetStateAction<BoardObjectScope>>;
  showRoomSettings: boolean;
  setShowRoomSettings: React.Dispatch<React.SetStateAction<boolean>>;
  showProfileEdit: boolean;
  setShowProfileEdit: React.Dispatch<React.SetStateAction<boolean>>;

  // --- Derived values ---
  activeScene: Scene | null;
  boardBackgroundUrl: string | null;
  boardForegroundUrl: string | null;
  boardForegroundOpacity: number;

  // --- Auth ---
  profile: UserProfile | null;
  user: User | null;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Pick<UserProfile, 'display_name' | 'avatar_url'>>) => Promise<void>;

  // --- Shortcut callbacks ---
  onAddObject: (scope?: BoardObjectScope) => void;

  // --- Dockview API ---
  dockviewApi: DockviewApi | null;
  setDockviewApi: React.Dispatch<React.SetStateAction<DockviewApi | null>>;
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
    roomObjects, sceneObjects, mergedObjects,
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
  const [editingObjectScope, setEditingObjectScope] = useState<BoardObjectScope>('scene');
  const [editingCutin, setEditingCutin] = useState<Cutin | null | undefined>(undefined);

  // --- Dockview API ---
  const [dockviewApi, setDockviewApi] = useState<DockviewApi | null>(null);

  // --- Derived values ---
  const activeScene = useMemo(() => {
    if (!room?.active_scene_id) return null;
    return scenes.find((s) => s.id === room.active_scene_id) ?? null;
  }, [room?.active_scene_id, scenes]);

  const boardBackgroundUrl = activeScene?.background_url ?? room?.background_url ?? null;
  const boardForegroundUrl = activeScene?.foreground_url ?? room?.foreground_url ?? null;
  const boardForegroundOpacity = activeScene?.foreground_opacity ?? 0.5;

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
      scenes, addScene, updateScene, removeScene, activateScene,

      // useCharacters
      characters, addCharacter, updateCharacter, removeCharacter,

      // useObjects
      roomObjects, sceneObjects, mergedObjects,
      addObject, updateObject, removeObject, reorderObjects,

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
      editingObjectScope, setEditingObjectScope,
      showRoomSettings, setShowRoomSettings,
      showProfileEdit, setShowProfileEdit,

      // Derived
      activeScene, boardBackgroundUrl, boardForegroundUrl, boardForegroundOpacity,

      // Auth
      profile, user, signOut, updateProfile,

      // Shortcut callbacks
      onAddObject,

      // Dockview
      dockviewApi, setDockviewApi,
    }),
    [
      roomId,
      pieces, room, movePiece, addPiece, removePiece, updatePiece, updateRoom,
      messages, chatLoading, hasMore, sendMessage, loadMore, handleSendMessage,
      scenes, addScene, updateScene, removeScene, activateScene,
      characters, addCharacter, updateCharacter, removeCharacter,
      roomObjects, sceneObjects, mergedObjects,
      addObject, updateObject, removeObject, reorderObjects,
      scenarioTexts, addScenarioText, updateScenarioText, removeScenarioText,
      cutins, addCutin, updateCutin, removeCutin, triggerCutin, clearCutin,
      editingScene, editingCharacter, editingCutin,
      editingPieceId, editingObjectId, editingObjectScope,
      showRoomSettings, showProfileEdit,
      activeScene, boardBackgroundUrl, boardForegroundUrl, boardForegroundOpacity,
      profile, user, signOut, updateProfile,
      onAddObject,
      dockviewApi,
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
