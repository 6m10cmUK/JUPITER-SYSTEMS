# 0002: Firebase Auth → Convex Auth 移行

## ステータス
廃止（2026-03）— 0003 で Supabase Auth に移行

## コンテキスト
Convex 採用に伴い、認証も Convex エコシステムに統一する方が管理が楽。Firebase Auth は Convex との連携に追加設定が必要。

## 決定
Firebase Auth を廃止し、Convex Auth（Google OAuth + Anonymous）に完全移行する。

## 理由
- Convex のユーザーテーブルと認証が自然に統合される
- Firebase SDK の依存を減らせる（バンドルサイズ削減）
- 認証フローがシンプルになる

## 結果
- `src/services/auth.ts` 削除
- `src/contexts/AuthContext.tsx` を Convex Auth ベースに書き換え
- Google ログイン動作確認済み（2026-03-12）
