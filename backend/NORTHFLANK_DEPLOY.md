# Northflankへのデプロイ構成

## 推奨アーキテクチャ

### オプション1: 単一サービス構成（推奨）
Discord BotとPDF APIを1つのサービスとして動かす

```dockerfile
# Dockerfile
FROM nikolaik/python-nodejs:python3.10-nodejs18

# Node.js依存関係
WORKDIR /app
COPY package*.json ./
RUN npm install

# Python依存関係
COPY backend/requirements.txt ./backend/
RUN pip install -r backend/requirements.txt

# アプリケーションコード
COPY . .
RUN npm run build

# 両方のプロセスを起動
CMD ["sh", "-c", "python backend/main.py & node dist/index.js"]
```

### オプション2: 2サービス構成
無料プランの2サービス枠を使い切る

**Service 1: Discord Bot**
- ポート: 不要（Discordへの接続のみ）
- ランタイム: Node.js

**Service 2: PDF API**
- ポート: 8000（HTTP）
- ランタイム: Python

## 環境変数設定

```env
# Discord Bot
DISCORD_TOKEN=your-token

# PDF API
ALLOWED_ORIGIN=https://trpg-pdf2md-tool.vercel.app
ENVIRONMENT=production

# 共通
NODE_ENV=production
```

## コスト最適化のヒント

1. **キャッシュの活用**
   - 処理済みPDFをメモリキャッシュ
   - 同じファイルの再処理を避ける

2. **ファイルサイズ制限**
   ```python
   MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
   ```

3. **レート制限**
   ```python
   from fastapi_limiter import FastAPILimiter
   # 1分間に10リクエストまで
   ```

## デプロイ手順

1. **リポジトリの準備**
   ```bash
   # Discord botプロジェクトにbackendをコピー
   cp -r backend/ JUPITER-SYSTEM.V.3.2/
   ```

2. **Dockerfileの作成**
   上記のDockerfileを使用

3. **Northflankでの設定**
   - GitHubリポジトリを接続
   - ビルド設定でDockerfileを指定
   - 環境変数を設定
   - ポート8000を公開設定

4. **監視設定**
   - メモリ使用量の監視
   - 帯域幅使用量のアラート設定

## 帯域幅計算例

- PDFアップロード: 平均5MB
- 処理結果ダウンロード: 平均100KB
- 月間100回の処理: (5MB + 0.1MB) × 100 = 510MB
- **コスト**: 0.51GB × $0.15 = **$0.08/月**

少量の利用なら、ほぼ無料で運用可能！