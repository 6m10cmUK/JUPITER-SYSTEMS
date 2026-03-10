import { SignalingClient } from './SignalingClient';
import type { P2PMessage, ConnectionState, SignedMessage, HostHeartbeatMessage, SignalingPeer } from './types';
import { HostElectionManager } from './HostElectionManager';
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

  // ホスト選出関連
  private hostElectionManager: HostElectionManager | null = null;
  private hostHeartbeatInterval: NodeJS.Timeout | null = null;
  private cryptoManager = new CryptoManager();

  // ホスト選出コールバック
  onHostElected?: (hostPeerId: string | null, isMe: boolean) => void;

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

  hasHostConnection(): boolean {
    // ホストへの接続が確立済みかどうか
    // connections が空でなく、ホストとのchannelがopenならtrue
    if (this.isHost) return true;
    // ゲストの場合: 誰かとでも接続済みならtrue（スター型なので相手はホストのはず）
    for (const conn of this.connections.values()) {
      if (conn.reliable?.readyState === 'open') return true;
    }
    return false;
  }

  /**
   * ホスト選出ロジックなしで起動（後方互換）
   * @deprecated startAsCandidate を使用してください
   */
  async startAsHost(): Promise<void> {
    this.onStateChange('connecting');
    await this.signaling.registerPeer(Date.now(), '');
    this.signaling.startHeartbeat();
    this.signaling.startPeerPolling(async (allPeers, newPeers) => {
      for (const peer of newPeers) {
        await this.createOfferTo(peer.peerId);
      }
    });
    this.onStateChange('connected');
  }

  /**
   * ゲストとして起動: ホストを探して接続（後方互換）
   * @deprecated startAsCandidate を使用してください
   */
  async startAsGuest(): Promise<void> {
    this.onStateChange('connecting');
    await this.signaling.registerPeer(Date.now(), '');
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

  /**
   * ホスト選出ロジック統合版
   * 全ピアが候補として起動し、ホスト選出メカニズムが自動選出を行う
   */
  async startAsCandidate(joinedAt: number): Promise<void> {
    // 暗号化キーペア生成
    await this.cryptoManager.generateKeyPair();

    this.onStateChange('connecting');

    // シグナリングに登録（CryptoManager から公開鍵を取得）
    const cryptoPublicKey = this.cryptoManager.getPublicKeyBase64();
    await this.signaling.registerPeer(joinedAt, cryptoPublicKey);

    // HostElectionManager を起動
    this.hostElectionManager = new HostElectionManager(
      this.signaling.getPeerId as string,
      joinedAt,
      (hostPeerId) => this.onHostChanged(hostPeerId),
    );

    // シグナリングサーバーのピア有効期限を維持するハートビート開始
    this.signaling.startHeartbeat();

    // ピアポーリングを開始（初期ピア取得 + ホスト選出に利用）
    this.signaling.startPeerPolling((allPeers, newPeers) => {
      this.handlePeerListUpdate(allPeers, newPeers);
    });

    // 死活監視を開始（ホスト無応答時の自動再選出）
    this.hostElectionManager.startHealthCheck(30000, 5000);

    this.onStateChange('connected');
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
        signerPeerId: this.signaling.getPeerId as string,
      };
      this.broadcast(signed);
    } catch (err) {
      console.warn('P2P: 署名生成エラー、メッセージ送信をスキップ', err);
      // 署名なしでは送信しない
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
    if (this.hostHeartbeatInterval) {
      clearInterval(this.hostHeartbeatInterval);
      this.hostHeartbeatInterval = null;
    }
    this.hostElectionManager?.destroy();
    for (const conn of this.connections.values()) {
      conn.reliable?.close();
      conn.unreliable?.close();
      conn.pc.close();
    }
    this.connections.clear();
    this.chunkBuffers.clear();
  }

  // --- Private: Host election ---

  private handlePeerListUpdate(allPeers: SignalingPeer[], _newPeers: SignalingPeer[]): void {
    // HostElectionManager に通知して選出計算を実行
    if (this.hostElectionManager) {
      this.hostElectionManager.notifyHostElection(allPeers);
    }
  }

  private async onHostChanged(hostPeerId: string | null): Promise<void> {
    const myPeerId = this.signaling.getPeerId as string;
    const isMe = hostPeerId === myPeerId;

    // 外部コールバック通知（RoomSync などが登録）
    this.onHostElected?.(hostPeerId, isMe);

    if (isMe) {
      // 自分がホストに選出: 全既知ピアにofferを送る
      console.log('P2P: ホスト選出（自分）、ゲストにoffer送信');
      this.isHost = true;
      this.startHostHeartbeat();
      try {
        const peers = await this.signaling.getPeers();
        console.log('[PeerManager] host elected, peers:', peers.map(p => p.peerId.slice(-8)));
        for (const peer of peers) {
          if (peer.peerId !== myPeerId && !this.connections.has(peer.peerId)) {
            await this.createOfferTo(peer.peerId);
          }
        }
      } catch (err) {
        console.warn('P2P: ゲストへのoffer送信エラー', err);
      }
      // 新規ゲスト用: ポーリングでoffer送信継続
      this.signaling.stopPeerPolling();
      this.signaling.startPeerPolling(async (allPeers, newPeers) => {
        for (const peer of newPeers) {
          if (peer.peerId !== myPeerId && !this.connections.has(peer.peerId)) {
            await this.createOfferTo(peer.peerId);
          }
        }
      });
    } else if (hostPeerId) {
      // 他のピアがホスト: offerを待つ
      console.log(`P2P: ホスト選出（${hostPeerId}）、offerを待機`);
      this.isHost = false;
      this.stopHostHeartbeat();
      // ゲストはofferを待つ（ホストがcreateOfferToで送ってくる）
      // ポーリングを停止してofferポーリングに切り替え
      this.signaling.stopPeerPolling();
      this.waitForOfferAndConnect(hostPeerId, 30_000).catch((err) => {
        console.warn('P2P: ホストからのoffer待機エラー', err);
        // offer に応答しなかったピアをブラックリスト化 → 次回の選出から除外
        this.hostElectionManager?.markAsDead(hostPeerId);
      });
    } else {
      // ホスト離脱
      console.log('P2P: ホスト離脱、再選出待ち');
      this.isHost = false;
      this.stopHostHeartbeat();
      // ポーリング再開（新しいホストを待つ）
      this.signaling.startPeerPolling((allPeers, newPeers) => {
        this.handlePeerListUpdate(allPeers, newPeers);
      });
    }
  }

  private startHostHeartbeat(): void {
    if (this.hostHeartbeatInterval) {
      clearInterval(this.hostHeartbeatInterval);
    }
    // 5秒ごとにハートビート送信
    this.hostHeartbeatInterval = setInterval(() => {
      if (!this.destroyed && this.isHost) {
        const heartbeat: HostHeartbeatMessage = {
          type: 'host_heartbeat',
          timestamp: Date.now(),
        };
        this.broadcast(heartbeat);
      }
    }, 5000);
  }

  private stopHostHeartbeat(): void {
    if (this.hostHeartbeatInterval) {
      clearInterval(this.hostHeartbeatInterval);
      this.hostHeartbeatInterval = null;
    }
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
      // ゲストがホストと接続したら sync_request を送ってフルシンクを要求
      if (!this.isHost && ch.label === 'reliable') {
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
      // crypto.subtle が使えない環境（HTTP）では署名検証をスキップ
      if (!window.crypto?.subtle) {
        this.onMessage(signed.inner as P2PMessage, remotePeerId);
        return;
      }

      // 送信元の公開鍵を取得
      const publicKeyBase64 = await this.signaling.getPeerPublicKey(signed.signerPeerId);
      if (!publicKeyBase64) {
        // 公開鍵なし（HTTP環境のピア）→ そのまま処理
        this.onMessage(signed.inner as P2PMessage, remotePeerId);
        return;
      }

      // CryptoManager で署名を検証
      const isValid = await CryptoManager.verify(
        publicKeyBase64,
        JSON.stringify(signed.inner),
        signed.signature,
      );
      if (!isValid) {
        console.warn('P2P: 署名検証失敗', signed.signerPeerId);
        return;
      }

      // 検証成功、メッセージを処理
      const innerMsg = signed.inner as P2PMessage;
      this.onMessage(innerMsg, remotePeerId);
    } catch (err) {
      console.warn('P2P: 署名メッセージ処理エラー', err);
    }
  }

  /** ホスト → ゲストにオファー送信 */
  private async createOfferTo(remotePeerId: string): Promise<void> {
    if (this.destroyed) return;
    console.log('[PeerManager] createOfferTo', remotePeerId.slice(-8));
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
    console.log('[PeerManager] offer sent, waiting for answer...');

    // answer を polling
    await this.pollForAnswer(remotePeerId, 30_000);
    console.log('[PeerManager] pollForAnswer done for', remotePeerId.slice(-8));

    // ICE candidates を polling
    this.pollIceCandidates(remotePeerId);
  }

  /** ゲスト: ホストからのオファーを待って接続 */
  private async waitForOfferAndConnect(hostPeerId: string, timeoutMs: number): Promise<void> {
    const start = Date.now();
    console.log('[PeerManager] waitForOfferAndConnect from', hostPeerId.slice(-8));
    while (!this.destroyed && Date.now() - start < timeoutMs) {
      const sdp = await this.signaling.getOffer(hostPeerId);
      if (sdp) {
        console.log('[PeerManager] got offer from', hostPeerId.slice(-8));
        await this.handleOffer(hostPeerId, sdp);
        return;
      }
      await sleep(1000);
    }
    console.warn('P2P: オファータイムアウト');
    // offer に応答しなかったホスト候補をブラックリスト化
    this.hostElectionManager?.markAsDead(hostPeerId);
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

    // ホストが切断した場合、即座に再選出をトリガー
    if (this.hostElectionManager && this.hostElectionManager.hostPeerId === remotePeerId) {
      console.log('[PeerManager] ホスト切断検出、即座に再選出');
      this.hostElectionManager.notifyHostElection([]);
    }

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
