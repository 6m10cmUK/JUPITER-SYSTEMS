-- channels: sub_owner 以上で INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS channels_insert ON public.channels;
CREATE POLICY channels_insert ON public.channels
  FOR INSERT WITH CHECK (has_min_role(room_id, 'sub_owner'));

DROP POLICY IF EXISTS channels_update ON public.channels;
CREATE POLICY channels_update ON public.channels
  FOR UPDATE USING (has_min_role(room_id, 'sub_owner'));

DROP POLICY IF EXISTS channels_delete ON public.channels;
CREATE POLICY channels_delete ON public.channels
  FOR DELETE USING (has_min_role(room_id, 'sub_owner'));
