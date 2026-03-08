import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { ScenePanel } from '../ScenePanel';

export function SceneDockPanel() {
  const ctx = useAdrasteaContext();

  const rebalanceSortOrder = (newSceneId: string, nextSortOrder: number) => {
    const sorted = [...ctx.scenes, { id: newSceneId, sort_order: nextSortOrder } as any]
      .sort((a, b) => a.sort_order - b.sort_order);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].sort_order !== i) {
        ctx.updateScene(sorted[i].id, { sort_order: i });
      }
    }
  };

  const getInsertSortOrder = () => {
    const activeSceneId = ctx.room?.active_scene_id ?? null;
    const activeScene = activeSceneId
      ? ctx.scenes.find(s => s.id === activeSceneId)
      : null;
    return activeScene ? activeScene.sort_order + 0.5 : ctx.scenes.length;
  };

  const handleAddScene = async () => {
    const nextSortOrder = getInsertSortOrder();
    const newSceneId = await ctx.addScene({
      name: '新しいシーン',
      sort_order: nextSortOrder,
    });
    rebalanceSortOrder(newSceneId, nextSortOrder);
    await ctx.activateScene(newSceneId);
  };

  const handleDuplicateScene = async () => {
    const activeSceneId = ctx.room?.active_scene_id ?? null;
    if (!activeSceneId) return;
    const activeScene = ctx.scenes.find(s => s.id === activeSceneId);
    const nextSortOrder = getInsertSortOrder();
    const newSceneId = await ctx.addScene(
      {
        name: `${activeScene?.name ?? 'シーン'} (複製)`,
        background_url: activeScene?.background_url ?? null,
        foreground_url: activeScene?.foreground_url ?? null,
        sort_order: nextSortOrder,
      },
      activeSceneId,
    );
    rebalanceSortOrder(newSceneId, nextSortOrder);
    await ctx.activateScene(newSceneId);
  };

  const handleReorderScenes = (orderedIds: string[]) => {
    for (let i = 0; i < orderedIds.length; i++) {
      const scene = ctx.scenes.find(s => s.id === orderedIds[i]);
      if (scene && scene.sort_order !== i) {
        ctx.updateScene(orderedIds[i], { sort_order: i });
      }
    }
  };

  return (
    <ScenePanel
      scenes={ctx.scenes}
      activeSceneId={ctx.room?.active_scene_id ?? null}
      onActivateScene={ctx.activateScene}
      onAddScene={handleAddScene}
      onDuplicateScene={handleDuplicateScene}
      onEditScene={(scene) => { ctx.clearAllEditing(); ctx.setEditingScene(scene); }}
      onUpdateSceneName={(id, name) => ctx.updateScene(id, { name })}
      onRemoveScene={async (sceneId) => {
        const activeSceneId = ctx.room?.active_scene_id ?? null;
        if (activeSceneId === sceneId) {
          const sorted = [...ctx.scenes].sort((a, b) => a.sort_order - b.sort_order);
          const idx = sorted.findIndex(s => s.id === sceneId);
          const next = sorted[idx + 1] ?? sorted[idx - 1];
          if (next) await ctx.activateScene(next.id);
          else await ctx.activateScene(null);
        }
        await ctx.removeScene(sceneId);
      }}
      onReorderScenes={handleReorderScenes}
    />
  );
}
