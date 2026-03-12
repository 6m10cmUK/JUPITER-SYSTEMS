import { useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Scene, BoardObject } from '../types/adrastea.types';
import { genId } from '../utils/id';

export type OnObjectsCreated = (objects: BoardObject[]) => void;

export function useScenes(
  roomId: string,
  onObjectsCreated?: OnObjectsCreated
) {
  const scenesData = useQuery(api.scenes.list, { room_id: roomId });
  const createMutation = useMutation(api.scenes.create);
  const updateMutation = useMutation(api.scenes.update).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.scenes.list, { room_id: roomId });
      if (current !== undefined) {
        localStore.setQuery(
          api.scenes.list,
          { room_id: roomId },
          current.map((s) => s.id === args.id ? { ...s, ...args } : s),
        );
      }
    }
  );
  const removeMutation = useMutation(api.scenes.remove);
  const reorderMutation = useMutation(api.scenes.reorder).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.scenes.list, { room_id: roomId });
      if (current !== undefined) {
        const orderMap = new Map(args.updates.map((u) => [u.id, u.sort_order]));
        localStore.setQuery(
          api.scenes.list,
          { room_id: roomId },
          current.map((s) => orderMap.has(s.id) ? { ...s, sort_order: orderMap.get(s.id)! } : s),
        );
      }
    }
  );
  const createObjectBatchMutation = useMutation(api.objects.createBatch);

  const loading = scenesData === undefined;
  const scenes: Scene[] = useMemo(() => scenesData ?? [], [scenesData]);

  const addScene = useCallback(
    async (
      data: Partial<Omit<Scene, 'id' | 'room_id'>>,
      duplicateFromSceneId?: string,
      allObjects?: BoardObject[]
    ) => {
      const id = genId();
      const now = Date.now();
      const newScene: Scene = {
        id,
        room_id: roomId,
        name: data.name ?? '新しいシーン',
        background_url: data.background_url ?? null,
        foreground_url: data.foreground_url ?? null,
        foreground_opacity: data.foreground_opacity ?? 0.5,
        bg_transition: data.bg_transition ?? 'none',
        bg_transition_duration: data.bg_transition_duration ?? 500,
        fg_transition: data.fg_transition ?? 'none',
        fg_transition_duration: data.fg_transition_duration ?? 500,
        bg_blur: data.bg_blur ?? true,
        sort_order: data.sort_order ?? scenes.length,
        created_at: now,
        updated_at: now,
      };

      await createMutation(newScene);

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
        createdObjects.push({
          id: genId(),
          room_id: roomId,
          type: 'background',
          name: '背景',
          global: false,
          scene_ids: [id],
          x: -50, y: -50, width: 100, height: 100,
          visible: true, opacity: 1, sort_order: 0, locked: true,
          position_locked: false, size_locked: false,
          image_url: null, image_asset_id: null, background_color: '#333333', image_fit: 'cover',
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
          visible: true, opacity: 1, sort_order: 100, locked: false,
          position_locked: false, size_locked: false,
          image_url: null, image_asset_id: null, background_color: '#666666', image_fit: 'cover',
          text_content: null, font_size: 16, font_family: 'sans-serif',
          letter_spacing: 0, line_height: 1.2, auto_size: true,
          text_align: 'left', text_vertical_align: 'top', text_color: '#ffffff',
          scale_x: 1, scale_y: 1,
          created_at: now, updated_at: now,
        });
      }

      if (createdObjects.length > 0) {
        await createObjectBatchMutation({ objects: createdObjects });
        onObjectsCreated?.(createdObjects);
      }

      return { scene: newScene, objects: createdObjects };
    },
    [roomId, scenes.length, createMutation, createObjectBatchMutation, onObjectsCreated]
  );

  const updateScene = useCallback(
    async (sceneId: string, updates: Partial<Scene>) => {
      const { id: _id, room_id: _rid, created_at: _ca, ...rest } = updates as Scene;
      await updateMutation({ id: sceneId, ...rest });
    },
    [updateMutation]
  );

  const removeScene = useCallback(
    async (sceneId: string) => {
      await removeMutation({ id: sceneId });
    },
    [removeMutation]
  );

  const activateScene = useCallback((_sceneId: string | null) => {
    // no-op: 呼び出し側で updateRoom を使う
  }, []);

  const reorderScenes = useCallback(
    async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, i) => ({ id, sort_order: i }));
      await reorderMutation({ updates });
    },
    [reorderMutation]
  );

  return { scenes, loading, addScene, updateScene, removeScene, reorderScenes, activateScene };
}
