-- users テーブルに RLS を有効化し、認証済みユーザーが他ユーザーの display_name, avatar_url を読めるようにする
-- room_members JOIN でメンバー名・アバターを取得するために必要

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全ユーザーの基本情報を読める
CREATE POLICY users_select ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 自分自身のレコードのみ更新可能
CREATE POLICY users_update ON public.users
  FOR UPDATE USING (id = auth.uid());

-- SELECT 権限を付与（PostgREST の embedded join に必要）
GRANT SELECT ON public.users TO authenticated;
