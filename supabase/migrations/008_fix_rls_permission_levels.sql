-- Fix RLS permission levels to match spec
-- spec の PERMISSION_MIN_ROLE:
-- - scene_edit → sub_owner
-- - object_edit → sub_owner (ただし object_move は user)
-- - bgm_manage → sub_owner
-- - cutin_manage → sub_owner
-- - character_edit → user
-- - chat_send → user
-- - piece_move → user

-- ============================================================================
-- scenes: sub_owner 以上で INSERT/UPDATE、sub_owner 以上で DELETE
-- ============================================================================
DROP POLICY IF EXISTS scenes_insert ON public.scenes;
CREATE POLICY scenes_insert ON public.scenes FOR INSERT WITH CHECK (
  has_min_role(room_id, 'sub_owner')
);

DROP POLICY IF EXISTS scenes_update ON public.scenes;
CREATE POLICY scenes_update ON public.scenes FOR UPDATE USING (
  has_min_role(room_id, 'sub_owner')
);

-- DELETE ポリシーは既に sub_owner。変更なし

-- ============================================================================
-- objects: sub_owner 以上で INSERT、user 以上で UPDATE（移動用）、sub_owner 以上で DELETE
-- ============================================================================
DROP POLICY IF EXISTS objects_insert ON public.objects;
CREATE POLICY objects_insert ON public.objects FOR INSERT WITH CHECK (
  has_min_role(room_id, 'sub_owner')
);

DROP POLICY IF EXISTS objects_update ON public.objects;
CREATE POLICY objects_update ON public.objects FOR UPDATE USING (
  has_min_role(room_id, 'user')
);

-- DELETE ポリシーは既に sub_owner。変更なし

-- ============================================================================
-- bgms: sub_owner 以上で INSERT/UPDATE、sub_owner 以上で DELETE
-- ============================================================================
DROP POLICY IF EXISTS bgms_insert ON public.bgms;
CREATE POLICY bgms_insert ON public.bgms FOR INSERT WITH CHECK (
  has_min_role(room_id, 'sub_owner')
);

DROP POLICY IF EXISTS bgms_update ON public.bgms;
CREATE POLICY bgms_update ON public.bgms FOR UPDATE USING (
  has_min_role(room_id, 'sub_owner')
);

-- DELETE ポリシーは既に sub_owner。変更なし

-- ============================================================================
-- cutins: sub_owner 以上で INSERT/UPDATE、sub_owner 以上で DELETE
-- ============================================================================
DROP POLICY IF EXISTS cutins_insert ON public.cutins;
CREATE POLICY cutins_insert ON public.cutins FOR INSERT WITH CHECK (
  has_min_role(room_id, 'sub_owner')
);

DROP POLICY IF EXISTS cutins_update ON public.cutins;
CREATE POLICY cutins_update ON public.cutins FOR UPDATE USING (
  has_min_role(room_id, 'sub_owner')
);

-- DELETE ポリシーは既に sub_owner。変更なし

-- ============================================================================
-- scenario_texts: sub_owner 以上で INSERT/UPDATE、sub_owner 以上で DELETE
-- ============================================================================
DROP POLICY IF EXISTS scenario_texts_insert ON public.scenario_texts;
CREATE POLICY scenario_texts_insert ON public.scenario_texts FOR INSERT WITH CHECK (
  has_min_role(room_id, 'sub_owner')
);

DROP POLICY IF EXISTS scenario_texts_update ON public.scenario_texts;
CREATE POLICY scenario_texts_update ON public.scenario_texts FOR UPDATE USING (
  has_min_role(room_id, 'sub_owner')
);

-- DELETE ポリシーは既に sub_owner。変更なし

-- characters_stats, characters_base, pieces, messages は spec で user 権限のためそのまま
