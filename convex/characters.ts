import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return ctx.db
      .query("characters")
      .withIndex("by_room", (q) => q.eq("room_id", args.room_id))
      .collect();
  },
});

export const create = mutation({
  args: {
    id: v.string(),
    room_id: v.string(),
    owner_id: v.string(),
    name: v.string(),
    images: v.array(v.object({ url: v.string(), label: v.string() })),
    active_image_index: v.number(),
    color: v.string(),
    sheet_url: v.union(v.string(), v.null()),
    initiative: v.number(),
    size: v.number(),
    statuses: v.array(v.object({
      label: v.string(),
      value: v.number(),
      max: v.number(),
      color: v.optional(v.string()),
    })),
    parameters: v.array(v.object({
      label: v.string(),
      value: v.union(v.number(), v.string()),
    })),
    memo: v.string(),
    secret_memo: v.string(),
    chat_palette: v.string(),
    is_status_private: v.boolean(),
    is_hidden_on_board: v.boolean(),
    is_speech_hidden: v.boolean(),
    sort_order: v.number(),
    created_at: v.number(),
    updated_at: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.db.insert("characters", args);
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    images: v.optional(v.array(v.object({ url: v.string(), label: v.string() }))),
    active_image_index: v.optional(v.number()),
    color: v.optional(v.string()),
    sheet_url: v.optional(v.union(v.string(), v.null())),
    initiative: v.optional(v.number()),
    size: v.optional(v.number()),
    statuses: v.optional(v.array(v.object({
      label: v.string(),
      value: v.number(),
      max: v.number(),
      color: v.optional(v.string()),
    }))),
    parameters: v.optional(v.array(v.object({
      label: v.string(),
      value: v.union(v.number(), v.string()),
    }))),
    memo: v.optional(v.string()),
    secret_memo: v.optional(v.string()),
    chat_palette: v.optional(v.string()),
    is_status_private: v.optional(v.boolean()),
    is_hidden_on_board: v.optional(v.boolean()),
    is_speech_hidden: v.optional(v.boolean()),
    sort_order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const { id, ...updates } = args;
    const doc = await ctx.db
      .query("characters")
      .filter((q) => q.eq(q.field("id"), id))
      .first();
    if (!doc) throw new Error("Character not found");
    await ctx.db.patch(doc._id, { ...updates, updated_at: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const doc = await ctx.db
      .query("characters")
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
        .query("characters")
        .filter((q) => q.eq(q.field("id"), u.id))
        .first();
      if (doc) await ctx.db.patch(doc._id, { sort_order: u.sort_order, updated_at: now });
    }
  },
});
