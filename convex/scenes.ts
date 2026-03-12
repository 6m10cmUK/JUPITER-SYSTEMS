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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return ctx.db
      .query("scenes")
      .withIndex("by_room", (q) => q.eq("room_id", args.room_id))
      .collect();
  },
});

export const create = mutation({
  args: {
    id: v.string(),
    room_id: v.string(),
    name: v.string(),
    background_url: v.union(v.string(), v.null()),
    foreground_url: v.union(v.string(), v.null()),
    foreground_opacity: v.number(),
    bg_transition: v.union(v.literal("none"), v.literal("fade")),
    bg_transition_duration: v.number(),
    fg_transition: v.union(v.literal("none"), v.literal("fade")),
    fg_transition_duration: v.number(),
    bg_blur: v.boolean(),
    sort_order: v.number(),
    created_at: v.number(),
    updated_at: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const role = await getRole(ctx, args.room_id);
    assertMinRole(role, 'sub_owner');
    await ctx.db.insert("scenes", args);
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    background_url: v.optional(v.union(v.string(), v.null())),
    foreground_url: v.optional(v.union(v.string(), v.null())),
    foreground_opacity: v.optional(v.number()),
    bg_transition: v.optional(v.union(v.literal("none"), v.literal("fade"))),
    bg_transition_duration: v.optional(v.number()),
    fg_transition: v.optional(v.union(v.literal("none"), v.literal("fade"))),
    fg_transition_duration: v.optional(v.number()),
    bg_blur: v.optional(v.boolean()),
    sort_order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const { id, ...updates } = args;
    const doc = await ctx.db
      .query("scenes")
      .filter((q) => q.eq(q.field("id"), id))
      .first();
    if (!doc) throw new Error("Scene not found");
    const role = await getRole(ctx, doc.room_id);
    assertMinRole(role, 'sub_owner');
    await ctx.db.patch(doc._id, { ...updates, updated_at: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const doc = await ctx.db
      .query("scenes")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (doc) {
      const role = await getRole(ctx, doc.room_id);
      assertMinRole(role, 'sub_owner');
      await ctx.db.delete(doc._id);
    }
  },
});

export const reorder = mutation({
  args: {
    updates: v.array(v.object({ id: v.string(), sort_order: v.number() })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const now = Date.now();
    let roomId: string | null = null;
    for (const u of args.updates) {
      const doc = await ctx.db
        .query("scenes")
        .filter((q) => q.eq(q.field("id"), u.id))
        .first();
      if (doc) {
        if (!roomId) roomId = doc.room_id;
        await ctx.db.patch(doc._id, { sort_order: u.sort_order, updated_at: now });
      }
    }
    if (roomId) {
      const role = await getRole(ctx, roomId);
      assertMinRole(role, 'sub_owner');
    }
  },
});
