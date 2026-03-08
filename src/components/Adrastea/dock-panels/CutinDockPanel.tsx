import { useEffect } from 'react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { CutinPanel } from '../CutinPanel';

export function CutinDockPanel() {
  const ctx = useAdrasteaContext();

  useEffect(() => {
    ctx.registerPanel('cutin');
    return () => ctx.unregisterPanel('cutin');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <CutinPanel
      cutins={ctx.cutins}
      onTrigger={ctx.triggerCutin}
      onAdd={() => { ctx.clearAllEditing(); ctx.setEditingCutin(null); }}
      onEdit={(cutin) => { ctx.clearAllEditing(); ctx.setEditingCutin(cutin); }}
      onRemove={ctx.removeCutin}
      onReorderCutins={ctx.reorderCutins}
      onClose={() => {}}
    />
  );
}
