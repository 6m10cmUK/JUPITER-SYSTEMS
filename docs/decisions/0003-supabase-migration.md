# 0003: Convex → Supabase 移行

## ステータス
承認（2026-03）

## コンテキスト
0001 で採用した Convex でリアルタイム同期・認証・バックエンドを統合していたが、以下の問題が発生した：
- Convex の無料枠制限（関数実行回数・帯域）がセッション中の同時接続で逼迫
- スキーマ変更時のマイグレーションが手動かつ煩雑
- RLS（Row Level Security）相当の細粒度認可が Convex では実装しづらい
- PostgreSQL エコシステム（SQL直接操作、既存ツールとの連携）が使えない

## 決定
Convex を廃止し、Supabase（PostgreSQL + Realtime + Auth）に移行する。Cloudflare R2/D1/Workers は維持。

## 理由
- PostgreSQL の RLS でテーブル単位の認可を宣言的に記述可能
- Supabase Realtime で Convex 同等のリアルタイム同期が実現可能
- Supabase Auth で Google OAuth + Anonymous をそのまま移行可能
- SQL マイグレーションで型安全なスキーマ管理
- 無料枠が Convex より余裕がある（DB 500MB、Auth 50,000 MAU）

## 結果
- convex/ ディレクトリを完全削除
- 全フック（useScenes, useCharacters 等）を Supabase SDK + Realtime に書き換え
- 認証を Convex Auth → Supabase Auth に移行
- spec-data-model.md, spec-api.md, spec-architecture.md を Supabase ベースに書き直し
- R2（アセット配信）、D1（チャットアーカイブ・ルームアーカイブ）、Workers（JWT検証・ファイル操作）は変更なし
