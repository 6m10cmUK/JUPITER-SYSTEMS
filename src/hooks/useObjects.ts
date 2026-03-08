import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import type { BoardObject } from '../types/adrastea.types';

const mapDoc = (d: { id: string; data: () => any }): BoardObject => {
  const data = d.data();
  return {
    id: d.id,
    type: data.type ?? 'panel',
    name: data.name ?? '',
    global: data.global ?? false,
    scene_ids: data.scene_ids ?? [],
    x: data.x ?? 50,
    y: data.y ?? 50,
    width: data.width ?? 4,
    height: data.height ?? 4,
    visible: data.visible ?? true,
    opacity: data.opacity ?? 1,
    sort_order: data.sort_order ?? 0,
    locked: data.locked ?? false,
    position_locked: data.position_locked ?? false,
    size_locked: data.size_locked ?? false,
    image_url: data.image_url ?? null,
    image_asset_id: data.image_asset_id ?? null,
    background_color: data.background_color ?? 'transparent',
    image_fit: data.image_fit ?? 'cover',
    text_content: data.text_content ?? null,
    font_size: data.font_size ?? 16,
    font_family: data.font_family ?? 'sans-serif',
    letter_spacing: data.letter_spacing ?? 0,
    line_height: data.line_height ?? 1.2,
    auto_size: data.auto_size ?? true,
    text_align: data.text_align ?? 'left',
    text_vertical_align: data.text_vertical_align ?? 'top',
    text_color: data.text_color ?? '#ffffff',
    created_at: data.created_at ?? Date.now(),
    updated_at: data.updated_at ?? Date.now(),
  };
};

export function useObjects(roomId: string, activeSceneId: string | null) {
  const [allObjects, setAllObjects] = useState<BoardObject[]>([]);
  const [loading, setLoading] = useState(true);

  // 単一購読: rooms/{roomId}/objects
  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'rooms', roomId, 'objects'),
      orderBy('sort_order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setAllObjects(snapshot.docs.map(mapDoc));
        setLoading(false);
      },
      (error) => {
        console.error('オブジェクトの監視に失敗:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  // activeSceneId でフィルタ
  const activeObjects = useMemo(() => {
    if (!activeSceneId) return allObjects.filter(o => o.global);
    return allObjects
      .filter(o => o.global || o.scene_ids.includes(activeSceneId))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [allObjects, activeSceneId]);

  const colPath = `rooms/${roomId}/objects`;

  const addObject = useCallback(
    async (data: Partial<BoardObject>) => {
      const type = data.type ?? 'panel';
      const docRef = await addDoc(collection(db, colPath), {
        type,
        name: data.name ?? '新規オブジェクト',
        global: data.global ?? false,
        scene_ids: data.scene_ids ?? [],
        x: data.x ?? 50,
        y: data.y ?? 50,
        width: data.width ?? 4,
        height: data.height ?? 4,
        visible: data.visible ?? true,
        opacity: data.opacity ?? 1,
        sort_order: data.sort_order ?? allObjects.length,
        locked: data.locked ?? (type === 'background'),
        position_locked: data.position_locked ?? false,
        size_locked: data.size_locked ?? false,
        image_url: data.image_url ?? null,
        image_asset_id: data.image_asset_id ?? null,
        background_color: data.background_color ?? 'rgba(255,255,255,0.1)',
        image_fit: data.image_fit ?? 'cover',
        text_content: data.text_content ?? null,
        font_size: data.font_size ?? 16,
        font_family: data.font_family ?? 'sans-serif',
        letter_spacing: data.letter_spacing ?? 0,
        line_height: data.line_height ?? 1.2,
        auto_size: data.auto_size ?? true,
        text_align: data.text_align ?? 'left',
        text_vertical_align: data.text_vertical_align ?? 'top',
        text_color: data.text_color ?? '#ffffff',
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      return docRef.id;
    },
    [colPath, allObjects.length]
  );

  const updateObject = useCallback(
    async (id: string, updates: Partial<BoardObject>) => {
      const { id: _id, created_at, ...data } = updates as any;
      await updateDoc(doc(db, colPath, id), {
        ...data,
        updated_at: Date.now(),
      });
    },
    [colPath]
  );

  const removeObject = useCallback(
    async (id: string) => {
      await deleteDoc(doc(db, colPath, id));
    },
    [colPath]
  );

  const reorderObjects = useCallback(
    async (orderedIds: string[]) => {
      const batch = writeBatch(db);
      orderedIds.forEach((id, index) => {
        batch.update(doc(db, colPath, id), {
          sort_order: index,
          updated_at: Date.now(),
        });
      });
      await batch.commit();
    },
    [colPath]
  );

  const batchUpdateSort = useCallback(
    async (updates: { id: string; sort: number }[]) => {
      const batch = writeBatch(db);
      for (const { id, sort } of updates) {
        batch.update(doc(db, colPath, id), {
          sort_order: sort,
          updated_at: Date.now(),
        });
      }
      await batch.commit();
    },
    [colPath]
  );

  // オプティミスティック注入: onSnapshot 到着前にローカル state にオブジェクトを追加
  const injectOptimistic = useCallback((objects: BoardObject[]) => {
    setAllObjects(prev => {
      const existingIds = new Set(prev.map(o => o.id));
      const newObjs = objects.filter(o => !existingIds.has(o.id));
      return newObjs.length > 0 ? [...prev, ...newObjs] : prev;
    });
  }, []);

  return {
    allObjects,
    activeObjects,
    loading,
    addObject,
    updateObject,
    removeObject,
    reorderObjects,
    batchUpdateSort,
    injectOptimistic,
  };
}
