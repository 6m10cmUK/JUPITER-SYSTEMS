import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../config/api';

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
    if (ai === Infinity && bi === Infinity) {
      return b.updated_at - a.updated_at;
    }
    return ai - bi;
  });
}

export function useRooms(uid: string | undefined) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/rooms');
      if (!res.ok) throw new Error(`Failed to fetch rooms: ${res.status}`);
      const data: {
        id: string;
        name: string;
        dice_system: string;
        tags: string;
        thumbnail_url: string | null;
        created_at: string;
        updated_at: string;
        owner_id: string;
      }[] = await res.json();

      const list: Room[] = data.map((r) => ({
        id: r.id,
        name: r.name ?? '',
        dice_system: r.dice_system ?? 'DiceBot',
        tags: r.tags ? JSON.parse(r.tags) : [],
        thumbnail_url: r.thumbnail_url ?? null,
        created_at: r.created_at ? new Date(r.created_at).getTime() : 0,
        updated_at: r.updated_at ? new Date(r.updated_at).getTime() : 0,
      }));
      setRooms(sortByOrder(list));
    } catch (err) {
      console.error('ルーム一覧の取得に失敗:', err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  const deleteRoom = useCallback((roomId: string) => {
    let snapshot: Room[] = [];
    setRooms((prev) => {
      snapshot = prev;
      return prev.filter((r) => r.id !== roomId);
    });
    apiFetch(`/api/rooms/${roomId}`, { method: 'DELETE' }).catch((err) => {
      console.error('ルーム削除の通信に失敗:', err);
      // 失敗時は元に戻す
      setRooms(snapshot);
    });
  }, []);

  const updateRoom = useCallback((roomId: string, data: Partial<Pick<Room, 'name' | 'dice_system' | 'tags'>>) => {
    const now = Date.now();
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, ...data, updated_at: now } : r)),
    );
    apiFetch(`/api/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, updated_at: now }),
    }).catch((err) =>
      console.error('ルーム更新の通信に失敗:', err),
    );
  }, []);

  const reorderRooms = useCallback((orderedIds: string[]) => {
    saveOrder(orderedIds);
    setRooms((prev) => {
      const map = new Map(prev.map((r) => [r.id, r]));
      const sorted: Room[] = [];
      for (const id of orderedIds) {
        const r = map.get(id);
        if (r) sorted.push(r);
      }
      // 未登録の room は末尾に
      for (const r of prev) {
        if (!orderedIds.includes(r.id)) sorted.push(r);
      }
      return sorted;
    });
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return { rooms, loading, fetchRooms, deleteRoom, updateRoom, reorderRooms };
}
