import { useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { ChatMessage } from '../types/adrastea.types';
import { rollDice } from '../services/diceRoller';

const genId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');

export function useAdrasteaChat(roomId: string) {
  const messagesData = useQuery(api.messages.list, { room_id: roomId });
  const sendMutation = useMutation(api.messages.send);

  const loading = messagesData === undefined;

  const messages: ChatMessage[] = useMemo(() => {
    if (!messagesData) return [];
    return [...messagesData].reverse().map((m) => ({
      id: m.id,
      room_id: m.room_id,
      sender_name: m.sender_name,
      sender_uid: (m as any).sender_uid ?? undefined,
      sender_avatar: (m as any).sender_avatar ?? null,
      content: m.content,
      message_type: m.message_type as ChatMessage['message_type'],
      created_at: m._creationTime,
    }));
  }, [messagesData]);

  const sendMessage = useCallback(
    async (
      senderName: string,
      content: string,
      messageType: ChatMessage['message_type'] = 'chat',
      senderUid?: string,
      senderAvatar?: string | null,
      diceSystem?: string
    ) => {
      try {
        let finalContent = content;
        if (messageType === 'dice') {
          const result = await rollDice(content, diceSystem || 'DiceBot');
          finalContent = result
            ? `${content} → ${result.text}`
            : `${content} → (無効なコマンド)`;
        }
        const id = genId();
        await sendMutation({
          id,
          room_id: roomId,
          sender_name: senderName,
          content: finalContent,
          message_type: messageType === 'dice' ? 'dice' : messageType,
          sender_uid: senderUid,
          sender_avatar: senderAvatar,
        });
        return { id, room_id: roomId, sender_name: senderName, content: finalContent, message_type: messageType, created_at: Date.now() } as ChatMessage;
      } catch (error) {
        console.error('メッセージ送信失敗:', error);
        return null;
      }
    },
    [roomId, sendMutation]
  );

  const loadMore = useCallback(async () => {}, []);
  const clearMessages = useCallback(async () => {}, []);

  return {
    messages,
    loading,
    hasMore: false,
    sendMessage,
    loadMore,
    clearMessages,
  };
}
