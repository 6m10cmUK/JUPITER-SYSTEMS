import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { CutinPanel } from '../CutinPanel';

export function CutinDockPanel() {
  const ctx = useAdrasteaContext();
  return (
    <CutinPanel
      cutins={ctx.cutins}
      onTrigger={ctx.triggerCutin}
      onAdd={() => ctx.setEditingCutin(null)}
      onEdit={(cutin) => ctx.setEditingCutin(cutin)}
      onRemove={ctx.removeCutin}
      onClose={() => {}}
    />
  );
}
