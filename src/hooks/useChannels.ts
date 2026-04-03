import { useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import type { ChatChannel } from '../types/adrastea.types';
import { genId } from '../utils/id';

interface ChannelRow {
  id: string;
  room_id: string;
  channel_id: string;
  label: string;
  order: number;
  is_archived: boolean;
  allowed_user_ids: string[];
}

export const DEFAULT_CHANNELS: ChatChannel[] = [
  { channel_id: 'main', label: 'メイン', order: 0, is_archived: false, allowed_user_ids: [] },
  { channel_id: 'info', label: '情報', order: 1, is_archived: false, allowed_user_ids: [] },
  { channel_id: 'other', label: '雑談', order: 2, is_archived: false, allowed_user_ids: [] },
];

export function useChannels(roomId: string, options?: { initialData?: unknown[]; enabled?: boolean }) {
  const { initialData, enabled } = options ?? {};
  const channelsQuery = useSupabaseQuery<ChannelRow>({
    table: 'channels',
    columns: 'id,room_id,channel_id,label,"order",is_archived,allowed_user_ids',
    roomId,
    filter: (q) => q.eq('room_id', roomId ?? ''),
    enabled: enabled !== false,
    initialData,
  });
  const channelsData = channelsQuery.data;
  const channelsMutation = useSupabaseMutation<ChannelRow>('channels', channelsQuery.setData);

  // DEFAULT_CHANNELSは常にUI定数として表示
  // DBのカスタムチャンネル（DEFAULT_CHANNELSと被らないもの）を後ろに追加
  const channels: ChatChannel[] = DEFAULT_CHANNELS.concat(
    (channelsData ?? [])
      .filter((c) => {
        // is_archived: true は除外
        if (c.is_archived) return false;
        // DEFAULT_CHANNELSのchannel_idと被らないもののみ
        const isDefault = DEFAULT_CHANNELS.some((dc) => dc.channel_id === c.channel_id);
        return !isDefault;
      })
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        channel_id: c.channel_id,
        label: c.label,
        order: c.order,
        is_archived: c.is_archived,
        allowed_user_ids: c.allowed_user_ids,
      }))
  );

  const upsertChannel = useCallback(async (channel: ChatChannel) => {
    // Supabase .upsert() で原子的に insert/update を実行（レースコンディション防止）
    const data = {
      id: genId(), // INSERT時に必要
      room_id: roomId,
      channel_id: channel.channel_id,
      label: channel.label,
      order: channel.order,
      is_archived: channel.is_archived,
      allowed_user_ids: channel.allowed_user_ids,
    };
    const { error } = await supabase
      .from('channels')
      .upsert(data, { onConflict: 'room_id,channel_id' });
    if (error) throw error;
  }, [roomId]);

  const deleteChannel = useCallback(async (channelId: string) => {
    // 楽観的削除：対象チャンネルを探して削除
    const channelToDelete = channelsData.find((c) => c.channel_id === channelId);
    if (channelToDelete) {
      await channelsMutation.remove(channelToDelete.id);
    }
  }, [channelsData, channelsMutation]);

  return { channels, upsertChannel, deleteChannel, loading: channelsQuery.loading };
}
