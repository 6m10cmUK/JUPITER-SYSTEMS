import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listStats = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return ctx.db
      .query("characters_stats")
      .withIndex("by_room", (q) => q.eq("room_id", args.room_id))
      .collect();
  },
});

export const listBase = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return ctx.db
      .query("characters_base")
      .withIndex("by_room", (q) => q.eq("room_id", args.room_id))
      .collect();
  },
});

export const getBase = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return ctx.db
      .query("characters_base")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
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

    const now = Date.now();

    // Insert into characters_stats
    await ctx.db.insert("characters_stats", {
      id: args.id,
      room_id: args.room_id,
      owner_id: args.owner_id,
      name: args.name,
      color: args.color,
      active_image_index: args.active_image_index,
      statuses: args.statuses,
      parameters: args.parameters,
      is_hidden_on_board: args.is_hidden_on_board,
      is_speech_hidden: args.is_speech_hidden,
      sort_order: args.sort_order,
      created_at: now,
      updated_at: now,
    });

    // Insert into characters_base
    await ctx.db.insert("characters_base", {
      id: args.id,
      room_id: args.room_id,
      images: args.images,
      memo: args.memo,
      secret_memo: args.secret_memo,
      chat_palette: args.chat_palette,
      sheet_url: args.sheet_url,
      initiative: args.initiative,
      size: args.size,
      is_status_private: args.is_status_private,
    });
  },
});

export const updateStats = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    active_image_index: v.optional(v.number()),
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
    is_hidden_on_board: v.optional(v.boolean()),
    is_speech_hidden: v.optional(v.boolean()),
    sort_order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { id, ...updates } = args;
    const doc = await ctx.db
      .query("characters_stats")
      .filter((q) => q.eq(q.field("id"), id))
      .first();
    if (!doc) throw new Error("Character stats not found");

    await ctx.db.patch(doc._id, { ...updates, updated_at: Date.now() });
  },
});

export const updateBase = mutation({
  args: {
    id: v.string(),
    images: v.optional(v.array(v.object({ url: v.string(), label: v.string() }))),
    memo: v.optional(v.string()),
    secret_memo: v.optional(v.string()),
    chat_palette: v.optional(v.string()),
    sheet_url: v.optional(v.union(v.string(), v.null())),
    initiative: v.optional(v.number()),
    size: v.optional(v.number()),
    is_status_private: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const { id, ...updates } = args;
    const doc = await ctx.db
      .query("characters_base")
      .filter((q) => q.eq(q.field("id"), id))
      .first();
    if (!doc) throw new Error("Character base not found");

    await ctx.db.patch(doc._id, updates);
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Delete from characters_stats
    const statDoc = await ctx.db
      .query("characters_stats")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (statDoc) await ctx.db.delete(statDoc._id);

    // Delete from characters_base
    const baseDoc = await ctx.db
      .query("characters_base")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (baseDoc) await ctx.db.delete(baseDoc._id);
  },
});

