import { useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const ROOM_ORDER_KEY = 'adrastea-room-order';

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

  const loading = roomsData === undefined;

  const rooms = useMemo<Room[]>(() => {
    if (!roomsData) return [];
    return sortByOrder(
      roomsData.map((r) => ({
        id: r._id,
        name: r.name ?? '',
        dice_system: r.dice_system ?? 'DiceBot',
        tags: [],
        thumbnail_url: null,
        created_at: r._creationTime ?? 0,
        updated_at: r._creationTime ?? 0,
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
    (roomId: string, data: Partial<Pick<Room, 'name' | 'dice_system'>>) => {
      updateMutation({ id: roomId, ...data }).catch((err) =>
        console.error('ルーム更新に失敗:', err)
      );
    },
    [updateMutation]
  );

  const reorderRooms = useCallback((orderedIds: string[]) => {
    saveOrder(orderedIds);
  }, []);

  const fetchRooms = useCallback(async () => {
    // Convex useQuery が自動で最新データを返すため no-op
  }, []);

  return { rooms, loading, fetchRooms, deleteRoom, updateRoom, reorderRooms };
}
