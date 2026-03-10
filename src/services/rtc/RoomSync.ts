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
  onHostElection?: (hostPeerId: string | null, isMe: boolean) => void;
  onSaveSnapshot?: () => void;
}

/**
 * RoomSync — P2P データ同期の統合レイヤー
 *
 * ホスト側:
 *   - ゲストからの patch/message を受信 → ローカルに適用 → 全員にブロードキャスト
 *   - ゲスト接続時に full_sync 送信
 *   - ホスト変更時に host_election を通知
 *
 * ゲスト側:
 *   - ホストからの full_sync/patch/message を受信 → ローカルに適用
 *   - 操作時は patch をホストに送信
 */
export class RoomSync {
  private peerManager: PeerManager;
  private signaling: SignalingClient;
  private isHost: boolean;
  private peerId: string;
  private getSnapshot: () => RoomSnapshot | null;

  // Callbacks to update React state
  private callbacks: RoomSyncCallbacks = {};

  // ホスト離脱中のpatchキュー
  private pendingPatches: Array<{
    collection: CollectionName;
    op: PatchOp;
    id: string;
    data?: Record<string, unknown>;
  }> = [];

  constructor(
    roomId: string,
    userId: string,
    isHost: boolean,
    getSnapshot: () => RoomSnapshot | null,
    _privateKey?: CryptoKey,
  ) {
    this.isHost = isHost;
    this.getSnapshot = getSnapshot;

    this.peerId = `${userId}_${Date.now()}`;
    this.signaling = new SignalingClient(roomId, this.peerId, isHost);
    this.peerManager = new PeerManager(
      this.signaling,
      this.peerId,
      isHost,
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
    // 全員が候補として起動（動的ホスト選出）
    const joinedAt = Date.now();

    // ホスト選出コールバックを登録
    this.peerManager.onHostElected = (hostPeerId, isMe) => {
      this.isHost = isMe;
      this.callbacks.onHostElection?.(hostPeerId, isMe);
      this.callbacks.onConnectionStateChange?.('connected');
    };

    // CryptoManager は PeerManager 内部で管理
    await this.peerManager.startAsCandidate(joinedAt);
  }

  destroy(): void {
    this.peerManager.destroy();
  }

  // --- Outbound: send changes to peers ---

  /** コレクション操作をブロードキャスト（ホスト）or ホストに送信（ゲスト） */
  async sendPatch(collection: CollectionName, op: PatchOp, id: string, data?: Record<string, unknown>): Promise<void> {
    const msg: PatchMessage = { type: 'patch', collection, op, id, data };
    if (this.isHost) {
      // ホスト: 全ゲストに署名付きでブロードキャスト
      await this.peerManager.broadcastWithSignature(msg);
      // キュー中のメッセージも送信
      while (this.pendingPatches.length > 0) {
        const p = this.pendingPatches.shift()!;
        const queued: PatchMessage = { type: 'patch', ...p };
        await this.peerManager.broadcastWithSignature(queued);
      }
    } else if (this.peerManager.hasHostConnection()) {
      // ホスト接続済みなら直接送信
      this.peerManager.broadcast(msg);
    } else {
      // ホスト未確定 or 再選出中: キューに積む（最大50件）
      if (this.pendingPatches.length < 50) {
        this.pendingPatches.push({ collection, op, id, data });
      }
    }
  }

  /** ルーム更新をブロードキャスト */
  sendRoomUpdate(data: Partial<Room>): void {
    const msg: RoomUpdateMessage = { type: 'room_update', data };
    if (this.isHost) {
      this.peerManager.broadcast(msg);
    } else {
      this.peerManager.broadcast(msg);
    }
  }

  /** チャットメッセージを送信 */
  sendChatMessage(chatMsg: ChatMessage): void {
    const msg: ChatP2PMessage = { type: 'message', data: chatMsg };
    if (this.isHost) {
      this.peerManager.broadcast(msg);
    } else {
      this.peerManager.broadcast(msg);
    }
  }

  // --- Dynamic host management ---

  setIsHost(isHost: boolean): void {
    this.isHost = isHost;
    if (isHost) {
      // ホストになったら full_sync を全員に送信
      const snapshot = this.getSnapshot();
      if (snapshot) {
        const msg: P2PMessage = { type: 'full_sync', data: snapshot };
        this.peerManager.broadcastWithSignature(msg).catch(console.error);
      }
    }
  }

  // --- Inbound: handle messages from peers ---

  private handleMessage(msg: P2PMessage, fromPeerId: string): void {
    switch (msg.type) {
      case 'full_sync':
        this.callbacks.onFullSync?.(msg.data);
        break;

      case 'patch':
        // ホスト: ゲストからの patch を受信 → ローカル適用 → 他のゲストにリレー
        if (this.isHost) {
          this.callbacks.onPatch?.(msg.collection, msg.op, msg.id, msg.data);
          // 送信元以外にリレー
          for (const peerId of this.peerManager.connectedPeerIds) {
            if (peerId !== fromPeerId) {
              this.peerManager.sendTo(peerId, msg);
            }
          }
        } else {
          // ゲスト: ホストからの確定パッチを適用
          this.callbacks.onPatch?.(msg.collection, msg.op, msg.id, msg.data);
        }
        break;

      case 'room_update':
        if (this.isHost) {
          this.callbacks.onRoomUpdate?.(msg.data);
          for (const peerId of this.peerManager.connectedPeerIds) {
            if (peerId !== fromPeerId) {
              this.peerManager.sendTo(peerId, msg);
            }
          }
        } else {
          this.callbacks.onRoomUpdate?.(msg.data);
        }
        break;

      case 'message':
        if (this.isHost) {
          this.callbacks.onChatMessage?.(msg.data);
          // 他のゲストにリレー
          for (const peerId of this.peerManager.connectedPeerIds) {
            if (peerId !== fromPeerId) {
              this.peerManager.sendTo(peerId, msg);
            }
          }
        } else {
          this.callbacks.onChatMessage?.(msg.data);
        }
        break;

      case 'sync_request':
        // ゲストがフルシンク要求 → ホストがスナップショット送信
        if (this.isHost) {
          const snapshot = this.getSnapshot();
          if (snapshot) {
            this.peerManager.sendTo(fromPeerId, { type: 'full_sync', data: snapshot });
          }
        }
        break;

      case 'host_election':
        // ホスト変更を通知
        this.callbacks.onHostElection?.(msg.hostPeerId, msg.hostPeerId === this.peerId);
        // ホスト離脱時（hostPeerId === null）にスナップショット保存を要求
        if (msg.hostPeerId === null) {
          this.callbacks.onSaveSnapshot?.();
        }
        break;

      case 'host_heartbeat':
        // ホストからのハートビート受信（将来的な使用を想定）
        // TODO: lastHostHeartbeatAt を記録してホスト無応答検出に利用
        break;

      case 'signed':
        // 署名検証は PeerManager 側で実施済みなので、inner を処理
        this.handleMessage((msg as SignedMessage).inner as P2PMessage, fromPeerId);
        break;

      case 'cursor':
      case 'drag':
        // TODO: カーソル/ドラッグ位置の同期（将来実装）
        break;
    }
  }

  private handleStateChange(state: ConnectionState): void {
    this.callbacks.onConnectionStateChange?.(state);

    // ゲスト: 接続確立時にフルシンクを要求
    if (!this.isHost && state === 'connected') {
      this.peerManager.broadcast({ type: 'sync_request' });
    }
  }
}
