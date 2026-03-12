import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const objectFields = {
  id: v.string(),
  room_id: v.string(),
  type: v.union(
    v.literal("panel"),
    v.literal("text"),
    v.literal("foreground"),
    v.literal("background")
  ),
  name: v.string(),
  global: v.boolean(),
  scene_ids: v.array(v.string()),
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
  visible: v.boolean(),
  opacity: v.number(),
  sort_order: v.number(),
  locked: v.boolean(),
  position_locked: v.boolean(),
  size_locked: v.boolean(),
  image_url: v.union(v.string(), v.null()),
  image_asset_id: v.union(v.string(), v.null()),
  background_color: v.string(),
  image_fit: v.union(v.literal("contain"), v.literal("cover"), v.literal("stretch")),
  text_content: v.union(v.string(), v.null()),
  font_size: v.number(),
  font_family: v.string(),
  letter_spacing: v.number(),
  line_height: v.number(),
  auto_size: v.boolean(),
  text_align: v.union(v.literal("left"), v.literal("center"), v.literal("right")),
  text_vertical_align: v.union(v.literal("top"), v.literal("middle"), v.literal("bottom")),
  text_color: v.string(),
  scale_x: v.number(),
  scale_y: v.number(),
  created_at: v.number(),
  updated_at: v.number(),
};

export const list = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return ctx.db
      .query("objects")
      .withIndex("by_room", (q) => q.eq("room_id", args.room_id))
      .collect();
  },
});

export const create = mutation({
  args: objectFields,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.db.insert("objects", args);
  },
});

export const createBatch = mutation({
  args: { objects: v.array(v.object(objectFields)) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    for (const obj of args.objects) {
      await ctx.db.insert("objects", obj);
    }
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    global: v.optional(v.boolean()),
    scene_ids: v.optional(v.array(v.string())),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    visible: v.optional(v.boolean()),
    opacity: v.optional(v.number()),
    sort_order: v.optional(v.number()),
    locked: v.optional(v.boolean()),
    position_locked: v.optional(v.boolean()),
    size_locked: v.optional(v.boolean()),
    image_url: v.optional(v.union(v.string(), v.null())),
    image_asset_id: v.optional(v.union(v.string(), v.null())),
    background_color: v.optional(v.string()),
    image_fit: v.optional(v.union(v.literal("contain"), v.literal("cover"), v.literal("stretch"))),
    text_content: v.optional(v.union(v.string(), v.null())),
    font_size: v.optional(v.number()),
    font_family: v.optional(v.string()),
    letter_spacing: v.optional(v.number()),
    line_height: v.optional(v.number()),
    auto_size: v.optional(v.boolean()),
    text_align: v.optional(v.union(v.literal("left"), v.literal("center"), v.literal("right"))),
    text_vertical_align: v.optional(v.union(v.literal("top"), v.literal("middle"), v.literal("bottom"))),
    text_color: v.optional(v.string()),
    scale_x: v.optional(v.number()),
    scale_y: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const { id, ...updates } = args;
    const doc = await ctx.db
      .query("objects")
      .filter((q) => q.eq(q.field("id"), id))
      .first();
    if (!doc) throw new Error("Object not found");
    await ctx.db.patch(doc._id, { ...updates, updated_at: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const doc = await ctx.db
      .query("objects")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (doc) await ctx.db.delete(doc._id);
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
    for (const u of args.updates) {
      const doc = await ctx.db
        .query("objects")
        .filter((q) => q.eq(q.field("id"), u.id))
        .first();
      if (doc) await ctx.db.patch(doc._id, { sort_order: u.sort_order, updated_at: now });
    }
  },
});

export const batchUpdateSort = mutation({
  args: {
    updates: v.array(v.object({ id: v.string(), sort: v.number() })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const now = Date.now();
    for (const u of args.updates) {
      const doc = await ctx.db
        .query("objects")
        .filter((q) => q.eq(q.field("id"), u.id))
        .first();
      if (doc) await ctx.db.patch(doc._id, { sort_order: u.sort, updated_at: now });
    }
  },
});
