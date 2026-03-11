import { SignalingClient } from './SignalingClient';
import { PeerManager } from './PeerManager';
import type {
  P2PMessage,
  RoomSnapshot,
  ConnectionState,
  CollectionName,
  PatchOp,
  PatchMessage,
  ChatP2PMessage,
  RoomUpdateMessage,
  SignedMessage,
} from './types';
import type { Room, ChatMessage } from '../../types/adrastea.types';

export interface RoomSyncCallbacks {
  onFullSync?: (snapshot: RoomSnapshot) => void;
  onPatch?: (collection: CollectionName, op: PatchOp, id: string, data?: Record<string, unknown>) => void;
  onRoomUpdate?: (data: Partial<Room>) => void;
  onChatMessage?: (msg: ChatMessage) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
}

/**
 * RoomSync — フルメッシュ P2P データ同期の統合レイヤー
 *
 * 全ピアが平等に接続。各ピアが同じ操作を受信し、Last-Write-Wins で競合を解決。
 * - 操作時: patch/room_update をブロードキャスト
 * - 受信時: timestamp を比較して適用判定
 * - 接続時: 全員が sync_request を送信し、全員が応答できる
 */
export class RoomSync {
  private peerManager: PeerManager;
  private signaling: SignalingClient;
  private peerId: string;
  private getSnapshot: () => RoomSnapshot | null;

  // Callbacks to update React state
  private callbacks: RoomSyncCallbacks = {};

  // Last-Write-Wins: 最後に適用したタイムスタンプ
  // key: `${collection}:${id}`
  private lastAppliedTimestamps = new Map<string, number>();

  constructor(
    roomId: string,
    userId: string,
    getSnapshot: () => RoomSnapshot | null,
    _privateKey?: CryptoKey,
  ) {
    this.getSnapshot = getSnapshot;

    // タブごとにランダムなIDを生成
    let tabId = sessionStorage.getItem('adrastea_tab_id');
    if (!tabId) {
      tabId = Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem('adrastea_tab_id', tabId);
    }
    this.peerId = `${userId}_${tabId}`;

    this.signaling = new SignalingClient(roomId, this.peerId);
    this.peerManager = new PeerManager(
      this.signaling,
      this.peerId,
      this.handleMessage.bind(this),
      this.handleStateChange.bind(this),
    );
  }

  // --- Callbacks registration ---

  setCallbacks(cbs: RoomSyncCallbacks): void {
    this.callbacks = cbs;
  }

  // --- Lifecycle ---

  async start(): Promise<void> {
    const joinedAt = Date.now();
    await this.peerManager.startAsCandidate(joinedAt);
  }

  destroy(): void {
    this.peerManager.destroy();
  }

  // --- Outbound: send changes to peers ---

  /** コレクション操作をブロードキャスト */
  async sendPatch(collection: CollectionName, op: PatchOp, id: string, data?: Record<string, unknown>): Promise<void> {
    const msg: PatchMessage = {
      type: 'patch',
      collection,
      op,
      id,
      data,
      timestamp: Date.now(),
    };
    this.peerManager.broadcast(msg);
  }

  /** ルーム更新をブロードキャスト */
  sendRoomUpdate(data: Partial<Room>): void {
    const msg: RoomUpdateMessage = {
      type: 'room_update',
      data,
      timestamp: Date.now(),
    };
    this.peerManager.broadcast(msg);
  }

  /** チャットメッセージを送信 */
  sendChatMessage(chatMsg: ChatMessage): void {
    const msg: ChatP2PMessage = { type: 'message', data: chatMsg };
    this.peerManager.broadcast(msg);
  }

  // --- Inbound: handle messages from peers ---

  private handleMessage(msg: P2PMessage, fromPeerId: string): void {
    switch (msg.type) {
      case 'full_sync':
        this.callbacks.onFullSync?.(msg.data);
        break;

      case 'patch': {
        // Last-Write-Wins: timestamp を比較して古いものは無視
        const key = `${msg.collection}:${msg.id}`;
        const lastTimestamp = this.lastAppliedTimestamps.get(key) ?? 0;
        if (msg.timestamp >= lastTimestamp) {
          this.lastAppliedTimestamps.set(key, msg.timestamp);
          this.callbacks.onPatch?.(msg.collection, msg.op, msg.id, msg.data);
        }
        break;
      }

      case 'room_update': {
        // Last-Write-Wins: room 全体のタイムスタンプとして管理
        const key = 'room:active_scene_id'; // 簡略化：room update は1種として扱う
        const lastTimestamp = this.lastAppliedTimestamps.get(key) ?? 0;
        if (msg.timestamp >= lastTimestamp) {
          this.lastAppliedTimestamps.set(key, msg.timestamp);
          this.callbacks.onRoomUpdate?.(msg.data);
        }
        break;
      }

      case 'message':
        this.callbacks.onChatMessage?.(msg.data);
        break;

      case 'sync_request':
        // 全員が応答できる（ホスト専用ではない）
        {
          const snapshot = this.getSnapshot();
          if (snapshot) {
            this.peerManager.sendTo(fromPeerId, { type: 'full_sync', data: snapshot });
          }
        }
        break;

      case 'signed':
        // 署名検証は PeerManager 側で実施済み
        this.handleMessage((msg as SignedMessage).inner as P2PMessage, fromPeerId);
        break;

      case 'cursor':
      case 'drag':
        // TODO: カーソル/ドラッグ位置の同期
        break;
    }
  }

  private handleStateChange(state: ConnectionState): void {
    this.callbacks.onConnectionStateChange?.(state);
    // 接続確立時の sync_request は、offer を出した側が ch.onopen 時に送信する
  }
}
