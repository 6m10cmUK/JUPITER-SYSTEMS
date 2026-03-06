import { useState, useEffect, useCallback } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import type { Cutin } from '../types/adrastea.types';

export function useCutins(roomId: string) {
  const [cutins, setCutins] = useState<Cutin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'rooms', roomId, 'cutins'),
      orderBy('sort_order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const updated: Cutin[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            room_id: roomId,
            name: data.name ?? '',
            image_url: data.image_url ?? null,
            text: data.text ?? '',
            animation: data.animation ?? 'slide',
            duration: data.duration ?? 3000,
            text_color: data.text_color ?? '#ffffff',
            background_color: data.background_color ?? 'rgba(0,0,0,0.8)',
            sort_order: data.sort_order ?? 0,
            created_at: data.created_at ?? Date.now(),
            updated_at: data.updated_at ?? Date.now(),
          } as Cutin;
        });
        setCutins(updated);
        setLoading(false);
      },
      (error) => {
        console.error('カットインの監視に失敗:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  const addCutin = useCallback(
    async (data: Partial<Omit<Cutin, 'id' | 'room_id'>>) => {
      const docRef = await addDoc(collection(db, 'rooms', roomId, 'cutins'), {
        name: data.name ?? '新規カットイン',
        image_url: data.image_url ?? null,
        text: data.text ?? '',
        animation: data.animation ?? 'slide',
        duration: data.duration ?? 3000,
        text_color: data.text_color ?? '#ffffff',
        background_color: data.background_color ?? 'rgba(0,0,0,0.8)',
        sort_order: data.sort_order ?? cutins.length,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      return docRef.id;
    },
    [roomId, cutins.length]
  );

  const updateCutin = useCallback(
    async (cutinId: string, updates: Partial<Cutin>) => {
      const { id, room_id, ...data } = updates as any;
      await updateDoc(doc(db, 'rooms', roomId, 'cutins', cutinId), {
        ...data,
        updated_at: Date.now(),
      });
    },
    [roomId]
  );

  const removeCutin = useCallback(
    async (cutinId: string) => {
      await deleteDoc(doc(db, 'rooms', roomId, 'cutins', cutinId));
    },
    [roomId]
  );

  const triggerCutin = useCallback(
    async (cutinId: string) => {
      await updateDoc(doc(db, 'rooms', roomId), {
        active_cutin: { cutin_id: cutinId, triggered_at: Date.now() },
        updated_at: Date.now(),
      });
    },
    [roomId]
  );

  const clearCutin = useCallback(
    async () => {
      await updateDoc(doc(db, 'rooms', roomId), {
        active_cutin: null,
        updated_at: Date.now(),
      });
    },
    [roomId]
  );

  const reorderCutins = useCallback(
    async (orderedIds: string[]) => {
      if (!roomId) return;
      const batch = writeBatch(db);
      orderedIds.forEach((id, index) => {
        batch.update(doc(db, 'rooms', roomId, 'cutins', id), {
          sort_order: index,
          updated_at: Date.now(),
        });
      });
      await batch.commit();
    },
    [roomId]
  );

  return { cutins, loading, addCutin, updateCutin, removeCutin, reorderCutins, triggerCutin, clearCutin };
}
