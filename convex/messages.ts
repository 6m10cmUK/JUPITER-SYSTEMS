import { mutation, query, internalAction, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./_helpers";
import { internal } from "./_generated/api";

const ROLE_HIERARCHY = ['guest', 'user', 'sub_owner', 'owner'] as const;
type RoomRole = typeof ROLE_HIERARCHY[number];

async function getRole(ctx: any, roomId: string): Promise<RoomRole> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return 'guest';
  const member = await ctx.db
    .query("room_members")
    .withIndex("by_room_user", (q: any) => q.eq("room_id", roomId).eq("user_id", getUserId(identity)))
    .first();
  return (member?.role ?? 'guest') as RoomRole;
}

function assertMinRole(role: RoomRole, required: RoomRole): void {
  if (ROLE_HIERARCHY.indexOf(role) < ROLE_HIERARCHY.indexOf(required)) {
    throw new Error(`Permission denied: requires ${required}, got ${role}`);
  }
}

/**
 * Get messages for a room (latest 100 messages in reverse chronological order)
 */
export const list = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity ? getUserId(identity) : null;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room_time", (q) => q.eq("room_id", args.room_id))
      .order("desc")
      .take(100);

    // Filter messages based on allowed_user_ids
    return messages.filter(msg => {
      const allowedUserIds = (msg as any).allowed_user_ids;
      // 秘密メッセージは未認証ユーザーには非表示
      if (allowedUserIds && allowedUserIds.length > 0) {
        return userId ? allowedUserIds.includes(userId) : false;
      }
      return true;
    });
  },
});

/**
 * Send a message to a room
 */
export const send = mutation({
  args: {
    id: v.string(),
    room_id: v.string(),
    sender_name: v.string(),
    content: v.string(),
    message_type: v.union(v.literal("chat"), v.literal("dice"), v.literal("system")),
    sender_uid: v.optional(v.string()),
    sender_avatar: v.optional(v.union(v.string(), v.null())),
    channel: v.optional(v.string()),
    allowed_user_ids: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const role = await getRole(ctx, args.room_id);
    assertMinRole(role, 'user');

    const message = {
      id: args.id,
      room_id: args.room_id,
      sender_name: args.sender_name,
      sender_uid: args.sender_uid ?? null,
      sender_avatar: args.sender_avatar ?? null,
      content: args.content,
      message_type: args.message_type,
      channel: args.channel,
      allowed_user_ids: args.allowed_user_ids,
      created_at: Date.now(),
    };

    await ctx.db.insert("messages", message);

    // アーカイブ閾値チェック: 300件超えたらバックグラウンドでアーカイブ
    const count = await ctx.db
      .query("messages")
      .withIndex("by_room", (q) => q.eq("room_id", args.room_id))
      .collect()
      .then((msgs) => msgs.length);
    if (count > 300) {
      await ctx.scheduler.runAfter(0, internal.messages.archive, {
        room_id: args.room_id,
      });
    }

    return message;
  },
});

/**
 * メッセージアーカイブ: 古いメッセージを Worker (D1) に退避し Convex から削除
 */
export const archive = internalAction({
  args: { room_id: v.string() },
  handler: async (ctx, args) => {
    // 1. このルームの全メッセージを created_at asc で取得
    const allMessages: any[] = await ctx.runQuery(internal.messages.listAllForArchive, {
      room_id: args.room_id,
    });

    if (allMessages.length <= 100) return; // 100件以下なら何もしない

    // 2. 最新100件を残し、古い方をアーカイブ対象に
    const toArchive = allMessages.slice(0, allMessages.length - 100);

    // 3. Worker に POST でバッチ送信
    const workerUrl = process.env.WORKER_URL;
    const archiveSecret = process.env.ARCHIVE_SECRET;
    if (!workerUrl || !archiveSecret) {
      console.error("WORKER_URL or ARCHIVE_SECRET not set");
      return;
    }

    const response = await fetch(
      `${workerUrl}/api/rooms/${args.room_id}/messages/archive`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Archive-Secret": archiveSecret,
        },
        body: JSON.stringify({
          messages: toArchive.map((m: any) => ({
            id: m.id,
            room_id: m.room_id,
            sender_name: m.sender_name,
            sender_uid: m.sender_uid,
            sender_avatar: m.sender_avatar,
            content: m.content,
            message_type: m.message_type,
            channel: m.channel,
            allowed_user_ids: m.allowed_user_ids,
            created_at: m.created_at,
          })),
        }),
      }
    );

    if (!response.ok) {
      console.error("Archive failed:", await response.text());
      return;
    }

    // 4. 成功したら Convex から対象メッセージを削除
    await ctx.runMutation(internal.messages.deleteArchived, {
      ids: toArchive.map((m: any) => m._id),
    });
  },
});

/** archive 用: ルーム内全メッセージを created_at asc で取得 */
export const listAllForArchive = internalQuery({
  args: { room_id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_room_time", (q) => q.eq("room_id", args.room_id))
      .order("asc")
      .collect();
  },
});

/** archive 用: 指定IDのメッセージを一括削除 */
export const deleteArchived = internalMutation({
  args: { ids: v.array(v.id("messages")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
  },
});

/**
 * ルーム内の全メッセージを削除（sub_owner 以上）
 */
export const clearByRoom = mutation({
  args: { room_id: v.string() },
  handler: async (ctx, args) => {
    const role = await getRole(ctx, args.room_id);
    assertMinRole(role, 'sub_owner');

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room", (q) => q.eq("room_id", args.room_id))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
  },
});

/**
 * シークレットダイスをオープン（送信者本人のみ）
 * allowed_user_ids を undefined に設定して全員に公開する
 */
export const openSecret = mutation({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = getUserId(identity);

    const msg = await ctx.db
      .query("messages")
      .withIndex("by_custom_id", (q) => q.eq("id", args.id))
      .first();
    if (!msg) throw new Error("Message not found");

    // 送信者本人のみオープン可能
    if (msg.sender_uid !== userId) {
      throw new Error("Permission denied: only sender can open secret dice");
    }

    // allowed_user_ids を削除して全員に公開
    await ctx.db.patch(msg._id, { allowed_user_ids: undefined });
  },
});
