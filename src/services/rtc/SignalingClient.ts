import { BACKEND_URL } from '../../config/api';
import type { SignalingPeer } from './types';

/**
 * HTTP polling ベースのシグナリングクライアント
 * Render FastAPI バックエンド経由で SDP / ICE / peer 情報を交換する
 */
export class SignalingClient {
  private roomId: string;
  private peerId: string;
  private registeredPublicKey: string = '';
  private registeredJoinedAt: number = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private eventSource: EventSource | null = null;
  private destroyed = false;

  constructor(roomId: string, peerId: string) {
    this.roomId = roomId;
    this.peerId = peerId;
  }

  // Getter for peerId (needed by PeerManager)
  get getPeerId(): string {
    return this.peerId;
  }

  private url(path: string, params?: Record<string, string>): string {
    const base = `${BACKEND_URL}/signal/${this.roomId}/${path}`;
    if (!params) return base;
    return `${base}?${new URLSearchParams(params)}`;
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(this.url(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  private async get(path: string, params?: Record<string, string>): Promise<unknown> {
    const res = await fetch(this.url(path, params));
    return res.json();
  }

  // --- Peer registration ---

  async registerPeer(joinedAt: number, publicKey: string): Promise<void> {
    // 初回登録時に保存しておく（ハートビートでも同じ値を使う）
    if (publicKey) {
      this.registeredPublicKey = publicKey;
      this.registeredJoinedAt = joinedAt;
    }
    await this.post('peers', {
      peerId: this.peerId,
      joinedAt: this.registeredJoinedAt || joinedAt,
      publicKey: this.registeredPublicKey || publicKey,
    });
  }

  async unregisterPeer(): Promise<void> {
    try {
      await fetch(this.url(`peers/${this.peerId}`), { method: 'DELETE' });
    } catch {
      // ignore errors on unload
    }
  }

  async getPeers(): Promise<SignalingPeer[]> {
    const res = await this.get('peers');
    const arr = Array.isArray(res) ? res : (res as any).peers ?? [];
    return arr.map((p: any) => ({
      peerId: p.peerId,
      timestamp: p.timestamp ?? p.joinedAt ?? 0,
      joinedAt: p.joinedAt ?? 0,
      publicKey: p.publicKey ?? '',
    })) as SignalingPeer[];
  }

  async getPeerPublicKey(peerId: string): Promise<string | null> {
    try {
      const peers = await this.getPeers();
      const peer = peers.find(p => p.peerId === peerId);
      return peer?.publicKey ?? null;
    } catch {
      return null;
    }
  }

  // --- SDP exchange ---

  async sendOffer(targetPeerId: string, sdp: string): Promise<void> {
    console.log('[Signaling] sendOffer to', targetPeerId.slice(-8));
    await this.post('offer', { fromPeer: this.peerId, toPeer: targetPeerId, sdp });
  }

  async getOffer(fromPeerId: string): Promise<string | null> {
    const res = (await this.get('offer', { peerId: this.peerId })) as { data?: string };
    if (res && (res as any).data) console.log('[Signaling] getOffer found!');
    return (res as { data?: string }).data ?? null;
  }

  async sendAnswer(targetPeerId: string, sdp: string): Promise<void> {
    console.log('[Signaling] sendAnswer to', targetPeerId.slice(-8));
    await this.post('answer', { fromPeer: this.peerId, toPeer: targetPeerId, sdp });
  }

  async getAnswer(fromPeerId: string): Promise<string | null> {
    const res = (await this.get('answer', { peerId: this.peerId })) as { data?: string };
    if (res && (res as any).data) console.log('[Signaling] getAnswer found!');
    return (res as { data?: string }).data ?? null;
  }

  // --- ICE exchange ---

  async sendIceCandidate(targetPeerId: string, candidate: string): Promise<void> {
    await this.post('ice', { fromPeer: this.peerId, toPeer: targetPeerId, candidate });
  }

  async getIceCandidates(fromPeerId: string): Promise<string[]> {
    const res = (await this.get('ice', { peerId: this.peerId })) as { from?: string; candidate?: string }[] | unknown;
    return (Array.isArray(res) ? res : []).map((x: any) => x.candidate).filter(Boolean);
  }

  // --- Heartbeat (keep peer entry alive) ---

  startHeartbeat(intervalMs = 10_000): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.destroyed) {
        // Get current timestamp for joinedAt
        const now = Date.now();
        // For heartbeat, use a minimal publicKey (could be empty or a hash)
        this.registerPeer(now, '').catch(() => {});
      }
    }, intervalMs);
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // --- SSE (Server-Sent Events) ---

  startSSE(callbacks: {
    onPeerJoined?: (peer: SignalingPeer) => void;
    onPeerLeft?: (peerId: string) => void;
    onOffer?: (fromPeer: string, sdp: string) => void;
    onAnswer?: (fromPeer: string, sdp: string) => void;
    onIce?: (fromPeer: string, candidate: string) => void;
  }): void {
    this.stopSSE();
    const url = this.url('events', { peerId: this.peerId });
    this.eventSource = new EventSource(url);

    this.eventSource.addEventListener('peer_joined', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        callbacks.onPeerJoined?.({
          peerId: data.peerId,
          timestamp: data.timestamp ?? data.joinedAt ?? 0,
          joinedAt: data.joinedAt ?? 0,
          publicKey: data.publicKey ?? '',
        });
      } catch {}
    });

    this.eventSource.addEventListener('peer_left', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        callbacks.onPeerLeft?.(data.peerId);
      } catch {}
    });

    this.eventSource.addEventListener('offer', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        console.log('[Signaling] offer SSE received:', data.fromPeer?.slice(-8), '→', data.toPeer?.slice(-8), 'myPeer:', this.peerId?.slice(-8));
        if (data.toPeer === this.peerId) {
          callbacks.onOffer?.(data.fromPeer, data.sdp);
        }
      } catch {}
    });

    this.eventSource.addEventListener('answer', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        if (data.toPeer === this.peerId) {
          callbacks.onAnswer?.(data.fromPeer, data.sdp);
        }
      } catch {}
    });

    this.eventSource.addEventListener('ice', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        if (data.toPeer === this.peerId) {
          callbacks.onIce?.(data.fromPeer, data.candidate);
        }
      } catch {}
    });

    this.eventSource.onerror = () => {
      console.warn('[Signaling] SSE接続エラー、自動再接続待機中...');
    };
  }

  stopSSE(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  // --- Cleanup ---

  destroy(): void {
    this.destroyed = true;
    this.unregisterPeer().catch(() => {});
    this.stopHeartbeat();
    this.stopSSE();
  }
}
