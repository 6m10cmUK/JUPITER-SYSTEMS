# JUPITER SYSTEMS

木林ユピテル（き-ばやし）の個人サイト。TRPGキャラクター管理ツールやPDF変換ツールなどを提供。

## 機能

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
- React + TypeScript
- Vite
- PDF.js（プレビュー用）

### バックエンド
- FastAPI (Python)
- PyMuPDF（高精度PDF処理）
- uvicorn

## セットアップ

### ローカル開発

1. リポジトリをクローン
```bash
git clone https://github.com/yourusername/TRPG-pdf2mdTOOL.git
cd TRPG-pdf2mdTOOL
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
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

## デプロイ

### バックエンド（Render.com）

1. [Render.com](https://render.com)でアカウント作成
2. Dashboard → 「New +」→「Web Service」を選択
3. GitHubリポジトリを接続（「Connect a repository」→ TRPG-pdf2mdTOOL を選択）
4. 以下の設定を使用：
   - **Name**: `trpg-pdf2md-api`（任意の名前）
   - **Region**: `Singapore`（日本から近い）
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Language**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`（自動検出される場合あり）
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`（無料プラン）
5. 「Deploy」をクリック（デプロイに5-10分かかります）
6. デプロイ完了後、URLが発行されます（例: `https://trpg-pdf2md-api.onrender.com`）

### フロントエンド（Vercel）

1. [Vercel](https://vercel.com)でアカウント作成（GitHubでサインアップ）
2. ダッシュボードで「Add New...」→「Project」
3. GitHubリポジトリ一覧から「TRPG-pdf2mdTOOL」を選択して「Import」
4. プロジェクト設定：
   - **Framework Preset**: `Vite`（自動検出される）
   - **Root Directory**: そのまま（変更不要）
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 環境変数を設定（Environment Variables）：
   ```
   Name: VITE_API_URL
   Value: https://your-api.onrender.com（Render.comで発行されたURL）
   ```
   ※最初は仮の値（例: `https://example.com`）でも可。後で更新できます
6. 「Deploy」をクリック
7. デプロイ完了後、URLが発行されます（例: `https://trpg-pdf2md-tool.vercel.app`）

### 代替デプロイ先

#### バックエンド
- **Railway.app**: `railway.json`設定済み
- **Fly.io**: Dockerfileを使用してデプロイ可能
- **Heroku**: 無料枠終了だが、有料プランで利用可能

#### フロントエンド
- **GitHub Pages**: 静的サイトとしてデプロイ
- **Netlify**: Vercelと同様の手順

## 使い方

1. PDFファイルをドラッグ&ドロップまたは選択
2. ページ範囲を指定（オプション）
3. 「変換」ボタンをクリック
4. Markdown形式で結果を確認
5. 必要に応じてダウンロード

## API仕様

### `POST /api/extract-text`
PDFからテキストを抽出

**パラメータ:**
- `file`: PDFファイル（必須）
- `start_page`: 開始ページ（デフォルト: 1）
- `end_page`: 終了ページ（デフォルト: 最終ページ）
- `preserve_layout`: レイアウト保持（デフォルト: true）

**レスポンス:**
```json
{
  "total_pages": 10,
  "extracted_pages": [...],
  "full_text": "..."
}
```

## ライセンス

MIT License


1. Fork it
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request