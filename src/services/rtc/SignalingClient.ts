import { BACKEND_URL } from '../../config/api';
import type { SignalingPeer, HostStatus } from './types';

/**
 * HTTP polling ベースのシグナリングクライアント
 * Render FastAPI バックエンド経由で SDP / ICE / peer 情報を交換する
 */
export class SignalingClient {
  private roomId: string;
  private peerId: string;
  private isHost: boolean;
  private registeredPublicKey: string = '';
  private registeredJoinedAt: number = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  constructor(roomId: string, peerId: string, isHost: boolean) {
    this.roomId = roomId;
    this.peerId = peerId;
    this.isHost = isHost;
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
      isHost: this.isHost,
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
      isHost: p.isHost ?? false,
      timestamp: p.joinedAt ?? 0,
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
    const result = await this.post('offer', { fromPeer: this.peerId, toPeer: targetPeerId, data: sdp });
    console.log('[Signaling] sendOffer result', result);
  }

  async getOffer(fromPeerId: string): Promise<string | null> {
    const res = (await this.get('offer', { peerId: this.peerId })) as { data?: string };
    if (res && (res as any).data) console.log('[Signaling] getOffer found!');
    return (res as { data?: string }).data ?? null;
  }

  async sendAnswer(targetPeerId: string, sdp: string): Promise<void> {
    console.log('[Signaling] sendAnswer to', targetPeerId.slice(-8));
    const result = await this.post('answer', { fromPeer: this.peerId, toPeer: targetPeerId, data: sdp });
    console.log('[Signaling] sendAnswer result', result);
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

  // --- Host election ---

  async announceHost(timestamp: number): Promise<void> {
    await this.post('announce-host', {
      peerId: this.peerId,
      timestamp,
    });
  }

  async getHostStatus(): Promise<HostStatus> {
    const res = (await this.get('host-status')) as HostStatus;
    return res ?? { hostPeerId: null, timestamp: null };
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

  // --- Polling for new peers (host mode) with exponential backoff ---

  startPeerPolling(
    onPeersUpdate: (allPeers: SignalingPeer[], newPeers: SignalingPeer[]) => void,
    initialIntervalMs = 2000,
  ): void {
    this.stopPeerPolling();
    let lastPeerSet = new Set<string>();
    let noNewPeersCount = 0;
    let currentIntervalMs = initialIntervalMs;

    const poll = async () => {
      if (this.destroyed) return;
      try {
        const peers = await this.getPeers();
        const currentPeerIds = new Set(peers.map(p => p.peerId));

        // 変更を検出：新しく参加したピア、および退出したピア
        const newPeers = peers.filter(p => !lastPeerSet.has(p.peerId));
        const departures: string[] = [];
        for (const id of lastPeerSet) {
          if (!currentPeerIds.has(id)) departures.push(id);
        }

        // ピアセットを更新
        lastPeerSet = currentPeerIds;

        // 変更がある場合のみコールバック実行
        const hasChanges = newPeers.length > 0 || departures.length > 0;
        if (hasChanges) {
          onPeersUpdate(peers, newPeers);
          noNewPeersCount = 0;
          currentIntervalMs = initialIntervalMs;
        } else {
          noNewPeersCount++;
          if (noNewPeersCount >= 6) {
            currentIntervalMs = 10000;
          } else if (noNewPeersCount >= 3) {
            currentIntervalMs = 5000;
          }
        }
      } catch {
        // ignore polling errors
      }
      this.pollTimer = setTimeout(poll, currentIntervalMs);
    };

    this.pollTimer = setTimeout(poll, currentIntervalMs);
  }

  stopPeerPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // --- Cleanup ---

  destroy(): void {
    this.destroyed = true;
    this.unregisterPeer().catch(() => {});
    this.stopHeartbeat();
    this.stopPeerPolling();
  }
}
