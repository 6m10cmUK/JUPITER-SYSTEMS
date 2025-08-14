# Discord Botサーバーへの移植ガイド

## 移植方法の比較

### 方法1: HTTPサーバーを追加（推奨）
Discord botにExpressサーバーを追加して、両方を同時に実行する。

**メリット**:
- 既存のPython APIをそのまま使える
- 独立性が高い
- メンテナンスが簡単

**実装例**:
```typescript
// src/httpServer.ts
import express from 'express';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.HTTP_PORT || 8000;

// Python APIプロセスを起動
const pythonApi = spawn('python', ['backend/main.py'], {
  env: { ...process.env, PORT: '8001' }
});

// リバースプロキシとして動作
app.use('/api', (req, res) => {
  // localhost:8001にプロキシ
});

app.listen(PORT);
```

### 方法2: Node.jsに完全移植
PDF処理をNode.jsライブラリで実装し直す。

**メリット**:
- 単一言語で管理
- デプロイが簡単

**デメリット**:
- 移植作業が大変
- PyMuPDFの高度な機能が使えない可能性

**必要なパッケージ**:
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "pdf-parse": "^1.1.1",
    "multer": "^1.4.5",
    "cors": "^2.8.5"
  }
}
```

## North Flarkでの設定

### 1. 環境変数の追加
```env
# 既存のDiscord bot設定
DISCORD_TOKEN=xxx

# PDF API設定
PDF_API_PORT=8001
HTTP_PORT=8000
ALLOWED_ORIGINS=https://trpg-pdf2md-tool.vercel.app
```

### 2. プロセス管理
PM2やsupervisorを使って複数プロセスを管理：

```json
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'discord-bot',
      script: './dist/index.js',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'pdf-api',
      script: 'python',
      args: 'backend/main.py',
      interpreter: 'none',
      env: {
        PORT: 8001
      }
    }
  ]
};
```

### 3. 必要な依存関係
```bash
# Pythonランタイムのインストール
apt-get install python3 python3-pip

# PDF処理の依存関係
pip install -r backend/requirements.txt
```

## 推奨構成

```
JUPITER-SYSTEM.V.3.2/
├── src/
│   ├── index.ts          # Discord bot
│   └── httpServer.ts     # Express server (新規)
├── backend/              # PDF処理API (コピー)
│   ├── main.py
│   ├── pdf_processor.py
│   └── common/
└── package.json          # expressを追加
```

## 注意点

1. **ポート設定**: Discord botとPDF APIで異なるポートを使用
2. **CORS設定**: フロントエンドのURLを許可リストに追加
3. **メモリ使用量**: PDF処理は重いので、サーバーのリソースを確認
4. **ログ管理**: 両方のプロセスのログを適切に管理

## セキュリティ考慮事項

- PDF APIは内部通信のみに制限することも可能
- 認証トークンを共有して、Discord bot経由でのみアクセス可能にする
- ファイルアップロードのサイズ制限を設定