import { SignalingClient } from './SignalingClient';
import type { P2PMessage, ConnectionState } from './types';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const CHUNK_SIZE = 15_000; // < 16KB DataChannel limit

interface PeerConnection {
  pc: RTCPeerConnection;
  reliable: RTCDataChannel | null;
  unreliable: RTCDataChannel | null;
  peerId: string;
}

type MessageHandler = (msg: P2PMessage, fromPeerId: string) => void;
type StateChangeHandler = (state: ConnectionState) => void;

/**
 * WebRTC PeerConnection 管理
 * - ホスト: 複数ゲストとの接続を管理（スター型ハブ）
 * - ゲスト: ホストへの単一接続
 */
export class PeerManager {
  private signaling: SignalingClient;
  private isHost: boolean;
  private connections = new Map<string, PeerConnection>();
  private onMessage: MessageHandler;
  private onStateChange: StateChangeHandler;
  private destroyed = false;
  private chunkBuffers = new Map<string, string[]>();

  // ICE candidate queue (collected before remote description is set)
  private pendingIceCandidates = new Map<string, RTCIceCandidateInit[]>();

  constructor(
    signaling: SignalingClient,
    _peerId: string,
    isHost: boolean,
    onMessage: MessageHandler,
    onStateChange: StateChangeHandler,
  ) {
    this.signaling = signaling;
    this.isHost = isHost;
    this.onMessage = onMessage;
    this.onStateChange = onStateChange;
  }

  // --- Public API ---

  get connectedPeerIds(): string[] {
    return Array.from(this.connections.entries())
      .filter(([, c]) => c.reliable?.readyState === 'open')
      .map(([id]) => id);
  }

  get hasConnections(): boolean {
    return this.connectedPeerIds.length > 0;
  }

  /**
   * ホストとして起動: peer polling 開始 → 新規ゲストにオファー送信
   */
  async startAsHost(): Promise<void> {
    this.onStateChange('connecting');
    await this.signaling.registerPeer();
    this.signaling.startHeartbeat();
    this.signaling.startPeerPolling(async (newPeers) => {
      for (const peer of newPeers) {
        await this.createOfferTo(peer.peerId);
      }
    });
    this.onStateChange('connected');
  }

  /**
   * ゲストとして起動: ホストを探して接続
   */
  async startAsGuest(): Promise<void> {
    this.onStateChange('connecting');
    await this.signaling.registerPeer();
    this.signaling.startHeartbeat();

    // ホストを探す（最大30秒）
    const hostPeerId = await this.waitForHost(30_000);
    if (!hostPeerId) {
      console.warn('P2P: ホストが見つからない');
      this.onStateChange('disconnected');
      return;
    }

    // ホストからのオファーを待つ
    await this.waitForOfferAndConnect(hostPeerId, 30_000);
  }

  /** reliable channel でメッセージ送信（全接続先） */
  broadcast(msg: P2PMessage): void {
    const data = JSON.stringify(msg);
    if (data.length > CHUNK_SIZE) {
      this.broadcastChunked(data);
    } else {
      for (const conn of this.connections.values()) {
        if (conn.reliable?.readyState === 'open') {
          conn.reliable.send(data);
        }
      }
    }
  }

  /** 特定ピアに送信 */
  sendTo(peerId: string, msg: P2PMessage): void {
    const conn = this.connections.get(peerId);
    if (!conn?.reliable || conn.reliable.readyState !== 'open') return;
    const data = JSON.stringify(msg);
    if (data.length > CHUNK_SIZE) {
      this.sendChunked(conn.reliable, data);
    } else {
      conn.reliable.send(data);
    }
  }

  /** unreliable channel で送信（全接続先） */
  broadcastUnreliable(msg: P2PMessage): void {
    const data = JSON.stringify(msg);
    for (const conn of this.connections.values()) {
      if (conn.unreliable?.readyState === 'open') {
        conn.unreliable.send(data);
      }
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.signaling.destroy();
    for (const conn of this.connections.values()) {
      conn.reliable?.close();
      conn.unreliable?.close();
      conn.pc.close();
    }
    this.connections.clear();
    this.chunkBuffers.clear();
  }

  // --- Private: Connection setup ---

  private createPeerConnection(remotePeerId: string): PeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const conn: PeerConnection = { pc, reliable: null, unreliable: null, peerId: remotePeerId };
    this.connections.set(remotePeerId, conn);

    // ICE candidate → signaling server
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.signaling.sendIceCandidate(remotePeerId, JSON.stringify(e.candidate)).catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.handleDisconnect(remotePeerId);
      }
    };

    // 受信側の DataChannel ハンドリング
    pc.ondatachannel = (e) => {
      const ch = e.channel;
      if (ch.label === 'reliable') {
        conn.reliable = ch;
        this.setupChannelHandlers(ch, remotePeerId);
      } else if (ch.label === 'unreliable') {
        conn.unreliable = ch;
        this.setupChannelHandlers(ch, remotePeerId);
      }
    };

    return conn;
  }

  private setupChannelHandlers(ch: RTCDataChannel, remotePeerId: string): void {
    ch.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as P2PMessage;
        if (msg.type === 'chunk') {
          this.handleChunk(msg, remotePeerId);
        } else {
          this.onMessage(msg, remotePeerId);
        }
      } catch {
        console.warn('P2P: invalid message', e.data);
      }
    };
    ch.onopen = () => {
      this.updateState();
    };
    ch.onclose = () => {
      this.updateState();
    };
  }

  /** ホスト → ゲストにオファー送信 */
  private async createOfferTo(remotePeerId: string): Promise<void> {
    if (this.destroyed) return;
    const conn = this.createPeerConnection(remotePeerId);

    // DataChannel 作成（オファー側が作る）
    conn.reliable = conn.pc.createDataChannel('reliable', { ordered: true });
    conn.unreliable = conn.pc.createDataChannel('unreliable', {
      ordered: false,
      maxRetransmits: 0,
    });
    this.setupChannelHandlers(conn.reliable, remotePeerId);
    this.setupChannelHandlers(conn.unreliable, remotePeerId);

    const offer = await conn.pc.createOffer();
    await conn.pc.setLocalDescription(offer);

    await this.signaling.sendOffer(remotePeerId, JSON.stringify(offer));

    // answer を polling
    await this.pollForAnswer(remotePeerId, 30_000);

    // ICE candidates を polling
    this.pollIceCandidates(remotePeerId);
  }

  /** ゲスト: ホストからのオファーを待って接続 */
  private async waitForOfferAndConnect(hostPeerId: string, timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (!this.destroyed && Date.now() - start < timeoutMs) {
      const sdp = await this.signaling.getOffer(hostPeerId);
      if (sdp) {
        await this.handleOffer(hostPeerId, sdp);
        return;
      }
      await sleep(1000);
    }
    console.warn('P2P: オファータイムアウト');
    this.onStateChange('disconnected');
  }

  private async handleOffer(hostPeerId: string, offerSdp: string): Promise<void> {
    const conn = this.createPeerConnection(hostPeerId);
    const offer = JSON.parse(offerSdp) as RTCSessionDescriptionInit;
    await conn.pc.setRemoteDescription(new RTCSessionDescription(offer));

    // Apply any pending ICE candidates
    await this.applyPendingIceCandidates(hostPeerId, conn.pc);

    const answer = await conn.pc.createAnswer();
    await conn.pc.setLocalDescription(answer);
    await this.signaling.sendAnswer(hostPeerId, JSON.stringify(answer));

    // ICE candidates を polling
    this.pollIceCandidates(hostPeerId);
  }

  private async pollForAnswer(remotePeerId: string, timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (!this.destroyed && Date.now() - start < timeoutMs) {
      const sdp = await this.signaling.getAnswer(remotePeerId);
      if (sdp) {
        const conn = this.connections.get(remotePeerId);
        if (conn) {
          const answer = JSON.parse(sdp) as RTCSessionDescriptionInit;
          await conn.pc.setRemoteDescription(new RTCSessionDescription(answer));
          // Apply any pending ICE candidates
          await this.applyPendingIceCandidates(remotePeerId, conn.pc);
        }
        return;
      }
      await sleep(1000);
    }
  }

  private pollIceCandidates(remotePeerId: string): void {
    let knownCount = 0;
    const interval = setInterval(async () => {
      if (this.destroyed) {
        clearInterval(interval);
        return;
      }
      const conn = this.connections.get(remotePeerId);
      if (!conn) {
        clearInterval(interval);
        return;
      }
      // DataChannel が接続済みなら polling 停止
      if (conn.reliable?.readyState === 'open') {
        clearInterval(interval);
        return;
      }
      try {
        const candidates = await this.signaling.getIceCandidates(remotePeerId);
        for (let i = knownCount; i < candidates.length; i++) {
          const candidate = JSON.parse(candidates[i]) as RTCIceCandidateInit;
          if (conn.pc.remoteDescription) {
            await conn.pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            // Queue for later
            const pending = this.pendingIceCandidates.get(remotePeerId) ?? [];
            pending.push(candidate);
            this.pendingIceCandidates.set(remotePeerId, pending);
          }
        }
        knownCount = candidates.length;
      } catch {
        // ignore
      }
    }, 1000);
  }

  private async applyPendingIceCandidates(peerId: string, pc: RTCPeerConnection): Promise<void> {
    const pending = this.pendingIceCandidates.get(peerId);
    if (!pending) return;
    for (const candidate of pending) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    this.pendingIceCandidates.delete(peerId);
  }

  private async waitForHost(timeoutMs: number): Promise<string | null> {
    const start = Date.now();
    while (!this.destroyed && Date.now() - start < timeoutMs) {
      const peers = await this.signaling.getPeers();
      const host = peers.find(p => p.isHost);
      if (host) return host.peerId;
      await sleep(2000);
    }
    return null;
  }

  private handleDisconnect(remotePeerId: string): void {
    const conn = this.connections.get(remotePeerId);
    if (conn) {
      conn.reliable?.close();
      conn.unreliable?.close();
      conn.pc.close();
      this.connections.delete(remotePeerId);
    }
    this.updateState();

    // ゲスト側: ホスト切断 → 再接続試行
    if (!this.isHost && this.connections.size === 0) {
      this.onStateChange('reconnecting');
      this.reconnectAsGuest();
    }
  }

  private async reconnectAsGuest(): Promise<void> {
    let delay = 2000;
    const maxDelay = 30_000;
    while (!this.destroyed) {
      await sleep(delay);
      if (this.destroyed) return;
      try {
        const hostPeerId = await this.waitForHost(10_000);
        if (hostPeerId) {
          await this.waitForOfferAndConnect(hostPeerId, 30_000);
          if (this.hasConnections) return;
        }
      } catch {
        // retry
      }
      delay = Math.min(delay * 1.5, maxDelay);
    }
  }

  private updateState(): void {
    if (this.destroyed) return;
    if (this.isHost) {
      // ホスト: 常に connected（ゲストがいなくてもOK）
      this.onStateChange('connected');
    } else {
      this.onStateChange(this.hasConnections ? 'connected' : 'reconnecting');
    }
  }

  // --- Chunked transfer ---

  private broadcastChunked(data: string): void {
    const id = crypto.randomUUID();
    const total = Math.ceil(data.length / CHUNK_SIZE);
    for (let i = 0; i < total; i++) {
      const chunk: P2PMessage = {
        type: 'chunk',
        id,
        index: i,
        total,
        data: data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      };
      const encoded = JSON.stringify(chunk);
      for (const conn of this.connections.values()) {
        if (conn.reliable?.readyState === 'open') {
          conn.reliable.send(encoded);
        }
      }
    }
  }

  private sendChunked(channel: RTCDataChannel, data: string): void {
    const id = crypto.randomUUID();
    const total = Math.ceil(data.length / CHUNK_SIZE);
    for (let i = 0; i < total; i++) {
      const chunk: P2PMessage = {
        type: 'chunk',
        id,
        index: i,
        total,
        data: data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      };
      channel.send(JSON.stringify(chunk));
    }
  }

  private handleChunk(chunk: P2PMessage & { type: 'chunk' }, fromPeerId: string): void {
    const key = `${fromPeerId}:${chunk.id}`;
    let buffer = this.chunkBuffers.get(key);
    if (!buffer) {
      buffer = new Array(chunk.total).fill('');
      this.chunkBuffers.set(key, buffer);
    }
    buffer[chunk.index] = chunk.data;

    // 全チャンク揃ったら組み立て
    if (buffer.every(s => s !== '')) {
      this.chunkBuffers.delete(key);
      try {
        const msg = JSON.parse(buffer.join('')) as P2PMessage;
        this.onMessage(msg, fromPeerId);
      } catch {
        console.warn('P2P: chunk reassembly failed');
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
