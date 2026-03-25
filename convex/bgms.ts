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

export const list = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("bgms")
      .withIndex("by_room", (q) => q.eq("room_id", args.room_id))
      .collect();
  },
});

export const create = mutation({
  args: {
    id: v.string(),
    room_id: v.string(),
    name: v.string(),
    bgm_type: v.union(v.literal("youtube"), v.literal("url"), v.literal("upload"), v.null()),
    bgm_source: v.union(v.string(), v.null()),
    bgm_volume: v.number(),
    bgm_loop: v.boolean(),
    scene_ids: v.array(v.string()),
    is_playing: v.boolean(),
    is_paused: v.boolean(),
    auto_play_scene_ids: v.array(v.string()),
    fade_in: v.boolean(),
    fade_in_duration: v.optional(v.number()),
    sort_order: v.number(),
    created_at: v.number(),
    updated_at: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const role = await getRole(ctx, args.room_id);
    assertMinRole(role, 'sub_owner');

    // Range validation: clamp numeric fields
    const data = { ...args };
    data.bgm_volume = Math.max(0, Math.min(1, data.bgm_volume));
    data.sort_order = Math.max(0, Math.floor(data.sort_order));
    if (data.fade_in_duration !== undefined) {
      data.fade_in_duration = Math.max(0, data.fade_in_duration);
    }

    await ctx.db.insert("bgms", data);
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    bgm_type: v.optional(v.union(v.literal("youtube"), v.literal("url"), v.literal("upload"), v.null())),
    bgm_source: v.optional(v.union(v.string(), v.null())),
    bgm_volume: v.optional(v.number()),
    bgm_loop: v.optional(v.boolean()),
    scene_ids: v.optional(v.array(v.string())),
    is_playing: v.optional(v.boolean()),
    is_paused: v.optional(v.boolean()),
    auto_play_scene_ids: v.optional(v.array(v.string())),
    fade_in: v.optional(v.boolean()),
    fade_in_duration: v.optional(v.number()),
    sort_order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const { id, ...updates } = args;
    const doc = await ctx.db
      .query("bgms")
      .filter((q) => q.eq(q.field("id"), id))
      .first();
    if (!doc) throw new Error("BGM not found");
    const role = await getRole(ctx, doc.room_id);
    assertMinRole(role, 'sub_owner');

    // Range validation: clamp numeric fields
    if (updates.bgm_volume !== undefined) {
      updates.bgm_volume = Math.max(0, Math.min(1, updates.bgm_volume));
    }
    if (updates.sort_order !== undefined) {
      updates.sort_order = Math.max(0, Math.floor(updates.sort_order));
    }
    if (updates.fade_in_duration !== undefined) {
      updates.fade_in_duration = Math.max(0, updates.fade_in_duration);
    }

    await ctx.db.patch(doc._id, { ...updates, updated_at: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const doc = await ctx.db
      .query("bgms")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (doc) {
      const role = await getRole(ctx, doc.room_id);
      assertMinRole(role, 'sub_owner');
      await ctx.db.delete(doc._id);
    }
  },
});

