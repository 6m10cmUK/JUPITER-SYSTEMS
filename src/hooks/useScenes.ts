import { useState, useEffect, useCallback } from 'react';
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
            bgm_type: data.bgm_type ?? null,
            bgm_source: data.bgm_source ?? null,
            bgm_volume: data.bgm_volume ?? 0.5,
            bgm_loop: data.bgm_loop ?? true,
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
    async (data: Partial<Omit<Scene, 'id' | 'room_id'>>) => {
      const docRef = await addDoc(collection(db, 'rooms', roomId, 'scenes'), {
        name: data.name ?? '新しいシーン',
        background_url: data.background_url ?? null,
        foreground_url: data.foreground_url ?? null,
        foreground_opacity: data.foreground_opacity ?? 0.5,
        bgm_type: data.bgm_type ?? null,
        bgm_source: data.bgm_source ?? null,
        bgm_volume: data.bgm_volume ?? 0.5,
        bgm_loop: data.bgm_loop ?? true,
        sort_order: data.sort_order ?? scenes.length,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
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
      await deleteDoc(doc(db, 'rooms', roomId, 'scenes', sceneId));
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
