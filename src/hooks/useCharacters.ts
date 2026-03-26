import { useCallback, useMemo, useRef, useState } from 'react';
import { supabase } from '../services/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import type { Character } from '../types/adrastea.types';
import type { CharactersInject } from '../types/adrastea-persistence';
import { genId } from '../utils/id';

export function useCharacters(roomId: string, options?: { inject?: CharactersInject }) {
  const { inject } = options ?? {};
  const injectRef = useRef(inject);
  injectRef.current = inject;

  const statsQuery = useSupabaseQuery<any>({
    table: 'characters_stats',
    columns: 'id,room_id,owner_id,name,color,active_image_index,statuses,parameters,is_hidden_on_board,sort_order,on_board,board_x,board_y,board_height,board_visible,created_at,updated_at',
    roomId,
    filter: (q) => q.eq('room_id', roomId),
    enabled: !inject,
  });
  const baseQuery = useSupabaseQuery<any>({
    table: 'characters_base',
    columns: 'id,room_id,images,memo,chat_palette,sheet_url,initiative,size,is_status_private',
    roomId,
    filter: (q) => q.eq('room_id', roomId),
    enabled: !inject,
  });

  const statsData = statsQuery.data;
  const baseData = baseQuery.data;

  const loading = inject ? false : (statsQuery.loading || baseQuery.loading);
  const [charOrderVersion, setCharOrderVersion] = useState(0);
  const [layerCharOrderVersion, setLayerCharOrderVersion] = useState(0);

  const characters: Character[] = useMemo(() => {
    if (inject) return inject.data;

    // 両テーブルが loading 中なら空配列を返す
    if (!statsData.length && !baseData.length && (statsQuery.loading || baseQuery.loading)) return [];

    if (!statsData || !baseData) return [];

    // Create map of base data for quick lookup
    const baseMap = new Map(baseData.map(b => [b.id, b]));

    const merged = statsData.map((stat) => {
      const base = baseMap.get(stat.id);
      return {
        id: stat.id,
        room_id: stat.room_id,
        owner_id: stat.owner_id,
        name: stat.name,
        color: stat.color,
        active_image_index: stat.active_image_index,
        statuses: stat.statuses ?? [],
        parameters: stat.parameters ?? [],
        is_hidden_on_board: stat.is_hidden_on_board,
        sort_order: stat.sort_order ?? 0,
        board_x: stat.board_x ?? 0,
        board_y: stat.board_y ?? 0,
        board_visible: stat.board_visible ?? true,
        created_at: stat.created_at,
        updated_at: stat.updated_at,
        // From base table
        images: base?.images ?? [],
        memo: base?.memo ?? '',
        secret_memo: '', // RLS: 通常取得では空。GM は fetchSecretMemo で個別取得
        chat_palette: base?.chat_palette ?? '',
        sheet_url: base?.sheet_url ?? null,
        initiative: base?.initiative ?? 0,
        size: base?.size ?? 1,
        is_status_private: base?.is_status_private ?? false,
      } as Character;
    });

    // Load sort order from localStorage
    const storageKey = `adrastea-char-order-${roomId}`;
    const savedOrder = localStorage.getItem(storageKey);
    let sorted = merged;
    if (savedOrder) {
      try {
        const orderedIds = JSON.parse(savedOrder) as string[];
        const idToChar = new Map(merged.map(c => [c.id, c]));
        const sortedArray: Character[] = [];
        const seenIds = new Set<string>();

        // Add characters in saved order
        for (const id of orderedIds) {
          const char = idToChar.get(id);
          if (char) {
            sortedArray.push(char);
            seenIds.add(id);
          }
        }

        // Add remaining characters not in saved order at the end
        for (const char of merged) {
          if (!seenIds.has(char.id)) {
            sortedArray.push(char);
          }
        }

        sorted = sortedArray;
      } catch {
        // If JSON parsing fails, return unsorted
        sorted = merged;
      }
    }

    // Overlay chat_palette from localStorage cache
    const overlaidCharacters = sorted.map((char) => {
      const cachedPalette = localStorage.getItem(`adrastea-chat-palette-${char.id}`);
      if (cachedPalette !== null) {
        return { ...char, chat_palette: cachedPalette };
      }
      return char;
    });

    return overlaidCharacters;
  }, [inject, statsData, baseData, roomId, charOrderVersion]);

  const layerOrderedCharacters: Character[] = useMemo(() => {
    if (characters.length === 0) return [];
    const storageKey = `adrastea-layer-char-order-${roomId}`;
    const savedOrder = localStorage.getItem(storageKey);
    if (!savedOrder) return characters;
    try {
      const orderedIds = JSON.parse(savedOrder) as string[];
      const idToChar = new Map(characters.map(c => [c.id, c]));
      const sorted: Character[] = [];
      const seen = new Set<string>();
      for (const id of orderedIds) {
        const char = idToChar.get(id);
        if (char) {
          sorted.push(char);
          seen.add(id);
        }
      }
      for (const char of characters) {
        if (!seen.has(char.id)) sorted.push(char);
      }
      return sorted;
    } catch {
      return characters;
    }
  }, [characters, roomId, layerCharOrderVersion]);

  const fetchSecretMemo = useCallback(
    async (charId: string): Promise<string> => {
      const { data, error } = await supabase
        .from('characters_base')
        .select('secret_memo')
        .eq('id', charId)
        .single();
      if (error) {
        console.error('Failed to fetch secret_memo:', error);
        return '';
      }
      return data?.secret_memo ?? '';
    },
    []
  );

  const addCharacter = useCallback(
    async (data: Partial<Omit<Character, 'id' | 'room_id' | 'created_at' | 'updated_at'>>): Promise<Character> => {
      const inj = injectRef.current;
      const now = Date.now();
      const id = (data as { id?: string }).id ?? genId();
      const newChar: Character = {
        id,
        room_id: roomId,
        owner_id: data.owner_id ?? '',
        name: data.name ?? '新規キャラクター',
        images: data.images ?? [],
        active_image_index: data.active_image_index ?? 0,
        color: data.color ?? '#555555',
        sheet_url: data.sheet_url ?? null,
        initiative: data.initiative ?? 0,
        size: data.size ?? 5,
        statuses: data.statuses ?? [],
        parameters: data.parameters ?? [],
        memo: data.memo ?? '',
        secret_memo: data.secret_memo ?? '',
        chat_palette: data.chat_palette ?? '',
        is_status_private: data.is_status_private ?? false,
        is_hidden_on_board: data.is_hidden_on_board ?? false,
        sort_order: data.sort_order ?? characters.length,
        board_x: data.board_x ?? 0,
        board_y: data.board_y ?? 0,
        board_visible: data.board_visible ?? true,
        created_at: now,
        updated_at: now,
      };
      if (inj) {
        await inj.create(newChar);
      } else {
        const { created_at: _ca, updated_at: _ua, ...statsData } = newChar;
        const baseData = {
          id: newChar.id,
          room_id: newChar.room_id,
          images: newChar.images,
          memo: newChar.memo,
          secret_memo: newChar.secret_memo,
          chat_palette: newChar.chat_palette,
          sheet_url: newChar.sheet_url,
          initiative: newChar.initiative,
          size: newChar.size,
          is_status_private: newChar.is_status_private,
        };
        await Promise.all([
          supabase.from('characters_stats').insert([statsData]),
          supabase.from('characters_base').insert([baseData]),
        ]);
      }
      return newChar;
    },
    [roomId, characters.length]
  );

  const updateCharacter = useCallback(
    async (charId: string, updates: Partial<Character>): Promise<void> => {
      const inj = injectRef.current;
      if (inj) {
        await inj.update(charId, updates);
        return;
      }

      // Fields that belong in characters_stats
      const statsFields = [
        'name', 'color', 'active_image_index',
        'statuses', 'parameters',
        'is_hidden_on_board',
        'sort_order',
        'board_x', 'board_y', 'board_visible'
      ];

      // Fields that belong in characters_base
      const baseFields = [
        'images', 'memo', 'secret_memo', 'chat_palette',
        'sheet_url', 'initiative', 'size', 'is_status_private'
      ];

      // Separate updates
      const statsUpdates: Record<string, any> = { id: charId };
      const baseUpdates: Record<string, any> = { id: charId };

      Object.entries(updates).forEach(([key, value]) => {
        if (statsFields.includes(key)) {
          statsUpdates[key] = value;
        } else if (baseFields.includes(key)) {
          baseUpdates[key] = value;
        }
      });


      // Cache chat_palette in localStorage before mutation
      if ('chat_palette' in baseUpdates) {
        localStorage.setItem(`adrastea-chat-palette-${charId}`, baseUpdates.chat_palette ?? '');
      }

      // Only call mutations if there are updates for each
      if (Object.keys(statsUpdates).length > 1) {
        const { id: _id, ...statsRest } = statsUpdates;
        await supabase.from('characters_stats').update(statsRest).eq('id', charId);
      }

      if (Object.keys(baseUpdates).length > 1) {
        const { id: _id, ...baseRest } = baseUpdates;
        await supabase.from('characters_base').update(baseRest).eq('id', charId);
      }
    },
    [characters]
  );

  const moveCharacter = useCallback(
    async (charId: string, updates: { board_x?: number; board_y?: number }): Promise<void> => {
      const inj = injectRef.current;
      if (inj) {
        await inj.move(charId, updates);
      } else {
        await supabase.from('characters_stats').update(updates).eq('id', charId);
      }
    },
    []
  );

  const removeCharacter = useCallback(
    async (charId: string): Promise<void> => {
      const inj = injectRef.current;
      if (inj) {
        await inj.remove(charId);
      } else {
        await Promise.all([
          supabase.from('pieces').delete().eq('character_id', charId),
          supabase.from('characters_stats').delete().eq('id', charId),
          supabase.from('characters_base').delete().eq('id', charId),
        ]);
      }
    },
    []
  );

  const reorderCharacters = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      const storageKey = `adrastea-char-order-${roomId}`;
      localStorage.setItem(storageKey, JSON.stringify(orderedIds));
      setCharOrderVersion(v => v + 1);
    },
    [roomId]
  );

  const reorderLayerCharacters = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      const storageKey = `adrastea-layer-char-order-${roomId}`;
      localStorage.setItem(storageKey, JSON.stringify(orderedIds));
      setLayerCharOrderVersion(v => v + 1);
    },
    [roomId]
  );

  return { characters, layerOrderedCharacters, loading, addCharacter, updateCharacter, moveCharacter, removeCharacter, reorderCharacters, reorderLayerCharacters, fetchSecretMemo };
}
