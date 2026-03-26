-- CRITICAL RLS fixes
-- C-1: room_members INSERT — ユーザー自身の入室登録を許可
-- C-2: rooms SELECT — ログインユーザー全員にロビー表示を許可

-- ============================================================================
-- C-1: room_members INSERT を2段構成に
-- ============================================================================
-- 1. ユーザー自身の登録（自分を room_members に入れる）
DROP POLICY IF EXISTS room_members_insert ON public.room_members;
CREATE POLICY room_members_insert_self ON public.room_members
  FOR INSERT WITH CHECK (
    user_id = get_auth_user_id()
  );

-- 2. Owner による他ユーザー追加（既存機能、明示的に新規作成）
CREATE POLICY room_members_insert_by_owner ON public.room_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_id AND owner_id = get_auth_user_id()
    )
  );

-- ============================================================================
-- C-2: rooms SELECT をログインユーザー全員に開放
-- ============================================================================
-- メンバーでなくても rooms のメタ情報は見える（ロビーで一覧表示するため）
-- ルーム内部データ（scenes/objects 等）は is_room_member で保護済み
DROP POLICY IF EXISTS rooms_select ON public.rooms;
CREATE POLICY rooms_select ON public.rooms
  FOR SELECT USING (
    get_auth_user_id() IS NOT NULL
  );
