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
import type { ScenarioText } from '../types/adrastea.types';

export function useScenarioTexts(roomId: string) {
  const [scenarioTexts, setScenarioTexts] = useState<ScenarioText[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'rooms', roomId, 'scenario_texts'),
      orderBy('sort_order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const updated: ScenarioText[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            room_id: roomId,
            title: data.title ?? '',
            content: data.content ?? '',
            visible: data.visible ?? false,
            sort_order: data.sort_order ?? 0,
            created_at: data.created_at ?? Date.now(),
            updated_at: data.updated_at ?? Date.now(),
          } as ScenarioText;
        });
        setScenarioTexts(updated);
        setLoading(false);
      },
      (error) => {
        console.error('シナリオテキストの監視に失敗:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  const addScenarioText = useCallback(
    async (data: Partial<Omit<ScenarioText, 'id' | 'room_id'>>) => {
      const docRef = await addDoc(collection(db, 'rooms', roomId, 'scenario_texts'), {
        title: data.title ?? '新規テキスト',
        content: data.content ?? '',
        visible: data.visible ?? false,
        sort_order: data.sort_order ?? scenarioTexts.length,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      return docRef.id;
    },
    [roomId, scenarioTexts.length]
  );

  const updateScenarioText = useCallback(
    async (textId: string, updates: Partial<ScenarioText>) => {
      const { id, room_id, ...data } = updates as any;
      await updateDoc(doc(db, 'rooms', roomId, 'scenario_texts', textId), {
        ...data,
        updated_at: Date.now(),
      });
    },
    [roomId]
  );

  const removeScenarioText = useCallback(
    async (textId: string) => {
      await deleteDoc(doc(db, 'rooms', roomId, 'scenario_texts', textId));
    },
    [roomId]
  );

  const reorderScenarioTexts = useCallback(
    async (orderedIds: string[]) => {
      if (!roomId) return;
      const batch = writeBatch(db);
      orderedIds.forEach((id, index) => {
        batch.update(doc(db, 'rooms', roomId, 'scenario_texts', id), {
          sort_order: index,
          updated_at: Date.now(),
        });
      });
      await batch.commit();
    },
    [roomId]
  );

  return { scenarioTexts, loading, addScenarioText, updateScenarioText, removeScenarioText, reorderScenarioTexts };
}
