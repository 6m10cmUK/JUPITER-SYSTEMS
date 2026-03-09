import { useState, useEffect, useCallback } from 'react';
import type { Cutin } from '../types/adrastea.types';

const genId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');

export type OnRoomUpdate = (updates: Record<string, unknown>) => void;

export function useCutins(
  roomId: string,
  enabled = true,
  initialCutins?: Cutin[],
  /** triggerCutin / clearCutin が room を更新するためのコールバック */
  onRoomUpdate?: OnRoomUpdate
) {
  const [cutins, setCutins] = useState<Cutin[]>(initialCutins ?? []);
  const [loading, setLoading] = useState(!initialCutins);

  useEffect(() => {
    if (initialCutins) {
      setCutins(initialCutins);
      setLoading(false);
    }
  }, [initialCutins]);

  const addCutin = useCallback(
    (data: Partial<Omit<Cutin, 'id' | 'room_id'>>) => {
      const now = Date.now();
      const newId = (data as { id?: string }).id ?? genId();
      const newCutin: Cutin = {
        id: newId,
        room_id: roomId,
        name: data.name ?? '新規カットイン',
        image_url: data.image_url ?? null,
        text: data.text ?? '',
        animation: data.animation ?? 'slide',
        duration: data.duration ?? 3000,
        text_color: data.text_color ?? '#ffffff',
        background_color: data.background_color ?? 'rgba(0,0,0,0.8)',
        sort_order: data.sort_order ?? cutins.length,
        created_at: now,
        updated_at: now,
      };
      setCutins((prev) => [...prev, newCutin]);
      return newId;
    },
    [roomId, cutins.length]
  );

  const updateCutin = useCallback(
    (cutinId: string, updates: Partial<Cutin>) => {
      setCutins((prev) =>
        prev.map((c) =>
          c.id === cutinId ? { ...c, ...updates, updated_at: Date.now() } : c
        )
      );
    },
    []
  );

  const removeCutin = useCallback((cutinId: string) => {
    setCutins((prev) => prev.filter((c) => c.id !== cutinId));
  }, []);

  const triggerCutin = useCallback(
    (cutinId: string) => {
      onRoomUpdate?.({
        active_cutin: { cutin_id: cutinId, triggered_at: Date.now() },
      });
    },
    [onRoomUpdate]
  );

  const clearCutin = useCallback(() => {
    onRoomUpdate?.({ active_cutin: null });
  }, [onRoomUpdate]);

  const reorderCutins = useCallback(
    (orderedIds: string[]) => {
      if (!roomId) return;
      setCutins((prev) => {
        const now = Date.now();
        const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
        return prev.map((c) => {
          const newSort = orderMap.get(c.id);
          return newSort !== undefined
            ? { ...c, sort_order: newSort, updated_at: now }
            : c;
        });
      });
    },
    [roomId]
  );

  const _setAll = useCallback((items: Cutin[]) => {
    setCutins(items);
    setLoading(false);
  }, []);

  return { cutins, loading, addCutin, updateCutin, removeCutin, reorderCutins, triggerCutin, clearCutin, _setAll };
}
