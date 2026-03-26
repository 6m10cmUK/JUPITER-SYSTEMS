-- Adrastea Supabase 初期マイグレーション
-- 作成日: 2026-03-26
-- 対象: Adrastea TRPG盤面共有ツール
-- 移行元: Convex DB

-- ================================================================
-- 1. ヘルパー関数
-- ================================================================

CREATE OR REPLACE FUNCTION get_auth_user_id()
RETURNS uuid AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql STABLE;

-- 認可ヘルパー：ユーザーがルームメンバーか確認
CREATE OR REPLACE FUNCTION is_room_member(room_id_arg text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM room_members
    WHERE room_members.room_id = room_id_arg
      AND room_members.user_id = get_auth_user_id()
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 認可ヘルパー：ユーザーのロール取得
CREATE OR REPLACE FUNCTION get_room_role(room_id_arg text)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role FROM room_members
    WHERE room_members.room_id = room_id_arg
      AND room_members.user_id = get_auth_user_id()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ================================================================
-- 2. users テーブル
-- ================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'ユーザー',
  avatar_url text,
  onboarded boolean NOT NULL DEFAULT false,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  CONSTRAINT updated_at_gte_created_at CHECK (updated_at >= created_at)
);

ALTER TABLE public.users REPLICA IDENTITY DEFAULT;

-- ================================================================
-- 3. rooms テーブル（ルーム・盤面セッション）
-- ================================================================

CREATE TABLE IF NOT EXISTS public.rooms (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  active_scene_id text,
  foreground_url text,
  thumbnail_asset_id text,
  active_cutin jsonb,
  dice_system text NOT NULL,
  gm_can_see_secret_memo boolean NOT NULL,
  default_login_role text CHECK (default_login_role IN ('sub_owner', 'user', 'guest')),
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  CONSTRAINT updated_at_gte_created_at CHECK (updated_at >= created_at)
);

CREATE INDEX IF NOT EXISTS idx_rooms_owner ON public.rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_id ON public.rooms(id);

ALTER TABLE public.rooms REPLICA IDENTITY DEFAULT;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 読み取り：メンバーのみ
CREATE POLICY rooms_select ON public.rooms
  FOR SELECT USING (is_room_member(id));

-- 作成：認証ユーザーなら owner として自動登録
CREATE POLICY rooms_insert ON public.rooms
  FOR INSERT WITH CHECK (owner_id = get_auth_user_id());

-- 更新：owner のみ
CREATE POLICY rooms_update ON public.rooms
  FOR UPDATE USING (owner_id = get_auth_user_id())
  WITH CHECK (owner_id = get_auth_user_id());

-- 削除：owner のみ
CREATE POLICY rooms_delete ON public.rooms
  FOR DELETE USING (owner_id = get_auth_user_id());

-- ================================================================
-- 4. room_members テーブル（ルームメンバー・権限管理）
-- ================================================================

CREATE TABLE IF NOT EXISTS public.room_members (
  id bigserial PRIMARY KEY,
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'sub_owner', 'user', 'guest')),
  joined_at bigint NOT NULL,
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_members_room ON public.room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_room_user ON public.room_members(room_id, user_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON public.room_members(user_id);

ALTER TABLE public.room_members REPLICA IDENTITY DEFAULT;

ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- 読み取り：同じルームのメンバーのみ
CREATE POLICY room_members_select ON public.room_members
  FOR SELECT USING (is_room_member(room_id));

-- 挿入：owner のみ
CREATE POLICY room_members_insert ON public.room_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_id AND owner_id = get_auth_user_id()
    )
  );

-- 更新：owner のみ
CREATE POLICY room_members_update ON public.room_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_id AND owner_id = get_auth_user_id()
    )
  );

-- 削除：owner のみ
CREATE POLICY room_members_delete ON public.room_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_id AND owner_id = get_auth_user_id()
    )
  );

-- ================================================================
-- 5. scenes テーブル（シーン・盤面背景）
-- ================================================================

CREATE TABLE IF NOT EXISTS public.scenes (
  id text PRIMARY KEY,
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  background_url text,
  foreground_url text,
  background_asset_id text,
  foreground_asset_id text,
  foreground_opacity numeric NOT NULL,
  bg_transition text CHECK (bg_transition IN ('none', 'fade')),
  bg_transition_duration numeric NOT NULL,
  fg_transition text CHECK (fg_transition IN ('none', 'fade')),
  fg_transition_duration numeric NOT NULL,
  bg_blur boolean NOT NULL,
  grid_visible boolean,
  sort_order numeric NOT NULL,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  CONSTRAINT updated_at_gte_created_at CHECK (updated_at >= created_at)
);

CREATE INDEX IF NOT EXISTS idx_scenes_room ON public.scenes(room_id);
CREATE INDEX IF NOT EXISTS idx_scenes_room_order ON public.scenes(room_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_scenes_id ON public.scenes(id);

ALTER TABLE public.scenes REPLICA IDENTITY DEFAULT;

ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY scenes_select ON public.scenes
  FOR SELECT USING (is_room_member(room_id));

CREATE POLICY scenes_insert ON public.scenes
  FOR INSERT WITH CHECK (is_room_member(room_id));

CREATE POLICY scenes_update ON public.scenes
  FOR UPDATE USING (is_room_member(room_id))
  WITH CHECK (is_room_member(room_id));

CREATE POLICY scenes_delete ON public.scenes
  FOR DELETE USING (is_room_member(room_id));

-- ================================================================
-- 6. objects テーブル（盤面上のオブジェクト）
-- ================================================================

CREATE TABLE IF NOT EXISTS public.objects (
  id text PRIMARY KEY,
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('panel', 'text', 'foreground', 'background', 'characters_layer')),
  name text NOT NULL,
  global boolean NOT NULL,
  scene_ids text[] NOT NULL DEFAULT '{}',
  x numeric NOT NULL,
  y numeric NOT NULL,
  width numeric NOT NULL,
  height numeric NOT NULL,
  visible boolean NOT NULL,
  opacity numeric NOT NULL,
  sort_order numeric NOT NULL,
  locked boolean,
  position_locked boolean NOT NULL,
  size_locked boolean NOT NULL,
  image_url text,
  image_asset_id text,
  background_color text NOT NULL,
  image_fit text CHECK (image_fit IN ('contain', 'cover', 'stretch')),
  color_enabled boolean,
  text_content text,
  font_size numeric NOT NULL,
  font_family text NOT NULL,
  letter_spacing numeric NOT NULL,
  line_height numeric NOT NULL,
  auto_size boolean NOT NULL,
  text_align text CHECK (text_align IN ('left', 'center', 'right')),
  text_vertical_align text CHECK (text_vertical_align IN ('top', 'middle', 'bottom')),
  text_color text NOT NULL,
  scale_x numeric NOT NULL,
  scale_y numeric NOT NULL,
  memo text,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  CONSTRAINT updated_at_gte_created_at CHECK (updated_at >= created_at)
);

CREATE INDEX IF NOT EXISTS idx_objects_room ON public.objects(room_id);
CREATE INDEX IF NOT EXISTS idx_objects_id ON public.objects(id);

ALTER TABLE public.objects REPLICA IDENTITY DEFAULT;

ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY objects_select ON public.objects
  FOR SELECT USING (is_room_member(room_id));

CREATE POLICY objects_insert ON public.objects
  FOR INSERT WITH CHECK (is_room_member(room_id));

CREATE POLICY objects_update ON public.objects
  FOR UPDATE USING (is_room_member(room_id))
  WITH CHECK (is_room_member(room_id));

CREATE POLICY objects_delete ON public.objects
  FOR DELETE USING (is_room_member(room_id));

-- ================================================================
-- 7. bgms テーブル（背景音）
-- ================================================================

CREATE TABLE IF NOT EXISTS public.bgms (
  id text PRIMARY KEY,
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  bgm_type text CHECK (bgm_type IN ('youtube', 'url', 'upload')),
  bgm_source text,
  bgm_asset_id text,
  bgm_volume numeric NOT NULL,
  bgm_loop boolean NOT NULL,
  scene_ids text[] NOT NULL DEFAULT '{}',
  is_playing boolean NOT NULL,
  is_paused boolean NOT NULL,
  auto_play_scene_ids text[] NOT NULL DEFAULT '{}',
  fade_in boolean NOT NULL,
  fade_in_duration numeric,
  fade_out boolean,
  fade_duration numeric,
  sort_order numeric,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  CONSTRAINT updated_at_gte_created_at CHECK (updated_at >= created_at)
);

CREATE INDEX IF NOT EXISTS idx_bgms_room ON public.bgms(room_id);
CREATE INDEX IF NOT EXISTS idx_bgms_id ON public.bgms(id);

ALTER TABLE public.bgms REPLICA IDENTITY DEFAULT;

ALTER TABLE public.bgms ENABLE ROW LEVEL SECURITY;

CREATE POLICY bgms_select ON public.bgms
  FOR SELECT USING (is_room_member(room_id));

CREATE POLICY bgms_insert ON public.bgms
  FOR INSERT WITH CHECK (is_room_member(room_id));

CREATE POLICY bgms_update ON public.bgms
  FOR UPDATE USING (is_room_member(room_id))
  WITH CHECK (is_room_member(room_id));

CREATE POLICY bgms_delete ON public.bgms
  FOR DELETE USING (is_room_member(room_id));

-- ================================================================
-- 8. characters_stats テーブル（キャラクター・統計情報）
-- ================================================================

CREATE TABLE IF NOT EXISTS public.characters_stats (
  id text PRIMARY KEY,
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL,
  active_image_index numeric NOT NULL,
  statuses jsonb NOT NULL DEFAULT '[]',
  parameters jsonb NOT NULL DEFAULT '[]',
  is_hidden_on_board boolean NOT NULL,
  is_speech_hidden boolean,
  sort_order numeric,
  on_board boolean,
  board_x numeric,
  board_y numeric,
  board_height numeric,
  board_visible boolean,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  CONSTRAINT updated_at_gte_created_at CHECK (updated_at >= created_at)
);

CREATE INDEX IF NOT EXISTS idx_characters_stats_room ON public.characters_stats(room_id);
CREATE INDEX IF NOT EXISTS idx_characters_stats_id ON public.characters_stats(id);

ALTER TABLE public.characters_stats REPLICA IDENTITY DEFAULT;

ALTER TABLE public.characters_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY characters_stats_select ON public.characters_stats
  FOR SELECT USING (is_room_member(room_id));

CREATE POLICY characters_stats_insert ON public.characters_stats
  FOR INSERT WITH CHECK (is_room_member(room_id));

CREATE POLICY characters_stats_update ON public.characters_stats
  FOR UPDATE USING (is_room_member(room_id))
  WITH CHECK (is_room_member(room_id));

CREATE POLICY characters_stats_delete ON public.characters_stats
  FOR DELETE USING (is_room_member(room_id));

-- ================================================================
-- 9. characters_base テーブル（キャラクター・画像・メモ）
-- ================================================================

CREATE TABLE IF NOT EXISTS public.characters_base (
  id text PRIMARY KEY,
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  images jsonb NOT NULL,
  memo text NOT NULL,
  secret_memo text NOT NULL,
  chat_palette text NOT NULL,
  sheet_url text,
  initiative numeric NOT NULL,
  size numeric NOT NULL,
  is_status_private boolean NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_characters_base_room ON public.characters_base(room_id);
CREATE INDEX IF NOT EXISTS idx_characters_base_id ON public.characters_base(id);

ALTER TABLE public.characters_base REPLICA IDENTITY DEFAULT;

ALTER TABLE public.characters_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY characters_base_select ON public.characters_base
  FOR SELECT USING (is_room_member(room_id));

CREATE POLICY characters_base_insert ON public.characters_base
  FOR INSERT WITH CHECK (is_room_member(room_id));

CREATE POLICY characters_base_update ON public.characters_base
  FOR UPDATE USING (is_room_member(room_id))
  WITH CHECK (is_room_member(room_id));

CREATE POLICY characters_base_delete ON public.characters_base
  FOR DELETE USING (is_room_member(room_id));

-- ================================================================
-- 10. pieces テーブル（イニシアティブ表示用）
-- ================================================================

CREATE TABLE IF NOT EXISTS public.pieces (
  id text PRIMARY KEY,
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  x numeric NOT NULL,
  y numeric NOT NULL,
  width numeric NOT NULL,
  height numeric NOT NULL,
  image_url text,
  label text NOT NULL,
  color text NOT NULL,
  z_index numeric NOT NULL,
  statuses jsonb NOT NULL DEFAULT '[]',
  initiative numeric NOT NULL,
  memo text NOT NULL,
  character_id text,
  created_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pieces_room ON public.pieces(room_id);
CREATE INDEX IF NOT EXISTS idx_pieces_id ON public.pieces(id);

ALTER TABLE public.pieces REPLICA IDENTITY DEFAULT;

ALTER TABLE public.pieces ENABLE ROW LEVEL SECURITY;

CREATE POLICY pieces_select ON public.pieces
  FOR SELECT USING (is_room_member(room_id));

CREATE POLICY pieces_insert ON public.pieces
  FOR INSERT WITH CHECK (is_room_member(room_id));

CREATE POLICY pieces_update ON public.pieces
  FOR UPDATE USING (is_room_member(room_id))
  WITH CHECK (is_room_member(room_id));

CREATE POLICY pieces_delete ON public.pieces
  FOR DELETE USING (is_room_member(room_id));

-- ================================================================
-- 11. cutins テーブル（カットイン・演出）
-- ================================================================

CREATE TABLE IF NOT EXISTS public.cutins (
  id text PRIMARY KEY,
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  image_url text,
  image_asset_id text,
  text text NOT NULL,
  animation text NOT NULL CHECK (animation IN ('slide', 'fade', 'zoom')),
  duration numeric NOT NULL,
  text_color text NOT NULL,
  background_color text NOT NULL,
  sort_order numeric NOT NULL,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  CONSTRAINT updated_at_gte_created_at CHECK (updated_at >= created_at)
);

CREATE INDEX IF NOT EXISTS idx_cutins_room ON public.cutins(room_id);
CREATE INDEX IF NOT EXISTS idx_cutins_id ON public.cutins(id);

ALTER TABLE public.cutins REPLICA IDENTITY DEFAULT;

ALTER TABLE public.cutins ENABLE ROW LEVEL SECURITY;

CREATE POLICY cutins_select ON public.cutins
  FOR SELECT USING (is_room_member(room_id));

CREATE POLICY cutins_insert ON public.cutins
  FOR INSERT WITH CHECK (is_room_member(room_id));

CREATE POLICY cutins_update ON public.cutins
  FOR UPDATE USING (is_room_member(room_id))
  WITH CHECK (is_room_member(room_id));

CREATE POLICY cutins_delete ON public.cutins
  FOR DELETE USING (is_room_member(room_id));

-- ================================================================
-- 12. scenario_texts テーブル（シナリオテキスト・会話テンプレート）
-- ================================================================

CREATE TABLE IF NOT EXISTS public.scenario_texts (
  id text PRIMARY KEY,
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  visible boolean NOT NULL,
  speaker_character_id text,
  speaker_name text,
  channel_id text,
  sort_order numeric NOT NULL,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  CONSTRAINT updated_at_gte_created_at CHECK (updated_at >= created_at)
);

CREATE INDEX IF NOT EXISTS idx_scenario_texts_room ON public.scenario_texts(room_id);
CREATE INDEX IF NOT EXISTS idx_scenario_texts_id ON public.scenario_texts(id);

ALTER TABLE public.scenario_texts REPLICA IDENTITY DEFAULT;

ALTER TABLE public.scenario_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY scenario_texts_select ON public.scenario_texts
  FOR SELECT USING (is_room_member(room_id));

CREATE POLICY scenario_texts_insert ON public.scenario_texts
  FOR INSERT WITH CHECK (is_room_member(room_id));

CREATE POLICY scenario_texts_update ON public.scenario_texts
  FOR UPDATE USING (is_room_member(room_id))
  WITH CHECK (is_room_member(room_id));

CREATE POLICY scenario_texts_delete ON public.scenario_texts
  FOR DELETE USING (is_room_member(room_id));

-- ================================================================
-- 13. messages テーブル（チャット・メッセージログ）
-- ================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id text PRIMARY KEY,
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  sender_uid uuid,
  sender_avatar text,
  sender_color text,
  content text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('chat', 'dice', 'system')),
  channel text,
  allowed_user_ids uuid[] DEFAULT '{}',
  created_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_room ON public.messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_time ON public.messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_id ON public.messages(id);

ALTER TABLE public.messages REPLICA IDENTITY DEFAULT;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_select ON public.messages
  FOR SELECT USING (is_room_member(room_id));

CREATE POLICY messages_insert ON public.messages
  FOR INSERT WITH CHECK (is_room_member(room_id));

CREATE POLICY messages_update ON public.messages
  FOR UPDATE USING (is_room_member(room_id))
  WITH CHECK (is_room_member(room_id));

CREATE POLICY messages_delete ON public.messages
  FOR DELETE USING (is_room_member(room_id));

-- ================================================================
-- 14. channels テーブル（チャンネル・メッセージグループ）
-- ================================================================

CREATE TABLE IF NOT EXISTS public.channels (
  id bigserial PRIMARY KEY,
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  channel_id text NOT NULL,
  label text NOT NULL,
  "order" numeric NOT NULL,
  is_archived boolean NOT NULL,
  allowed_user_ids uuid[] NOT NULL DEFAULT '{}',
  UNIQUE(room_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_channels_room ON public.channels(room_id);
CREATE INDEX IF NOT EXISTS idx_channels_room_channel ON public.channels(room_id, channel_id);

ALTER TABLE public.channels REPLICA IDENTITY DEFAULT;

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY channels_select ON public.channels
  FOR SELECT USING (is_room_member(room_id));

CREATE POLICY channels_insert ON public.channels
  FOR INSERT WITH CHECK (is_room_member(room_id));

CREATE POLICY channels_update ON public.channels
  FOR UPDATE USING (is_room_member(room_id))
  WITH CHECK (is_room_member(room_id));

CREATE POLICY channels_delete ON public.channels
  FOR DELETE USING (is_room_member(room_id));

-- ================================================================
-- 15. Auth トリガー（Google OAuth 後の users テーブル自動作成）
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, display_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'ユーザー'),
    NEW.raw_user_meta_data->>'avatar_url',
    EXTRACT(EPOCH FROM NOW())::bigint * 1000,
    EXTRACT(EPOCH FROM NOW())::bigint * 1000
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'ユーザー'),
    avatar_url = NEW.raw_user_meta_data->>'avatar_url',
    updated_at = EXTRACT(EPOCH FROM NOW())::bigint * 1000;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
