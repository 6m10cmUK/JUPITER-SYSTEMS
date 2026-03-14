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
    on_board: v.optional(v.boolean()),
    board_x: v.optional(v.number()),
    board_y: v.optional(v.number()),
    board_height: v.optional(v.number()),
    board_visible: v.optional(v.boolean()),
    created_at: v.number(),
    updated_at: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const role = await getRole(ctx, args.room_id);
    assertMinRole(role, 'user');

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
      board_x: args.board_x,
      board_y: args.board_y,
      board_visible: args.board_visible,
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
    on_board: v.optional(v.boolean()),
    board_x: v.optional(v.number()),
    board_y: v.optional(v.number()),
    board_height: v.optional(v.number()),
    board_visible: v.optional(v.boolean()),
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

    const userId = getUserId(identity);
    const role = await getRole(ctx, doc.room_id);

    // sub_owner以上は常に編集可、user は自分のキャラのみ
    if (ROLE_HIERARCHY.indexOf(role) < ROLE_HIERARCHY.indexOf('sub_owner')) {
      assertMinRole(role, 'user');
      if (doc.owner_id !== userId) {
        throw new Error("Permission denied: can only edit own character");
      }
    }

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

    // 対応する characters_stats を取得してオーナーを確認
    const statDoc = await ctx.db
      .query("characters_stats")
      .filter((q) => q.eq(q.field("id"), id))
      .first();

    const userId = getUserId(identity);
    const role = await getRole(ctx, doc.room_id);

    // sub_owner以上は常に編集可、user は自分のキャラのみ
    if (statDoc && ROLE_HIERARCHY.indexOf(role) < ROLE_HIERARCHY.indexOf('sub_owner')) {
      assertMinRole(role, 'user');
      if (statDoc.owner_id !== userId) {
        throw new Error("Permission denied: can only edit own character");
      }
    }

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
    if (statDoc) {
      const userId = getUserId(identity);
      const role = await getRole(ctx, statDoc.room_id);

      // sub_owner以上は常に削除可、user は自分のキャラのみ
      if (ROLE_HIERARCHY.indexOf(role) < ROLE_HIERARCHY.indexOf('sub_owner')) {
        assertMinRole(role, 'user');
        if (statDoc.owner_id !== userId) {
          throw new Error("Permission denied: can only remove own character");
        }
      }

      await ctx.db.delete(statDoc._id);
    }

    // Delete from characters_base
    const baseDoc = await ctx.db
      .query("characters_base")
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    if (baseDoc) await ctx.db.delete(baseDoc._id);
  },
});
