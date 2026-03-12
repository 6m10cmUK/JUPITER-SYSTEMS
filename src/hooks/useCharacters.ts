import { useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Character } from '../types/adrastea.types';

const genId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');

export function useCharacters(roomId: string) {
  const charsData = useQuery(api.characters.list, { room_id: roomId });
  const createMutation = useMutation(api.characters.create);
  const updateMutation = useMutation(api.characters.update);
  const removeMutation = useMutation(api.characters.remove);
  const reorderMutation = useMutation(api.characters.reorder);

  const loading = charsData === undefined;
  const characters: Character[] = useMemo(() => (charsData ?? []).map((c) => ({
    id: c.id, room_id: c.room_id, owner_id: (c as any).owner_id ?? '',
    name: c.name, images: c.images, active_image_index: c.active_image_index,
    color: c.color, sheet_url: (c as any).sheet_url ?? null,
    initiative: (c as any).initiative, size: (c as any).size,
    statuses: (c as any).statuses ?? [], parameters: (c as any).parameters ?? [],
    memo: (c as any).memo ?? '', secret_memo: (c as any).secret_memo ?? '',
    chat_palette: (c as any).chat_palette ?? '',
    is_status_private: (c as any).is_status_private ?? false,
    is_hidden_on_board: (c as any).is_hidden_on_board ?? false,
    is_speech_hidden: (c as any).is_speech_hidden ?? false,
    sort_order: c.sort_order, created_at: c._creationTime, updated_at: c._creationTime,
  } as Character)), [charsData]);

  const addCharacter = useCallback(
    async (data: Partial<Omit<Character, 'id' | 'room_id' | 'created_at' | 'updated_at'>>): Promise<Character> => {
      const now = Date.now();
      const id = (data as { id?: string }).id ?? genId();
      const newChar: Character = {
        id, room_id: roomId, owner_id: data.owner_id ?? '',
        name: data.name ?? '新規キャラクター',
        images: data.images ?? [], active_image_index: data.active_image_index ?? 0,
        color: data.color ?? '#89b4fa', sheet_url: data.sheet_url ?? null,
        initiative: data.initiative ?? 0, size: data.size ?? 1,
        statuses: data.statuses ?? [], parameters: data.parameters ?? [],
        memo: data.memo ?? '', secret_memo: data.secret_memo ?? '',
        chat_palette: data.chat_palette ?? '',
        is_status_private: data.is_status_private ?? false,
        is_hidden_on_board: data.is_hidden_on_board ?? false,
        is_speech_hidden: data.is_speech_hidden ?? false,
        sort_order: data.sort_order ?? characters.length,
        created_at: now, updated_at: now,
      };
      await createMutation(newChar);
      return newChar;
    },
    [roomId, characters.length, createMutation]
  );

  const updateCharacter = useCallback(
    async (charId: string, updates: Partial<Character>): Promise<void> => {
      const { id: _id, room_id: _rid, owner_id: _oid, created_at: _ca, ...rest } = updates as Character;
      await updateMutation({ id: charId, ...rest } as any);
    },
    [updateMutation]
  );

  const removeCharacter = useCallback(
    async (charId: string): Promise<void> => {
      await removeMutation({ id: charId });
    },
    [removeMutation]
  );

  const reorderCharacters = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      const updates = orderedIds.map((id, i) => ({ id, sort_order: i }));
      await reorderMutation({ updates });
    },
    [reorderMutation]
  );

  return { characters, loading, addCharacter, updateCharacter, removeCharacter, reorderCharacters };
}
