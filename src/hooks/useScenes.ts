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
        sort_order: data.sort_order ?? scenes.length,
        created_at: Date.now(),
        updated_at: Date.now(),
      });

      const objectsCol = collection(db, 'rooms', roomId, 'scenes', docRef.id, 'objects');
      const now = Date.now();

      if (duplicateFromSceneId) {
        // 元シーンのオブジェクトを複製
        const sourceObjects = await getDocs(
          collection(db, 'rooms', roomId, 'scenes', duplicateFromSceneId, 'objects')
        );
        const batch = writeBatch(db);
        sourceObjects.docs.forEach((d) => {
          const objData = d.data();
          const newRef = doc(objectsCol);
          batch.set(newRef, {
            ...objData,
            created_at: now,
            updated_at: now,
          });
        });
        await batch.commit();

        // BGMトラックも複製
        const sourceBgms = await getDocs(
          collection(db, 'rooms', roomId, 'scenes', duplicateFromSceneId, 'bgms')
        );
        if (!sourceBgms.empty) {
          const bgmBatch = writeBatch(db);
          sourceBgms.docs.forEach((d) => {
            const bgmData = d.data();
            const newRef = doc(collection(db, 'rooms', roomId, 'scenes', docRef.id, 'bgms'));
            bgmBatch.set(newRef, { ...bgmData, created_at: now, updated_at: now });
          });
          await bgmBatch.commit();
        }
      } else {
        // デフォルト背景オブジェクト
        await addDoc(objectsCol, {
          type: 'background',
          name: '背景',
          x: 0, y: 0, width: 100, height: 100,
          visible: true, opacity: 1, sort_order: 0, locked: true,
          image_url: null, background_color: '#333333', image_fit: 'cover',
          text_content: null, font_size: 16, text_color: '#ffffff',
          created_at: now, updated_at: now,
        });
        // デフォルト前景オブジェクト
        await addDoc(objectsCol, {
          type: 'foreground',
          name: '前景',
          x: 26, y: 36, width: 48, height: 27,
          visible: true, opacity: 1, sort_order: 100, locked: false,
          image_url: null, background_color: '#666666', image_fit: 'cover',
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
      // シーン配下のオブジェクト・BGM・シーン本体を一括削除
      const [objectsSnap, bgmsSnap] = await Promise.all([
        getDocs(collection(db, 'rooms', roomId, 'scenes', sceneId, 'objects')),
        getDocs(collection(db, 'rooms', roomId, 'scenes', sceneId, 'bgms')),
      ]);
      const batch = writeBatch(db);
      objectsSnap.docs.forEach((d) => batch.delete(d.ref));
      bgmsSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'rooms', roomId, 'scenes', sceneId));
      await batch.commit();
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
