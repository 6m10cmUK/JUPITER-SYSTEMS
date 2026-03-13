import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import { getUserId } from './_helpers';

export const list = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('認証が必要です');
    }

    const userId = getUserId(identity);
    const allChannels = await ctx.db
      .query('channels')
      .withIndex('by_room', (q) => q.eq('room_id', args.room_id))
      .collect();

    // allowed_user_ids でフィルタリング
    return allChannels.filter((ch) => {
      if (ch.allowed_user_ids.length === 0) {
        // 空配列の場合は全員に表示
        return true;
      }
      // ユーザーIDが含まれている場合のみ表示
      return ch.allowed_user_ids.includes(userId);
    });
  },
});

export const upsert = mutation({
  args: {
    room_id: v.string(),
    channel_id: v.string(),
    label: v.string(),
    order: v.number(),
    is_archived: v.boolean(),
    allowed_user_ids: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('認証が必要です');
    }

    // 既存レコードを検索
    const existing = await ctx.db
      .query('channels')
      .withIndex('by_room_channel', (q) =>
        q.eq('room_id', args.room_id).eq('channel_id', args.channel_id)
      )
      .first();

    if (existing) {
      // 既存レコードを更新
      await ctx.db.patch(existing._id, {
        label: args.label,
        order: args.order,
        is_archived: args.is_archived,
        allowed_user_ids: args.allowed_user_ids,
      });
    } else {
      // 新規作成
      await ctx.db.insert('channels', {
        room_id: args.room_id,
        channel_id: args.channel_id,
        label: args.label,
        order: args.order,
        is_archived: args.is_archived,
        allowed_user_ids: args.allowed_user_ids,
      });
    }
  },
});

const RESERVED_CHANNEL_IDS = ['main', 'info', 'other'];

export const remove = mutation({
  args: {
    room_id: v.string(),
    channel_id: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('認証が必要です');
    }
    if (RESERVED_CHANNEL_IDS.includes(args.channel_id)) {
      throw new Error('既定チャンネルは削除できません');
    }
    const existing = await ctx.db
      .query('channels')
      .withIndex('by_room_channel', (q) =>
        q.eq('room_id', args.room_id).eq('channel_id', args.channel_id)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
