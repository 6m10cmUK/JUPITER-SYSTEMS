-- 秘密ダイス リファクタ: 2メッセージ方式 → 1メッセージ + クライアント Broadcast
-- secret_dice_notification 廃止、secret_dice に統一

-- 1. CHECK 制約更新: secret_dice_notification → secret_dice
ALTER TABLE public.messages DROP CONSTRAINT messages_message_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('chat', 'dice', 'system', 'secret_dice'));

-- 2. RLS ポリシー修正: secret_dice は送信者のみ SELECT 可
DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages
  FOR SELECT USING (
    is_room_member(room_id)
    AND (
      allowed_user_ids IS NULL
      OR allowed_user_ids = '{}'
      OR auth.uid()::uuid = ANY(allowed_user_ids)
    )
    AND (
      message_type != 'secret_dice'
      OR sender_uid::text = auth.uid()::text
    )
  );

-- 3. 既存データ移行: secret_dice_notification は不要になるので削除
DELETE FROM public.messages WHERE message_type = 'secret_dice_notification';
