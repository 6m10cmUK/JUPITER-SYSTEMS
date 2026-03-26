-- Role-based RLS policies for all tables
-- Helper function to check if user has minimum role in a room
CREATE OR REPLACE FUNCTION has_min_role(room_id_arg text, min_role text)
RETURNS boolean AS $$
DECLARE
  user_role text;
  role_order integer;
  min_order integer;
BEGIN
  SELECT role INTO user_role FROM room_members
    WHERE room_members.room_id = room_id_arg
    AND room_members.user_id = auth.uid()
    LIMIT 1;

  IF user_role IS NULL THEN RETURN false; END IF;

  SELECT CASE user_role
    WHEN 'owner' THEN 4
    WHEN 'sub_owner' THEN 3
    WHEN 'user' THEN 2
    WHEN 'guest' THEN 1
    ELSE 0
  END INTO role_order;

  SELECT CASE min_role
    WHEN 'owner' THEN 4
    WHEN 'sub_owner' THEN 3
    WHEN 'user' THEN 2
    WHEN 'guest' THEN 1
    ELSE 0
  END INTO min_order;

  RETURN role_order >= min_order;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- scenes: user 以上で INSERT/UPDATE、sub_owner 以上で DELETE
-- ============================================================================
DROP POLICY IF EXISTS scenes_insert ON public.scenes;
CREATE POLICY scenes_insert ON public.scenes FOR INSERT WITH CHECK (
  has_min_role(room_id, 'user')
);

DROP POLICY IF EXISTS scenes_update ON public.scenes;
CREATE POLICY scenes_update ON public.scenes FOR UPDATE USING (
  has_min_role(room_id, 'user')
);

DROP POLICY IF EXISTS scenes_delete ON public.scenes;
CREATE POLICY scenes_delete ON public.scenes FOR DELETE USING (
  has_min_role(room_id, 'sub_owner')
);

-- ============================================================================
-- objects: user 以上で INSERT/UPDATE、sub_owner 以上で DELETE
-- ============================================================================
DROP POLICY IF EXISTS objects_insert ON public.objects;
CREATE POLICY objects_insert ON public.objects FOR INSERT WITH CHECK (
  has_min_role(room_id, 'user')
);

DROP POLICY IF EXISTS objects_update ON public.objects;
CREATE POLICY objects_update ON public.objects FOR UPDATE USING (
  has_min_role(room_id, 'user')
);

DROP POLICY IF EXISTS objects_delete ON public.objects;
CREATE POLICY objects_delete ON public.objects FOR DELETE USING (
  has_min_role(room_id, 'sub_owner')
);

-- ============================================================================
-- bgms: user 以上で INSERT/UPDATE、sub_owner 以上で DELETE
-- ============================================================================
DROP POLICY IF EXISTS bgms_insert ON public.bgms;
CREATE POLICY bgms_insert ON public.bgms FOR INSERT WITH CHECK (
  has_min_role(room_id, 'user')
);

DROP POLICY IF EXISTS bgms_update ON public.bgms;
CREATE POLICY bgms_update ON public.bgms FOR UPDATE USING (
  has_min_role(room_id, 'user')
);

DROP POLICY IF EXISTS bgms_delete ON public.bgms;
CREATE POLICY bgms_delete ON public.bgms FOR DELETE USING (
  has_min_role(room_id, 'sub_owner')
);

-- ============================================================================
-- cutins: user 以上で INSERT/UPDATE、sub_owner 以上で DELETE
-- ============================================================================
DROP POLICY IF EXISTS cutins_insert ON public.cutins;
CREATE POLICY cutins_insert ON public.cutins FOR INSERT WITH CHECK (
  has_min_role(room_id, 'user')
);

DROP POLICY IF EXISTS cutins_update ON public.cutins;
CREATE POLICY cutins_update ON public.cutins FOR UPDATE USING (
  has_min_role(room_id, 'user')
);

DROP POLICY IF EXISTS cutins_delete ON public.cutins;
CREATE POLICY cutins_delete ON public.cutins FOR DELETE USING (
  has_min_role(room_id, 'sub_owner')
);

-- ============================================================================
-- scenario_texts: user 以上で INSERT/UPDATE、sub_owner 以上で DELETE
-- ============================================================================
DROP POLICY IF EXISTS scenario_texts_insert ON public.scenario_texts;
CREATE POLICY scenario_texts_insert ON public.scenario_texts FOR INSERT WITH CHECK (
  has_min_role(room_id, 'user')
);

DROP POLICY IF EXISTS scenario_texts_update ON public.scenario_texts;
CREATE POLICY scenario_texts_update ON public.scenario_texts FOR UPDATE USING (
  has_min_role(room_id, 'user')
);

DROP POLICY IF EXISTS scenario_texts_delete ON public.scenario_texts;
CREATE POLICY scenario_texts_delete ON public.scenario_texts FOR DELETE USING (
  has_min_role(room_id, 'sub_owner')
);

-- ============================================================================
-- characters_stats: user 以上で INSERT/UPDATE、sub_owner 以上で DELETE
-- ============================================================================
DROP POLICY IF EXISTS characters_stats_insert ON public.characters_stats;
CREATE POLICY characters_stats_insert ON public.characters_stats FOR INSERT WITH CHECK (
  has_min_role(room_id, 'user')
);

DROP POLICY IF EXISTS characters_stats_update ON public.characters_stats;
CREATE POLICY characters_stats_update ON public.characters_stats FOR UPDATE USING (
  has_min_role(room_id, 'user')
);

DROP POLICY IF EXISTS characters_stats_delete ON public.characters_stats;
CREATE POLICY characters_stats_delete ON public.characters_stats FOR DELETE USING (
  has_min_role(room_id, 'sub_owner')
);

-- ============================================================================
-- characters_base: user 以上で INSERT/UPDATE、sub_owner 以上で DELETE
-- ============================================================================
DROP POLICY IF EXISTS characters_base_insert ON public.characters_base;
CREATE POLICY characters_base_insert ON public.characters_base FOR INSERT WITH CHECK (
  has_min_role(room_id, 'user')
);

DROP POLICY IF EXISTS characters_base_update ON public.characters_base;
CREATE POLICY characters_base_update ON public.characters_base FOR UPDATE USING (
  has_min_role(room_id, 'user')
);

DROP POLICY IF EXISTS characters_base_delete ON public.characters_base;
CREATE POLICY characters_base_delete ON public.characters_base FOR DELETE USING (
  has_min_role(room_id, 'sub_owner')
);

-- ============================================================================
-- pieces: user 以上で INSERT/UPDATE、sub_owner 以上で DELETE
-- ============================================================================
DROP POLICY IF EXISTS pieces_insert ON public.pieces;
CREATE POLICY pieces_insert ON public.pieces FOR INSERT WITH CHECK (
  has_min_role(room_id, 'user')
);

DROP POLICY IF EXISTS pieces_update ON public.pieces;
CREATE POLICY pieces_update ON public.pieces FOR UPDATE USING (
  has_min_role(room_id, 'user')
);

DROP POLICY IF EXISTS pieces_delete ON public.pieces;
CREATE POLICY pieces_delete ON public.pieces FOR DELETE USING (
  has_min_role(room_id, 'sub_owner')
);

-- ============================================================================
-- messages: user 以上で INSERT、UPDATE/DELETE は既存ポリシー維持、SELECT は既存
-- ============================================================================
DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages FOR INSERT WITH CHECK (
  has_min_role(room_id, 'user')
);

-- UPDATE と DELETE は 005_fix_messages_write_rls.sql で定義済み
-- SELECT は is_room_member() で統制済み
