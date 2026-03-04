/**
 * Adrastea テーマトークン定義
 *
 * 全コンポーネントはここから色を参照する。
 * CSS Custom Properties (`var(--xxx)`) 経由なので、
 * .adrastea-root のクラスを切り替えるだけでテーマ変更可能。
 */

/** セマンティックトークン名 → CSS変数参照 */
export const theme = {
  // ── 背景 ──
  bgBase: 'var(--ad-bg-base)',           // メイン背景
  bgSurface: 'var(--ad-bg-surface)',     // カード・パネル背景
  bgToolbar: 'var(--ad-bg-toolbar)',     // ツールバー背景
  bgInput: 'var(--ad-bg-input)',         // 入力フィールド背景
  bgOverlay: 'var(--ad-bg-overlay)',     // モーダルオーバーレイ背景

  // ── テキスト ──
  textPrimary: 'var(--ad-text-primary)',     // 主テキスト
  textSecondary: 'var(--ad-text-secondary)', // 副テキスト
  textMuted: 'var(--ad-text-muted)',         // 薄いテキスト・無効状態
  textOnAccent: 'var(--ad-text-on-accent)',  // アクセント色上のテキスト

  // ── ボーダー ──
  border: 'var(--ad-border)',               // 標準ボーダー
  borderInput: 'var(--ad-border-input)',     // 入力フィールドボーダー

  // ── アクセント ──
  accent: 'var(--ad-accent)',               // プライマリアクセント（青）
  accentHover: 'var(--ad-accent-hover)',     // アクセントホバー

  // ── セマンティック ──
  danger: 'var(--ad-danger)',               // 削除・エラー
  dangerHover: 'var(--ad-danger-hover)',     // 削除ホバー
  success: 'var(--ad-success)',             // 成功・有効
  warning: 'var(--ad-warning)',             // 警告・ハイライト

  // ── ステータス ──
  statusRed: 'var(--ad-status-red)',
  statusBlue: 'var(--ad-status-blue)',
  statusGreen: 'var(--ad-status-green)',
  statusYellow: 'var(--ad-status-yellow)',
} as const;

export type ThemeTokens = typeof theme;
