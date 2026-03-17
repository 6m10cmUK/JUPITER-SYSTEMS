import { useCallback } from 'react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { handleClipboardImport } from '../../../hooks/usePasteHandler';
import { LayerPanel } from '../LayerPanel';

export function LayerDockPanel() {
  const ctx = useAdrasteaContext();

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      await handleClipboardImport(text, ctx.addCharacter, ctx.showToast);
    } catch {
      ctx.showToast('クリップボードの読み取りに失敗しました', 'error');
    }
  }, [ctx.addCharacter, ctx.showToast]);

  return (
    <LayerPanel onPaste={handlePaste} />
  );
}
