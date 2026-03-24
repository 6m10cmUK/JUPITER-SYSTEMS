import { useCallback } from 'react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { handleClipboardImport } from '../../../hooks/usePasteHandler';
import { LayerPanel } from '../LayerPanel';

export function LayerDockPanel() {
  const ctx = useAdrasteaContext();

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      await handleClipboardImport(
        text,
        (data) => ctx.addCharacter({ ...data, owner_id: ctx.user?.uid ?? '' }),
        ctx.showToast,
        async (data) => {
          const targetSort = data.sort_order ?? ctx.activeObjects.length;
          const shifts = ctx.activeObjects
            .filter(o => o.sort_order >= targetSort)
            .map(o => ({ id: o.id, sort: o.sort_order + 1 }));
          if (shifts.length > 0) await ctx.batchUpdateSort(shifts);
          return ctx.addObject({ ...data, sort_order: targetSort, scene_ids: ctx.activeScene ? [ctx.activeScene.id] : [] });
        },
        undefined,
        undefined,
        ctx.updateObject,
        ctx.activeObjects,
        ctx.activeScene?.id ?? null,
      );
    } catch {
      ctx.showToast('クリップボードの読み取りに失敗しました', 'error');
    }
  }, [ctx]);

  return (
    <LayerPanel onPaste={handlePaste} />
  );
}
