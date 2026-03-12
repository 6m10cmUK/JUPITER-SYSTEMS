import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return ctx.db
      .query("cutins")
      .withIndex("by_room", (q) => q.eq("room_id", args.room_id))
      .collect();
  },
});

export const create = mutation({
  args: {
    id: v.string(),
    room_id: v.string(),
    name: v.string(),
    image_url: v.union(v.string(), v.null()),
    text: v.string(),
    animation: v.union(v.literal("slide"), v.literal("fade"), v.literal("zoom")),
    duration: v.number(),
    text_color: v.string(),
    background_color: v.string(),
    sort_order: v.number(),
    created_at: v.number(),
    updated_at: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.db.insert("cutins", args);
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    image_url: v.optional(v.union(v.string(), v.null())),
    text: v.optional(v.string()),
    animation: v.optional(v.union(v.literal("slide"), v.literal("fade"), v.literal("zoom"))),
    duration: v.optional(v.number()),
    text_color: v.optional(v.string()),
    background_color: v.optional(v.string()),
    sort_order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const { id, ...updates } = args;
    const doc = await ctx.db
      .query("cutins")
      .filter((q) => q.eq(q.field("id"), id))
      .first();
    if (!doc) throw new Error("Cutin not found");
    await ctx.db.patch(doc._id, { ...updates, updated_at: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const doc = await ctx.db
      .query("cutins")
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
        .query("cutins")
        .filter((q) => q.eq(q.field("id"), u.id))
        .first();
      if (doc) await ctx.db.patch(doc._id, { sort_order: u.sort_order, updated_at: now });
    }
  },
});
