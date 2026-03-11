import { SignalingClient } from './SignalingClient';
import type { P2PMessage, ConnectionState, SignedMessage } from './types';
import { CryptoManager } from './CryptoManager';

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
 * WebRTC PeerConnection 管理（フルメッシュ + Perfect Negotiation）
 *
 * 全ピアが平等に接続を確立。Perfect Negotiation により衝突を自動解決。
 * - polite = myPeerId < remotePeerId（引き役：rollback して相手の offer を受け入れ）
 * - impolite = myPeerId > remotePeerId（押し通す：相手の offer を無視）
 */
export class PeerManager {
  private myPeerId: string;
  private signaling: SignalingClient;
  private connections = new Map<string, PeerConnection>();
  private onMessage: MessageHandler;
  private onStateChange: StateChangeHandler;
  private destroyed = false;
  private chunkBuffers = new Map<string, string[]>();

  // ICE candidate queue (collected before remote description is set)
  private pendingIceCandidates = new Map<string, RTCIceCandidateInit[]>();

  // Perfect Negotiation: offer作成中フラグ
  private makingOffer = new Map<string, boolean>();

  // Crypto manager
  private cryptoManager = new CryptoManager();

  constructor(
    signaling: SignalingClient,
    myPeerId: string,
    onMessage: MessageHandler,
    onStateChange: StateChangeHandler,
  ) {
    this.myPeerId = myPeerId;
    this.signaling = signaling;
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
   * 全ピアが候補として起動（ホスト選出なし）
   * フルメッシュ P2P 接続を確立する
   */
  async startAsCandidate(joinedAt: number): Promise<void> {
    // 暗号化キーペア生成
    await this.cryptoManager.generateKeyPair();

    this.onStateChange('connecting');

    // シグナリングに登録
    const cryptoPublicKey = this.cryptoManager.getPublicKeyBase64();
    await this.signaling.registerPeer(joinedAt, cryptoPublicKey);

    // ハートビート開始（ピア登録を有効期限内に維持）
    this.signaling.startHeartbeat();

    // SSEでイベント受信
    this.signaling.startSSE({
      onPeerJoined: (peer) => {
        if (peer.peerId === this.myPeerId) return;
        // 新規ピアに対して offer を作成
        if (!this.connections.has(peer.peerId)) {
          this.createOfferTo(peer.peerId).catch(console.error);
        }
      },
      onPeerLeft: (peerId) => {
        if (this.connections.has(peerId)) {
          this.handleDisconnect(peerId);
        }
      },
      onOffer: (fromPeer, sdp) => {
        this.handleOffer(fromPeer, sdp).catch(console.error);
      },
      onAnswer: (fromPeer, sdp) => {
        this.handleAnswer(fromPeer, sdp).catch(console.error);
      },
      onIce: (fromPeer, candidate) => {
        this.handleIceCandidateFromSSE(fromPeer, candidate).catch(console.error);
      },
    });

    // 初期ピアリスト取得（SSE接続前に参加済みのピア用）
    try {
      const peers = await this.signaling.getPeers();
      for (const peer of peers) {
        if (peer.peerId !== this.myPeerId && !this.connections.has(peer.peerId)) {
          await this.createOfferTo(peer.peerId);
        }
      }
    } catch {}

    this.updateState();
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

  /** 署名付きでブロードキャスト */
  async broadcastWithSignature(msg: P2PMessage): Promise<void> {
    try {
      const signature = await this.cryptoManager.sign(JSON.stringify(msg));
      const signed: SignedMessage = {
        type: 'signed',
        inner: msg as any,
        signature,
        signerPeerId: this.myPeerId,
      };
      this.broadcast(signed);
    } catch (err) {
      console.warn('P2P: 署名生成エラー、メッセージ送信をスキップ', err);
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
    this.signaling.stopSSE?.();
    this.signaling.destroy();
    for (const conn of this.connections.values()) {
      conn.reliable?.close();
      conn.unreliable?.close();
      conn.pc.close();
    }
    this.connections.clear();
    this.chunkBuffers.clear();
    this.makingOffer.clear();
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
      console.log(`[PeerManager] connectionState=${pc.connectionState} iceConnectionState=${pc.iceConnectionState} with ${remotePeerId.slice(-8)}`);
      if (pc.connectionState === 'failed') {
        this.handleDisconnect(remotePeerId);
      }
    };
    pc.oniceconnectionstatechange = () => {
      console.log(`[PeerManager] iceConnectionState=${pc.iceConnectionState} with ${remotePeerId.slice(-8)}`);
    };

    // 受信側の DataChannel ハンドリング
    pc.ondatachannel = (e) => {
      const ch = e.channel;
      if (ch.label === 'reliable') {
        conn.reliable = ch;
        this.setupChannelHandlers(ch, remotePeerId);
        if (ch.readyState === 'open') {
          console.log(`[PeerManager] DataChannel "reliable" already open with ${remotePeerId.slice(-8)}`);
          this.updateState();
          // フルメッシュ：全員が sync_request を送る
          ch.send(JSON.stringify({ type: 'sync_request' }));
        }
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
        } else if (msg.type === 'signed') {
          this.handleSignedMessage(msg as SignedMessage, remotePeerId);
        } else {
          this.onMessage(msg, remotePeerId);
        }
      } catch (err) {
        console.warn('P2P: invalid message', e.data, err);
      }
    };
    ch.onopen = () => {
      console.log(`[PeerManager] DataChannel "${ch.label}" opened with ${remotePeerId.slice(-8)}`);
      this.updateState();
      // フルメッシュ：全員が sync_request を送る
      if (ch.label === 'reliable') {
        ch.send(JSON.stringify({ type: 'sync_request' }));
      }
    };
    ch.onclose = () => {
      console.log(`[PeerManager] DataChannel "${ch.label}" closed with ${remotePeerId.slice(-8)}`);
      this.updateState();
    };
  }

  private async handleSignedMessage(signed: SignedMessage, remotePeerId: string): Promise<void> {
    try {
      if (!window.crypto?.subtle) {
        this.onMessage(signed.inner as P2PMessage, remotePeerId);
        return;
      }

      const publicKeyBase64 = await this.signaling.getPeerPublicKey(signed.signerPeerId);
      if (!publicKeyBase64) {
        this.onMessage(signed.inner as P2PMessage, remotePeerId);
        return;
      }

      const isValid = await CryptoManager.verify(
        publicKeyBase64,
        JSON.stringify(signed.inner),
        signed.signature,
      );
      if (!isValid) {
        console.warn('P2P: 署名検証失敗', signed.signerPeerId);
        return;
      }

      const innerMsg = signed.inner as P2PMessage;
      this.onMessage(innerMsg, remotePeerId);
    } catch (err) {
      console.warn('P2P: 署名メッセージ処理エラー', err);
    }
  }

  /** offer を送信（全ピアに対して呼び出される） */
  private async createOfferTo(remotePeerId: string): Promise<void> {
    if (this.destroyed) return;

    // 既に有効な接続がある場合はスキップ
    const existing = this.connections.get(remotePeerId);
    if (existing?.reliable?.readyState === 'open') {
      return;
    }

    // 既存接続を破棄
    if (existing) {
      existing.reliable?.close();
      existing.unreliable?.close();
      existing.pc.close();
      this.connections.delete(remotePeerId);
    }

    console.log('[PeerManager] createOfferTo', remotePeerId.slice(-8));
    const conn = this.createPeerConnection(remotePeerId);

    conn.reliable = conn.pc.createDataChannel('reliable', { ordered: true });
    conn.unreliable = conn.pc.createDataChannel('unreliable', {
      ordered: false,
      maxRetransmits: 0,
    });
    this.setupChannelHandlers(conn.reliable, remotePeerId);
    this.setupChannelHandlers(conn.unreliable, remotePeerId);

    this.makingOffer.set(remotePeerId, true);
    try {
      const offer = await conn.pc.createOffer();
      await conn.pc.setLocalDescription(offer);
      await this.signaling.sendOffer(remotePeerId, JSON.stringify(offer));
    } finally {
      this.makingOffer.set(remotePeerId, false);
    }
  }

  /** Perfect Negotiation: offer を受信して処理 */
  private async handleOffer(fromPeerId: string, offerSdp: string): Promise<void> {
    if (this.destroyed) return;

    console.log('[PeerManager] handleOffer from', fromPeerId.slice(-8));

    // polite/impolite の決定（peerId の辞書順）
    const polite = this.myPeerId < fromPeerId;
    console.log(`[PeerManager] polite=${polite}, myPeerId=${this.myPeerId.slice(-8)}, fromPeerId=${fromPeerId.slice(-8)}`);

    let conn = this.connections.get(fromPeerId);
    const collision = conn && (this.makingOffer.get(fromPeerId) || conn.pc.signalingState !== 'stable');

    if (collision) {
      console.log(`[PeerManager] collision detected with ${fromPeerId.slice(-8)}, polite=${polite}`);
      if (!polite) {
        // impolite: 相手の offer を無視
        console.log(`[PeerManager] impolite: ignoring offer from ${fromPeerId.slice(-8)}`);
        return;
      }
      // polite: rollback して相手の offer を受け入れ
      console.log(`[PeerManager] polite: rolling back and accepting offer from ${fromPeerId.slice(-8)}`);
      try {
        if (conn!.pc.signalingState !== 'stable') {
          await conn!.pc.setLocalDescription({ type: 'rollback' });
        }
      } catch (err) {
        console.warn('[PeerManager] rollback error:', err);
      }
    }

    // 新規接続を作成（既存を破棄）
    if (!conn || collision) {
      if (conn) {
        conn.reliable?.close();
        conn.unreliable?.close();
        conn.pc.close();
        this.connections.delete(fromPeerId);
      }
      conn = this.createPeerConnection(fromPeerId);
    }

    try {
      const offer = JSON.parse(offerSdp) as RTCSessionDescriptionInit;
      await conn.pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Apply any pending ICE candidates
      await this.applyPendingIceCandidates(fromPeerId, conn.pc);

      const answer = await conn.pc.createAnswer();
      await conn.pc.setLocalDescription(answer);
      await this.signaling.sendAnswer(fromPeerId, JSON.stringify(answer));
    } catch (err) {
      console.warn('[PeerManager] handleOffer error:', err);
    }
  }

  /** answer を受信して処理 */
  private async handleAnswer(fromPeerId: string, sdp: string): Promise<void> {
    if (this.destroyed) return;

    console.log('[PeerManager] handleAnswer from', fromPeerId.slice(-8));
    const conn = this.connections.get(fromPeerId);
    if (!conn) return;

    try {
      const answer = JSON.parse(sdp) as RTCSessionDescriptionInit;
      if (conn.pc.signalingState === 'have-local-offer') {
        await conn.pc.setRemoteDescription(new RTCSessionDescription(answer));
        await this.applyPendingIceCandidates(fromPeerId, conn.pc);
      }
    } catch (err) {
      console.warn('[PeerManager] handleAnswer error', err);
    }
  }

  /** ICE candidate を SSE で受信して処理 */
  private async handleIceCandidateFromSSE(fromPeerId: string, candidateStr: string): Promise<void> {
    try {
      const candidate = JSON.parse(candidateStr) as RTCIceCandidateInit;
      const conn = this.connections.get(fromPeerId);
      if (conn?.pc.remoteDescription) {
        await conn.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        const pending = this.pendingIceCandidates.get(fromPeerId) ?? [];
        pending.push(candidate);
        this.pendingIceCandidates.set(fromPeerId, pending);
      }
    } catch (err) {
      console.warn('[PeerManager] handleIceCandidate error', err);
    }
  }

  private async applyPendingIceCandidates(peerId: string, pc: RTCPeerConnection): Promise<void> {
    const pending = this.pendingIceCandidates.get(peerId);
    if (!pending) return;
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[PeerManager] addIceCandidate error:', err);
      }
    }
    this.pendingIceCandidates.delete(peerId);
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

    // WebRTC失敗後に再接続を試みる（3秒後）
    if (!this.destroyed) {
      setTimeout(async () => {
        if (this.destroyed || this.connections.has(remotePeerId)) return;
        try {
          const peers = await this.signaling.getPeers();
          if (peers.some(p => p.peerId === remotePeerId)) {
            console.log(`[PeerManager] 再接続を試みます: ${remotePeerId.slice(-8)}`);
            await this.createOfferTo(remotePeerId);
          }
        } catch {
          // 再接続失敗は無視（次のSSEイベントで試みる）
        }
      }, 3000);
    }
  }

  private updateState(): void {
    if (this.destroyed) return;
    this.onStateChange(this.hasConnections ? 'connected' : 'reconnecting');
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
