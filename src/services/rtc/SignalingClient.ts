import { API_BASE_URL } from '../../config/api';
import type { SignalingPeer } from './types';

/**
 * HTTP polling ベースのシグナリングクライアント
 * Cloudflare Workers KV を介して SDP / ICE / peer 情報を交換する
 */
export class SignalingClient {
  private roomId: string;
  private peerId: string;
  private isHost: boolean;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  constructor(roomId: string, peerId: string, isHost: boolean) {
    this.roomId = roomId;
    this.peerId = peerId;
    this.isHost = isHost;
  }

  private url(path: string, params?: Record<string, string>): string {
    const base = `${API_BASE_URL}/signal/${this.roomId}/${path}`;
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

  async registerPeer(): Promise<void> {
    await this.post('peers', { peerId: this.peerId, isHost: this.isHost });
  }

  async getPeers(): Promise<SignalingPeer[]> {
    const res = (await this.get('peers')) as { peers: SignalingPeer[] };
    return res.peers ?? [];
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

  // --- Heartbeat (keep peer entry alive) ---

  startHeartbeat(intervalMs = 60_000): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.destroyed) this.registerPeer().catch(() => {});
    }, intervalMs);
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // --- Polling for new peers (host mode) ---

  startPeerPolling(
    onNewPeers: (peers: SignalingPeer[]) => void,
    intervalMs = 2000,
  ): void {
    this.stopPeerPolling();
    const knownPeers = new Set<string>();
    this.pollTimer = setInterval(async () => {
      if (this.destroyed) return;
      try {
        const peers = await this.getPeers();
        const newPeers = peers.filter(p => !p.isHost && !knownPeers.has(p.peerId));
        for (const p of newPeers) knownPeers.add(p.peerId);
        if (newPeers.length > 0) onNewPeers(newPeers);
      } catch {
        // ignore polling errors
      }
    }, intervalMs);
  }

  stopPeerPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
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
