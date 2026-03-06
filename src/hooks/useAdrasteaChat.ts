import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import type { ChatMessage } from '../types/adrastea.types';
import {
  getCachedMessages,
  getLatestCachedTimestamp,
  cacheMessages,
} from '../services/adrasteaCache';
import { rollDice } from '../services/diceRoller';

const PAGE_SIZE = 50;

export function useAdrasteaChat(roomId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const oldestTimestampRef = useRef<number>(Infinity);

  // 初回: IndexedDBキャッシュ → Firestore差分取得 → リアルタイム監視
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      if (!roomId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      // 1. IndexedDBキャッシュから取得
      const cached = await getCachedMessages(roomId, PAGE_SIZE);
      if (cached.length > 0) {
        setMessages(cached);
        oldestTimestampRef.current = cached[0].created_at;
      }

      // 2. キャッシュ以降の差分をFirestoreから取得
      const latestTs = await getLatestCachedTimestamp(roomId);
      const messagesRef = collection(db, 'rooms', roomId, 'messages');

      let diffMessages: ChatMessage[] = [];
      if (latestTs > 0) {
        const diffQuery = query(
          messagesRef,
          where('created_at', '>', latestTs),
          orderBy('created_at', 'asc')
        );
        const diffSnap = await getDocs(diffQuery);
        diffMessages = diffSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ChatMessage[];

        if (diffMessages.length > 0) {
          await cacheMessages(diffMessages);
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const newOnes = diffMessages.filter((m) => !ids.has(m.id));
            return [...prev, ...newOnes];
          });
        }
      }

      setLoading(false);

      // 3. リアルタイム監視（差分取得済み or キャッシュ最新 or 現在時刻以降の新着）
      const realtimeStartTs = diffMessages.length > 0
        ? diffMessages[diffMessages.length - 1].created_at
        : (latestTs > 0 ? latestTs : Date.now());
      const realtimeQuery = query(
        messagesRef,
        where('created_at', '>', realtimeStartTs),
        orderBy('created_at', 'asc')
      );

      unsubscribe = onSnapshot(realtimeQuery, (snapshot) => {
        const newMessages: ChatMessage[] = [];
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            newMessages.push({
              id: change.doc.id,
              ...change.doc.data(),
            } as ChatMessage);
          }
        });

        if (newMessages.length > 0) {
          cacheMessages(newMessages);
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const unique = newMessages.filter((m) => !ids.has(m.id));
            return unique.length > 0 ? [...prev, ...unique] : prev;
          });
        }
      }, (error) => {
        console.error('メッセージの監視に失敗:', error);
      });
    };

    init();

    return () => {
      unsubscribe?.();
    };
  }, [roomId]);

  const sendMessage = useCallback(
    async (
      senderName: string,
      content: string,
      messageType: ChatMessage['message_type'] = 'chat',
      senderUid?: string,
      senderAvatar?: string | null
    ) => {
      try {
        if (messageType === 'dice') {
          const result = await rollDice(content);
          const displayContent = result
            ? `${content} → ${result.text}`
            : `${content} → (無効なコマンド)`;
          await addDoc(collection(db, 'rooms', roomId, 'messages'), {
            room_id: roomId,
            sender_name: senderName,
            sender_uid: senderUid ?? null,
            sender_avatar: senderAvatar ?? null,
            content: displayContent,
            message_type: 'dice',
            created_at: Date.now(),
          });
        } else {
          await addDoc(collection(db, 'rooms', roomId, 'messages'), {
            room_id: roomId,
            sender_name: senderName,
            sender_uid: senderUid ?? null,
            sender_avatar: senderAvatar ?? null,
            content,
            message_type: messageType,
            created_at: Date.now(),
          });
        }
      } catch (error) {
        console.error('メッセージの送信に失敗:', error);
      }
    },
    [roomId]
  );

  const loadMore = useCallback(async () => {
    if (!hasMore) return;

    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    const olderQuery = query(
      messagesRef,
      where('created_at', '<', oldestTimestampRef.current),
      orderBy('created_at', 'desc'),
      limit(PAGE_SIZE)
    );

    const snap = await getDocs(olderQuery);
    const older: ChatMessage[] = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ChatMessage[];

    if (older.length < PAGE_SIZE) {
      setHasMore(false);
    }

    if (older.length > 0) {
      older.reverse();
      oldestTimestampRef.current = older[0].created_at;
      await cacheMessages(older);
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const unique = older.filter((m) => !ids.has(m.id));
        return [...unique, ...prev];
      });
    }
  }, [roomId, hasMore]);

  return { messages, loading, hasMore, sendMessage, loadMore };
}
