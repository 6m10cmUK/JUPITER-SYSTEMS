import { useCallback, useMemo, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import type { BoardObject } from '../types/adrastea.types';
import type { ObjectsInject } from '../types/adrastea-persistence';
import { genId } from '../utils/id';

export function useObjects(
  roomId: string,
  activeSceneId: string | null,
  options?: { inject?: ObjectsInject }
) {
  const { inject } = options ?? {};
  const injectRef = useRef(inject);
  injectRef.current = inject;
  const { data: objectsData, loading: objectsLoading } = useSupabaseQuery<BoardObject>({
    table: 'objects',
    columns: 'id,room_id,type,name,global,scene_ids,x,y,width,height,visible,opacity,sort_order,position_locked,size_locked,image_asset_id,background_color,image_fit,color_enabled,text_content,font_size,font_family,letter_spacing,line_height,auto_size,text_align,text_vertical_align,text_color,scale_x,scale_y,memo,created_at,updated_at',
    roomId,
    filter: (q) => q.eq('room_id', roomId),
    enabled: !inject,
  });

  const loading = inject ? false : objectsLoading;

  const allObjects: BoardObject[] = useMemo(() => {
    if (inject) return inject.data;
    return objectsData ?? [];
  }, [inject, objectsData]);


  const activeObjects = useMemo(() => {
    if (!activeSceneId) return allObjects.filter((o) => o.global);
    return allObjects
      .filter((o) => o.global || o.scene_ids.includes(activeSceneId))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [allObjects, activeSceneId]);

  const addObject = useCallback(
    async (data: Partial<BoardObject>): Promise<string> => {
      const inj = injectRef.current;
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
        position_locked: data.position_locked ?? false,
        size_locked: data.size_locked ?? false,
        image_asset_id: data.image_asset_id ?? null,
        background_color: data.background_color ?? 'transparent',
        image_fit: data.image_fit ?? 'contain',
        text_content: data.text_content ?? null, font_size: data.font_size ?? 128,
        font_family: data.font_family ?? 'sans-serif',
        letter_spacing: data.letter_spacing ?? 0, line_height: data.line_height ?? 1.2,
        auto_size: data.auto_size ?? true,
        text_align: data.text_align ?? 'left',
        text_vertical_align: data.text_vertical_align ?? 'top',
        text_color: data.text_color ?? '#ffffff',
        scale_x: data.scale_x ?? 1, scale_y: data.scale_y ?? 1,
        memo: data.memo ?? '',
        created_at: now, updated_at: now,
      };
      if (inj) {
        await inj.create(newObj);
      } else {
        await supabase.from('objects').insert(newObj);
      }
      return id;
    },
    [roomId, allObjects.length]
  );

  const updateObject = useCallback(
    async (id: string, updates: Partial<BoardObject>): Promise<void> => {
      const inj = injectRef.current;
      if (inj) {
        await inj.update(id, updates);
      } else {
        const { id: _id, room_id: _rid, type: _t, created_at: _ca, ...rest } = updates as BoardObject;
        await supabase.from('objects').update({ ...rest, updated_at: Date.now() }).eq('id', id);
      }
    },
    []
  );

  const removeObject = useCallback(
    async (id: string): Promise<void> => {
      const inj = injectRef.current;
      if (inj) {
        await inj.remove(id);
      } else {
        await supabase.from('objects').delete().eq('id', id);
      }
    },
    []
  );

  const reorderObjects = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      const inj = injectRef.current;
      const updates = orderedIds.map((id, i) => ({ id, sort_order: i }));
      if (inj) {
        await inj.reorder(updates);
      } else {
        for (const { id, sort_order } of updates) {
          await supabase.from('objects').update({ sort_order, updated_at: Date.now() }).eq('id', id);
        }
      }
    },
    []
  );

  const batchUpdateSort = useCallback(
    async (updates: { id: string; sort: number }[]): Promise<void> => {
      const inj = injectRef.current;
      if (inj) {
        await inj.batchUpdateSort(updates);
      } else {
        for (const { id, sort } of updates) {
          await supabase.from('objects').update({ sort_order: sort, updated_at: Date.now() }).eq('id', id);
        }
      }
    },
    []
  );

  return {
    allObjects, activeObjects, loading,
    addObject, updateObject, removeObject, reorderObjects, batchUpdateSort,
  };
}
