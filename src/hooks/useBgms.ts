import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { BgmTrack } from '../types/adrastea.types';
import type { BgmsInject } from '../types/adrastea-persistence';
import { genId } from '../utils/id';

export function useBgms(roomId: string, options?: { inject?: BgmsInject }) {
  const { inject } = options ?? {};
  const injectRef = useRef(inject);
  injectRef.current = inject;

  const bgmsData = useQuery(api.bgms.list, inject ? 'skip' : { room_id: roomId });
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

  // is_playing / is_paused のローカルオーバーライド
  // Convex の楽観更新が振動するのを防ぐ
  const [playbackOverrides, setPlaybackOverrides] = useState<
    Map<string, { is_playing: boolean; is_paused: boolean }>
  >(new Map());
  const overrideTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const setPlaybackOverride = useCallback((id: string, state: { is_playing: boolean; is_paused: boolean }) => {
    setPlaybackOverrides(prev => new Map(prev).set(id, state));
    // 既存タイマーをクリア
    const existing = overrideTimersRef.current.get(id);
    if (existing) clearTimeout(existing);
    // 10秒後にオーバーライドを解除（Convex が確実に収束してるはず）
    const timer = setTimeout(() => {
      setPlaybackOverrides(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      overrideTimersRef.current.delete(id);
    }, 10000);
    overrideTimersRef.current.set(id, timer);
  }, []);

  const loading = inject ? false : bgmsData === undefined;
  const bgms: BgmTrack[] = useMemo(() => {
    if (inject) return inject.data;

    const merged = (bgmsData ?? []).map((b) => {
      const override = playbackOverrides.get(b.id);
      return {
        id: b.id, name: b.name,
        bgm_type: b.bgm_type as BgmTrack['bgm_type'],
        bgm_source: (b as any).bgm_source ?? null,
        bgm_volume: b.bgm_volume, bgm_loop: b.bgm_loop,
        scene_ids: b.scene_ids,
        is_playing: override ? override.is_playing : b.is_playing,
        is_paused: override ? override.is_paused : b.is_paused,
        auto_play_scene_ids: (b as any).auto_play_scene_ids ?? [],
        fade_in: (b as any).fade_in ?? true,
        fade_in_duration: (b as any).fade_in_duration ?? (b as any).fade_duration ?? 500,
        sort_order: b.sort_order ?? 0, created_at: b._creationTime, updated_at: b._creationTime,
      } as BgmTrack;
    });

    // Load sort order from localStorage
    const storageKey = `adrastea-bgm-order-${roomId}`;
    const savedOrder = localStorage.getItem(storageKey);
    if (savedOrder) {
      try {
        const orderedIds = JSON.parse(savedOrder) as string[];
        const idToBgm = new Map(merged.map(b => [b.id, b]));
        const sorted: BgmTrack[] = [];
        const seenIds = new Set<string>();

        for (const id of orderedIds) {
          const bgm = idToBgm.get(id);
          if (bgm) {
            sorted.push(bgm);
            seenIds.add(id);
          }
        }

        for (const bgm of merged) {
          if (!seenIds.has(bgm.id)) {
            sorted.push(bgm);
          }
        }

        return sorted;
      } catch {
        return merged;
      }
    }

    return merged;
  }, [inject, bgmsData, playbackOverrides, roomId]);

  const removeFromLocalStorageOrder = useCallback((id: string) => {
    const storageKey = `adrastea-bgm-order-${roomId}`;
    const savedOrder = localStorage.getItem(storageKey);
    if (!savedOrder) return;
    try {
      const orderedIds = JSON.parse(savedOrder) as string[];
      const filtered = orderedIds.filter((oid) => oid !== id);
      localStorage.setItem(storageKey, JSON.stringify(filtered));
    } catch { /* ignore */ }
  }, [roomId]);

  const addBgm = useCallback(
    async (data: Partial<Omit<BgmTrack, 'id'>>): Promise<string> => {
      const inj = injectRef.current;
      const id = (data as { id?: string }).id ?? genId();
      const now = Date.now();
      const bgmData = {
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
        fade_in_duration: data.fade_in_duration ?? 500,
        sort_order: data.sort_order ?? bgms.length,
        created_at: now, updated_at: now,
      };
      if (inj) {
        await inj.create(bgmData as BgmTrack);
      } else {
        await createMutation(bgmData);
      }
      return id;
    },
    [roomId, bgms.length, createMutation]
  );

  const updateBgm = useCallback(
    async (id: string, updates: Partial<BgmTrack>): Promise<void> => {
      // is_playing / is_paused の変更はローカルオーバーライドで即座に安定化
      if ('is_playing' in updates || 'is_paused' in updates) {
        const current = bgms.find((b) => b.id === id);
        if (current) {
          setPlaybackOverride(id, {
            is_playing: updates.is_playing ?? current.is_playing,
            is_paused: updates.is_paused ?? current.is_paused,
          });
        }
      }

      const inj = injectRef.current;
      if (inj) {
        await inj.update(id, updates);
        const merged = { ...(bgms.find((b) => b.id === id) ?? {}), ...updates };
        if ((merged as BgmTrack).scene_ids?.length === 0) {
          await inj.remove(id);
        }
        return;
      }

      const { id: _id, created_at: _ca, ...rest } = updates as BgmTrack;
      await updateMutation({ id, ...rest } as any);
      const merged = { ...(bgms.find((b) => b.id === id) ?? {}), ...updates };
      if ((merged as BgmTrack).scene_ids?.length === 0) {
        await removeMutation({ id });
        removeFromLocalStorageOrder(id);
      }
    },
    [bgms, updateMutation, removeMutation, removeFromLocalStorageOrder, setPlaybackOverride]
  );

  const removeBgm = useCallback(
    async (id: string): Promise<void> => {
      const inj = injectRef.current;
      if (inj) {
        await inj.remove(id);
      } else {
        await removeMutation({ id });
        removeFromLocalStorageOrder(id);
      }
    },
    [removeMutation, removeFromLocalStorageOrder]
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
