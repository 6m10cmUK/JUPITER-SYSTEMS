# デプロイガイド（詳細版）

このガイドでは、PDF to Markdown ConverterをVercel（フロントエンド）とRender.com（バックエンド）にデプロイする手順を詳しく説明します。

## 前提条件
- GitHubアカウント
- このリポジトリをGitHubにプッシュ済み

## 1. バックエンドのデプロイ（Render.com）

### アカウント作成
1. https://render.com にアクセス
2. 「Get Started for Free」をクリック
3. GitHubアカウントでサインイン（推奨）

### Web Serviceの作成
1. ダッシュボードで「New +」ボタンをクリック
2. 「Web Service」を選択

### リポジトリの接続
1. 「Connect a repository」画面が表示される
2. GitHubアカウントが連携されていない場合は「Connect GitHub」をクリック
3. リポジトリ一覧から「TRPG-pdf2mdTOOL」を探して「Connect」をクリック

### サービスの設定
以下の設定を入力します：

| 項目 | 値 | 説明 |
|------|-----|------|
| **Name** | `trpg-pdf2md-api` | サービス名（任意の名前でOK） |
| **Region** | `Singapore` | 日本から最も近いリージョン |
| **Branch** | `main` | デプロイするブランチ |
| **Root Directory** | `backend` | バックエンドコードのディレクトリ |
| **Language** | `Python 3` | ランタイム言語 |
| **Build Command** | `pip install -r requirements.txt` | 依存関係のインストール |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` | サーバー起動コマンド |

### インスタンスタイプの選択
- 「Instance Type」で「**Free**」を選択（無料プラン）

### デプロイ
1. 「Create Web Service」または「Deploy」ボタンをクリック
2. デプロイが開始されます（5-10分程度かかります）
3. ログを確認しながら待機

### デプロイ完了の確認
- デプロイが成功すると、URLが発行されます
- 例: `https://trpg-pdf2md-api.onrender.com`
- ブラウザでアクセスして `{"message":"PDF to Markdown API","version":"1.0.0"}` が表示されればOK

### APIドキュメントの確認
- 発行されたURLに `/docs` を追加してアクセス
- 例: `https://trpg-pdf2md-api.onrender.com/docs`
- FastAPIの自動生成ドキュメントが表示されます

## 2. フロントエンドのデプロイ（Vercel）

### アカウント作成
1. https://vercel.com にアクセス
2. 「Sign Up」をクリック
3. 「Continue with GitHub」でGitHubアカウントでサインイン

### プロジェクトの作成
1. ダッシュボードで「Add New...」をクリック
2. 「Project」を選択

### リポジトリのインポート
1. 「Import Git Repository」画面が表示される
2. リポジトリ一覧から「TRPG-pdf2mdTOOL」を見つける
3. 「Import」ボタンをクリック

### プロジェクト設定
以下の設定を確認・入力します：

| 項目 | 値 | 説明 |
|------|-----|------|
| **Project Name** | 自動生成される名前でOK | プロジェクト名 |
| **Framework Preset** | `Vite` | 自動検出されるはず |
| **Root Directory** | `.` | そのまま（変更不要） |
| **Build Command** | `npm run build` | ビルドコマンド |
| **Output Directory** | `dist` | ビルド出力先 |
| **Install Command** | `npm install` | 自動設定 |

### 環境変数の設定
1. 「Environment Variables」セクションを開く
2. 以下を追加：
   - **Name**: `VITE_API_URL`
   - **Value**: Render.comで発行されたバックエンドのURL
   - 例: `https://trpg-pdf2md-api.onrender.com`

※バックエンドがまだデプロイ中の場合は、仮の値（`https://example.com`）を入れて、後で更新することも可能

### デプロイ
1. 「Deploy」ボタンをクリック
2. デプロイが開始されます（2-3分程度）
3. 進行状況を確認

### デプロイ完了の確認
- デプロイが成功すると、URLが発行されます
- 例: `https://trpg-pdf2md-tool.vercel.app`
- ブラウザでアクセスして、PDFアップロード画面が表示されればOK

## 3. 環境変数の更新（必要な場合）

### Vercelで環境変数を更新する方法
1. Vercelのダッシュボードでプロジェクトを選択
2. 「Settings」タブを開く
3. 左メニューから「Environment Variables」を選択
4. `VITE_API_URL`の値を更新
5. 「Save」をクリック
6. 「Deployments」タブから最新のデプロイメントの「...」メニューをクリック
7. 「Redeploy」を選択して再デプロイ

## トラブルシューティング

### Render.comでビルドエラーが出る場合
- **PyMuPDFのインストールエラー**: システム依存関係が不足している可能性
  - 解決策: Dockerfileを使用するか、`apt-packages`ファイルを追加

### Vercelでビルドエラーが出る場合
- **node_modulesが大きすぎる**: ビルドキャッシュをクリア
  - 解決策: Vercelダッシュボードで「Settings」→「Functions」→「Clear Cache」

### CORSエラーが出る場合
- フロントエンドからバックエンドにアクセスできない
  - 解決策: `backend/main.py`のCORS設定にVercelのURLを追加

## 無料プランの制限

### Render.com（Free tier）
- **スリープ**: 15分間アクセスがないとスリープ状態になる
- **月間稼働時間**: 750時間
- **帯域**: 100GB/月
- **ビルド時間**: 500分/月

### Vercel（Hobby plan）
- **帯域**: 100GB/月
- **ビルド時間**: 6,000分/月
- **同時実行ビルド**: 1
- **商用利用**: 可能

## 次のステップ

デプロイが完了したら：
1. 実際にPDFファイルをアップロードしてテスト
2. APIとの連携を実装（現在は未実装）
3. 必要に応じてカスタムドメインを設定

## 参考リンク
- [Render.com Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)