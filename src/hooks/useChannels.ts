import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { ChatChannel } from '../types/adrastea.types';

export const DEFAULT_CHANNELS: ChatChannel[] = [
  { channel_id: 'main', label: 'メイン', order: 0, is_archived: false, allowed_user_ids: [] },
  { channel_id: 'info', label: '情報', order: 1, is_archived: false, allowed_user_ids: [] },
  { channel_id: 'other', label: '雑談', order: 2, is_archived: false, allowed_user_ids: [] },
];

export function useChannels(roomId: string) {
  const channelsData = useQuery(api.channels.list, { room_id: roomId ?? '' });
  const upsertMutation = useMutation(api.channels.upsert);

  // DBにデータがなければデフォルトを使う
  const channels: ChatChannel[] = channelsData && channelsData.length > 0
    ? channelsData
        .filter((c: any) => !c.is_archived)
        .sort((a: any, b: any) => a.order - b.order)
        .map((c: any) => ({
          channel_id: c.channel_id,
          label: c.label,
          order: c.order,
          is_archived: c.is_archived,
          allowed_user_ids: c.allowed_user_ids,
        }))
    : DEFAULT_CHANNELS;

  const upsertChannel = async (channel: ChatChannel) => {
    await upsertMutation({
      room_id: roomId,
      channel_id: channel.channel_id,
      label: channel.label,
      order: channel.order,
      is_archived: channel.is_archived,
      allowed_user_ids: channel.allowed_user_ids,
    });
  };

  return { channels, upsertChannel, loading: channelsData === undefined };
}
