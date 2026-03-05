import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { CutinPanel } from '../CutinPanel';

export function CutinDockPanel() {
  const ctx = useAdrasteaContext();
  return (
    <CutinPanel
      cutins={ctx.cutins}
      onTrigger={ctx.triggerCutin}
      onAdd={() => { ctx.clearAllEditing(); ctx.setEditingCutin(null); }}
      onEdit={(cutin) => { ctx.clearAllEditing(); ctx.setEditingCutin(cutin); }}
      onRemove={ctx.removeCutin}
      onClose={() => {}}
    />
  );
}
