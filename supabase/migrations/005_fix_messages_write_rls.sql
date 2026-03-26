-- messages の DELETE を owner のみに制限
DROP POLICY IF EXISTS messages_delete ON public.messages;
CREATE POLICY messages_delete ON public.messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = messages.room_id
      AND rooms.owner_id = auth.uid()
    )
  );

-- messages の UPDATE を sender のみに制限（openSecretDice 用）
DROP POLICY IF EXISTS messages_update ON public.messages;
CREATE POLICY messages_update ON public.messages
  FOR UPDATE USING (
    is_room_member(room_id)
    AND CAST(sender_uid AS text) = CAST(auth.uid() AS text)
  );
