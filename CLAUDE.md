# CLAUDE.md — JUPITER SYSTEMS

木林ユピテルの個人サイト兼ツール群。TRPG支援ツール・PDF変換・ダーツスコアリング等を提供する。

## 重要な指示

**必ず日本語で返答すること。**

**つぶやき機能**: 作業中の任意のタイミングで `__think__/tweet.txt` に現在の作業や感想をつぶやく。140文字以内、タイムスタンプ付き追記形式。
```
[2025-01-22 14:30:45] つぶやき内容
```

## スキル使用制限

- `/commit-pr` はこのリポジトリでは使わない（no9-monorepo 向けのため）

## プロジェクト一覧

| プロジェクト | パス | 概要 |
|------------|------|------|
| **Adrastea** | `src/components/Adrastea/`, `src/pages/Adrastea.tsx` | TRPG盤面共有ツール（メイン開発中） |
| **PDF2MD** | `src/pages/PDF2MD.tsx`, `src/components/PDFUploader/` 等, `backend/` | PDF→Markdown高精度変換 |
| **Juno** | `src/components/Juno/`, `src/pages/Juno.tsx`（feat/Juno ブランチ） | ダーツスコアリングツール |
| **CharacterDisplayGenerator** | `src/pages/CharacterDisplayGenerator.tsx` | キャラクター表示ジェネレーター |
| **DiscordObs** | `src/pages/DiscordObs.tsx`, `src/components/DiscordObs/` | Discord OBSカスタマイザー |
| **Home** | `src/pages/Home.tsx` | ポータルサイトトップ |

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 19 + TypeScript + Vite |
| バックエンド（Adrastea） | Convex（リアルタイムDB + サーバー関数） |
| バックエンド（PDF2MD） | FastAPI (Python) + PyMuPDF |
| 認証 | Convex Auth (Google OAuth + Anonymous) |
| アセットストレージ | Cloudflare R2 |
| スタイリング | CSS Modules + テーマトークン (`src/styles/theme.ts`) |
| テスト | Vitest + Playwright |
| デプロイ | Vercel (フロント) + Convex (Adrastea バックエンド) |

## 開発コマンド

```bash
# フロントエンド
npm install          # 依存関係インストール
npm run dev          # 開発サーバー (localhost:6100, strictPort)
npm run build        # 型チェック (tsc -b) + ビルド
npm run lint         # ESLint
npm run test         # Vitest (単発実行)
npm run test:watch   # Vitest (ウォッチモード)
npm run test:e2e     # Playwright E2Eテスト
npm run build:serve  # ビルド + プレビュー
npm run clean:dev    # Viteキャッシュクリア + dev

# Convex（Adrastea バックエンド）
npx convex dev       # 開発モード（ローカルで自動同期）
npx convex deploy    # 本番デプロイ

# Python バックエンド（PDF2MD）
cd backend && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## リポジトリ構造

```
├── CLAUDE.md              # このファイル
├── src/
│   ├── pages/             # ルーティング先ページ
│   ├── components/
│   │   ├── Adrastea/      # TRPG盤面ツール UI
│   │   ├── PDFUploader/   # PDF変換 UI
│   │   ├── PDFViewer/     # PDFプレビュー
│   │   ├── DiscordObs/    # Discord OBS UI
│   │   └── Auth/          # 認証 UI
│   ├── contexts/          # React Context
│   ├── hooks/             # カスタムフック
│   ├── services/          # API通信・ユーティリティ
│   ├── styles/            # テーマ・CSS
│   └── types/             # 型定義
├── convex/                # Convex バックエンド（Adrastea）
├── backend/               # Python バックエンド（PDF2MD）
├── e2e/                   # E2Eテスト (Playwright)
├── docs/                  # アーキテクチャ・設計判断
├── .claude/
│   ├── settings.local.json
│   ├── skills/            # 再利用可能なAIワークフロー
│   └── hooks/             # 自動チェック
└── __think__/             # 設計メモ・つぶやき
```

## 新機能開発フロー（Spec-First TDD）

新機能の追加・既存機能の変更時は、以下の3ステップを必ず順番に踏む。ステップを飛ばさない。

### Step 1: 仕様確定
- 対象機能の spec ファイル（`docs/specs/機能名.md`）を確認
- 未記載の機能は spec を先に書く。曖昧なまま次に進まない
- 変更が他機能に波及する場合、関連 spec（`spec-data-model.md` / `spec-api.md` 含む）も同時に更新
- 新規機能の場合は `docs/specs/` に新しい spec ファイルを作成し、`docs/spec-features.md`（インデックス）にリンクを追加

### Step 2: テスト設計・実装（RED）
- spec に基づいてテストを先に書く。この時点で全テストは失敗（RED）する状態が正しい
- `/tdd` スキルの test-writer を活用
- テスト種別の判断基準:

| 種別 | 判断基準 | 置き場 |
|------|---------|--------|
| E2E (Playwright) | DOM・ブラウザが必要な操作フロー | `e2e/機能名-e2e.spec.ts` |
| ユニット (Vitest) | 純粋ロジック（パーサー、計算、変換、バリデーション） | `src/__tests__/対象名.test.ts` |

- 迷ったら E2E。このプロジェクトは E2E 中心

### Step 3: 実装（GREEN）
- テストが GREEN になるまで実装
- テスト追加なしに実装コードを書かない
- 全テスト通過後、リファクタリング（REFACTOR）は任意

## コーディングルール

- **色のハードコード絶対禁止** — 色は必ず `src/styles/theme.ts` のトークン経由で使う
- **ソート可能リスト** → `SortableListPanel` + `SortableListItem` (`src/components/Adrastea/ui/SortableList.tsx`)
- **型インポート** — `verbatimModuleSyntax: true` のため `import type` を使う
- **push 前に型チェック + 画面確認** を必ず実施

## 環境変数

`.env.example` を `.env.local` にコピーして設定する。

| 変数 | 用途 | 例 |
|------|------|-----|
| `CONVEX_DEPLOYMENT` | Convex デプロイメント名 | `useful-jay-379` |
| `VITE_CONVEX_URL` | Convex クライアントURL | `https://useful-jay-379.convex.cloud` |
| `VITE_R2_WORKER_URL` | Cloudflare Worker（アセット・認証） | `https://your-worker.workers.dev` |
| `VITE_API_URL` | Python バックエンドURL（PDF2MD） | `http://localhost:8000` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth クライアントID | `*.apps.googleusercontent.com` |

## Gotchas（注意点）

- **Vite strictPort** — ポート6100固定。使用中だと起動失敗する（フォールバックなし）
- **blob URL とアニメーション** — 同じ blob URL を `<img src>` に再利用するとGIF/WebP/APNGの再生が止まる。表示用は毎回 `URL.createObjectURL` で新規生成
- **useEffect 無限ループ** — `useEffect([objectLiteral])` で毎レンダー新参照になる。`initializedRef` で初回のみ適用するパターンを使う
- **`import type` 必須** — `verbatimModuleSyntax: true` のため型インポートに `import type` か `type` キーワードが必要。忘れるとビルドエラー
- **ダイスロール** — bcdice(Opal/Ruby→JS)はViteと非互換。自前ダイスパーサーに置換済み（`src/services/diceRoller.ts`）
- **Cross-Origin-Opener-Policy** — Vite dev server に `same-origin-allow-popups` ヘッダー設定済み（Google OAuth ポップアップ対応）

## 通信プロトコル: Agent Teams

エージェントチーム使用時は Agent Teams の組み込み機能を使う。

| 操作 | API |
|------|-----|
| メッセージ送信 | `SendMessage(type="message", recipient="名前", ...)` |
| 全体通知 | `SendMessage(type="broadcast", ...)` |
| タスク作成 | `TaskCreate(subject="...", description="...")` |
| タスク割当 | `TaskUpdate(taskId="...", owner="名前")` |
| タスク完了 | `TaskUpdate(taskId="...", status="completed")` |
| タスク一覧 | `TaskList()` |
