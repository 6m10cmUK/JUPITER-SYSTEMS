import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, deleteDoc, updateDoc, doc, getDoc, orderBy, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

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
      const q = query(
        collection(db, 'rooms'),
        where('owner_uid', '==', uid),
        orderBy('updated_at', 'desc'),
      );
      const snap = await getDocs(q);
      // ルーム基本情報
      const base = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name ?? '',
        dice_system: d.data().dice_system ?? 'DiceBot',
        tags: d.data().tags ?? [],
        active_scene_id: d.data().active_scene_id as string | null,
        thumbnail_url: null as string | null,
        created_at: d.data().created_at ?? 0,
        updated_at: d.data().updated_at ?? 0,
      }));
      // アクティブシーンの foreground_url をサムネイルとして取得
      await Promise.all(
        base.map(async (room) => {
          if (!room.active_scene_id) return;
          try {
            const sceneSnap = await getDoc(doc(db, 'rooms', room.id, 'scenes', room.active_scene_id));
            room.thumbnail_url = sceneSnap.data()?.foreground_url ?? null;
          } catch { /* ignore */ }
        }),
      );
      const list: Room[] = base.map(({ active_scene_id: _, ...rest }) => rest);
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
    deleteDoc(doc(db, 'rooms', roomId)).catch((err) => {
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
    updateDoc(doc(db, 'rooms', roomId), { ...data, updated_at: now }).catch((err) =>
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
