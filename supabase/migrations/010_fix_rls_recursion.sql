-- RLS ヘルパー関数の再帰問題修正
-- is_room_member() と has_min_role() が room_members を参照するが、
-- room_members 自体にも RLS があるため無限再帰が発生する。
-- SECURITY DEFINER を付けて RLS をバイパスする。

CREATE OR REPLACE FUNCTION is_room_member(room_id_arg text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM room_members
    WHERE room_members.room_id = room_id_arg
      AND room_members.user_id = get_auth_user_id()
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_min_role(room_id_arg text, min_role text)
RETURNS boolean AS $$
DECLARE
  user_role text;
  role_order integer;
  min_order integer;
BEGIN
  SELECT role INTO user_role FROM room_members
    WHERE room_members.room_id = room_id_arg
    AND room_members.user_id = get_auth_user_id()
    LIMIT 1;
  IF user_role IS NULL THEN RETURN false; END IF;

  SELECT CASE user_role WHEN 'owner' THEN 4 WHEN 'sub_owner' THEN 3 WHEN 'user' THEN 2 WHEN 'guest' THEN 1 ELSE 0 END INTO role_order;
  SELECT CASE min_role WHEN 'owner' THEN 4 WHEN 'sub_owner' THEN 3 WHEN 'user' THEN 2 WHEN 'guest' THEN 1 ELSE 0 END INTO min_order;

  RETURN role_order >= min_order;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
