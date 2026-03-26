import { useCallback, useMemo, useRef, useState } from 'react';
import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import type { BgmTrack } from '../types/adrastea.types';
import type { BgmsInject } from '../types/adrastea-persistence';
import { genId } from '../utils/id';

export function useBgms(roomId: string, options?: { inject?: BgmsInject }) {
  const { inject } = options ?? {};
  const injectRef = useRef(inject);
  injectRef.current = inject;

  const bgmsQuery = useSupabaseQuery<BgmTrack>({
    table: 'bgms',
    columns: 'id,room_id,name,bgm_type,bgm_source,bgm_asset_id,bgm_volume,bgm_loop,scene_ids,is_playing,is_paused,auto_play_scene_ids,fade_in,fade_in_duration,fade_out,fade_duration,sort_order,created_at,updated_at',
    roomId,
    filter: (q) => q.eq('room_id', roomId),
    enabled: !inject,
  });
  const bgmsData = bgmsQuery.data;

  const bgmsMutation = useSupabaseMutation<BgmTrack>('bgms', bgmsQuery.setData);

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

  const loading = inject ? false : bgmsQuery.loading;
  const bgms: BgmTrack[] = useMemo(() => {
    if (inject) return inject.data;

    const merged = (bgmsData ?? []).map((b) => {
      const override = playbackOverrides.get(b.id);
      return {
        id: b.id,
        name: b.name,
        bgm_type: b.bgm_type as BgmTrack['bgm_type'],
        bgm_source: b.bgm_source ?? null,
        bgm_volume: b.bgm_volume,
        bgm_loop: b.bgm_loop,
        scene_ids: b.scene_ids,
        is_playing: override ? override.is_playing : b.is_playing,
        is_paused: override ? override.is_paused : b.is_paused,
        auto_play_scene_ids: b.auto_play_scene_ids ?? [],
        fade_in: b.fade_in ?? true,
        fade_in_duration: b.fade_in_duration ?? 500,
        sort_order: b.sort_order ?? 0,
        created_at: b.created_at,
        updated_at: b.updated_at,
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
      } catch (e) {
        console.warn('[useBgms] Failed to parse from localStorage:', e instanceof Error ? e.message : e);
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
    } catch (e) {
      console.warn('[useBgms] Failed to parse from localStorage:', e instanceof Error ? e.message : e);
    }
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
        try {
          await bgmsMutation.insert(bgmData as BgmTrack);
        } catch (error) {
          console.error('[useBgms] addBgm failed:', error);
          throw error;
        }
      }
      return id;
    },
    [roomId, bgms.length, bgmsMutation]
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

      try {
        const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = updates as BgmTrack;
        await bgmsMutation.update(id, { ...rest, updated_at: Date.now() } as Partial<BgmTrack>);
        const merged = { ...(bgms.find((b) => b.id === id) ?? {}), ...updates };
        if ((merged as BgmTrack).scene_ids?.length === 0) {
          await bgmsMutation.remove(id);
          removeFromLocalStorageOrder(id);
        }
      } catch (error) {
        console.error('[useBgms] updateBgm failed:', error);
      }
    },
    [bgms, removeFromLocalStorageOrder, setPlaybackOverride, bgmsMutation]
  );

  const removeBgm = useCallback(
    async (id: string): Promise<void> => {
      const inj = injectRef.current;
      if (inj) {
        await inj.remove(id);
      } else {
        try {
          await bgmsMutation.remove(id);
          removeFromLocalStorageOrder(id);
        } catch (error) {
          console.error('[useBgms] removeBgm failed:', error);
        }
      }
    },
    [removeFromLocalStorageOrder, bgmsMutation]
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
