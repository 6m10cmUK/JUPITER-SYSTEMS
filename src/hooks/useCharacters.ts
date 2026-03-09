import { useState, useEffect, useCallback } from 'react';
import type { Character } from '../types/adrastea.types';

const genId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');

export function useCharacters(roomId: string, initialCharacters?: Character[]) {
  const [characters, setCharacters] = useState<Character[]>(initialCharacters ?? []);
  const [loading, setLoading] = useState(!initialCharacters);

  useEffect(() => {
    if (initialCharacters) {
      setCharacters(initialCharacters);
      setLoading(false);
    }
  }, [initialCharacters]);

  const addCharacter = useCallback(
    (data: Partial<Omit<Character, 'id' | 'room_id'>>) => {
      const now = Date.now();
      const newId = (data as { id?: string }).id ?? genId();
      const newChar: Character = {
        id: newId,
        room_id: roomId,
        name: data.name ?? '新規キャラクター',
        image_url: data.image_url ?? null,
        color: data.color ?? '#89b4fa',
        statuses: data.statuses ?? [],
        tags: data.tags ?? [],
        memo: data.memo ?? '',
        sort_order: data.sort_order ?? characters.length,
        created_at: now,
        updated_at: now,
      };
      setCharacters((prev) => [...prev, newChar]);
      return newId;
    },
    [roomId, characters.length]
  );

  const updateCharacter = useCallback(
    (charId: string, updates: Partial<Character>) => {
      setCharacters((prev) =>
        prev.map((c) =>
          c.id === charId ? { ...c, ...updates, updated_at: Date.now() } : c
        )
      );
    },
    []
  );

  const removeCharacter = useCallback((charId: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== charId));
  }, []);

  const reorderCharacters = useCallback((orderedIds: string[]) => {
    setCharacters((prev) => {
      const now = Date.now();
      const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
      return prev.map((c) => {
        const newSort = orderMap.get(c.id);
        return newSort !== undefined
          ? { ...c, sort_order: newSort, updated_at: now }
          : c;
      });
    });
  }, []);

  const _setAll = useCallback((items: Character[]) => {
    setCharacters(items);
    setLoading(false);
  }, []);

  return { characters, loading, addCharacter, updateCharacter, removeCharacter, reorderCharacters, _setAll };
}
