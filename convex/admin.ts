import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./_helpers";
import type { Id } from "./_generated/dataModel";

/**
 * 管理者かどうかを判定
 * 環境変数 ADMIN_USER_IDS （カンマ区切り）で指定
 */
function isAdmin(userId: string): boolean {
  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return adminIds.includes(userId);
}

/**
 * 全ルーム一覧（管理者専用）
 */
export const listAllRooms = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = getUserId(identity);
    if (!isAdmin(userId)) {
      throw new Error("Forbidden");
    }

    const rooms = await ctx.db.query("rooms").collect();

    // ユーザー情報を付与
    const userIds = [...new Set(rooms.map((r) => r.owner_id))];
    const users = await Promise.all(
      userIds.map((id) => ctx.db.get(id as Id<"users">))
    );

    const userMap = new Map(
      users.map((u) => [
        u?._id.toString(),
        u
          ? { name: u.name ?? null, image: u.image ?? null }
          : { name: null, image: null },
      ])
    );

    return rooms.map((r) => ({
      ...r,
      ownerInfo: userMap.get(r.owner_id) ?? { name: null, image: null },
    }));
  },
});

/**
 * ルーム削除（管理者専用）
 */
export const deleteRoom = mutation({
  args: { roomId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = getUserId(identity);
    if (!isAdmin(userId)) {
      throw new Error("Forbidden");
    }

    const room = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("id"), args.roomId))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    // 関連データを削除（チェーンで並べる）
    // 1. シーン削除
    const scenes = await ctx.db
      .query("scenes")
      .withIndex("by_room", (q) => q.eq("room_id", args.roomId))
      .collect();

    for (const scene of scenes) {
      await ctx.db.delete(scene._id);
    }

    // 2. ピース削除
    const pieces = await ctx.db
      .query("pieces")
      .withIndex("by_room", (q) => q.eq("room_id", args.roomId))
      .collect();

    for (const piece of pieces) {
      await ctx.db.delete(piece._id);
    }

    // 3. キャラクター削除
    const characters = await ctx.db
      .query("characters_stats")
      .withIndex("by_room", (q) => q.eq("room_id", args.roomId))
      .collect();

    for (const character of characters) {
      await ctx.db.delete(character._id);
    }

    // 4. オブジェクト削除
    const objects = await ctx.db
      .query("objects")
      .withIndex("by_room", (q) => q.eq("room_id", args.roomId))
      .collect();

    for (const obj of objects) {
      await ctx.db.delete(obj._id);
    }

    // 5. BGM削除
    const bgms = await ctx.db
      .query("bgms")
      .withIndex("by_room", (q) => q.eq("room_id", args.roomId))
      .collect();

    for (const bgm of bgms) {
      await ctx.db.delete(bgm._id);
    }

    // 6. カットイン削除
    const cutins = await ctx.db
      .query("cutins")
      .withIndex("by_room", (q) => q.eq("room_id", args.roomId))
      .collect();

    for (const cutin of cutins) {
      await ctx.db.delete(cutin._id);
    }

    // 7. メッセージ削除
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_room", (q) => q.eq("room_id", args.roomId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // 8. ルームメンバー削除
    const members = await ctx.db
      .query("room_members")
      .withIndex("by_room", (q) => q.eq("room_id", args.roomId))
      .collect();

    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // 9. 最後にルーム本体を削除
    await ctx.db.delete(room._id);

    return { success: true };
  },
});

/**
 * 管理者ユーザーかどうかを確認（クライアント側でUI制御用）
 */
export const isCurrentUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const userId = getUserId(identity);
    return isAdmin(userId);
  },
});
