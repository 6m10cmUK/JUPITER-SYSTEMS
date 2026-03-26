import { useMemo, useCallback } from 'react';

export function useLocalStorageOrder<T extends { id: string }>(
  items: T[],
  storageKey: string
): {
  orderedItems: T[];
  saveOrder: (orderedIds: string[]) => void;
  removeFromOrder: (id: string) => void;
} {
  const orderedItems = useMemo(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return items;
    try {
      const orderedIds = JSON.parse(saved) as string[];
      const idToItem = new Map(items.map(i => [i.id, i]));
      const sorted: T[] = [];
      const seen = new Set<string>();

      for (const id of orderedIds) {
        const item = idToItem.get(id);
        if (item) {
          sorted.push(item);
          seen.add(id);
        }
      }

      for (const item of items) {
        if (!seen.has(item.id)) {
          sorted.push(item);
        }
      }

      return sorted;
    } catch {
      return items;
    }
  }, [items, storageKey]);

  const saveOrder = useCallback((orderedIds: string[]) => {
    localStorage.setItem(storageKey, JSON.stringify(orderedIds));
  }, [storageKey]);

  const removeFromOrder = useCallback((id: string) => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const ids = JSON.parse(saved) as string[];
      localStorage.setItem(storageKey, JSON.stringify(ids.filter(i => i !== id)));
    } catch {
      // 無視
    }
  }, [storageKey]);

  return { orderedItems, saveOrder, removeFromOrder };
}
