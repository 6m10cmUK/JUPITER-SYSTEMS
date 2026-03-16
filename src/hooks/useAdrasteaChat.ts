import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useAuthToken } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import type { ChatMessage } from '../types/adrastea.types';
import { rollDice } from '../services/diceRoller';
import { genId } from '../utils/id';
import { API_BASE_URL } from '../config/api';

export function useAdrasteaChat(roomId: string) {
  const messagesData = useQuery(api.messages.list, { room_id: roomId });
  const sendMutation = useMutation(api.messages.send);
  const token = useAuthToken();

  const loading = messagesData === undefined;

  // ローカルキャッシュ: Convex から消えたメッセージも保持（archive 対策）
  const localCacheRef = useRef<Map<string, ChatMessage>>(new Map());
  // D1 から取得した過去ログ
  const [archivedMessages, setArchivedMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Convex メッセージを ChatMessage に変換してキャッシュにマージ
  const convexMessages: ChatMessage[] = useMemo(() => {
    if (!messagesData) return [];
    const msgs = [...messagesData].reverse().map((m) => ({
      id: m.id,
      room_id: m.room_id,
      sender_name: m.sender_name,
      sender_uid: (m as any).sender_uid ?? undefined,
      sender_avatar: (m as any).sender_avatar ?? null,
      content: m.content,
      message_type: m.message_type as ChatMessage['message_type'],
      channel: (m as any).channel ?? 'main',
      allowed_user_ids: (m as any).allowed_user_ids,
      created_at: m.created_at ?? m._creationTime,
    }));
    // キャッシュに追加
    for (const msg of msgs) {
      localCacheRef.current.set(msg.id, msg);
    }
    return msgs;
  }, [messagesData]);

  // 全メッセージ = Convex キャッシュ + D1 アーカイブ（ID重複排除、created_at ソート）
  const messages: ChatMessage[] = useMemo(() => {
    const merged = new Map<string, ChatMessage>();
    // D1 アーカイブ（古い方が先）
    for (const msg of archivedMessages) {
      merged.set(msg.id, msg);
    }
    // ローカルキャッシュ（Convex 由来、上書き優先）
    for (const [id, msg] of localCacheRef.current) {
      merged.set(id, msg);
    }
    // Convex の最新データで上書き
    for (const msg of convexMessages) {
      merged.set(msg.id, msg);
    }
    return Array.from(merged.values()).sort((a, b) => a.created_at - b.created_at);
  }, [convexMessages, archivedMessages]);

  const sendMessage = useCallback(
    async (
      senderName: string,
      content: string,
      messageType: ChatMessage['message_type'] = 'chat',
      senderUid?: string,
      senderAvatar?: string | null,
      diceSystem?: string,
      channel?: string,
      allowedUserIds?: string[]
    ) => {
      try {
        let finalContent = content;
        let finalType: ChatMessage['message_type'] = messageType;

        const result = await rollDice(content, diceSystem || 'DiceBot');
        if (result) {
          const color = (result.success) ? '#4a90d9' : '#e05555';
          finalContent = `${content} <color=${color}>${result.text}</color>`;
          finalType = 'dice';
        }

        const id = genId();
        await sendMutation({
          id,
          room_id: roomId,
          sender_name: senderName,
          content: finalContent,
          message_type: finalType,
          sender_uid: senderUid,
          sender_avatar: senderAvatar,
          channel,
          allowed_user_ids: allowedUserIds,
        });
        return { id, room_id: roomId, sender_name: senderName, content: finalContent, message_type: finalType, channel, allowed_user_ids: allowedUserIds, created_at: Date.now() } as ChatMessage;
      } catch (error) {
        console.error('メッセージ送信失敗:', error);
        return null;
      }
    },
    [roomId, sendMutation]
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !token) return;
    setLoadingMore(true);
    try {
      // 最古のメッセージの created_at をカーソルにする
      const allMsgs = messages;
      const oldest = allMsgs.length > 0 ? allMsgs[0].created_at : Date.now();

      const params = new URLSearchParams({
        before: String(oldest),
        limit: '200',
      });
      const res = await fetch(
        `${API_BASE_URL}/api/rooms/${roomId}/messages?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        console.error('過去ログ取得失敗:', res.status);
        return;
      }

      const data = await res.json() as { messages: any[]; has_more: boolean };
      setHasMore(data.has_more);

      if (data.messages.length > 0) {
        const newMsgs: ChatMessage[] = data.messages.map((m: any) => ({
          id: m.id,
          room_id: m.room_id,
          sender_name: m.sender_name,
          sender_uid: m.sender_uid ?? undefined,
          sender_avatar: m.sender_avatar ?? null,
          content: m.content,
          message_type: m.message_type as ChatMessage['message_type'],
          channel: m.channel ?? 'main',
          allowed_user_ids: m.allowed_user_ids,
          created_at: m.created_at,
        }));
        setArchivedMessages(prev => [...newMsgs, ...prev]);
      }
    } catch (error) {
      console.error('過去ログ取得エラー:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, token, messages, roomId]);

  const clearMessages = useCallback(async () => {
    // ローカルキャッシュとアーカイブもクリア
    localCacheRef.current.clear();
    setArchivedMessages([]);
  }, []);

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    sendMessage,
    loadMore,
    clearMessages,
  };
}
