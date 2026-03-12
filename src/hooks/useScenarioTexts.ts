import { useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { ScenarioText } from '../types/adrastea.types';

const genId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');

export function useScenarioTexts(roomId: string, _enabled = true) {
  const textsData = useQuery(api.scenario_texts.list, { room_id: roomId });
  const createMutation = useMutation(api.scenario_texts.create);
  const updateMutation = useMutation(api.scenario_texts.update);
  const removeMutation = useMutation(api.scenario_texts.remove);
  const reorderMutation = useMutation(api.scenario_texts.reorder);

  const loading = textsData === undefined;
  const scenarioTexts: ScenarioText[] = useMemo(() => (textsData ?? []).map((t) => ({
    id: t._id, room_id: t.room_id, title: t.title, content: t.content,
    visible: t.visible, sort_order: t.sort_order,
    created_at: t._creationTime, updated_at: t._creationTime,
  } as ScenarioText)), [textsData]);

  const addScenarioText = useCallback(
    async (data: Partial<Omit<ScenarioText, 'id' | 'room_id'>>): Promise<ScenarioText> => {
      const id = (data as { id?: string }).id ?? genId();
      const now = Date.now();
      const newText: ScenarioText = {
        id, room_id: roomId,
        title: data.title ?? '新規テキスト',
        content: data.content ?? '',
        visible: data.visible ?? false,
        sort_order: data.sort_order ?? scenarioTexts.length,
        created_at: now, updated_at: now,
      };
      await createMutation(newText);
      return newText;
    },
    [roomId, scenarioTexts.length, createMutation]
  );

  const updateScenarioText = useCallback(
    async (textId: string, updates: Partial<ScenarioText>): Promise<void> => {
      const { id: _id, room_id: _rid, created_at: _ca, ...rest } = updates as ScenarioText;
      await updateMutation({ id: textId, ...rest } as any);
    },
    [updateMutation]
  );

  const removeScenarioText = useCallback(
    async (textId: string): Promise<void> => {
      await removeMutation({ id: textId });
    },
    [removeMutation]
  );

  const reorderScenarioTexts = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      const updates = orderedIds.map((id, i) => ({ id, sort_order: i }));
      await reorderMutation({ updates });
    },
    [reorderMutation]
  );

  return { scenarioTexts, loading, addScenarioText, updateScenarioText, removeScenarioText, reorderScenarioTexts };
}
