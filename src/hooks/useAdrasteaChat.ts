import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { useAuth } from '../contexts/AuthContext';
import type { ChatMessage } from '../types/adrastea.types';
import type { ChatInject } from '../types/adrastea-persistence';
import { rollDice } from '../services/diceRoller';
import { genId } from '../utils/id';
import { API_BASE_URL } from '../config/api';

interface ArchiveMessagesResponse {
  messages: Array<{
    id: string;
    room_id: string;
    sender_name: string;
    sender_uid: string | null;
    sender_avatar_asset_id: string | null;
    content: string;
    message_type: string;
    channel?: string;
    allowed_user_ids?: string[];
    created_at: number;
  }>;
  has_more: boolean;
}

export function useAdrasteaChat(roomId: string, options?: { inject?: ChatInject }) {
  const { inject } = options ?? {};
  const injectRef = useRef(inject);
  injectRef.current = inject;
  const { user, token } = useAuth();

  const messagesQuery = useSupabaseQuery<ChatMessage>({
    table: 'messages',
    columns: 'id,room_id,sender_name,sender_uid,sender_avatar_asset_id,content,message_type,channel,allowed_user_ids,created_at',
    roomId,
    filter: (q) => q.eq('room_id', roomId).order('created_at', { ascending: false }).limit(200),
    enabled: !inject,
  });
  const messagesData = messagesQuery.data;
  const chatMutation = useSupabaseMutation<ChatMessage>('messages', messagesQuery.setData);

  const loading = inject ? false : messagesQuery.loading;

  // ローカルキャッシュ: Supabase から消えたメッセージも保持（archive 対策）
  const localCacheRef = useRef<Map<string, ChatMessage>>(new Map());
  // D1 から取得した過去ログ
  const [archivedMessages, setArchivedMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // auth がない場合（ゲスト等）は D1 から取得できないので hasMore を false に
  useEffect(() => {
    if (!user) setHasMore(false);
  }, [user]);

  // Supabase メッセージを ChatMessage に変換してキャッシュにマージ
  const supabaseMessages: ChatMessage[] = useMemo(() => {
    if (inject) return [];
    if (!messagesData) return [];
    const msgs = [...messagesData].reverse().map((m) => ({
      id: m.id,
      room_id: m.room_id,
      sender_name: m.sender_name,
      sender_uid: m.sender_uid ?? undefined,
      sender_avatar_asset_id: m.sender_avatar_asset_id ?? null,
      content: m.content,
      message_type: m.message_type as ChatMessage['message_type'],
      channel: m.channel ?? 'main',
      allowed_user_ids: m.allowed_user_ids,
      created_at: m.created_at,
    }));
    // キャッシュに追加
    for (const msg of msgs) {
      localCacheRef.current.set(msg.id, msg);
    }
    return msgs;
  }, [inject, messagesData]);

  // 全メッセージ = Supabase キャッシュ + D1 アーカイブ（ID重複排除、created_at ソート）
  // inject モードでは inject.data をそのまま返す
  const messages: ChatMessage[] = useMemo(() => {
    if (inject) return inject.data;
    const merged = new Map<string, ChatMessage>();
    // D1 アーカイブ（古い方が先）
    for (const msg of archivedMessages) {
      merged.set(msg.id, msg);
    }
    // ローカルキャッシュ（Supabase 由来、上書き優先）
    for (const [id, msg] of localCacheRef.current) {
      merged.set(id, msg);
    }
    // Supabase の最新データで上書き
    for (const msg of supabaseMessages) {
      merged.set(msg.id, msg);
    }
    return Array.from(merged.values()).sort((a, b) => a.created_at - b.created_at);
  }, [inject, supabaseMessages, archivedMessages]);

  const sendMessage = useCallback(
    async (
      senderName: string,
      content: string,
      messageType: ChatMessage['message_type'] = 'chat',
      senderUid?: string,
      senderAvatarAssetId?: string | null,
      diceSystem?: string,
      channel?: string,
      allowedUserIds?: string[]
    ) => {
      const inj = injectRef.current;
      if (inj) {
        return await inj.send(senderName, content, messageType, senderUid, senderAvatarAssetId, diceSystem, channel, allowedUserIds);
      }
      try {
        let finalContent = content;
        let finalType: ChatMessage['message_type'] = messageType;
        let finalAllowedUserIds = allowedUserIds;
        const messagesToInsert: ChatMessage[] = [];

        const result = await rollDice(content, diceSystem || 'DiceBot');
        if (result) {
          const color = (result.success) ? '#4a90d9' : '#e05555';
          finalContent = `${content} <color=${color}>${result.text}</color>`;
          finalType = 'dice';

          // 秘密ダイスの場合、全員向け通知と送信者向け結果の2メッセージをバッチ送信
          if (result.isSecret && senderUid) {
            // 1. 全員向け通知メッセージ（allowed_user_ids なし）
            messagesToInsert.push({
              id: genId(),
              room_id: roomId,
              sender_name: senderName,
              content: 'シークレットダイス',
              message_type: 'secret_dice_notification' as const,
              sender_uid: senderUid,
              sender_avatar_asset_id: senderAvatarAssetId,
              channel,
              created_at: Date.now(),
            } as ChatMessage);

            // 2. 送信者のみ向け結果メッセージ
            finalAllowedUserIds = [senderUid];
          }
        }

        const id = genId();
        const mainMessage: ChatMessage = {
          id,
          room_id: roomId,
          sender_name: senderName,
          content: finalContent,
          message_type: finalType,
          sender_uid: senderUid,
          sender_avatar_asset_id: senderAvatarAssetId,
          channel,
          allowed_user_ids: finalAllowedUserIds,
          created_at: Date.now(),
        };
        messagesToInsert.push({
          id,
          room_id: roomId,
          sender_name: senderName,
          content: finalContent,
          message_type: finalType,
          sender_uid: senderUid,
          sender_avatar_asset_id: senderAvatarAssetId,
          channel,
          allowed_user_ids: finalAllowedUserIds,
          created_at: Date.now(),
        } as ChatMessage);

        // 秘密ダイス時は2メッセージをアトミックに送信する必要があるため Supabase 直接
        if (messagesToInsert.length > 1) {
          const { error } = await supabase.from('messages').insert(messagesToInsert);
          if (error) throw error;
          // 全メッセージをローカル state に追加（Realtime の重複受信を防ぐ）
          messagesQuery.setData(prev => [...prev, ...messagesToInsert]);
        } else {
          // 通常メッセージは楽観的更新を使用
          await chatMutation.insert(mainMessage);
        }

        return mainMessage;
      } catch (error) {
        console.error('メッセージ送信失敗:', error);
        return null;
      }
    },
    [roomId, chatMutation]
  );

  const loadMore = useCallback(async () => {
    if (inject) return;
    if (loadingMore || !hasMore) return;
    if (!user || !token) return;
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
        // 401: 認証エラー（トークン無効）→リトライ不可
        if (res.status === 401) {
          console.warn('[useAdrasteaChat] 401 Unauthorized - cannot retry loadMore');
          setHasMore(false);
        }
        // その他ネットワークエラーは一時的→hasMore は変えない（リトライ可能）
        setLoadingMore(false);
        return;
      }

      const data = await res.json() as ArchiveMessagesResponse;
      setHasMore(data.has_more);

      if (data.messages.length > 0) {
        const newMsgs: ChatMessage[] = data.messages.map((m) => ({
          id: m.id,
          room_id: m.room_id,
          sender_name: m.sender_name,
          sender_uid: m.sender_uid ?? undefined,
          sender_avatar_asset_id: m.sender_avatar_asset_id ?? null,
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
  }, [inject, loadingMore, hasMore, messages, roomId, user, token]);

  const clearMessages = useCallback(async () => {
    if (injectRef.current) return;
    try {
      // 楽観的更新: 全メッセージをクリア
      messagesQuery.setData([]);
      setArchivedMessages([]);
      localCacheRef.current.clear();

      // RLS で owner のみが削除可能。フロント側は呼び出し元（ChatLogPanel等）で owner チェック
      // Supabase のメッセージを削除
      const { error: sbError } = await supabase.from('messages').delete().eq('room_id', roomId);
      if (sbError) {
        // ロールバック（エラー時）
        location.reload();
        throw sbError;
      }

      // D1 アーカイブも削除
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/api/rooms/${roomId}/messages`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (e) {
          console.error('D1 メッセージ削除失敗:', e);
        }
      }
    } catch (err) {
      console.error('メッセージ削除失敗:', err);
      throw err;
    }
  }, [roomId, messagesQuery, token]);

  const openSecretDice = useCallback(
    async (messageId: string) => {
      try {
        // 楽観的更新: allowed_user_ids を空配列に（null ではなく全員に公開）
        messagesQuery.setData((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, allowed_user_ids: undefined } : msg
          )
        );

        const { error } = await supabase.from('messages').update({ allowed_user_ids: null }).eq('id', messageId);
        if (error) {
          // ロールバック（エラー時）
          location.reload();
          throw error;
        }
      } catch (err) {
        console.error('秘密ダイス公開失敗:', err);
        throw err;
      }
    },
    [messagesQuery]
  );

  return {
    messages,
    loading,
    loadingMore: inject ? false : loadingMore,
    hasMore: inject ? false : hasMore,
    sendMessage,
    loadMore,
    clearMessages,
    openSecretDice,
  };
}
