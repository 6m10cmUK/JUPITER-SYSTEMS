import { useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { generateUUID } from '../utils/uuid';

const ROOM_ORDER_KEY = 'adrastea-room-order';
const ROOM_TAGS_PREFIX = 'adrastea-room-tags-';

export interface Room {
  id: string;
  name: string;
  dice_system: string;
  tags: string[];
  thumbnail_url: string | null;
  created_at: number;
  updated_at: number;
}

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

function sortByOrder(rooms: Room[]): Room[] {
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
  const roomsData = useQuery(api.rooms.list);
  const deleteMutation = useMutation(api.rooms.remove);
  const updateMutation = useMutation(api.rooms.update).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.rooms.list, {});
      if (current !== undefined) {
        localStore.setQuery(
          api.rooms.list,
          {},
          current.map((r) => r.id === args.id ? { ...r, ...args } : r),
        );
      }
    }
  );
  const createMutation = useMutation(api.rooms.create);

  const loading = roomsData === undefined;

  const rooms = useMemo<Room[]>(() => {
    if (!roomsData) return [];
    return sortByOrder(
      roomsData.map((r) => ({
        id: r.id,
        name: r.name ?? '',
        dice_system: r.dice_system ?? 'DiceBot',
        tags: loadRoomTags(r.id),
        thumbnail_url: (r as any).foreground_url ?? null,
        created_at: r.created_at ?? r._creationTime ?? 0,
        updated_at: r.updated_at ?? r._creationTime ?? 0,
      }))
    );
  }, [roomsData]);

  const deleteRoom = useCallback(
    (roomId: string) => {
      deleteMutation({ id: roomId }).catch((err) =>
        console.error('ルーム削除に失敗:', err)
      );
    },
    [deleteMutation]
  );

  const updateRoom = useCallback(
    (roomId: string, data: Partial<Pick<Room, 'name' | 'dice_system' | 'tags'>>) => {
      // tags は localStorage に保存（Convex同期なし）
      if (data.tags !== undefined) {
        saveRoomTags(roomId, data.tags);
      }
      // name/dice_system は Convex に保存
      const convexData: Partial<Pick<Room, 'name' | 'dice_system'>> = {};
      if (data.name !== undefined) convexData.name = data.name;
      if (data.dice_system !== undefined) convexData.dice_system = data.dice_system;
      if (Object.keys(convexData).length > 0) {
        updateMutation({ id: roomId, ...convexData }).catch((err) =>
          console.error('ルーム更新に失敗:', err)
        );
      }
    },
    [updateMutation]
  );

  const reorderRooms = useCallback((orderedIds: string[]) => {
    saveOrder(orderedIds);
  }, []);

  const fetchRooms = useCallback(async () => {
    // Convex useQuery が自動で最新データを返すため no-op
  }, []);

  const createSceneMutation = useMutation(api.scenes.create);
  const createObjectBatchMutation = useMutation(api.objects.createBatch);
  const updateRoomMutation = useMutation(api.rooms.update);

  const addRoom = useCallback(
    async (name: string, dice_system: string, _tags: string[]): Promise<string> => {
      const id = generateUUID();
      const now = Date.now();

      // 1. ルーム作成
      await createMutation({ id, name, dice_system, gm_can_see_secret_memo: false });

      // 2. デフォルトシーン「メイン」を作成
      const sceneId = generateUUID();
      await createSceneMutation({
        id: sceneId,
        room_id: id,
        name: 'メイン',
        background_url: null,
        foreground_url: null,
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

      // 3. 背景・前景・キャラクターレイヤーオブジェクトを自動生成
      await createObjectBatchMutation({
        objects: [
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
            image_url: null, image_asset_id: null,
            background_color: '#333333', image_fit: 'cover',
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
            image_url: null, image_asset_id: null,
            background_color: '#666666', image_fit: 'cover',
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
            image_url: null, image_asset_id: null,
            background_color: 'transparent', image_fit: 'cover',
            text_content: null, font_size: 16, font_family: 'sans-serif',
            letter_spacing: 0, line_height: 1.5, auto_size: false,
            text_align: 'left', text_vertical_align: 'top', text_color: '#000000',
            scale_x: 1, scale_y: 1,
            created_at: now, updated_at: now,
          },
        ],
      });

      // 4. active_scene_id を設定
      await updateRoomMutation({ id, active_scene_id: sceneId });

      return id;
    },
    [createMutation, createSceneMutation, createObjectBatchMutation, updateRoomMutation]
  );

  return { rooms, loading, fetchRooms, deleteRoom, updateRoom, reorderRooms, addRoom };
}
