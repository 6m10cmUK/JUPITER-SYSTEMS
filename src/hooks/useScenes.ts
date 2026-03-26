import { useCallback, useMemo, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import type { Scene, BoardObject } from '../types/adrastea.types';
import type { ScenesInject } from '../types/adrastea-persistence';
import { genId } from '../utils/id';

export type OnObjectsCreated = (objects: BoardObject[]) => void;

export function useScenes(
  roomId: string,
  options?: {
    inject?: ScenesInject;
    onObjectsCreated?: OnObjectsCreated;
    onActivateScene?: (sceneId: string | null) => Promise<void>;
  }
) {
  const { inject, onObjectsCreated, onActivateScene } = options ?? {};
  const injectRef = useRef(inject);
  injectRef.current = inject;
  const onActivateSceneRef = useRef(onActivateScene);
  onActivateSceneRef.current = onActivateScene;

  const { data: scenesData, loading: scenesLoading } = useSupabaseQuery<Scene>({
    table: 'scenes',
    columns: 'id,room_id,name,background_asset_id,foreground_asset_id,foreground_opacity,bg_transition,bg_transition_duration,fg_transition,fg_transition_duration,bg_blur,grid_visible,sort_order,created_at,updated_at',
    roomId,
    filter: (q) => q.eq('room_id', roomId),
    enabled: !inject,
  });

  const loading = inject ? false : scenesLoading;
  const scenes: Scene[] = useMemo(
    () => {
      const data = inject ? inject.data : (scenesData ?? []);
      return [...data].sort((a, b) => a.sort_order - b.sort_order);
    },
    [inject, scenesData]
  );

  const addScene = useCallback(
    async (
      data: Partial<Omit<Scene, 'id' | 'room_id'>>,
      duplicateFromSceneId?: string,
      allObjects?: BoardObject[]
    ) => {
      const inj = injectRef.current;
      const id = genId();
      const now = Date.now();
      const newScene: Scene = {
        id,
        room_id: roomId,
        name: data.name ?? '新しいシーン',
        background_asset_id: data.background_asset_id ?? null,
        foreground_asset_id: data.foreground_asset_id ?? null,
        foreground_opacity: data.foreground_opacity ?? 0.5,
        bg_transition: data.bg_transition ?? 'none',
        bg_transition_duration: data.bg_transition_duration ?? 500,
        fg_transition: data.fg_transition ?? 'none',
        fg_transition_duration: data.fg_transition_duration ?? 500,
        bg_blur: data.bg_blur ?? true,
        grid_visible: data.grid_visible ?? false,
        sort_order: data.sort_order ?? scenes.length,
        created_at: now,
        updated_at: now,
      };

      const createdObjects: BoardObject[] = [];

      if (duplicateFromSceneId && allObjects) {
        const sourceObjects = allObjects.filter(
          (o) => !o.global && o.scene_ids.includes(duplicateFromSceneId)
        );
        for (const obj of sourceObjects) {
          createdObjects.push({
            ...obj,
            id: genId(),
            room_id: roomId,
            scene_ids: [id],
            created_at: now,
            updated_at: now,
          });
        }
      } else {
        // characters_layer の sort_order を参照し、前景をその下に配置
        const charLayer = allObjects?.find(o => o.type === 'characters_layer');
        const charLayerSort = charLayer?.sort_order ?? 9999;
        const fgSort = Math.max(1, charLayerSort - 1);

        createdObjects.push({
          id: genId(),
          room_id: roomId,
          type: 'background',
          name: '背景',
          global: false,
          scene_ids: [id],
          x: -50, y: -50, width: 100, height: 100,
          visible: true, opacity: 1, sort_order: 0,
          position_locked: false, size_locked: false,
          image_asset_id: null, background_color: '#333333', color_enabled: false, image_fit: 'cover',
          text_content: null, font_size: 16, font_family: 'sans-serif',
          letter_spacing: 0, line_height: 1.2, auto_size: true,
          text_align: 'left', text_vertical_align: 'top', text_color: '#ffffff',
          scale_x: 1, scale_y: 1,
          created_at: now, updated_at: now,
        });
        createdObjects.push({
          id: genId(),
          room_id: roomId,
          type: 'foreground',
          name: '前景',
          global: false,
          scene_ids: [id],
          x: -24, y: -14, width: 48, height: 27,
          visible: true, opacity: 1, sort_order: fgSort,
          position_locked: false, size_locked: false,
          image_asset_id: null, background_color: '#666666', color_enabled: false, image_fit: 'cover',
          text_content: null, font_size: 16, font_family: 'sans-serif',
          letter_spacing: 0, line_height: 1.2, auto_size: true,
          text_align: 'left', text_vertical_align: 'top', text_color: '#ffffff',
          scale_x: 1, scale_y: 1,
          created_at: now, updated_at: now,
        });
        // 初回シーン作成時のみ characters_layer を生成
        if (scenes.length === 0) {
          createdObjects.push({
            id: genId(),
            room_id: roomId,
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
          });
        }
      }

      if (inj) {
        await inj.create(newScene);
        if (createdObjects.length > 0) {
          await inj.createObjectBatch(createdObjects);
          onObjectsCreated?.(createdObjects);
        }
      } else {
        const { error: sceneError } = await supabase.from('scenes').insert(newScene);
        if (sceneError) throw sceneError;

        if (createdObjects.length > 0) {
          const { error: objectError } = await supabase.from('objects').insert(createdObjects);
          if (objectError) throw objectError;
          onObjectsCreated?.(createdObjects);
        }
      }

      return { scene: newScene, objects: createdObjects };
    },
    [roomId, scenes.length, onObjectsCreated]
    // ← inject は injectRef 経由なので deps に入れない
  );

  const updateScene = useCallback(
    async (sceneId: string, updates: Partial<Scene>) => {
      const inj = injectRef.current;
      if (inj) {
        await inj.update(sceneId, updates);
      } else {
        const { id: _id, room_id: _rid, created_at: _ca, ...rest } = updates as Scene;
        const { error } = await supabase.from('scenes').update({ ...rest, updated_at: Date.now() }).eq('id', sceneId);
        if (error) throw error;
      }
    },
    []
  );

  const removeScene = useCallback(
    async (sceneId: string) => {
      const inj = injectRef.current;
      if (inj) {
        await inj.remove(sceneId);
      } else {
        const { error } = await supabase.from('scenes').delete().eq('id', sceneId);
        if (error) throw error;
      }
    },
    []
  );

  const activateScene = useCallback(
    async (sceneId: string | null) => {
      const callback = onActivateSceneRef.current;
      if (callback) {
        await callback(sceneId);
      }
    },
    []
  );

  const reorderScenes = useCallback(
    async (orderedIds: string[]) => {
      const inj = injectRef.current;
      const updates = orderedIds.map((id, i) => ({ id, sort_order: i }));
      if (inj) {
        await inj.reorder(updates);
      } else {
        for (const { id, sort_order } of updates) {
          const { error } = await supabase.from('scenes').update({ sort_order, updated_at: Date.now() }).eq('id', id);
          if (error) throw error;
        }
      }
    },
    []
  );

  return { scenes, loading, addScene, updateScene, removeScene, reorderScenes, activateScene };
}
