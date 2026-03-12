import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { BoardObject } from '../types/adrastea.types';

const genId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');

export function useObjects(
  roomId: string,
  activeSceneId: string | null,
) {
  const objectsData = useQuery(api.objects.list, { room_id: roomId });
  const createMutation = useMutation(api.objects.create);
  const updateMutation = useMutation(api.objects.update);
  const removeMutation = useMutation(api.objects.remove);
  const reorderMutation = useMutation(api.objects.reorder);
  const batchSortMutation = useMutation(api.objects.batchUpdateSort);

  const [optimisticObjects, setOptimisticObjects] = useState<BoardObject[]>([]);

  const loading = objectsData === undefined;

  const allObjects: BoardObject[] = useMemo(() => {
    const serverObjs = (objectsData ?? []).map((o) => ({
      id: o._id,
      room_id: o.room_id,
      type: o.type as BoardObject['type'],
      name: o.name,
      global: o.global,
      scene_ids: o.scene_ids,
      x: o.x, y: o.y, width: o.width, height: o.height,
      visible: o.visible, opacity: o.opacity,
      sort_order: o.sort_order, locked: o.locked,
      position_locked: o.position_locked, size_locked: o.size_locked,
      image_url: (o as any).image_url ?? null, image_asset_id: (o as any).image_asset_id ?? null,
      background_color: o.background_color,
      image_fit: o.image_fit as BoardObject['image_fit'],
      text_content: (o as any).text_content ?? null, font_size: o.font_size,
      font_family: o.font_family, letter_spacing: o.letter_spacing,
      line_height: o.line_height, auto_size: o.auto_size,
      text_align: o.text_align as BoardObject['text_align'],
      text_vertical_align: o.text_vertical_align as BoardObject['text_vertical_align'],
      text_color: o.text_color, scale_x: o.scale_x, scale_y: o.scale_y,
      created_at: o._creationTime, updated_at: o._creationTime,
    } as BoardObject));
    const serverIds = new Set(serverObjs.map((o) => o.id));
    const extras = optimisticObjects.filter((o) => !serverIds.has(o.id));
    return [...serverObjs, ...extras];
  }, [objectsData, optimisticObjects]);

  const activeObjects = useMemo(() => {
    if (!activeSceneId) return allObjects.filter((o) => o.global);
    return allObjects
      .filter((o) => o.global || o.scene_ids.includes(activeSceneId))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [allObjects, activeSceneId]);

  const addObject = useCallback(
    async (data: Partial<BoardObject>): Promise<string> => {
      const type = data.type ?? 'panel';
      const now = Date.now();
      const id = (data as { id?: string }).id ?? genId();
      const newObj: BoardObject = {
        id,
        room_id: roomId,
        type,
        name: data.name ?? '新規オブジェクト',
        global: data.global ?? false,
        scene_ids: data.scene_ids ?? [],
        x: data.x ?? 50, y: data.y ?? 50,
        width: data.width ?? 4, height: data.height ?? 4,
        visible: data.visible ?? true, opacity: data.opacity ?? 1,
        sort_order: data.sort_order ?? allObjects.length,
        locked: data.locked ?? (type === 'background'),
        position_locked: data.position_locked ?? false,
        size_locked: data.size_locked ?? false,
        image_url: data.image_url ?? null, image_asset_id: data.image_asset_id ?? null,
        background_color: data.background_color ?? 'transparent',
        image_fit: data.image_fit ?? 'cover',
        text_content: data.text_content ?? null, font_size: data.font_size ?? 128,
        font_family: data.font_family ?? 'sans-serif',
        letter_spacing: data.letter_spacing ?? 0, line_height: data.line_height ?? 1.2,
        auto_size: data.auto_size ?? true,
        text_align: data.text_align ?? 'left',
        text_vertical_align: data.text_vertical_align ?? 'top',
        text_color: data.text_color ?? '#ffffff',
        scale_x: data.scale_x ?? 1, scale_y: data.scale_y ?? 1,
        created_at: now, updated_at: now,
      };
      await createMutation(newObj);
      return id;
    },
    [roomId, allObjects.length, createMutation]
  );

  const updateObject = useCallback(
    async (id: string, updates: Partial<BoardObject>): Promise<void> => {
      const { id: _id, room_id: _rid, type: _t, created_at: _ca, ...rest } = updates as BoardObject;
      await updateMutation({ id, ...rest } as any);
    },
    [updateMutation]
  );

  const removeObject = useCallback(
    async (id: string): Promise<void> => {
      setOptimisticObjects((prev) => prev.filter((o) => o.id !== id));
      await removeMutation({ id });
    },
    [removeMutation]
  );

  const reorderObjects = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      const updates = orderedIds.map((id, i) => ({ id, sort_order: i }));
      await reorderMutation({ updates });
    },
    [reorderMutation]
  );

  const batchUpdateSort = useCallback(
    async (updates: { id: string; sort: number }[]): Promise<void> => {
      await batchSortMutation({ updates });
    },
    [batchSortMutation]
  );

  const injectOptimistic = useCallback((objects: BoardObject[]) => {
    setOptimisticObjects((prev) => {
      const existingIds = new Set(prev.map((o) => o.id));
      const newObjs = objects.filter((o) => !existingIds.has(o.id));
      return newObjs.length > 0 ? [...prev, ...newObjs] : prev;
    });
  }, []);

  return {
    allObjects, activeObjects, loading,
    addObject, updateObject, removeObject, reorderObjects, batchUpdateSort, injectOptimistic,
  };
}
