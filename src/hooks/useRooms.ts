import { useCallback, useMemo } from 'react';
import type { Room } from '../types/adrastea.types';
import { supabase } from '../services/supabase';
import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { generateUUID } from '../utils/uuid';

const ROOM_ORDER_KEY = 'adrastea-room-order';
const ROOM_TAGS_PREFIX = 'adrastea-room-tags-';

export type RoomUI = {
  id: string;
  name: string;
  dice_system: string;
  tags: string[];
  thumbnail_asset_id: string | null;
  created_at: number;
  updated_at: number;
};

// Re-export Room 型
export type { Room };

function loadOrder(): string[] {
  try {
    const raw = localStorage.getItem(ROOM_ORDER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOrder(ids: string[]) {
  localStorage.setItem(ROOM_ORDER_KEY, JSON.stringify(ids));
}

function loadRoomTags(roomId: string): string[] {
  try {
    const raw = localStorage.getItem(ROOM_TAGS_PREFIX + roomId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRoomTags(roomId: string, tags: string[]) {
  localStorage.setItem(ROOM_TAGS_PREFIX + roomId, JSON.stringify(tags));
}

function sortByOrder(rooms: RoomUI[]): RoomUI[] {
  const order = loadOrder();
  const orderMap = new Map(order.map((id, i) => [id, i]));
  return [...rooms].sort((a, b) => {
    const ai = orderMap.get(a.id) ?? Infinity;
    const bi = orderMap.get(b.id) ?? Infinity;
    if (ai === Infinity && bi === Infinity) return b.updated_at - a.updated_at;
    return ai - bi;
  });
}

export function useRooms(_uid?: string) {
  const roomsQuery = useSupabaseQuery<Room>({
    table: 'rooms',
    columns: 'id,name,dice_system,created_at,updated_at,thumbnail_asset_id,archived',
    roomId: 'global',
    filter: (q) => q.eq('archived', false),
  });

  const loading = roomsQuery.loading;
  const roomsMutation = useSupabaseMutation<Room>('rooms', roomsQuery.setData);

  const rooms = useMemo<RoomUI[]>(() => {
    if (!roomsQuery.data) return [];
    return sortByOrder(
      roomsQuery.data.map((r) => ({
        id: r.id,
        name: r.name ?? '',
        dice_system: r.dice_system ?? 'DiceBot',
        tags: loadRoomTags(r.id),
        thumbnail_asset_id: r.thumbnail_asset_id ?? null,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }))
    );
  }, [roomsQuery.data]);

  const deleteRoom = useCallback(
    (roomId: string) => {
      void (async () => {
        try {
          await roomsMutation.remove(roomId);
        } catch (err) {
          console.error('ルーム削除に失敗:', err);
        }
      })();
    },
    [roomsMutation]
  );

  const updateRoom = useCallback(
    (roomId: string, data: Partial<Pick<RoomUI, 'name' | 'dice_system' | 'tags'>>) => {
      // tags は localStorage に保存（Supabase同期なし）
      if (data.tags !== undefined) {
        saveRoomTags(roomId, data.tags);
      }
      // name/dice_system は Supabase に保存
      const supabaseData: Partial<Pick<RoomUI, 'name' | 'dice_system'>> = {};
      if (data.name !== undefined) supabaseData.name = data.name;
      if (data.dice_system !== undefined) supabaseData.dice_system = data.dice_system;
      if (Object.keys(supabaseData).length > 0) {
        void (async () => {
          try {
            await roomsMutation.update(roomId, supabaseData as Partial<Room>);
          } catch (err) {
            console.error('ルーム更新に失敗:', err);
          }
        })();
      }
    },
    [roomsMutation]
  );

  const reorderRooms = useCallback((orderedIds: string[]) => {
    saveOrder(orderedIds);
  }, []);

  const fetchRooms = useCallback(async () => {
    // Convex useQuery が自動で最新データを返すため no-op
  }, []);

  const addRoom = useCallback(
    async (name: string, dice_system: string, _tags: string[]): Promise<string> => {
      const id = generateUUID();
      const now = Date.now();

      try {
        // 1. ルーム作成
        const { error: roomError } = await supabase.from('rooms').insert({
          id,
          name,
          dice_system,
          gm_can_see_secret_memo: false,
          created_at: now,
          updated_at: now,
        });
        if (roomError) throw roomError;

        // 2. デフォルトシーン「メイン」を作成
        const sceneId = generateUUID();
        const { error: sceneError } = await supabase.from('scenes').insert({
          id: sceneId,
          room_id: id,
          name: 'メイン',
          background_asset_id: null,
          foreground_asset_id: null,
          foreground_opacity: 0.5,
          bg_transition: 'none',
          bg_transition_duration: 500,
          fg_transition: 'none',
          fg_transition_duration: 500,
          bg_blur: true,
          sort_order: 0,
          created_at: now,
          updated_at: now,
        });
        if (sceneError) throw sceneError;

        // 3. 背景・前景・キャラクターレイヤーオブジェクトを自動生成
        const { error: objectsError } = await supabase.from('objects').insert([
          {
            id: generateUUID(),
            room_id: id,
            type: 'background',
            name: '背景',
            global: false,
            scene_ids: [sceneId],
            x: -50, y: -50, width: 100, height: 100,
            visible: true, opacity: 1, sort_order: 0,
            position_locked: false, size_locked: false,
            image_asset_id: null,
            background_color: '#333333', color_enabled: false, image_fit: 'cover',
            text_content: null, font_size: 16, font_family: 'sans-serif',
            letter_spacing: 0, line_height: 1.2, auto_size: true,
            text_align: 'left', text_vertical_align: 'top', text_color: '#ffffff',
            scale_x: 1, scale_y: 1,
            created_at: now, updated_at: now,
          },
          {
            id: generateUUID(),
            room_id: id,
            type: 'foreground',
            name: '前景',
            global: false,
            scene_ids: [sceneId],
            x: -24, y: -14, width: 48, height: 27,
            visible: true, opacity: 1, sort_order: 100,
            position_locked: false, size_locked: false,
            image_asset_id: null,
            background_color: '#666666', color_enabled: false, image_fit: 'cover',
            text_content: null, font_size: 16, font_family: 'sans-serif',
            letter_spacing: 0, line_height: 1.2, auto_size: true,
            text_align: 'left', text_vertical_align: 'top', text_color: '#ffffff',
            scale_x: 1, scale_y: 1,
            created_at: now, updated_at: now,
          },
          {
            id: generateUUID(),
            room_id: id,
            type: 'characters_layer',
            name: 'キャラクター',
            global: true,
            scene_ids: [],
            x: 0, y: 0, width: 0, height: 0,
            visible: true, opacity: 1, sort_order: 9999,
            position_locked: true, size_locked: true,
            image_asset_id: null,
            background_color: '#333333', color_enabled: false, image_fit: 'cover',
            text_content: null, font_size: 16, font_family: 'sans-serif',
            letter_spacing: 0, line_height: 1.5, auto_size: false,
            text_align: 'left', text_vertical_align: 'top', text_color: '#000000',
            scale_x: 1, scale_y: 1,
            created_at: now, updated_at: now,
          },
        ]);
        if (objectsError) throw objectsError;

        // 4. active_scene_id を設定
        const { error: updateError } = await supabase.from('rooms').update({ active_scene_id: sceneId }).eq('id', id);
        if (updateError) throw updateError;

        return id;
      } catch (err) {
        // ロールバック: 作成したデータを削除（best effort）
        console.error('ルーム作成失敗:', err);
        await supabase.from('objects').delete().eq('room_id', id).then(() => {}, () => {});
        await supabase.from('scenes').delete().eq('room_id', id).then(() => {}, () => {});
        await supabase.from('rooms').delete().eq('id', id).then(() => {}, () => {});
        throw err;
      }
    },
    []
  );

  return { rooms, loading, fetchRooms, deleteRoom, updateRoom, reorderRooms, addRoom };
}
