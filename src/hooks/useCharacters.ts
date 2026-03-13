import { useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Character } from '../types/adrastea.types';
import { genId } from '../utils/id';

export function useCharacters(roomId: string) {
  const statsData = useQuery(api.characters.listStats, { room_id: roomId });
  const baseData = useQuery(api.characters.listBase, { room_id: roomId });

  const createMutation = useMutation(api.characters.create);
  const updateStatsMutation = useMutation(api.characters.updateStats);
  const updateBaseMutation = useMutation(api.characters.updateBase);
  const removeMutation = useMutation(api.characters.remove);

  const loading = statsData === undefined || baseData === undefined;

  const characters: Character[] = useMemo(() => {
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
        is_speech_hidden: stat.is_speech_hidden,
        sort_order: stat.sort_order ?? 0,
        on_board: stat.on_board ?? false,
        board_x: stat.board_x ?? 0,
        board_y: stat.board_y ?? 0,
        board_height: stat.board_height ?? 10,
        board_scene_ids: stat.board_scene_ids ?? [],
        board_visible: stat.board_visible ?? true,
        created_at: stat.created_at,
        updated_at: stat.updated_at,
        // From base table
        images: base?.images ?? [],
        memo: base?.memo ?? '',
        secret_memo: base?.secret_memo ?? '',
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
  }, [statsData, baseData, roomId]);

  const addCharacter = useCallback(
    async (data: Partial<Omit<Character, 'id' | 'room_id' | 'created_at' | 'updated_at'>>): Promise<Character> => {
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
        on_board: data.on_board ?? false,
        board_x: data.board_x ?? 0,
        board_y: data.board_y ?? 0,
        board_height: data.board_height ?? 10,
        board_scene_ids: data.board_scene_ids ?? [],
        board_visible: data.board_visible ?? true,
        created_at: now,
        updated_at: now,
      };
      await createMutation(newChar);
      return newChar;
    },
    [roomId, characters.length, createMutation]
  );

  const updateCharacter = useCallback(
    async (charId: string, updates: Partial<Character>): Promise<void> => {
      // Fields that belong in characters_stats
      const statsFields = [
        'name', 'color', 'active_image_index',
        'statuses', 'parameters',
        'is_hidden_on_board', 'is_speech_hidden',
        'sort_order',
        'on_board', 'board_x', 'board_y', 'board_height', 'board_scene_ids', 'board_visible'
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
        await updateStatsMutation(statsUpdates as any);
      }

      if (Object.keys(baseUpdates).length > 1) {
        await updateBaseMutation(baseUpdates as any);
      }
    },
    [updateStatsMutation, updateBaseMutation]
  );

  const removeCharacter = useCallback(
    async (charId: string): Promise<void> => {
      await removeMutation({ id: charId });
    },
    [removeMutation]
  );

  const reorderCharacters = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      const storageKey = `adrastea-char-order-${roomId}`;
      localStorage.setItem(storageKey, JSON.stringify(orderedIds));
    },
    [roomId]
  );

  return { characters, loading, addCharacter, updateCharacter, removeCharacter, reorderCharacters };
}
