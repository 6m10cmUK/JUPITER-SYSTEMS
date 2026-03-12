import { useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

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
  const updateMutation = useMutation(api.rooms.update);
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
        thumbnail_url: null,
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

  const addRoom = useCallback(
    async (name: string, dice_system: string, tags: string[]): Promise<string> => {
      const id = crypto.randomUUID();
      await createMutation({ id, name, dice_system, gm_can_see_secret_memo: false });
      return id;
    },
    [createMutation]
  );

  return { rooms, loading, fetchRooms, deleteRoom, updateRoom, reorderRooms, addRoom };
}
