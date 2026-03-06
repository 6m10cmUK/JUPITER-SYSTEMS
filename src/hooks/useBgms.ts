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
  writeBatch,
} from 'firebase/firestore';
import type { BgmTrack } from '../types/adrastea.types';

const mapDoc = (d: { id: string; data: () => any }): BgmTrack => {
  const data = d.data();
  return {
    id: d.id,
    name: data.name ?? '新規BGM',
    bgm_type: data.bgm_type ?? null,
    bgm_source: data.bgm_source ?? null,
    bgm_volume: data.bgm_volume ?? 0.5,
    bgm_loop: data.bgm_loop ?? true,
    scene_ids: data.scene_ids ?? [],
    is_playing: data.is_playing ?? false,
    is_paused: data.is_paused ?? false,
    auto_play_scene_ids: data.auto_play_scene_ids ?? [],
    fade_in: data.fade_in ?? true,
    fade_out: data.fade_out ?? true,
    fade_duration: data.fade_duration ?? 500,
    sort_order: data.sort_order ?? 0,
    created_at: data.created_at ?? Date.now(),
    updated_at: data.updated_at ?? Date.now(),
  };
};

export function useBgms(roomId: string) {
  const [bgms, setBgms] = useState<BgmTrack[]>([]);

  useEffect(() => {
    if (!roomId) {
      setBgms([]);
      return;
    }

    const q = query(
      collection(db, 'rooms', roomId, 'bgms'),
      orderBy('sort_order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setBgms(snapshot.docs.map(mapDoc));
      },
      (error) => {
        console.error('BGMの監視に失敗:', error);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  const addBgm = useCallback(
    async (data: Partial<Omit<BgmTrack, 'id'>>) => {
      if (!roomId) throw new Error('roomId required');
      const colRef = collection(db, 'rooms', roomId, 'bgms');
      const docRef = await addDoc(colRef, {
        name: data.name ?? '新規BGM',
        bgm_type: data.bgm_type ?? null,
        bgm_source: data.bgm_source ?? null,
        bgm_volume: data.bgm_volume ?? 0.5,
        bgm_loop: data.bgm_loop ?? true,
        scene_ids: data.scene_ids ?? [],
        is_playing: data.is_playing ?? false,
        is_paused: data.is_paused ?? false,
        auto_play_scene_ids: data.auto_play_scene_ids ?? [],
        fade_in: data.fade_in ?? true,
        fade_out: data.fade_out ?? true,
        fade_duration: data.fade_duration ?? 500,
        sort_order: data.sort_order ?? bgms.length,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      return docRef.id;
    },
    [roomId, bgms.length]
  );

  const updateBgm = useCallback(
    async (id: string, updates: Partial<BgmTrack>) => {
      if (!roomId) return;
      const { id: _id, created_at: _ca, ...data } = updates as any;
      await updateDoc(doc(db, 'rooms', roomId, 'bgms', id), {
        ...data,
        updated_at: Date.now(),
      });
    },
    [roomId]
  );

  const removeBgm = useCallback(
    async (id: string) => {
      if (!roomId) return;
      await deleteDoc(doc(db, 'rooms', roomId, 'bgms', id));
    },
    [roomId]
  );

  const reorderBgms = useCallback(
    async (orderedIds: string[]) => {
      if (!roomId) return;
      const batch = writeBatch(db);
      orderedIds.forEach((id, index) => {
        batch.update(doc(db, 'rooms', roomId, 'bgms', id), {
          sort_order: index,
          updated_at: Date.now(),
        });
      });
      await batch.commit();
    },
    [roomId]
  );

  return { bgms, addBgm, updateBgm, removeBgm, reorderBgms };
}
