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
    const correctRole = (room?.owner_id === userId) ? 'owner' : 'user';

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
    role: v.union(v.literal('sub_owner'), v.literal('user')),
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

    // ロールを更新
    await ctx.db.patch(member._id, { role: args.role });
  },
});
