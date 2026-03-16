import { useState, useCallback } from 'react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { handleClipboardImport } from '../../../hooks/usePasteHandler';
import { DropdownMenu } from '../ui';
import { LayerPanel } from '../LayerPanel';

export function LayerDockPanel() {
  const ctx = useAdrasteaContext();
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      await handleClipboardImport(text, ctx.addCharacter, ctx.showToast);
    } catch {
      ctx.showToast('クリップボードの読み取りに失敗しました', 'error');
    }
  }, [ctx.addCharacter, ctx.showToast]);

  return (
    <>
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenuPos({ x: e.clientX, y: e.clientY });
        }}
        style={{ height: '100%' }}
      >
        <LayerPanel />
      </div>
      <DropdownMenu
        mode="context"
        open={contextMenuPos !== null}
        onOpenChange={(open) => { if (!open) setContextMenuPos(null); }}
        position={contextMenuPos ?? { x: 0, y: 0 }}
        items={[
          {
            label: '貼り付け',
            onClick: () => {
              handlePaste();
              setContextMenuPos(null);
            },
          },
        ]}
      />
    </>
  );
}
