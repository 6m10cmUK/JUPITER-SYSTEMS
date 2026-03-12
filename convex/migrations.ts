import { mutation } from "./_generated/server";

/** 既存データのuser_idからセッションIDを除去するワンショットmigration */
export const fixUserIds = mutation({
  args: {},
  handler: async (ctx) => {
    // rooms.owner_id を修正
    const rooms = await ctx.db.query("rooms").collect();
    for (const room of rooms) {
      if (room.owner_id.includes('|')) {
        await ctx.db.patch(room._id, { owner_id: room.owner_id.split('|')[0] });
      }
    }

    // room_members.user_id を修正（重複を統合）
    const members = await ctx.db.query("room_members").collect();
    const seen = new Map<string, typeof members[0]>();
    for (const member of members) {
      const cleanUserId = member.user_id.includes('|') ? member.user_id.split('|')[0] : member.user_id;
      const key = `${member.room_id}:${cleanUserId}`;
      const existing = seen.get(key);
      if (existing) {
        // 重複: ownerのエントリを優先し、それ以外は削除
        if (member.role === 'owner') {
          await ctx.db.patch(member._id, { user_id: cleanUserId });
          await ctx.db.delete(existing._id);
          seen.set(key, member);
        } else {
          await ctx.db.delete(member._id);
        }
      } else {
        if (member.user_id !== cleanUserId) {
          await ctx.db.patch(member._id, { user_id: cleanUserId });
        }
        seen.set(key, { ...member, user_id: cleanUserId });
      }
    }

    // characters_stats.owner_id を修正
    const characterStats = await ctx.db.query("characters_stats").collect();
    for (const char of characterStats) {
      if (char.owner_id.includes('|')) {
        await ctx.db.patch(char._id, { owner_id: char.owner_id.split('|')[0] });
      }
    }

    return { rooms: rooms.length, members: members.length, characterStats: characterStats.length };
  },
});
