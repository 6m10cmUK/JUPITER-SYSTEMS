# Adrastea API 仕様書

TRPG盤面共有ツール「Adrastea」のバックエンドAPI仕様。Supabase (PostgreSQL + RLS) をメインDB、Cloudflare Workers (R2 + D1) をアセット配信・チャットアーカイブ・ルームアーカイブに使用。

## 認証

### Supabase Auth

Google OAuth + Anonymous（ゲスト）をサポート。認証後、Supabase JWT が発行される。

### JWT 検証（Workers）

Cloudflare Workers は Supabase JWKS から公開鍵を取得し、JWT を検証（ES256/RS256）。ペイロードから `sub`（uid）、`is_anonymous`、`user_metadata` を抽出。公開鍵は5分キャッシュ。

### ロール階層

```
guest < user < sub_owner < owner
```

- owner: ルーム全操作。メンバー権限管理
- sub_owner: シーン・オブジェクト・BGM等の編集
- user: 自キャラ編集、チャット送信、駒移動
- guest: 閲覧のみ

---

## Supabase RLS ポリシー

全テーブルで Row Level Security を有効化。`is_room_member(room_id)` 関数でルームメンバーシップを検証。

### 共通認可関数

- `get_auth_user_id()`: 現在ユーザーのID取得
- `is_room_member(room_id)`: room_members テーブルで参加確認
- `get_room_role(room_id)`: ルーム内ロール取得

### テーブル別ポリシー

| テーブル | SELECT | INSERT | UPDATE | DELETE |
|---------|--------|--------|--------|--------|
| rooms | member | owner新規 | owner | owner |
| room_members | member | owner | owner | owner |
| scenes | member | member | member | member |
| objects | member | member | member | member |
| bgms | member | member | member | member |
| characters_stats | member | member | member | member |
| characters_base | member | member | member | member |
| pieces | member | member | member | member |
| cutins | member | member | member | member |
| scenario_texts | member | member | member | member |
| messages | member | member | member | member |
| channels | member | member | member | member |
| assets | 認証ユーザー全員 | 自分のみ | 自分のみ | 自分のみ |

### 特記事項

- messages の `allowed_user_ids`: 秘密ダイスの可視化制御。配列に含まれるユーザーのみ閲覧可
- assets: ルームを跨いで参照可能にするため、認証済みなら全員 SELECT 可
- Auth トリガー: Google OAuth 後に users テーブルに自動レコード作成

---

## Cloudflare Workers API

Base URL: `VITE_R2_WORKER_URL`（環境変数で設定）

### ファイル操作

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| GET | `/file/:key` | なし | R2 ファイル配信（public） |
| POST | `/upload` | JWT | R2 ファイルアップロード（自動圧縮） |
| DELETE | `/delete` | JWT | R2 ファイル削除 |

#### POST /upload

FormData で `file` + `path` を送信。Worker は path をそのまま R2 キーとして使用。

R2 キー例: `users/{uid}/images/{timestamp}-{random}.webp`

画像は自動圧縮（WebP変換、GIFフレーム保持）。音声は圧縮なし。

#### DELETE /delete

`{ path: string }` を JSON で送信。R2 から該当キーを削除。

### ルーム管理

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| GET | `/api/rooms` | JWT | ルーム一覧（ownerのみ） |
| POST | `/api/rooms` | JWT | ルーム作成 |
| GET | `/api/rooms/:id` | JWT | ルーム詳細 |
| PATCH | `/api/rooms/:id` | JWT | ルーム更新（ownerのみ） |
| DELETE | `/api/rooms/:id` | JWT | ルーム削除（ownerのみ） |

### スナップショット（D1）

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| GET | `/api/rooms/:id/snapshot` | JWT | D1からルームデータ取得（復元用） |
| PUT | `/api/rooms/:id/snapshot` | JWT | D1にルームデータ保存（JSON） |

### アーカイブ・復元

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| POST | `/api/rooms/:id/archive` | JWT | ルームデータをD1に退避 |
| POST | `/api/rooms/:id/restore` | JWT | D1からルームデータを復元 |

### チャット履歴（D1）

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| GET | `/api/rooms/:id/messages` | JWT | 過去ログ取得。`?before=<timestamp>&limit=200` |
| POST | `/api/rooms/:id/messages/archive` | JWT or X-Archive-Secret | メッセージバッチ登録 |
| DELETE | `/api/rooms/:id/messages` | JWT | チャット全削除 |

D1制限: ルームあたり8,192件。超過時は古いものから自動削除。Supabase側は直近200件を保持し、古いメッセージはD1にアーカイブ。

### アセットメタデータ

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| GET | `/api/assets` | JWT | 自分のアセット一覧 |
| POST | `/api/assets` | JWT | メタデータ登録 |
| GET | `/api/assets/:id` | なし | アセット単体取得 |
| PATCH | `/api/assets/:id` | JWT | タグ・タイトル更新 |

### 管理者API

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| GET | `/api/admin/assets` | JWT (Admin) | 全アセット一覧 |
| DELETE | `/api/admin/assets/:id` | JWT (Admin) | アセット削除 |

---

## フロントエンド API 呼び出しパターン

### 共通

`apiFetch(path, init, token)` でJWT `Bearer` ヘッダー付きリクエスト送信。設定は `src/config/api.ts`。

### Supabase クライアント

フロントから直接 Supabase SDK でCRUD操作。RLS がサーバー側で認可。

```typescript
// 読み取り（Realtime subscription）
supabase.from('scenes').select('*').eq('room_id', roomId)

// 書き込み
supabase.from('scenes').insert({ id, room_id, name, ... })
supabase.from('scenes').update({ name }).eq('id', sceneId)
supabase.from('scenes').delete().eq('id', sceneId)
```

Realtime で変更をリアルタイム監視：
```typescript
supabase.channel(`room:${roomId}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'scenes', filter: `room_id=eq.${roomId}` }, handler)
  .subscribe()
```

### ファイルアップロード

```typescript
// src/services/fileUpload.ts
uploadImage(file, path)  // 画像 → WebP自動圧縮 → R2
uploadAudio(file, path)  // 音声 → そのまま → R2
deleteFile(path)          // R2削除
```

### チャットアーカイブ

Supabase Realtime で messages テーブルを監視。過去ログは D1 から `GET /api/rooms/:id/messages` で取得。

---

## レート制限・ストレージ制限

- Workers: 1日90,000リクエスト（無料枠）
- R2: 1GB/ユーザー
- D1: ルームあたり8,192メッセージ
- Supabase: 直近200メッセージ保持

---

## 参考ファイル

- Worker ルーティング: `worker/src/index.ts`
- ルームAPI: `worker/src/routes/rooms.ts`
- JWT検証: `worker/src/utils/jwt.ts`
- RLS定義: `supabase/migrations/001_init.sql`
- フロントAPI設定: `src/config/api.ts`
- フック: `src/hooks/use*.ts`
