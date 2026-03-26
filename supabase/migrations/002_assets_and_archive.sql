-- Adrastea: アセットメタデータ + ルームアーカイブ対応
-- 作成日: 2026-03-26

-- ================================================================
-- 1. rooms テーブルに archived フラグ追加
-- ================================================================

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS last_accessed_at bigint;

-- アーカイブ済みルームはロビー一覧で表示（メタ情報のみ残る）
CREATE INDEX IF NOT EXISTS idx_rooms_archived ON public.rooms(archived);

-- ================================================================
-- 2. assets テーブル（D1 から Postgres に移行）
-- ================================================================

CREATE TABLE IF NOT EXISTS public.assets (
  id text PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  r2_key text NOT NULL,
  filename text NOT NULL,
  title text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  width integer NOT NULL DEFAULT 0,
  height integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  asset_type text NOT NULL DEFAULT 'image' CHECK (asset_type IN ('image', 'audio')),
  created_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_owner ON public.assets(owner_id);
CREATE INDEX IF NOT EXISTS idx_assets_id ON public.assets(id);

ALTER TABLE public.assets REPLICA IDENTITY DEFAULT;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- アセット読み取り: 認証済みユーザーなら誰でも（owner 不問。ルーム内で他人のアセットを解決するため）
CREATE POLICY assets_select ON public.assets
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- アセット作成: 自分のアセットのみ
CREATE POLICY assets_insert ON public.assets
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- アセット更新: 自分のアセットのみ
CREATE POLICY assets_update ON public.assets
  FOR UPDATE USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- アセット削除: 自分のアセットのみ
CREATE POLICY assets_delete ON public.assets
  FOR DELETE USING (owner_id = auth.uid());
