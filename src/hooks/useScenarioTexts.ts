import { useState, useEffect, useCallback, useRef } from 'react';
import type { ScenarioText } from '../types/adrastea.types';

const genId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');

export function useScenarioTexts(
  roomId: string,
  _enabled = true,
  initialScenarioTexts?: ScenarioText[]
) {
  const [scenarioTexts, setScenarioTexts] = useState<ScenarioText[]>(
    initialScenarioTexts ?? []
  );
  const scenarioTextsRef = useRef(scenarioTexts);
  scenarioTextsRef.current = scenarioTexts;
  const [loading, setLoading] = useState(!initialScenarioTexts);

  useEffect(() => {
    if (initialScenarioTexts) {
      setScenarioTexts(initialScenarioTexts);
      setLoading(false);
    }
  }, [initialScenarioTexts]);

  const addScenarioText = useCallback(
    (data: Partial<Omit<ScenarioText, 'id' | 'room_id'>>) => {
      const now = Date.now();
      const newId = (data as { id?: string }).id ?? genId();
      const newText: ScenarioText = {
        id: newId,
        room_id: roomId,
        title: data.title ?? '新規テキスト',
        content: data.content ?? '',
        visible: data.visible ?? false,
        sort_order: data.sort_order ?? scenarioTextsRef.current.length,
        created_at: now,
        updated_at: now,
      };
      setScenarioTexts((prev) => [...prev, newText]);
      return newText;
    },
    [roomId]
  );

  const updateScenarioText = useCallback(
    (textId: string, updates: Partial<ScenarioText>) => {
      setScenarioTexts((prev) =>
        prev.map((t) =>
          t.id === textId ? { ...t, ...updates, updated_at: Date.now() } : t
        )
      );
    },
    []
  );

  const removeScenarioText = useCallback((textId: string) => {
    setScenarioTexts((prev) => prev.filter((t) => t.id !== textId));
  }, []);

  const reorderScenarioTexts = useCallback(
    (orderedIds: string[]) => {
      if (!roomId) return;
      setScenarioTexts((prev) => {
        const now = Date.now();
        const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
        return prev.map((t) => {
          const newSort = orderMap.get(t.id);
          return newSort !== undefined
            ? { ...t, sort_order: newSort, updated_at: now }
            : t;
        });
      });
    },
    [roomId]
  );

  const _setAll = useCallback((items: ScenarioText[]) => {
    setScenarioTexts(items);
    setLoading(false);
  }, []);

  return {
    scenarioTexts,
    loading,
    addScenarioText,
    updateScenarioText,
    removeScenarioText,
    reorderScenarioTexts,
    _setAll,
  };
}
