import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room_time", (q) => q.eq("room_id", args.room_id))
      .order("desc")
      .take(100);

    return messages;
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const message = {
      id: args.id,
      room_id: args.room_id,
      sender_name: args.sender_name,
      sender_uid: args.sender_uid ?? null,
      sender_avatar: args.sender_avatar ?? null,
      content: args.content,
      message_type: args.message_type,
      created_at: Date.now(),
    };

    await ctx.db.insert("messages", message);
    return message;
  },
});
