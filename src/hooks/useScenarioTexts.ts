import { useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';
import type { ScenarioText } from '../types/adrastea.types';
import { genId } from '../utils/id';

export function useScenarioTexts(roomId: string, _enabled = true) {
  const textsQuery = useSupabaseQuery<ScenarioText>({
    table: 'scenario_texts',
    columns: 'id,room_id,title,content,visible,speaker_character_id,speaker_name,channel_id,sort_order,created_at,updated_at',
    roomId,
    filter: (q) => q.eq('room_id', roomId),
  });
  const textsData = textsQuery.data;

  const loading = textsQuery.loading;
  const scenarioTexts: ScenarioText[] = useMemo(() => (textsData ?? []).map((t) => ({
    id: t.id, room_id: t.room_id, title: t.title, content: t.content,
    visible: t.visible, sort_order: t.sort_order,
    speaker_character_id: t.speaker_character_id ?? null,
    speaker_name: t.speaker_name ?? null,
    channel_id: t.channel_id ?? null,
    created_at: t.created_at, updated_at: t.updated_at,
  } as ScenarioText)).sort((a, b) => a.sort_order - b.sort_order), [textsData]);

  const addScenarioText = useCallback(
    async (data: Partial<Omit<ScenarioText, 'id' | 'room_id'>>): Promise<ScenarioText> => {
      const id = (data as { id?: string }).id ?? genId();
      const now = Date.now();
      const newText: ScenarioText = {
        id, room_id: roomId,
        title: data.title ?? '新規テキスト',
        content: data.content ?? '',
        visible: data.visible ?? false,
        speaker_character_id: data.speaker_character_id ?? null,
        speaker_name: data.speaker_name ?? null,
        channel_id: data.channel_id ?? null,
        sort_order: data.sort_order ?? scenarioTexts.length,
        created_at: now, updated_at: now,
      };
      await supabase.from('scenario_texts').insert([newText]);
      return newText;
    },
    [roomId, scenarioTexts.length]
  );

  const updateScenarioText = useCallback(
    async (textId: string, updates: Partial<ScenarioText>): Promise<void> => {
      const { id: _id, room_id: _rid, created_at: _ca, updated_at: _ua, ...rest } = updates as ScenarioText;
      await supabase.from('scenario_texts').update(rest).eq('id', textId);
    },
    []
  );

  const removeScenarioText = useCallback(
    async (textId: string): Promise<void> => {
      await supabase.from('scenario_texts').delete().eq('id', textId);
    },
    []
  );

  const reorderScenarioTexts = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      const updates = orderedIds.map((id, i) => ({ id, sort_order: i }));
      await Promise.all(updates.map(u =>
        supabase.from('scenario_texts').update({ sort_order: u.sort_order }).eq('id', u.id)
      ));
    },
    []
  );

  return { scenarioTexts, loading, addScenarioText, updateScenarioText, removeScenarioText, reorderScenarioTexts };
}
