import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { ScenePanel } from '../ScenePanel';

export function SceneDockPanel() {
  const ctx = useAdrasteaContext();

  const handleAddScene = async () => {
    const activeSceneId = ctx.room?.active_scene_id ?? null;
    const activeScene = activeSceneId
      ? ctx.scenes.find(s => s.id === activeSceneId)
      : null;

    // 現在のシーンの次の sort_order を計算
    const currentIdx = activeScene
      ? ctx.scenes.findIndex(s => s.id === activeScene.id)
      : ctx.scenes.length - 1;
    const nextSortOrder = activeScene
      ? activeScene.sort_order + 0.5
      : ctx.scenes.length;

    // 現在のシーンのレイヤーを複製して新規シーン作成
    const newSceneId = await ctx.addScene(
      {
        name: `新しいシーン`,
        background_url: activeScene?.background_url ?? null,
        foreground_url: activeScene?.foreground_url ?? null,
        sort_order: nextSortOrder,
      },
      activeSceneId ?? undefined,
    );

    // sort_order を整数に振り直す
    const sorted = [...ctx.scenes, { id: newSceneId, sort_order: nextSortOrder } as any]
      .sort((a, b) => a.sort_order - b.sort_order);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].sort_order !== i) {
        ctx.updateScene(sorted[i].id, { sort_order: i });
      }
    }

    // 新しいシーンをアクティブにする
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
      onEditScene={(scene) => { ctx.clearAllEditing(); ctx.setEditingScene(scene); }}
      onRemoveScene={ctx.removeScene}
      onReorderScenes={handleReorderScenes}
    />
  );
}
