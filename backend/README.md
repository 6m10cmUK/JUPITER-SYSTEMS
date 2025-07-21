# Backend Server Management

## サーバーの起動・停止・再起動

### 開発環境での起動
```bash
# 通常の起動（自動リロード有効）
python run_server.py

# または
cd backend
python run_server.py
```

### サーバーの停止
```bash
# バッチファイルを使用
stop_server.bat

# または Ctrl+C で停止
```

### サーバーの再起動（確実に変更を反映）
```bash
# バッチファイルを使用
restart_server.bat
```

### 本番環境での起動
```bash
# 自動リロードなし、シングルワーカー
python run_server_production.py
```

## トラブルシューティング

### ポート8000が使用中の場合
```bash
# Windowsでポート8000を使用しているプロセスを確認
netstat -ano | findstr :8000

# プロセスを強制終了
taskkill /F /PID [プロセスID]
```

### ログが表示されない場合
1. `app.log` ファイルを確認
2. ブラウザの開発者ツールでコンソールエラーを確認
3. `run_server.py` を直接実行して詳細なエラーを確認

### 変更が反映されない場合
1. `restart_server.bat` を実行
2. ブラウザのキャッシュをクリア（Ctrl+F5）
3. `__pycache__` フォルダを削除

## ログの確認方法

### コンソールログ
サーバー起動時のターミナルに表示されます：
- `[STARTUP]` - サーバー起動時
- `[HEALTH]` - ヘルスチェック
- `[API]` - APIエンドポイントへのアクセス
- `[PROCESSING]` - 処理中の情報
- `[SUCCESS]` - 成功時
- `[ERROR]` - エラー時

### ファイルログ
`backend/app.log` に保存されます。ローテーション設定済み（10MB x 3ファイル）。

## 開発のヒント

1. **自動リロード**: `run_server.py` を使用すると、コード変更時に自動的にサーバーが再起動します
2. **デバッグ**: VSCodeのデバッガーを使用する場合は、`reload=False` に設定してください
3. **パフォーマンス**: 本番環境では `run_server_production.py` を使用してください