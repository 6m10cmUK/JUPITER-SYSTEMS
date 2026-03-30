-- sender_avatar (URL) → sender_avatar_asset_id (アセットID) にリネーム
ALTER TABLE public.messages RENAME COLUMN sender_avatar TO sender_avatar_asset_id;
