import { useState, useEffect, useCallback } from 'react';
import type { BgmTrack } from '../types/adrastea.types';

const genId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');

export function useBgms(roomId: string, initialBgms?: BgmTrack[]) {
  const [bgms, setBgms] = useState<BgmTrack[]>(initialBgms ?? []);
  const [loading, setLoading] = useState(!initialBgms);

  useEffect(() => {
    if (initialBgms) {
      setBgms(initialBgms);
      setLoading(false);
    }
  }, [initialBgms]);

  const addBgm = useCallback(
    (data: Partial<Omit<BgmTrack, 'id'>>) => {
      if (!roomId) throw new Error('roomId required');
      const now = Date.now();
      const newId = (data as { id?: string }).id ?? genId();
      const newBgm: BgmTrack = {
        id: newId,
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
        created_at: now,
        updated_at: now,
      };
      setBgms((prev) => [...prev, newBgm]);
      return newId;
    },
    [roomId, bgms.length]
  );

  const updateBgm = useCallback(
    (id: string, updates: Partial<BgmTrack>) => {
      if (!roomId) return;
      setBgms((prev) => {
        const updated = prev.map((b) =>
          b.id === id ? { ...b, ...updates, updated_at: Date.now() } : b
        );
        // scene_ids が空になったトラックは自動削除
        const target = updated.find((b) => b.id === id);
        if (target && target.scene_ids.length === 0) {
          return updated.filter((b) => b.id !== id);
        }
        return updated;
      });
    },
    [roomId]
  );

  const removeBgm = useCallback(
    (id: string) => {
      if (!roomId) return;
      setBgms((prev) => prev.filter((b) => b.id !== id));
    },
    [roomId]
  );

  const reorderBgms = useCallback(
    (orderedIds: string[]) => {
      if (!roomId) return;
      setBgms((prev) => {
        const now = Date.now();
        const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
        return prev.map((b) => {
          const newSort = orderMap.get(b.id);
          return newSort !== undefined
            ? { ...b, sort_order: newSort, updated_at: now }
            : b;
        });
      });
    },
    [roomId]
  );

  const _setAll = useCallback((items: BgmTrack[]) => {
    setBgms(items);
    setLoading(false);
  }, []);

  return { bgms, loading, addBgm, updateBgm, removeBgm, reorderBgms, _setAll };
}
