import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { getUserId, ROLE_HIERARCHY, RoomRole, assertMinRole } from "./_helpers";

async function getRole(ctx: any, roomId: string): Promise<RoomRole> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return 'guest';
  const member = await ctx.db
    .query("room_members")
    .withIndex("by_room_user", (q: any) => q.eq("room_id", roomId).eq("user_id", getUserId(identity)))
    .first();
  return (member?.role ?? 'guest') as RoomRole;
}

export const getMyRole = query({
  args: { room_id: v.string() },
  handler: async (ctx, args): Promise<RoomRole> => {
    return getRole(ctx, args.room_id);
  },
});

export const join = mutation({
  args: { room_id: v.string() },
  handler: async (ctx, args): Promise<{ role: RoomRole }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const userId = getUserId(identity);

    // 既存メンバーをチェック
    const existing = await ctx.db
      .query("room_members")
      .withIndex("by_room_user", (q) => q.eq("room_id", args.room_id).eq("user_id", userId))
      .first();

    const room = await ctx.db
      .query("rooms")
      .filter((q) => q.eq(q.field("id"), args.room_id))
      .first();

    if (!room) {
      throw new Error("Room not found");
    }

    const correctRole = (room.owner_id === userId)
      ? 'owner'
      : (room.default_login_role ?? 'user');

    if (!existing) {
      await ctx.db.insert("room_members", {
        room_id: args.room_id,
        user_id: userId,
        role: correctRole,
        joined_at: Date.now(),
      });
      return { role: correctRole };
    } else if (existing.role !== 'owner' && correctRole === 'owner') {
      // 既存エントリがあるがオーナーが user になってしまっている場合に修正
      await ctx.db.patch(existing._id, { role: 'owner' });
      return { role: 'owner' as RoomRole };
    }
    return { role: existing.role as RoomRole };
  },
});

export const assignRole = mutation({
  args: {
    room_id: v.string(),
    target_user_id: v.string(),
    role: v.union(v.literal('sub_owner'), v.literal('user'), v.literal('guest')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // 呼び出し元のロールをチェック
    const myRole = await getRole(ctx, args.room_id);
    assertMinRole(myRole, 'owner');

    // 対象ユーザーを取得
    let member = await ctx.db
      .query("room_members")
      .withIndex("by_room_user", (q) => q.eq("room_id", args.room_id).eq("user_id", args.target_user_id))
      .first();

    if (!member) {
      throw new Error("Member not found");
    }

    // オーナーのロール変更は禁止
    if (member.role === 'owner') {
      throw new Error("Cannot change owner's role");
    }

    // ロールを更新
    await ctx.db.patch(member._id, { role: args.role });
  },
});

export const getMembers = query({
  args: { room_id: v.string() },
  handler: async (ctx, args) => {
    const myRole = await getRole(ctx, args.room_id);
    assertMinRole(myRole, 'owner');

    const members = await ctx.db
      .query("room_members")
      .withIndex("by_room", (q: any) => q.eq("room_id", args.room_id))
      .collect();

    // ユーザー情報を結合
    const membersWithInfo = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.user_id as Id<"users">);
        return {
          user_id: m.user_id,
          role: m.role,
          joined_at: m.joined_at,
          display_name: user?.name ?? null,
          avatar_url: user?.image ?? null,
        };
      })
    );

    return membersWithInfo;
  },
});
