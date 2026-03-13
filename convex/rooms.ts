import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./_helpers";

/**
 * List rooms owned by the current user
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = getUserId(identity);
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_owner", (q) => q.eq("owner_id", userId))
      .collect();

    return rooms;
  },
});

/**
 * Get a specific room by ID
 */
export const get = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const room = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();

    if (!room) {
      return null;
    }

    return room;
  },
});

/**
 * Create a new room
 */
export const create = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    dice_system: v.string(),
    gm_can_see_secret_memo: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = getUserId(identity);
    const now = Date.now();

    const room = {
      id: args.id,
      name: args.name,
      owner_id: userId,
      active_scene_id: null,
      foreground_url: null,
      active_cutin: null,
      dice_system: args.dice_system,
      gm_can_see_secret_memo: args.gm_can_see_secret_memo,
      created_at: now,
      updated_at: now,
    };

    await ctx.db.insert("rooms", room);

    // 作成者を owner として room_members に登録
    await ctx.db.insert("room_members", {
      room_id: args.id,
      user_id: userId,
      role: 'owner',
      joined_at: now,
    });

    return room;
  },
});

/**
 * Update a room (owner only)
 */
export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    active_scene_id: v.optional(v.union(v.string(), v.null())),
    foreground_url: v.optional(v.union(v.string(), v.null())),
    active_cutin: v.optional(
      v.union(
        v.object({
          cutin_id: v.string(),
          triggered_at: v.number(),
        }),
        v.null()
      )
    ),
    dice_system: v.optional(v.string()),
    gm_can_see_secret_memo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = getUserId(identity);

    const room = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    if (room.owner_id !== userId) {
      throw new Error("Not authorized");
    }

    const updates: Record<string, any> = {
      updated_at: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.active_scene_id !== undefined)
      updates.active_scene_id = args.active_scene_id;
    if (args.foreground_url !== undefined)
      updates.foreground_url = args.foreground_url;
    if (args.active_cutin !== undefined) updates.active_cutin = args.active_cutin;
    if (args.dice_system !== undefined) updates.dice_system = args.dice_system;
    if (args.gm_can_see_secret_memo !== undefined)
      updates.gm_can_see_secret_memo = args.gm_can_see_secret_memo;

    const _id = room._id;
    await ctx.db.patch(_id, updates);

    const updated = await ctx.db.get(_id);
    return updated;
  },
});

/**
 * Remove a room (owner only)
 */
export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = getUserId(identity);

    const room = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    if (room.owner_id !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(room._id);
    return { success: true };
  },
});
