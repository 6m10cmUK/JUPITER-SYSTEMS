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
} from './types';
import type { Room, ChatMessage } from '../../types/adrastea.types';

/**
 * RoomSync — P2P データ同期の統合レイヤー
 *
 * ホスト側:
 *   - ゲストからの patch/message を受信 → ローカルに適用 → 全員にブロードキャスト
 *   - ゲスト接続時に full_sync 送信
 *
 * ゲスト側:
 *   - ホストからの full_sync/patch/message を受信 → ローカルに適用
 *   - 操作時は patch をホストに送信
 */
export class RoomSync {
  private peerManager: PeerManager;
  private signaling: SignalingClient;
  private isHost: boolean;
  private getSnapshot: () => RoomSnapshot | null;

  // Callbacks to update React state
  private onFullSync: ((snapshot: RoomSnapshot) => void) | null = null;
  private onPatch: ((collection: CollectionName, op: PatchOp, id: string, data?: Record<string, unknown>) => void) | null = null;
  private onRoomUpdate: ((data: Partial<Room>) => void) | null = null;
  private onChatMessage: ((msg: ChatMessage) => void) | null = null;
  private onConnectionStateChange: ((state: ConnectionState) => void) | null = null;

  constructor(
    roomId: string,
    userId: string,
    isHost: boolean,
    getSnapshot: () => RoomSnapshot | null,
  ) {
    this.isHost = isHost;
    this.getSnapshot = getSnapshot;

    const peerId = `${userId}_${Date.now()}`;
    this.signaling = new SignalingClient(roomId, peerId, isHost);
    this.peerManager = new PeerManager(
      this.signaling,
      peerId,
      isHost,
      this.handleMessage.bind(this),
      this.handleStateChange.bind(this),
    );
  }

  // --- Callbacks registration ---

  setCallbacks(cbs: {
    onFullSync: (snapshot: RoomSnapshot) => void;
    onPatch: (collection: CollectionName, op: PatchOp, id: string, data?: Record<string, unknown>) => void;
    onRoomUpdate: (data: Partial<Room>) => void;
    onChatMessage: (msg: ChatMessage) => void;
    onConnectionStateChange: (state: ConnectionState) => void;
  }): void {
    this.onFullSync = cbs.onFullSync;
    this.onPatch = cbs.onPatch;
    this.onRoomUpdate = cbs.onRoomUpdate;
    this.onChatMessage = cbs.onChatMessage;
    this.onConnectionStateChange = cbs.onConnectionStateChange;
  }

  // --- Lifecycle ---

  async start(): Promise<void> {
    if (this.isHost) {
      await this.peerManager.startAsHost();
    } else {
      await this.peerManager.startAsGuest();
    }
  }

  destroy(): void {
    this.peerManager.destroy();
  }

  // --- Outbound: send changes to peers ---

  /** コレクション操作をブロードキャスト（ホスト）or ホストに送信（ゲスト） */
  sendPatch(collection: CollectionName, op: PatchOp, id: string, data?: Record<string, unknown>): void {
    const msg: PatchMessage = { type: 'patch', collection, op, id, data };
    if (this.isHost) {
      // ホスト: 全ゲストにブロードキャスト
      this.peerManager.broadcast(msg);
    } else {
      // ゲスト: ホストに送信
      this.peerManager.broadcast(msg);
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

  // --- Inbound: handle messages from peers ---

  private handleMessage(msg: P2PMessage, fromPeerId: string): void {
    switch (msg.type) {
      case 'full_sync':
        this.onFullSync?.(msg.data);
        break;

      case 'patch':
        // ホスト: ゲストからの patch を受信 → ローカル適用 → 他のゲストにリレー
        if (this.isHost) {
          this.onPatch?.(msg.collection, msg.op, msg.id, msg.data);
          // 送信元以外にリレー
          for (const peerId of this.peerManager.connectedPeerIds) {
            if (peerId !== fromPeerId) {
              this.peerManager.sendTo(peerId, msg);
            }
          }
        } else {
          // ゲスト: ホストからの確定パッチを適用
          this.onPatch?.(msg.collection, msg.op, msg.id, msg.data);
        }
        break;

      case 'room_update':
        if (this.isHost) {
          this.onRoomUpdate?.(msg.data);
          for (const peerId of this.peerManager.connectedPeerIds) {
            if (peerId !== fromPeerId) {
              this.peerManager.sendTo(peerId, msg);
            }
          }
        } else {
          this.onRoomUpdate?.(msg.data);
        }
        break;

      case 'message':
        if (this.isHost) {
          this.onChatMessage?.(msg.data);
          // 他のゲストにリレー
          for (const peerId of this.peerManager.connectedPeerIds) {
            if (peerId !== fromPeerId) {
              this.peerManager.sendTo(peerId, msg);
            }
          }
        } else {
          this.onChatMessage?.(msg.data);
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

      case 'cursor':
      case 'drag':
        // TODO: カーソル/ドラッグ位置の同期（将来実装）
        break;
    }
  }

  private handleStateChange(state: ConnectionState): void {
    this.onConnectionStateChange?.(state);

    // ゲスト: 接続確立時にフルシンクを要求
    if (!this.isHost && state === 'connected') {
      this.peerManager.broadcast({ type: 'sync_request' });
    }
  }
}
