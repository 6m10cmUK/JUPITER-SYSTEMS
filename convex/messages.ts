import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./_helpers";

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
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = getUserId(identity);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room_time", (q) => q.eq("room_id", args.room_id))
      .order("desc")
      .take(100);

    // Filter messages based on allowed_user_ids
    return messages.filter(msg => {
      const allowedUserIds = (msg as any).allowed_user_ids;
      // If allowed_user_ids is set and non-empty, only include if user is in the list
      if (allowedUserIds && allowedUserIds.length > 0) {
        return allowedUserIds.includes(userId);
      }
      // If not set or empty, include for all users
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
    return message;
  },
});
