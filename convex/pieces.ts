import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return ctx.db
      .query("pieces")
      .withIndex("by_room", (q) => q.eq("room_id", args.room_id))
      .collect();
  },
});

export const create = mutation({
  args: {
    id: v.string(),
    room_id: v.string(),
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    image_url: v.union(v.string(), v.null()),
    label: v.string(),
    color: v.string(),
    z_index: v.number(),
    statuses: v.array(v.object({
      label: v.string(),
      value: v.number(),
      max: v.number(),
      color: v.optional(v.string()),
    })),
    initiative: v.number(),
    memo: v.string(),
    character_id: v.union(v.string(), v.null()),
    created_at: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.db.insert("pieces", args);
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    image_url: v.optional(v.union(v.string(), v.null())),
    label: v.optional(v.string()),
    color: v.optional(v.string()),
    z_index: v.optional(v.number()),
    statuses: v.optional(v.array(v.object({
      label: v.string(),
      value: v.number(),
      max: v.number(),
      color: v.optional(v.string()),
    }))),
    initiative: v.optional(v.number()),
    memo: v.optional(v.string()),
    character_id: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const { id, ...updates } = args;
    const doc = await ctx.db
      .query("pieces")
      .filter((q) => q.eq(q.field("id"), id))
      .first();
    if (!doc) throw new Error("Piece not found");
    await ctx.db.patch(doc._id, updates);
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const doc = await ctx.db
      .query("pieces")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (doc) await ctx.db.delete(doc._id);
  },
});
