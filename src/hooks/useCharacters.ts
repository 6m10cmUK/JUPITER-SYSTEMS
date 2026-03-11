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
    (data: Partial<Omit<Character, 'id' | 'room_id' | 'created_at' | 'updated_at'>>) => {
      const now = Date.now();
      const newId = (data as { id?: string }).id ?? genId();
      const newChar: Character = {
        id: newId,
        room_id: roomId,
        owner_id: data.owner_id ?? '',
        name: data.name ?? '新規キャラクター',
        images: data.images ?? [],
        active_image_index: data.active_image_index ?? 0,
        color: data.color ?? '#89b4fa',
        sheet_url: data.sheet_url ?? null,
        initiative: data.initiative ?? 0,
        size: data.size ?? 1,
        statuses: data.statuses ?? [],
        parameters: data.parameters ?? [],
        memo: data.memo ?? '',
        secret_memo: data.secret_memo ?? '',
        chat_palette: data.chat_palette ?? '',
        is_status_private: data.is_status_private ?? false,
        is_hidden_on_board: data.is_hidden_on_board ?? false,
        is_speech_hidden: data.is_speech_hidden ?? false,
        sort_order: data.sort_order ?? characters.length,
        created_at: now,
        updated_at: now,
      };
      setCharacters((prev) => [...prev, newChar]);
      return newChar;
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

  // P2P: add single item without Firestore write
  const _addOne = useCallback((item: Character) => {
    setCharacters(prev => [...prev, item]);
  }, []);

  return { characters, loading, addCharacter, updateCharacter, removeCharacter, reorderCharacters, _setAll, _addOne };
}
