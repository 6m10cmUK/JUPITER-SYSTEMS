-- message_type に secret_dice_notification を追加
ALTER TABLE public.messages DROP CONSTRAINT messages_message_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('chat', 'dice', 'system', 'secret_dice_notification'));
