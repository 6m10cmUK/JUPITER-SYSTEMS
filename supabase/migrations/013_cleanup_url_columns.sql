-- pieces.image_url → image_asset_id にリネーム（型定義と合わせる）
ALTER TABLE public.pieces RENAME COLUMN image_url TO image_asset_id;

-- 死んだ URL カラムを削除（asset_id に移行済み）
ALTER TABLE public.rooms DROP COLUMN IF EXISTS foreground_url;
ALTER TABLE public.scenes DROP COLUMN IF EXISTS background_url;
ALTER TABLE public.scenes DROP COLUMN IF EXISTS foreground_url;
