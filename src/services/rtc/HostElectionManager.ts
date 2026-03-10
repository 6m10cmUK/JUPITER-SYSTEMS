import type { SignalingPeer } from './types';

/**
 * HostElectionManager
 *
 * P2Pネットワーク内でホストを自律的に選出・管理する
 * - 各ピアのjoinedAtタイムスタンプに基づいて最古のピアをホストに選出（deterministic）
 * - ホストからのハートビート監視
 * - ホスト無応答時の自動再選出
 */
export class HostElectionManager {
  private myPeerId: string;
  private myJoinedAt: number;
  private currentHostPeerId: string | null = null;
  private lastHeartbeatAt: number = Date.now();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private onHostChanged: (hostPeerId: string | null) => void;
  private destroyed = false;

  // offer に応答しなかったピアを一時的に除外するブラックリスト
  private deadCandidates = new Map<string, number>(); // peerId → 除外期限 (ms)

  constructor(
    myPeerId: string,
    myJoinedAt: number,
    onHostChanged: (hostPeerId: string | null) => void
  ) {
    this.myPeerId = myPeerId;
    this.myJoinedAt = myJoinedAt;
    this.onHostChanged = onHostChanged;
  }

  /**
   * ピアリストから最古のピアをホストとして選出（deterministic）
   * tiebreak: joinedAt が同じなら peerId の辞書順で小さい方
   */
  /**
   * offer に応答しなかったピアをブラックリストに追加（デフォルト60秒）
   */
  markAsDead(peerId: string, durationMs = 60_000): void {
    console.log(`[HostElection] ${peerId.slice(-8)} を ${durationMs / 1000}秒間除外`);
    this.deadCandidates.set(peerId, Date.now() + durationMs);
  }

  electHost(peers: SignalingPeer[]): string | null {
    if (!peers || peers.length === 0) {
      return null;
    }

    // 期限切れのブラックリストエントリを掃除
    const now = Date.now();
    for (const [id, until] of this.deadCandidates) {
      if (now > until) this.deadCandidates.delete(id);
    }

    // 自分も候補に含める（自分はブラックリストしない）
    const allPeers = [
      ...peers.filter(p => !this.deadCandidates.has(p.peerId)),
      {
        peerId: this.myPeerId,
        isHost: false, // placeholder
        timestamp: this.myJoinedAt,
      },
    ];

    // joinedAt でソート（古い順） → peerId で辞書順（同一タイムスタンプの場合）
    const sorted = allPeers.sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return a.peerId.localeCompare(b.peerId);
    });

    return sorted[0]?.peerId ?? null;
  }

  /**
   * 自分がホストかどうか
   */
  get isElectedHost(): boolean {
    return this.currentHostPeerId === this.myPeerId;
  }

  /**
   * 現在のホストPeerId
   */
  get hostPeerId(): string | null {
    return this.currentHostPeerId;
  }

  /**
   * ホストからのハートビートを受信したときに呼ぶ
   */
  recordHeartbeat(): void {
    this.lastHeartbeatAt = Date.now();
  }

  /**
   * ホストが応答していないか（デフォルト30秒）
   */
  isHostUnresponsive(timeoutMs?: number): boolean {
    const timeout = timeoutMs ?? 30000;
    return Date.now() - this.lastHeartbeatAt > timeout;
  }

  /**
   * ホスト変更を通知（RoomSyncから呼ばれる）
   */
  notifyHostElection(peers: SignalingPeer[]): void {
    if (this.destroyed) return;

    const nextHost = this.electHost(peers);

    if (nextHost !== this.currentHostPeerId) {
      this.currentHostPeerId = nextHost;
      this.lastHeartbeatAt = Date.now(); // ハートビート監視もリセット
      this.onHostChanged(nextHost);
    }
  }

  /**
   * ハートビート送信を開始（自分がホストのとき）
   * コールバック: ハートビートメッセージを送信する関数
   */
  startHeartbeat(sendFn: () => void, intervalMs?: number): void {
    if (this.destroyed) return;

    const interval = intervalMs ?? 5000;

    this.heartbeatTimer = setInterval(() => {
      if (this.isElectedHost && !this.destroyed) {
        sendFn();
      }
    }, interval);
  }

  /**
   * 死活監視を開始
   * timeoutMs 以上ハートビートがなければ onHostChanged(null) を呼ぶ
   */
  startHealthCheck(timeoutMs?: number, checkIntervalMs?: number): void {
    if (this.destroyed) return;

    const timeout = timeoutMs ?? 30000;
    const checkInterval = checkIntervalMs ?? 5000;

    this.healthCheckTimer = setInterval(() => {
      if (this.destroyed) return;

      if (this.currentHostPeerId && !this.isElectedHost && this.isHostUnresponsive(timeout)) {
        // ホストが応答していない → 再選出
        this.currentHostPeerId = null;
        this.onHostChanged(null);
      }
    }, checkInterval);
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.destroyed = true;

    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.healthCheckTimer !== null) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
}
