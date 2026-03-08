import { useState, useEffect, useCallback } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { Scene } from '../types/adrastea.types';

export function useScenes(roomId: string) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'rooms', roomId, 'scenes'),
      orderBy('sort_order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const updated: Scene[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            room_id: roomId,
            name: data.name ?? '',
            background_url: data.background_url ?? null,
            foreground_url: data.foreground_url ?? null,
            foreground_opacity: data.foreground_opacity ?? 0.5,
            bg_transition: data.bg_transition ?? 'none',
            bg_transition_duration: data.bg_transition_duration ?? 500,
            fg_transition: data.fg_transition ?? 'none',
            fg_transition_duration: data.fg_transition_duration ?? 500,
            bg_blur: data.bg_blur ?? true,
            sort_order: data.sort_order ?? 0,
            created_at: data.created_at ?? Date.now(),
            updated_at: data.updated_at ?? Date.now(),
          } as Scene;
        });
        setScenes(updated);
        setLoading(false);
      },
      (error) => {
        console.error('シーンの監視に失敗:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  const addScene = useCallback(
    async (data: Partial<Omit<Scene, 'id' | 'room_id'>>, duplicateFromSceneId?: string) => {
      const docRef = await addDoc(collection(db, 'rooms', roomId, 'scenes'), {
        name: data.name ?? '新しいシーン',
        background_url: data.background_url ?? null,
        foreground_url: data.foreground_url ?? null,
        foreground_opacity: data.foreground_opacity ?? 0.5,
        bg_blur: data.bg_blur ?? true,
        sort_order: data.sort_order ?? scenes.length,
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      const objectsCol = collection(db, 'rooms', roomId, 'objects');
      const now = Date.now();
      const newSceneId = docRef.id;

      if (duplicateFromSceneId) {
        // 元シーンに紐付くオブジェクトを検索して複製（scene_ids に元シーンID含む非グローバル）
        const sourceSnap = await getDocs(
          query(objectsCol, where('scene_ids', 'array-contains', duplicateFromSceneId))
        );
        const batch = writeBatch(db);
        sourceSnap.docs.forEach((d) => {
          const objData = d.data();
          // グローバルオブジェクトは複製しない（既に全シーンで表示される）
          if (objData.global) return;
          const newRef = doc(objectsCol);
          batch.set(newRef, {
            ...objData,
            scene_ids: [newSceneId],
            created_at: now,
            updated_at: now,
          });
        });
        await batch.commit();
      } else {
        // デフォルト背景オブジェクト（シーン固有）
        await addDoc(objectsCol, {
          type: 'background',
          name: '背景',
          global: false,
          scene_ids: [newSceneId],
          x: -50, y: -50, width: 100, height: 100,
          visible: true, opacity: 1, sort_order: 0, locked: true,
          image_url: null, image_asset_id: null, background_color: '#333333', image_fit: 'cover',
          text_content: null, font_size: 16, text_color: '#ffffff',
          created_at: now, updated_at: now,
        });
        // デフォルト前景オブジェクト（シーン固有）
        await addDoc(objectsCol, {
          type: 'foreground',
          name: '前景',
          global: false,
          scene_ids: [newSceneId],
          x: -24, y: -14, width: 48, height: 27,
          visible: true, opacity: 1, sort_order: 100, locked: false,
          image_url: null, image_asset_id: null, background_color: '#666666', image_fit: 'cover',
          text_content: null, font_size: 16, text_color: '#ffffff',
          created_at: now, updated_at: now,
        });
      }

      return docRef.id;
    },
    [roomId, scenes.length]
  );

  const updateScene = useCallback(
    async (sceneId: string, updates: Partial<Scene>) => {
      const { id, room_id, ...data } = updates as any;
      await updateDoc(doc(db, 'rooms', roomId, 'scenes', sceneId), {
        ...data,
        updated_at: Date.now(),
      });
    },
    [roomId]
  );

  const removeScene = useCallback(
    async (sceneId: string) => {
      try {
        const objectsCol = collection(db, 'rooms', roomId, 'objects');

        // scene_ids にこのシーンIDを含むオブジェクトを検索
        const snap = await getDocs(
          query(objectsCol, where('scene_ids', 'array-contains', sceneId))
        );

        const batch = writeBatch(db);
        for (const d of snap.docs) {
          const data = d.data();
          if (data.global) continue; // グローバルオブジェクトは影響なし
          const newSceneIds = (data.scene_ids as string[]).filter(id => id !== sceneId);
          if (newSceneIds.length === 0) {
            // どのシーンにも属さなくなった → 削除
            batch.delete(d.ref);
          } else {
            batch.update(d.ref, { scene_ids: newSceneIds, updated_at: Date.now() });
          }
        }

        // シーン本体を削除
        batch.delete(doc(db, 'rooms', roomId, 'scenes', sceneId));
        await batch.commit();
      } catch (e) {
        console.error('シーン削除エラー:', e);
        alert(`シーン削除エラー: ${e instanceof Error ? e.message : String(e)}`);
        throw e;
      }
    },
    [roomId]
  );

  const activateScene = useCallback(
    async (sceneId: string | null) => {
      await updateDoc(doc(db, 'rooms', roomId), {
        active_scene_id: sceneId,
        updated_at: Date.now(),
      });
    },
    [roomId]
  );

  return { scenes, loading, addScene, updateScene, removeScene, activateScene };
}
