import { useState, useCallback } from 'react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { ScenePanel } from '../ScenePanel';

export function SceneDockPanel() {
  const ctx = useAdrasteaContext();
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>([]);

  const rebalanceSortOrder = (newSceneId: string, nextSortOrder: number) => {
    const sorted = [...ctx.scenes, { id: newSceneId, sort_order: nextSortOrder } as any]
      .sort((a, b) => a.sort_order - b.sort_order);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].sort_order !== i) {
        ctx.updateScene(sorted[i].id, { sort_order: i });
      }
    }
  };

  const getInsertSortOrder = (afterSceneId?: string) => {
    const refId = afterSceneId ?? ctx.room?.active_scene_id ?? null;
    const refScene = refId ? ctx.scenes.find(s => s.id === refId) : null;
    return refScene ? refScene.sort_order + 0.5 : ctx.scenes.length;
  };

  const handleAddScene = async () => {
    const nextSortOrder = getInsertSortOrder();
    const result = await ctx.addScene({
      name: '新しいシーン',
      sort_order: nextSortOrder,
    });
    if (!result) return;
    const newSceneId = result.scene.id;
    rebalanceSortOrder(newSceneId, nextSortOrder);
    await ctx.activateScene(newSceneId);
  };

  const handleDuplicateScenes = useCallback(async (sceneIds: string[]) => {
    if (sceneIds.length === 0) return;
    // sort_order順に処理
    const sorted = ctx.scenes.filter(s => sceneIds.includes(s.id)).sort((a, b) => a.sort_order - b.sort_order);
    let lastNewId: string | null = null;
    for (const scene of sorted) {
      const nextSortOrder = getInsertSortOrder(scene.id);
      const result = await ctx.addScene(
        {
          name: `${scene.name} (複製)`,
          background_url: scene.background_url ?? null,
          foreground_url: scene.foreground_url ?? null,
          sort_order: nextSortOrder,
        },
        scene.id,
        ctx.allObjects,
      );
      if (!result) continue;
      const newSceneId = result.scene.id;
      rebalanceSortOrder(newSceneId, nextSortOrder);

      // 元シーンに紐づくBGMトラックに新シーンIDも追加
      for (const bgm of ctx.bgms) {
        if (bgm.scene_ids.includes(scene.id)) {
          ctx.updateBgm(bgm.id, {
            scene_ids: [...bgm.scene_ids, newSceneId],
            auto_play_scene_ids: bgm.auto_play_scene_ids.includes(scene.id)
              ? [...bgm.auto_play_scene_ids, newSceneId]
              : bgm.auto_play_scene_ids,
          });
        }
      }
      lastNewId = newSceneId;
    }
    if (lastNewId) await ctx.activateScene(lastNewId);
  }, [ctx.scenes, ctx.bgms, ctx.allObjects, ctx.addScene, ctx.updateBgm, ctx.activateScene]);

  const handleRemoveScenes = useCallback(async (sceneIds: string[]) => {
    const activeSceneId = ctx.room?.active_scene_id ?? null;
    const removeSet = new Set(sceneIds);

    // アクティブシーンが削除対象なら別シーンに切り替え
    if (activeSceneId && removeSet.has(activeSceneId)) {
      const sorted = [...ctx.scenes].sort((a, b) => a.sort_order - b.sort_order);
      const remaining = sorted.filter(s => !removeSet.has(s.id));
      if (remaining.length > 0) {
        await ctx.activateScene(remaining[0].id);
      } else {
        await ctx.activateScene(null);
      }
    }

    for (const id of sceneIds) {
      await ctx.removeScene(id);
    }
    setSelectedSceneIds([]);
  }, [ctx.scenes, ctx.room?.active_scene_id, ctx.activateScene, ctx.removeScene]);

  return (
    <ScenePanel
      scenes={ctx.scenes}
      activeSceneId={ctx.room?.active_scene_id ?? null}
      selectedSceneIds={selectedSceneIds}
      onSelectedSceneIdsChange={setSelectedSceneIds}
      onActivateScene={ctx.activateScene}
      onAddScene={handleAddScene}
      onDuplicateScenes={handleDuplicateScenes}
      onEditScene={(scene) => { ctx.clearAllEditing(); ctx.setEditingScene(scene); }}
      onUpdateSceneName={(id, name) => ctx.updateScene(id, { name })}
      onRemoveScenes={handleRemoveScenes}
      onReorderScenes={ctx.reorderScenes}
    />
  );
}
