-- room_members SELECT: 自分自身の行は常に読める + 同じルームのメンバーなら読める
-- 新規ユーザーが入室時に自分の membership を確認するために必要

DROP POLICY IF EXISTS room_members_select ON public.room_members;
CREATE POLICY room_members_select ON public.room_members
  FOR SELECT USING (
    user_id = get_auth_user_id()
    OR is_room_member(room_id)
  );
