import { supabase } from '../services/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import type { ChatChannel } from '../types/adrastea.types';

export const DEFAULT_CHANNELS: ChatChannel[] = [
  { channel_id: 'main', label: 'メイン', order: 0, is_archived: false, allowed_user_ids: [] },
  { channel_id: 'info', label: '情報', order: 1, is_archived: false, allowed_user_ids: [] },
  { channel_id: 'other', label: '雑談', order: 2, is_archived: false, allowed_user_ids: [] },
];

export function useChannels(roomId: string) {
  const channelsQuery = useSupabaseQuery<any>({
    table: 'channels',
    columns: 'id,room_id,channel_id,label,"order",is_archived,allowed_user_ids',
    roomId,
    filter: (q) => q.eq('room_id', roomId ?? ''),
  });
  const channelsData = channelsQuery.data;

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

  const upsertChannel = async (channel: ChatChannel) => {
    const { data: existing } = await supabase
      .from('channels')
      .select('id')
      .eq('room_id', roomId)
      .eq('channel_id', channel.channel_id)
      .single();

    if (existing) {
      await supabase
        .from('channels')
        .update({
          label: channel.label,
          order: channel.order,
          is_archived: channel.is_archived,
          allowed_user_ids: channel.allowed_user_ids,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('channels').insert([{
        room_id: roomId,
        channel_id: channel.channel_id,
        label: channel.label,
        order: channel.order,
        is_archived: channel.is_archived,
        allowed_user_ids: channel.allowed_user_ids,
      }]);
    }
  };

  const deleteChannel = async (channelId: string) => {
    await supabase
      .from('channels')
      .delete()
      .eq('room_id', roomId)
      .eq('channel_id', channelId);
  };

  return { channels, upsertChannel, deleteChannel, loading: channelsQuery.loading };
}
