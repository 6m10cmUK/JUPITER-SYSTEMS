-- messages の SELECT ポリシーを修正: allowed_user_ids チェック追加
-- 秘密メッセージ対応: allowed_user_ids が空 or NULL なら全メンバー閲覧可、設定済みなら指定UUIDのみ

DROP POLICY IF EXISTS messages_select ON public.messages;

CREATE POLICY messages_select ON public.messages
  FOR SELECT USING (
    is_room_member(room_id)
    AND (
      allowed_user_ids IS NULL
      OR allowed_user_ids = '{}'
      OR auth.uid()::uuid = ANY(allowed_user_ids)
    )
  );
