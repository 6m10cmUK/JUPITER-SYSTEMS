import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  rooms: defineTable({
    id: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    owner_id: v.string(),
    active_scene_id: v.union(v.string(), v.null()),
    foreground_url: v.union(v.string(), v.null()),
    active_cutin: v.union(
      v.object({
        cutin_id: v.string(),
        triggered_at: v.number(),
      }),
      v.null()
    ),
    dice_system: v.string(),
    gm_can_see_secret_memo: v.boolean(),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_owner", ["owner_id"]),

  scenes: defineTable({
    id: v.string(),
    room_id: v.string(),
    name: v.string(),
    background_url: v.union(v.string(), v.null()),
    foreground_url: v.union(v.string(), v.null()),
    foreground_opacity: v.number(),
    bg_transition: v.union(v.literal("none"), v.literal("fade")),
    bg_transition_duration: v.number(),
    fg_transition: v.union(v.literal("none"), v.literal("fade")),
    fg_transition_duration: v.number(),
    bg_blur: v.boolean(),
    sort_order: v.number(),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_room", ["room_id"])
    .index("by_room_order", ["room_id", "sort_order"]),

  pieces: defineTable({
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
    statuses: v.array(
      v.object({
        label: v.string(),
        value: v.number(),
        max: v.number(),
        color: v.optional(v.string()),
      })
    ),
    initiative: v.number(),
    memo: v.string(),
    character_id: v.union(v.string(), v.null()),
    created_at: v.number(),
  })
    .index("by_room", ["room_id"]),

  characters_stats: defineTable({
    id: v.string(),
    room_id: v.string(),
    owner_id: v.string(),
    name: v.string(),
    color: v.string(),
    active_image_index: v.number(),
    statuses: v.array(
      v.object({
        label: v.string(),
        value: v.number(),
        max: v.number(),
        color: v.optional(v.string()),
      })
    ),
    parameters: v.array(
      v.object({
        label: v.string(),
        value: v.union(v.number(), v.string()),
      })
    ),
    is_hidden_on_board: v.boolean(),
    is_speech_hidden: v.boolean(),
    sort_order: v.optional(v.number()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_room", ["room_id"]),

  characters_base: defineTable({
    id: v.string(),
    room_id: v.string(),
    images: v.array(
      v.object({
        url: v.string(),
        label: v.string(),
      })
    ),
    memo: v.string(),
    secret_memo: v.string(),
    chat_palette: v.string(),
    sheet_url: v.union(v.string(), v.null()),
    initiative: v.number(),
    size: v.number(),
    is_status_private: v.boolean(),
  })
    .index("by_room", ["room_id"]),

  objects: defineTable({
    id: v.string(),
    room_id: v.string(),
    type: v.union(
      v.literal("panel"),
      v.literal("text"),
      v.literal("foreground"),
      v.literal("background")
    ),
    name: v.string(),
    global: v.boolean(),
    scene_ids: v.array(v.string()),
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    visible: v.boolean(),
    opacity: v.number(),
    sort_order: v.number(),
    locked: v.boolean(),
    position_locked: v.boolean(),
    size_locked: v.boolean(),
    image_url: v.union(v.string(), v.null()),
    image_asset_id: v.union(v.string(), v.null()),
    background_color: v.string(),
    image_fit: v.union(
      v.literal("contain"),
      v.literal("cover"),
      v.literal("stretch")
    ),
    text_content: v.union(v.string(), v.null()),
    font_size: v.number(),
    font_family: v.string(),
    letter_spacing: v.number(),
    line_height: v.number(),
    auto_size: v.boolean(),
    text_align: v.union(
      v.literal("left"),
      v.literal("center"),
      v.literal("right")
    ),
    text_vertical_align: v.union(
      v.literal("top"),
      v.literal("middle"),
      v.literal("bottom")
    ),
    text_color: v.string(),
    scale_x: v.number(),
    scale_y: v.number(),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_room", ["room_id"]),

  bgms: defineTable({
    id: v.string(),
    room_id: v.string(),
    name: v.string(),
    bgm_type: v.union(
      v.literal("youtube"),
      v.literal("url"),
      v.literal("upload"),
      v.null()
    ),
    bgm_source: v.union(v.string(), v.null()),
    bgm_volume: v.number(),
    bgm_loop: v.boolean(),
    scene_ids: v.array(v.string()),
    is_playing: v.boolean(),
    is_paused: v.boolean(),
    auto_play_scene_ids: v.array(v.string()),
    fade_in: v.boolean(),
    fade_out: v.boolean(),
    fade_duration: v.number(),
    sort_order: v.optional(v.number()),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_room", ["room_id"]),

  cutins: defineTable({
    id: v.string(),
    room_id: v.string(),
    name: v.string(),
    image_url: v.union(v.string(), v.null()),
    text: v.string(),
    animation: v.union(
      v.literal("slide"),
      v.literal("fade"),
      v.literal("zoom")
    ),
    duration: v.number(),
    text_color: v.string(),
    background_color: v.string(),
    sort_order: v.number(),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_room", ["room_id"]),

  scenario_texts: defineTable({
    id: v.string(),
    room_id: v.string(),
    title: v.string(),
    content: v.string(),
    visible: v.boolean(),
    sort_order: v.number(),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index("by_room", ["room_id"]),

  messages: defineTable({
    id: v.string(),
    room_id: v.string(),
    sender_name: v.string(),
    sender_uid: v.union(v.string(), v.null()),
    sender_avatar: v.union(v.string(), v.null()),
    sender_color: v.optional(v.string()), // 旧データ互換
    content: v.string(),
    message_type: v.union(
      v.literal("chat"),
      v.literal("dice"),
      v.literal("system")
    ),
    channel: v.optional(v.string()),
    allowed_user_ids: v.optional(v.array(v.string())),
    created_at: v.number(),
  })
    .index("by_room", ["room_id"])
    .index("by_room_time", ["room_id", "created_at"]),

  room_members: defineTable({
    room_id: v.string(),
    user_id: v.string(),
    role: v.union(v.literal('owner'), v.literal('sub_owner'), v.literal('user')),
    joined_at: v.number(),
  })
    .index("by_room", ["room_id"])
    .index("by_room_user", ["room_id", "user_id"])
    .index("by_user", ["user_id"]),

  channels: defineTable({
    room_id: v.string(),
    channel_id: v.string(),
    label: v.string(),
    order: v.number(),
    is_archived: v.boolean(),
    allowed_user_ids: v.array(v.string()),
  })
    .index("by_room", ["room_id"])
    .index("by_room_channel", ["room_id", "channel_id"]),
});
