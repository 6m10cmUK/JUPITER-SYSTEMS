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
import type { Character } from '../types/adrastea.types';

export function useCharacters(roomId: string) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'rooms', roomId, 'characters'),
      orderBy('sort_order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const updated: Character[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            room_id: roomId,
            name: data.name ?? '',
            image_url: data.image_url ?? null,
            color: data.color ?? '#89b4fa',
            statuses: data.statuses ?? [],
            tags: data.tags ?? [],
            memo: data.memo ?? '',
            sort_order: data.sort_order ?? 0,
            created_at: data.created_at ?? Date.now(),
            updated_at: data.updated_at ?? Date.now(),
          } as Character;
        });
        setCharacters(updated);
        setLoading(false);
      },
      (error) => {
        console.error('キャラクターの監視に失敗:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  const addCharacter = useCallback(
    async (data: Partial<Omit<Character, 'id' | 'room_id'>>) => {
      const docRef = await addDoc(collection(db, 'rooms', roomId, 'characters'), {
        name: data.name ?? '新規キャラクター',
        image_url: data.image_url ?? null,
        color: data.color ?? '#89b4fa',
        statuses: data.statuses ?? [],
        tags: data.tags ?? [],
        memo: data.memo ?? '',
        sort_order: data.sort_order ?? characters.length,
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      return docRef.id;
    },
    [roomId, characters.length]
  );

  const updateCharacter = useCallback(
    async (charId: string, updates: Partial<Character>) => {
      const { id, room_id, ...data } = updates as any;
      await updateDoc(doc(db, 'rooms', roomId, 'characters', charId), {
        ...data,
        updated_at: Date.now(),
      });
    },
    [roomId]
  );

  const removeCharacter = useCallback(
    async (charId: string) => {
      await deleteDoc(doc(db, 'rooms', roomId, 'characters', charId));
    },
    [roomId]
  );

  return { characters, loading, addCharacter, updateCharacter, removeCharacter };
}
