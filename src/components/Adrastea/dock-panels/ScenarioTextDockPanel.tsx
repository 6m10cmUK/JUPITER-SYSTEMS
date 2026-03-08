import { useEffect } from 'react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { ScenarioTextPanel } from '../ScenarioTextPanel';

export function ScenarioTextDockPanel() {
  const ctx = useAdrasteaContext();

  useEffect(() => {
    ctx.registerPanel('scenarioText');
    return () => ctx.unregisterPanel('scenarioText');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ScenarioTextPanel
      texts={ctx.scenarioTexts}
      onAdd={() => ctx.addScenarioText({ title: '新規テキスト', content: '' })}
      onUpdate={ctx.updateScenarioText}
      onRemove={ctx.removeScenarioText}
      onReorderTexts={ctx.reorderScenarioTexts}
      onClose={() => {}}
    />
  );
}
