import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { ScenePanel } from '../ScenePanel';

export function SceneDockPanel() {
  const ctx = useAdrasteaContext();
  return (
    <ScenePanel
      scenes={ctx.scenes}
      activeSceneId={ctx.room?.active_scene_id ?? null}
      onActivateScene={ctx.activateScene}
      onAddScene={() => ctx.setEditingScene(null)}
      onEditScene={(scene) => ctx.setEditingScene(scene)}
      onRemoveScene={ctx.removeScene}
      onClose={() => {}}
    />
  );
}
