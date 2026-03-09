import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatMessage } from '../types/adrastea.types';
import {
  getCachedMessages,
  cacheMessages,
  clearCachedMessages,
} from '../services/adrasteaCache';
import { rollDice } from '../services/diceRoller';

const PAGE_SIZE = 50;

const genId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');

export function useAdrasteaChat(
  roomId: string,
  initialMessages?: ChatMessage[]
) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const oldestTimestampRef = useRef<number>(Infinity);

  // 初回: initialMessages または IndexedDBキャッシュから読み込み
  useEffect(() => {
    const init = async () => {
      if (!roomId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      if (initialMessages && initialMessages.length > 0) {
        setMessages(initialMessages);
        oldestTimestampRef.current = initialMessages[0].created_at;
        // キャッシュにも保存
        await cacheMessages(initialMessages);
      } else {
        // IndexedDBキャッシュから取得
        const cached = await getCachedMessages(roomId, PAGE_SIZE);
        if (cached.length > 0) {
          setMessages(cached);
          oldestTimestampRef.current = cached[0].created_at;
        }
      }

      setLoading(false);
    };

    init();
  }, [roomId, initialMessages]);

  const sendMessage = useCallback(
    async (
      senderName: string,
      content: string,
      messageType: ChatMessage['message_type'] = 'chat',
      senderUid?: string,
      senderAvatar?: string | null
    ) => {
      try {
        const now = Date.now();
        let finalContent = content;

        if (messageType === 'dice') {
          const result = await rollDice(content);
          finalContent = result
            ? `${content} → ${result.text}`
            : `${content} → (無効なコマンド)`;
        }

        const newMessage: ChatMessage = {
          id: genId(),
          room_id: roomId,
          sender_name: senderName,
          sender_uid: senderUid ?? null,
          sender_avatar: senderAvatar ?? null,
          content: finalContent,
          message_type: messageType === 'dice' ? 'dice' : messageType,
          created_at: now,
        };

        setMessages((prev) => [...prev, newMessage]);
        await cacheMessages([newMessage]);
      } catch (error) {
        console.error('メッセージの送信に失敗:', error);
      }
    },
    [roomId]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore) return;

    // IndexedDBキャッシュから古いメッセージを読み込む
    const older = await getCachedMessages(roomId, PAGE_SIZE, oldestTimestampRef.current);

    if (older.length < PAGE_SIZE) {
      setHasMore(false);
    }

    if (older.length > 0) {
      oldestTimestampRef.current = older[0].created_at;
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const unique = older.filter((m) => !ids.has(m.id));
        return [...unique, ...prev];
      });
    }
  }, [roomId, hasMore]);

  const clearMessages = useCallback(async () => {
    await clearCachedMessages(roomId);
    setMessages([]);
    oldestTimestampRef.current = Infinity;
    setHasMore(false);
  }, [roomId]);

  return { messages, loading, hasMore, sendMessage, loadMore, clearMessages };
}
