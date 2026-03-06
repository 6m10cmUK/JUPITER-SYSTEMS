# JUPITER SYSTEMS

木林ユピテル（き-ばやし）の個人サイト。TRPGキャラクター管理ツールやPDF変換ツールなどを提供。

## 機能

### 🎲 Adrastea — TRPG盤面共有ツール

ブラウザ上で動作するTRPGオンラインセッション向け盤面共有ツール。
マップ・駒・シーン・チャット・BGM・カットインなどをリアルタイムに共有できる。

#### 主要機能

- **盤面（Board）** — Konva.js ベースの2Dキャンバス。駒の配置・移動、グリッド表示、ズーム＆パン
- **シーン管理** — 背景・前景画像の切り替え、複数シーンの保持
- **キャラクター管理** — キャラクターシート、立ち絵・アイコン画像、ステータス管理
- **チャット** — ダイスロール対応テキストチャット（BCDice連携、数百種のシステム対応）
- **BGMプレイヤー** — プレイリスト型BGM管理、複数トラック同時再生、YouTube連携
- **カットイン** — 全画面演出エフェクト
- **シナリオテキスト** — 画面下部へのテキスト表示（ナレーション・台詞用）
- **PDFビューア** — セッション中のルールブック参照
- **レイヤー管理** — ボードオブジェクトのレイヤー制御
- **ドックレイアウト** — flexlayout-react によるパネル自由配置、レイアウト保存/復元

#### ルーム管理

- カードグリッド型ルーム一覧（サムネイル表示）
- ドラッグ＆ドロップでカード並び替え（localStorage保存）
- ルーム作成・編集・削除
- ダイスシステム選択（検索付きドロップダウン、BCDice全システム対応）
- タグ管理（候補サジェスト付き入力）
- ルーム共有（URL発行＆コピー）
- 名前・タグ・ダイスシステムによる検索

#### セキュリティ

- Firestore Security Rules によるオーナー認証
- ルームおよび全サブコレクション（シーン、ピース、チャット等）はオーナーのみアクセス可能

#### アーキテクチャ

```
src/
├── pages/
│   └── Adrastea.tsx              # ルーティング・認証・オーナーチェック
├── contexts/
│   ├── AdrasteaContext.tsx        # 全グローバル状態の一元管理
│   └── AuthContext.tsx            # Firebase認証
├── hooks/
│   ├── useAdrastea.ts             # ピース・ルーム基本データ
│   ├── useAdrasteaChat.ts         # チャットメッセージ
│   ├── useScenes.ts               # シーン管理
│   ├── useCharacters.ts           # キャラクター管理
│   ├── useObjects.ts              # ボードオブジェクト
│   ├── useBgms.ts                 # BGMトラック
│   ├── useCutins.ts               # カットイン
│   ├── useScenarioTexts.ts        # シナリオテキスト
│   ├── useAssets.ts               # アセット（画像）管理
│   ├── useRooms.ts                # ルームCRUD・並び替え
│   └── useImagePreloader.ts       # 画像プリロード最適化
├── components/Adrastea/
│   ├── DockLayout.tsx             # flexlayout-react メインレイアウト
│   ├── TopToolbar.tsx             # ツールバー（パネル切替・BGMミニプレイヤー）
│   ├── Board.tsx                  # Konva.js 盤面
│   ├── RoomLobby.tsx              # ルーム選択・管理画面
│   ├── ChatPanel.tsx              # チャットUI
│   ├── ScenePanel.tsx             # シーン管理UI
│   ├── CharacterPanel.tsx         # キャラクター管理UI
│   ├── BgmPanel.tsx               # BGM管理UI
│   ├── BgmEngine.tsx              # BGM再生エンジン
│   ├── LayerPanel.tsx             # レイヤー管理
│   ├── CutinPanel.tsx             # カットイン管理
│   ├── ScenarioTextPanel.tsx      # シナリオテキスト管理
│   ├── PdfViewer.tsx              # PDFビューア
│   ├── CutinOverlay.tsx           # カットイン全画面演出
│   ├── ObjectOverlay.tsx          # オブジェクト操作
│   ├── ui/
│   │   ├── AdComponents.tsx       # 共通UIコンポーネント群
│   │   └── SortableList.tsx       # DnD対応ソート可能リスト
│   └── dock-panels/               # flexlayout パネルラッパー
│       ├── sharedComponents.ts    # パネル定義マップ
│       └── *DockPanel.tsx         # 各パネルコンポーネント
├── services/
│   ├── diceRoller.ts              # BCDice連携・ダイスロール
│   ├── assetService.ts            # アセットアップロード/取得
│   ├── encryption.ts              # 暗号化処理
│   └── adrasteaCache.ts           # クライアントキャッシュ
└── styles/
    ├── theme.ts                   # デザイントークン（CSS変数参照）
    └── flexlayout-catppuccin.css  # Catppuccin ダークテーマ
```

#### 共通UIコンポーネント（AdComponents.tsx）

| コンポーネント | 用途 |
|---------------|------|
| `AdInput` | テキスト入力 |
| `AdTextArea` | テキストエリア |
| `AdButton` | ボタン（primary / default / danger） |
| `AdSelect` | セレクトボックス |
| `AdCheckbox` | トグルスイッチ |
| `AdSlider` | スライダー |
| `AdSection` | 折りたたみセクション |
| `AdColorPicker` | カラーピッカー（パレット保存機能付き） |
| `AdModal` | モーダルダイアログ |
| `AdToggleButtons` | ボタン群トグル |
| `AdTagInput` | タグ入力（候補サジェスト付き） |

#### テーマ・デザイン規約

- Catppuccin系ダークテーマ
- 全ての色は `theme.ts` のセマンティックトークン経由で参照（ハードコード禁止）
- CSS変数は `.adrastea-root` スコープで定義（`flexlayout-catppuccin.css`）
- ボタンホバーは `ad-btn`（通常）/ `ad-btn-icon`（アイコン）CSSクラスで統一

#### データ構造（Firestore）

```
rooms/{roomId}
  ├── name, dice_system, tags[], owner_uid
  ├── active_scene_id, created_at, updated_at
  ├── scenes/{sceneId}
  │   ├── name, background_url, foreground_url
  │   └── objects/{objectId}  # 背景・前景・テキスト等
  ├── pieces/{pieceId}        # 盤面上の駒
  ├── messages/{messageId}    # チャットメッセージ
  ├── characters/{charId}     # キャラクターデータ
  ├── bgms/{bgmId}            # BGMトラック
  ├── cutins/{cutinId}        # カットイン定義
  └── scenario_texts/{textId} # シナリオテキスト
```

---

### 🎭 キャラクターギャラリー
- TRPGキャラクターの一覧表示
- キャラクター詳細情報の閲覧
- 立ち絵・アイコン画像の管理

### 🏠 ルームギャラリー
- TRPG用背景素材の一覧表示
- ルーム詳細情報の閲覧

### 📄 PDF→Markdown変換ツール
- PDFファイルのドラッグ&ドロップアップロード
- 高精度テキスト抽出（PyMuPDF使用）
- ページ範囲指定
- レイアウト解析（ヘッダー/フッター自動検出）
- Markdown形式への変換
- 変換結果のダウンロード

### 🎨 Character Display
- TRPGキャラクターシート生成ツール
- 立ち絵アップロード・編集機能
- 表情差分管理

## 技術スタック

### フロントエンド
- React 19 + TypeScript
- Vite 7
- flexlayout-react（ドックレイアウト）
- Konva.js / react-konva（2Dキャンバス）
- @dnd-kit（ドラッグ＆ドロップ）
- BCDice（ダイスロール）
- Firebase（認証・Firestore・Storage）
- Supabase（アセットストレージ）
- PDF.js（PDFプレビュー）
- lucide-react（アイコン）

### バックエンド
- FastAPI (Python)
- PyMuPDF（高精度PDF処理）
- uvicorn

## セットアップ

### ローカル開発

1. リポジトリをクローン
```bash
git clone https://github.com/yourusername/JUPITER-SYSTEMS.git
cd JUPITER-SYSTEMS
```

2. フロントエンドのセットアップ
```bash
npm install
cp .env.example .env
npm run dev
```

3. バックエンドのセットアップ
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

4. Firebase設定
- Firebase Consoleでプロジェクトを作成
- `.env` にFirebase設定を記入
- `firebase deploy --only firestore` でセキュリティルール＆インデックスをデプロイ

## デプロイ

- **フロントエンド**: Vercel（Vite preset）
- **バックエンド**: Render.com（FastAPI）
- **データベース**: Firebase Firestore
- **ストレージ**: Supabase Storage / Firebase Storage

## ライセンス

MIT License
