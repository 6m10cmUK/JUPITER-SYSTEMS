import { useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Cutin } from '../types/adrastea.types';
import type { CutinsInject } from '../types/adrastea-persistence';
import { genId } from '../utils/id';

export type OnRoomUpdate = (updates: Record<string, unknown>) => void;

export function useCutins(
  roomId: string,
  _enabled = true,
  onRoomUpdate?: OnRoomUpdate,
  options?: { inject?: CutinsInject }
) {
  const { inject } = options ?? {};
  const injectRef = useRef(inject);
  injectRef.current = inject;

  const cutinsData = useQuery(
    api.cutins.list,
    inject ? 'skip' : { room_id: roomId }
  );
  const createMutation = useMutation(api.cutins.create);
  const updateMutation = useMutation(api.cutins.update).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.cutins.list, { room_id: roomId });
      if (current !== undefined) {
        localStore.setQuery(
          api.cutins.list,
          { room_id: roomId },
          current.map((c) => c.id === args.id ? { ...c, ...args } : c),
        );
      }
    }
  );
  const removeMutation = useMutation(api.cutins.remove);
  const reorderMutation = useMutation(api.cutins.reorder);

  const loading = inject ? false : cutinsData === undefined;
  const cutins: Cutin[] = useMemo(() => {
    if (inject) return inject.data;
    return (cutinsData ?? []).map((c) => ({
      id: c.id, room_id: c.room_id, name: c.name,
      image_url: (c as any).image_url ?? null, text: c.text,
      animation: c.animation as Cutin['animation'],
      duration: c.duration, text_color: c.text_color,
      background_color: c.background_color,
      sort_order: c.sort_order, created_at: c._creationTime, updated_at: c._creationTime,
    } as Cutin));
  }, [inject, cutinsData]);

  const addCutin = useCallback(
    async (data: Partial<Omit<Cutin, 'id' | 'room_id'>>): Promise<Cutin> => {
      const inj = injectRef.current;
      const id = (data as { id?: string }).id ?? genId();
      const now = Date.now();
      const newCutin: Cutin = {
        id, room_id: roomId,
        name: data.name ?? '新規カットイン',
        image_url: data.image_url ?? null, text: data.text ?? '',
        animation: data.animation ?? 'slide',
        duration: data.duration ?? 3000,
        text_color: data.text_color ?? '#ffffff',
        background_color: data.background_color ?? 'rgba(0,0,0,0.8)',
        sort_order: data.sort_order ?? cutins.length,
        created_at: now, updated_at: now,
      };
      if (inj) {
        await inj.create(newCutin);
      } else {
        await createMutation(newCutin);
      }
      return newCutin;
    },
    [roomId, cutins.length, createMutation]
  );

  const updateCutin = useCallback(
    async (cutinId: string, updates: Partial<Cutin>): Promise<void> => {
      const inj = injectRef.current;
      if (inj) {
        await inj.update(cutinId, updates);
      } else {
        const { id: _id, room_id: _rid, created_at: _ca, ...rest } = updates as Cutin;
        await updateMutation({ id: cutinId, ...rest } as any);
      }
    },
    [updateMutation]
  );

  const removeCutin = useCallback(
    async (cutinId: string): Promise<void> => {
      const inj = injectRef.current;
      if (inj) {
        await inj.remove(cutinId);
      } else {
        await removeMutation({ id: cutinId });
      }
    },
    [removeMutation]
  );

  const triggerCutin = useCallback(
    (cutinId: string) => {
      const inj = injectRef.current;
      if (inj) {
        inj.triggerCutin(cutinId);
      } else {
        onRoomUpdate?.({ active_cutin: { cutin_id: cutinId, triggered_at: Date.now() } });
      }
    },
    [onRoomUpdate]
  );

  const clearCutin = useCallback(() => {
    const inj = injectRef.current;
    if (inj) {
      inj.clearCutin();
    } else {
      onRoomUpdate?.({ active_cutin: null });
    }
  }, [onRoomUpdate]);

  const reorderCutins = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      const inj = injectRef.current;
      const updates = orderedIds.map((id, i) => ({ id, sort_order: i }));
      if (inj) {
        await inj.reorder(updates);
      } else {
        await reorderMutation({ updates });
      }
    },
    [reorderMutation]
  );

  return { cutins, loading, addCutin, updateCutin, removeCutin, reorderCutins, triggerCutin, clearCutin };
}
