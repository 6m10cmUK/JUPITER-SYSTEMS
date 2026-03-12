import { useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { BgmTrack } from '../types/adrastea.types';

const genId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');

export function useBgms(roomId: string) {
  const bgmsData = useQuery(api.bgms.list, { room_id: roomId });
  const createMutation = useMutation(api.bgms.create);
  const updateMutation = useMutation(api.bgms.update).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.bgms.list, { room_id: roomId });
      if (current !== undefined) {
        localStore.setQuery(
          api.bgms.list,
          { room_id: roomId },
          current.map((b) => b.id === args.id ? { ...b, ...args } : b),
        );
      }
    }
  );
  const removeMutation = useMutation(api.bgms.remove);

  const loading = bgmsData === undefined;
  const bgms: BgmTrack[] = useMemo(() => {
    const merged = (bgmsData ?? []).map((b) => ({
      id: b.id, name: b.name,
      bgm_type: b.bgm_type as BgmTrack['bgm_type'],
      bgm_source: (b as any).bgm_source ?? null,
      bgm_volume: b.bgm_volume, bgm_loop: b.bgm_loop,
      scene_ids: b.scene_ids, is_playing: b.is_playing, is_paused: b.is_paused,
      auto_play_scene_ids: (b as any).auto_play_scene_ids ?? [],
      fade_in: (b as any).fade_in ?? true, fade_out: (b as any).fade_out ?? true,
      fade_duration: (b as any).fade_duration ?? 500,
      sort_order: b.sort_order ?? 0, created_at: b._creationTime, updated_at: b._creationTime,
    } as BgmTrack));

    // Load sort order from localStorage
    const storageKey = `adrastea-bgm-order-${roomId}`;
    const savedOrder = localStorage.getItem(storageKey);
    if (savedOrder) {
      try {
        const orderedIds = JSON.parse(savedOrder) as string[];
        const idToBgm = new Map(merged.map(b => [b.id, b]));
        const sorted: BgmTrack[] = [];
        const seenIds = new Set<string>();

        // Add BGMs in saved order
        for (const id of orderedIds) {
          const bgm = idToBgm.get(id);
          if (bgm) {
            sorted.push(bgm);
            seenIds.add(id);
          }
        }

        // Add remaining BGMs not in saved order at the end
        for (const bgm of merged) {
          if (!seenIds.has(bgm.id)) {
            sorted.push(bgm);
          }
        }

        return sorted;
      } catch {
        // If JSON parsing fails, return unsorted
        return merged;
      }
    }

    return merged;
  }, [bgmsData, roomId]);

  const addBgm = useCallback(
    async (data: Partial<Omit<BgmTrack, 'id'>>): Promise<string> => {
      const id = (data as { id?: string }).id ?? genId();
      const now = Date.now();
      await createMutation({
        id, room_id: roomId,
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
        created_at: now, updated_at: now,
      });
      return id;
    },
    [roomId, bgms.length, createMutation]
  );

  const updateBgm = useCallback(
    async (id: string, updates: Partial<BgmTrack>): Promise<void> => {
      const { id: _id, created_at: _ca, ...rest } = updates as BgmTrack;
      await updateMutation({ id, ...rest } as any);
      const merged = { ...(bgms.find((b) => b.id === id) ?? {}), ...updates };
      if ((merged as BgmTrack).scene_ids?.length === 0) {
        await removeMutation({ id });
      }
    },
    [bgms, updateMutation, removeMutation]
  );

  const removeBgm = useCallback(
    async (id: string): Promise<void> => {
      await removeMutation({ id });
    },
    [removeMutation]
  );

  const reorderBgms = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      const storageKey = `adrastea-bgm-order-${roomId}`;
      localStorage.setItem(storageKey, JSON.stringify(orderedIds));
    },
    [roomId]
  );

  return { bgms, loading, addBgm, updateBgm, removeBgm, reorderBgms };
}
