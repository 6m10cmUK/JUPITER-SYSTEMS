-- public.users.onboarded カラムを削除
-- オンボーディング判定は auth.users.user_metadata.onboarded で行うため不要
ALTER TABLE public.users DROP COLUMN IF EXISTS onboarded;
