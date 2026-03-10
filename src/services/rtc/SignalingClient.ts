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
    await this.post('peers', {
      peerId: this.peerId,
      isHost: this.isHost,
      joinedAt,
      publicKey,
    });
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
    await this.post('offer', { peerId: `${this.peerId}:${targetPeerId}`, sdp });
  }

  async getOffer(fromPeerId: string): Promise<string | null> {
    const res = (await this.get('offer', { peerId: `${fromPeerId}:${this.peerId}` })) as { sdp: string | null };
    return res.sdp ?? null;
  }

  async sendAnswer(targetPeerId: string, sdp: string): Promise<void> {
    await this.post('answer', { peerId: `${this.peerId}:${targetPeerId}`, sdp });
  }

  async getAnswer(fromPeerId: string): Promise<string | null> {
    const res = (await this.get('answer', { peerId: `${fromPeerId}:${this.peerId}` })) as { sdp: string | null };
    return res.sdp ?? null;
  }

  // --- ICE exchange ---

  async sendIceCandidate(targetPeerId: string, candidate: string): Promise<void> {
    await this.post('ice', { peerId: `${this.peerId}:${targetPeerId}`, candidate });
  }

  async getIceCandidates(fromPeerId: string): Promise<string[]> {
    const res = (await this.get('ice', { peerId: `${fromPeerId}:${this.peerId}` })) as { candidates: string[] };
    return res.candidates ?? [];
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
    onNewPeers: (peers: SignalingPeer[]) => void,
    initialIntervalMs = 2000,
  ): void {
    this.stopPeerPolling();
    const knownPeers = new Set<string>();
    let noNewPeersCount = 0;
    let currentIntervalMs = initialIntervalMs;

    const poll = async () => {
      if (this.destroyed) return;
      try {
        const peers = await this.getPeers();
        const newPeers = peers.filter(p => !p.isHost && !knownPeers.has(p.peerId));
        for (const p of newPeers) knownPeers.add(p.peerId);

        if (newPeers.length > 0) {
          // Reset backoff on new peers found
          noNewPeersCount = 0;
          currentIntervalMs = initialIntervalMs;
          onNewPeers(newPeers);
        } else {
          // Increment no-new-peers counter and adjust interval
          noNewPeersCount++;
          if (noNewPeersCount >= 6) {
            currentIntervalMs = 10000; // 10 seconds
          } else if (noNewPeersCount >= 3) {
            currentIntervalMs = 5000; // 5 seconds
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
    this.stopHeartbeat();
    this.stopPeerPolling();
  }
}
