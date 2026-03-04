import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { ScenarioTextPanel } from '../ScenarioTextPanel';

export function ScenarioTextDockPanel() {
  const ctx = useAdrasteaContext();
  return (
    <ScenarioTextPanel
      texts={ctx.scenarioTexts}
      onAdd={() => ctx.addScenarioText({ title: '新規テキスト', content: '' })}
      onUpdate={ctx.updateScenarioText}
      onRemove={ctx.removeScenarioText}
      onClose={() => {}}
    />
  );
}
