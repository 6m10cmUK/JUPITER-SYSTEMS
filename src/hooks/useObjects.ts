import { useState, useEffect, useCallback, useMemo } from 'react';
import type { BoardObject } from '../types/adrastea.types';

const genId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');

export function useObjects(
  roomId: string,
  activeSceneId: string | null,
  initialObjects?: BoardObject[]
) {
  const [allObjects, setAllObjects] = useState<BoardObject[]>(initialObjects ?? []);
  const [loading, setLoading] = useState(!initialObjects);

  useEffect(() => {
    if (initialObjects) {
      setAllObjects(initialObjects);
      setLoading(false);
    }
  }, [initialObjects]);

  // activeSceneId でフィルタ
  const activeObjects = useMemo(() => {
    if (!activeSceneId) return allObjects.filter((o) => o.global);
    return allObjects
      .filter((o) => o.global || o.scene_ids.includes(activeSceneId))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [allObjects, activeSceneId]);

  const addObject = useCallback(
    (data: Partial<BoardObject>) => {
      const type = data.type ?? 'panel';
      const now = Date.now();
      const newId = genId();
      const newObj: BoardObject = {
        id: newId,
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
        background_color: data.background_color ?? 'transparent',
        image_fit: data.image_fit ?? 'cover',
        text_content: data.text_content ?? null,
        font_size: data.font_size ?? 128,
        font_family: data.font_family ?? 'sans-serif',
        letter_spacing: data.letter_spacing ?? 0,
        line_height: data.line_height ?? 1.2,
        auto_size: data.auto_size ?? true,
        text_align: data.text_align ?? 'left',
        text_vertical_align: data.text_vertical_align ?? 'top',
        text_color: data.text_color ?? '#ffffff',
        scale_x: data.scale_x ?? 1,
        scale_y: data.scale_y ?? 1,
        created_at: now,
        updated_at: now,
      };
      setAllObjects((prev) => [...prev, newObj]);
      return newId;
    },
    [allObjects.length]
  );

  const updateObject = useCallback(
    (id: string, updates: Partial<BoardObject>) => {
      setAllObjects((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, ...updates, updated_at: Date.now() } : o
        )
      );
    },
    []
  );

  const removeObject = useCallback((id: string) => {
    setAllObjects((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const reorderObjects = useCallback((orderedIds: string[]) => {
    setAllObjects((prev) => {
      const now = Date.now();
      const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
      return prev.map((o) => {
        const newSort = orderMap.get(o.id);
        return newSort !== undefined
          ? { ...o, sort_order: newSort, updated_at: now }
          : o;
      });
    });
  }, []);

  const batchUpdateSort = useCallback(
    (updates: { id: string; sort: number }[]) => {
      setAllObjects((prev) => {
        const now = Date.now();
        const sortMap = new Map(updates.map((u) => [u.id, u.sort]));
        return prev.map((o) => {
          const newSort = sortMap.get(o.id);
          return newSort !== undefined
            ? { ...o, sort_order: newSort, updated_at: now }
            : o;
        });
      });
    },
    []
  );

  // オプティミスティック注入
  const injectOptimistic = useCallback((objects: BoardObject[]) => {
    setAllObjects((prev) => {
      const existingIds = new Set(prev.map((o) => o.id));
      const newObjs = objects.filter((o) => !existingIds.has(o.id));
      return newObjs.length > 0 ? [...prev, ...newObjs] : prev;
    });
  }, []);

  /** シーン削除時にオブジェクトを整理する */
  const removeObjectsForScene = useCallback((sceneId: string) => {
    setAllObjects((prev) => {
      const now = Date.now();
      return prev
        .map((o) => {
          if (o.global) return o;
          if (!o.scene_ids.includes(sceneId)) return o;
          const newSceneIds = o.scene_ids.filter((id) => id !== sceneId);
          if (newSceneIds.length === 0) return null; // 削除
          return { ...o, scene_ids: newSceneIds, updated_at: now };
        })
        .filter((o): o is BoardObject => o !== null);
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
    removeObjectsForScene,
  };
}
