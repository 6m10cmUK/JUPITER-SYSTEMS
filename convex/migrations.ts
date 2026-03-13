import { mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

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

/** D1スナップショットから最初のルームのowner_idを取得 */
export const getFirstRoomOwnerId = internalQuery({
  args: {},
  handler: async (ctx) => {
    const room = await ctx.db.query("rooms").first();
    return room ? room.owner_id : null;
  },
});

/** D1スナップショットをConvexの各テーブルに移行 */
export const importFromD1Snapshot = internalMutation({
  args: {
    ownerConvexId: v.string(),
    room: v.object({
      id: v.string(),
      name: v.string(),
      dice_system: v.string(),
      created_at: v.number(),
      updated_at: v.number(),
      active_scene_id: v.union(v.string(), v.null()),
      active_cutin: v.null(),
      foreground_url: v.union(v.string(), v.null()),
    }),
    scenes: v.array(v.any()),
    objects: v.array(v.any()),
    characters: v.array(v.any()),
    bgms: v.array(v.any()),
    messages: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    // 1. rooms テーブルに挿入
    const roomName = args.room.name || "（名称未設定）";
    await ctx.db.insert("rooms", {
      id: args.room.id,
      name: roomName,
      owner_id: args.ownerConvexId,
      active_scene_id: args.room.active_scene_id,
      foreground_url: args.room.foreground_url,
      active_cutin: null,
      dice_system: args.room.dice_system,
      gm_can_see_secret_memo: false,
      created_at: args.room.created_at,
      updated_at: args.room.updated_at,
    } as any);

    // 2. room_members テーブルに owner レコード挿入
    await ctx.db.insert("room_members", {
      room_id: args.room.id,
      user_id: args.ownerConvexId,
      role: "owner",
      joined_at: Date.now(),
    } as any);

    // 3. scenes テーブルに各シーン挿入
    for (const scene of args.scenes) {
      await ctx.db.insert("scenes", {
        id: scene.id,
        room_id: args.room.id,
        name: scene.name,
        background_url: scene.background_url,
        foreground_url: scene.foreground_url,
        foreground_opacity: scene.foreground_opacity,
        bg_transition: scene.bg_transition,
        bg_transition_duration: scene.bg_transition_duration,
        fg_transition: scene.fg_transition,
        fg_transition_duration: scene.fg_transition_duration,
        bg_blur: scene.bg_blur,
        sort_order: scene.sort_order,
        created_at: scene.created_at,
        updated_at: scene.updated_at,
      } as any);
    }

    // 4. objects テーブルに各オブジェクト挿入
    for (const object of args.objects) {
      await ctx.db.insert("objects", {
        id: object.id,
        room_id: args.room.id,
        type: object.type,
        name: object.name,
        global: object.global,
        scene_ids: object.scene_ids,
        x: object.x,
        y: object.y,
        width: object.width,
        height: object.height,
        visible: object.visible,
        opacity: object.opacity,
        sort_order: object.sort_order,
        locked: object.locked,
        position_locked: object.position_locked,
        size_locked: object.size_locked,
        image_url: object.image_url,
        image_asset_id: object.image_asset_id,
        background_color: object.background_color,
        image_fit: object.image_fit,
        text_content: object.text_content,
        font_size: object.font_size,
        font_family: object.font_family,
        letter_spacing: object.letter_spacing,
        line_height: object.line_height,
        auto_size: object.auto_size,
        text_align: object.text_align,
        text_vertical_align: object.text_vertical_align,
        text_color: object.text_color,
        scale_x: object.scale_x,
        scale_y: object.scale_y,
        created_at: object.created_at,
        updated_at: object.updated_at,
      } as any);
    }

    // 5. characters_stats + characters_base テーブルに各キャラクター分割挿入
    for (const character of args.characters) {
      const charId = character.id;

      // characters_stats に挿入
      await ctx.db.insert("characters_stats", {
        id: charId,
        room_id: args.room.id,
        owner_id: args.ownerConvexId,
        name: character.name,
        color: character.color,
        active_image_index: character.active_image_index ?? 0,
        statuses: character.statuses ?? [],
        parameters: character.parameters ?? [],
        is_hidden_on_board: character.is_hidden_on_board ?? false,
        is_speech_hidden: character.is_speech_hidden ?? false,
        sort_order: character.sort_order,
        created_at: character.created_at,
        updated_at: character.updated_at,
      } as any);

      // characters_base に挿入
      await ctx.db.insert("characters_base", {
        id: charId,
        room_id: args.room.id,
        images: character.images ?? [],
        memo: character.memo ?? '',
        secret_memo: character.secret_memo ?? '',
        chat_palette: character.chat_palette ?? '',
        sheet_url: character.sheet_url ?? null,
        initiative: character.initiative ?? 0,
        size: character.size ?? 1,
        is_status_private: character.is_status_private ?? false,
      } as any);
    }

    // 6. bgms テーブルに各BGM挿入
    for (const bgm of args.bgms) {
      await ctx.db.insert("bgms", {
        id: bgm.id,
        room_id: args.room.id,
        name: bgm.name,
        bgm_type: bgm.bgm_type,
        bgm_source: bgm.bgm_source,
        bgm_volume: bgm.bgm_volume,
        bgm_loop: bgm.bgm_loop,
        scene_ids: bgm.scene_ids,
        is_playing: false,
        is_paused: false,
        auto_play_scene_ids: bgm.auto_play_scene_ids,
        fade_in: bgm.fade_in,
        fade_out: bgm.fade_out,
        fade_duration: bgm.fade_duration,
        sort_order: bgm.sort_order,
        created_at: bgm.created_at,
        updated_at: bgm.updated_at,
      } as any);
    }

    // 7. messages テーブルに各メッセージ挿入
    for (const message of args.messages) {
      await ctx.db.insert("messages", {
        id: message.id,
        room_id: args.room.id,
        sender_name: message.sender_name,
        sender_uid: message.sender_uid,
        sender_avatar: message.sender_avatar,
        content: message.content,
        message_type: message.message_type,
        channel: "main",
        created_at: message.created_at,
      } as any);
    }

    return {
      room: args.room.id,
      scenes: args.scenes.length,
      objects: args.objects.length,
      characters: args.characters.length,
      bgms: args.bgms.length,
      messages: args.messages.length,
    };
  },
});
