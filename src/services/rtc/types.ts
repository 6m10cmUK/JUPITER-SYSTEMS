import type {
  Piece,
  Room,
  ChatMessage,
  Scene,
  Character,
  BoardObject,
  ScenarioText,
  Cutin,
  BgmTrack,
} from '../../types/adrastea.types';

// ---------------------------------------------------------------------------
// RoomSnapshot (full state)
// ---------------------------------------------------------------------------

export interface RoomSnapshot {
  room: Room;
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
// P2P message protocol
// ---------------------------------------------------------------------------

export type CollectionName =
  | 'pieces'
  | 'objects'
  | 'scenes'
  | 'characters'
  | 'bgms'
  | 'cutins'
  | 'scenarioTexts';

export type PatchOp = 'add' | 'update' | 'remove';

/** Full state sync (host → guest on connect) */
export interface FullSyncMessage {
  type: 'full_sync';
  data: RoomSnapshot;
}

/** Incremental update */
export interface PatchMessage {
  type: 'patch';
  collection: CollectionName;
  op: PatchOp;
  id: string;
  data?: Record<string, unknown>;
}

/** Room-level update (active_scene_id, dice_system, etc.) */
export interface RoomUpdateMessage {
  type: 'room_update';
  data: Partial<Room>;
}

/** Chat message */
export interface ChatP2PMessage {
  type: 'message';
  data: ChatMessage;
}

/** Cursor / drag position (unreliable channel) */
export interface CursorMessage {
  type: 'cursor';
  data: { userId: string; x: number; y: number };
}

export interface DragMessage {
  type: 'drag';
  data: { userId: string; targetId: string; x: number; y: number };
}

/** Chunk transfer for large payloads */
export interface ChunkMessage {
  type: 'chunk';
  id: string;
  index: number;
  total: number;
  data: string;
}

/** Request full sync (guest → host) */
export interface SyncRequestMessage {
  type: 'sync_request';
}

/** Host election notification */
export interface HostElectionMessage {
  type: 'host_election';
  hostPeerId: string | null;
  timestamp: number;
}

/** Host heartbeat (to prevent timeout) */
export interface HostHeartbeatMessage {
  type: 'host_heartbeat';
  timestamp: number;
}

/** Signed message wrapper (for host verification) */
export interface SignedMessage {
  type: 'signed';
  signature: string;
  signerPeerId: string;
  inner: P2PMessage;
}

export type P2PMessage =
  | FullSyncMessage
  | PatchMessage
  | RoomUpdateMessage
  | ChatP2PMessage
  | CursorMessage
  | DragMessage
  | ChunkMessage
  | SyncRequestMessage
  | HostElectionMessage
  | HostHeartbeatMessage
  | SignedMessage;

// ---------------------------------------------------------------------------
// Connection state
// ---------------------------------------------------------------------------

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// ---------------------------------------------------------------------------
// Signaling types
// ---------------------------------------------------------------------------

export interface SignalingPeer {
  peerId: string;
  isHost: boolean;
  timestamp: number;
  joinedAt: number;
  publicKey: string;
  isElected?: boolean;
}

export interface HostStatus {
  hostPeerId: string | null;
  timestamp: number | null;
}
