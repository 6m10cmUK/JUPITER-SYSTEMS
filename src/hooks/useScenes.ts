import { useState, useEffect, useCallback } from 'react';
import type { Scene, BoardObject } from '../types/adrastea.types';

const genId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');

/** addScene が外部にオブジェクト追加を通知するためのコールバック */
export type OnObjectsCreated = (objects: BoardObject[]) => void;

export function useScenes(
  roomId: string,
  initialScenes?: Scene[],
  /** シーン追加時にオブジェクトを外部に通知するコールバック */
  onObjectsCreated?: OnObjectsCreated
) {
  const [scenes, setScenes] = useState<Scene[]>(initialScenes ?? []);
  const [loading, setLoading] = useState(!initialScenes);

  useEffect(() => {
    if (initialScenes) {
      setScenes(initialScenes);
      setLoading(false);
    }
  }, [initialScenes]);

  const addScene = useCallback(
    (
      data: Partial<Omit<Scene, 'id' | 'room_id'>>,
      duplicateFromSceneId?: string,
      allObjects?: BoardObject[]
    ) => {
      const now = Date.now();
      const newSceneId = (data as { id?: string }).id ?? genId();

      const newScene: Scene = {
        id: newSceneId,
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
      setScenes((prev) => [...prev, newScene]);

      // オブジェクト生成
      const createdObjects: BoardObject[] = [];

      if (duplicateFromSceneId && allObjects) {
        // 元シーンに紐付くオブジェクトを複製（グローバルは除外）
        const sourceObjects = allObjects.filter(
          (o) => !o.global && o.scene_ids.includes(duplicateFromSceneId)
        );
        for (const obj of sourceObjects) {
          createdObjects.push({
            ...obj,
            id: genId(),
            scene_ids: [newSceneId],
            created_at: now,
            updated_at: now,
          });
        }
      } else {
        // デフォルト背景オブジェクト
        createdObjects.push({
          id: genId(),
          type: 'background',
          name: '背景',
          global: false,
          scene_ids: [newSceneId],
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
        // デフォルト前景オブジェクト
        createdObjects.push({
          id: genId(),
          type: 'foreground',
          name: '前景',
          global: false,
          scene_ids: [newSceneId],
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
        onObjectsCreated?.(createdObjects);
      }

      return { scene: newScene, objects: createdObjects };
    },
    [roomId, scenes.length, onObjectsCreated]
  );

  const updateScene = useCallback(
    (sceneId: string, updates: Partial<Scene>) => {
      setScenes((prev) =>
        prev.map((s) =>
          s.id === sceneId ? { ...s, ...updates, updated_at: Date.now() } : s
        )
      );
    },
    []
  );

  const removeScene = useCallback(
    (sceneId: string) => {
      setScenes((prev) => prev.filter((s) => s.id !== sceneId));
    },
    []
  );

  /** activateScene は room の更新なので、外部の updateRoom を使うことを想定。
   *  後方互換のためにコールバックを返す形にする。
   *  呼び出し側で updateRoom({ active_scene_id: sceneId }) を呼んでもらう。 */
  const activateScene = useCallback(
    (_sceneId: string | null) => {
      // no-op: 呼び出し側で updateRoom を使う
    },
    []
  );

  const reorderScenes = useCallback(
    (orderedIds: string[]) => {
      const now = Date.now();
      setScenes((prev) => {
        const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
        return prev.map((s) => {
          const newSort = orderMap.get(s.id);
          return newSort !== undefined && s.sort_order !== newSort
            ? { ...s, sort_order: newSort, updated_at: now }
            : s;
        });
      });
    },
    []
  );

  // P2P: expose raw setter for full sync
  const _setAll = useCallback((items: Scene[]) => {
    setScenes(items);
    setLoading(false);
  }, []);

  return { scenes, loading, addScene, updateScene, removeScene, reorderScenes, activateScene, _setAll };
}
