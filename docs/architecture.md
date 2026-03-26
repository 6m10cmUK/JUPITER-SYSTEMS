# アーキテクチャ概要 — JUPITER SYSTEMS

## システム全体図

```
┌──────────────────────────────────────────────────┐
│                    Vercel                        │
│  ┌─────────────────────────────────────────────┐ │
│  │         React + Vite (SPA)                  │ │
│  │  ┌──────────┬──────────┬──────────┐         │ │
│  │  │ Adrastea │ PDF2MD   │ Others   │         │ │
│  │  └────┬─────┴────┬─────┴──────────┘         │ │
│  └───────┼──────────┼──────────────────────────┘ │
└──────────┼──────────┼────────────────────────────┘
           │          │
     ┌─────▼──────┐ ┌─▼───────────┐
     │  Convex    │ │  FastAPI    │
     │ (realtime) │ │  (Python)   │
     │            │ │             │
     │ - Rooms    │ │ - PyMuPDF   │
     │ - Scenes   │ │ - Text      │
     │ - Objects  │ │   extraction│
     │ - Auth     │ │             │
     └─────┬──────┘ └─────────────┘
           │
     ┌─────▼───────┐
     │ Cloudflare  │
     │ R2 (assets) │
     └─────────────┘
```

## Adrastea アーキテクチャ

### データフロー

```
Convex (リアルタイムDB)
  ↕ useQuery / useMutation
AdrasteaContext (グローバル状態)
  ↕ Context Provider
各コンポーネント (Board, ScenePanel, LayerPanel, ...)
```

### 主要コンテキスト

- **AdrasteaContext** — ルーム・シーン・オブジェクト・レイヤーの状態管理。現在800行超の God Context で分割が課題。
- **AuthContext** — Convex Auth によるユーザー認証状態。

### パネルシステム

flexlayout-react による DockLayout。各パネルは `dock-panels/` 内のラッパーで登録。レイアウトは localStorage に保存/復元。

### アセット管理

- アップロード: `assetService.ts` → Cloudflare R2
- プリロード: ルーム入室時に全シーンの画像を `preloadImageBlobs` でバックグラウンド fetch
- キャッシュ: モジュールレベル `assetCache` で remount 時の再取得防止
- blob URL: アニメーション画像は毎回 `URL.createObjectURL` で新規生成（キャッシュ再利用するとアニメーション停止）

### 認証

Convex Auth を使用。Google OAuth + Anonymous（ゲスト）。Firebase Auth から移行済み。

## PDF2MD アーキテクチャ

### 処理フロー

```
PDFアップロード → FastAPI → PyMuPDF でテキスト抽出
  → カラム検出（縦余白ベース）
  → ヘッダー/フッター境界検出（統計的手法）
  → Markdown 整形
  → (オプション) AES-256-CBC 暗号化
```

### バックエンドモジュール

| モジュール | 役割 |
|-----------|------|
| `main.py` | FastAPI ルーティング |
| `pdf_processor.py` | PDF処理メインクラス |
| `common/text_extractor.py` | テキスト抽出 |
| `common/column_detector.py` | カラム自動認識 |
| `common/boundary_detector.py` | ヘッダー/フッター境界 |
| `common/text_processor.py` | テキスト後処理 |
| `common/text_style_analyzer.py` | フォント・スタイル解析 |
