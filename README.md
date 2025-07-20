# PDF to Markdown Converter

高精度なPDFからMarkdownへの変換ツール。PyMuPDFを使用した精密なテキスト抽出とレイアウト解析を提供します。

## 機能

- 📄 PDFファイルのドラッグ&ドロップアップロード
- 🔍 高精度テキスト抽出（PyMuPDF使用）
- 📑 ページ範囲指定
- 🎯 レイアウト解析（ヘッダー/フッター自動検出）
- 📝 Markdown形式への変換
- 💾 変換結果のダウンロード

## デモ

- フロントエンド: [https://your-app.vercel.app](https://your-app.vercel.app)
- API: [https://your-api.onrender.com](https://your-api.onrender.com)

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
2. New > Web Service を選択
3. GitHubリポジトリを接続
4. 以下の設定を使用：
   - **Root Directory**: `backend`
   - **Environment**: `Docker`
   - **Port**: `8000`

### フロントエンド（Vercel）

1. [Vercel](https://vercel.com)でアカウント作成
2. GitHubリポジトリをインポート
3. 環境変数を設定：
   ```
   VITE_API_URL=https://your-api.onrender.com
   ```

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

## 貢献

プルリクエストを歓迎します！

1. Fork it
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request