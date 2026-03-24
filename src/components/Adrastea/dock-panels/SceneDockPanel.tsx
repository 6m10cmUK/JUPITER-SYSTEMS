import { useState, useCallback, useEffect } from 'react';
import { ConfirmModal } from '../ui';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { ScenePanel } from '../ScenePanel';
import { sceneToClipboardJson, pasteSceneFromClipboard } from '../../../utils/clipboardImport';
import { handleClipboardImport } from '../../../hooks/usePasteHandler';

export function SceneDockPanel() {
  const ctx = useAdrasteaContext();
  const selectedSceneIds = ctx.panelSelection?.panel === 'scene' ? ctx.panelSelection.ids : [];
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const setSelectedSceneIds = useCallback((ids: string[]) => {
    ctx.setPanelSelection(ids.length > 0 ? { panel: 'scene', ids } : null);
  }, [ctx.setPanelSelection]);

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

  const handleAddScene = async (count: number = 1) => {
    for (let i = 0; i < count; i++) {
      const nextSortOrder = getInsertSortOrder();
      const result = await ctx.addScene({
        name: '新しいシーン',
        sort_order: nextSortOrder,
      }, undefined, ctx.allObjects);
      if (!result) continue;
      const newSceneId = result.scene.id;
      rebalanceSortOrder(newSceneId, nextSortOrder);
      if (i === count - 1) {
        setSelectedSceneIds([newSceneId]);
      }
    }
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
          foreground_opacity: scene.foreground_opacity,
          bg_transition: scene.bg_transition,
          bg_transition_duration: scene.bg_transition_duration,
          fg_transition: scene.fg_transition,
          fg_transition_duration: scene.fg_transition_duration,
          bg_blur: scene.bg_blur,
          grid_visible: scene.grid_visible,
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
    if (lastNewId) setSelectedSceneIds([lastNewId]);
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

    await Promise.all(sceneIds.map(id => ctx.removeScene(id)));

    // 削除したシーンIDをBGMのscene_ids/auto_play_scene_idsから除去
    for (const bgm of ctx.bgms) {
      const newSceneIds = bgm.scene_ids.filter(sid => !removeSet.has(sid));
      const newAutoPlay = bgm.auto_play_scene_ids.filter(sid => !removeSet.has(sid));
      if (newSceneIds.length !== bgm.scene_ids.length || newAutoPlay.length !== bgm.auto_play_scene_ids.length) {
        if (newSceneIds.length === 0) {
          ctx.removeBgm(bgm.id);
        } else {
          ctx.updateBgm(bgm.id, { scene_ids: newSceneIds, auto_play_scene_ids: newAutoPlay });
        }
      }
    }

    setSelectedSceneIds([]);
  }, [ctx.scenes, ctx.bgms, ctx.room?.active_scene_id, ctx.activateScene, ctx.removeScene, ctx.updateBgm, ctx.removeBgm]);

  const handleCopy = useCallback((sceneIds: string | string[]) => {
    const ids = Array.isArray(sceneIds) ? sceneIds : [sceneIds];
    const scenes = ctx.scenes.filter(s => ids.includes(s.id));
    if (scenes.length === 0) return;
    navigator.clipboard.writeText(sceneToClipboardJson(scenes, ctx.allObjects, ctx.bgms));
    ctx.showToast(scenes.length > 1 ? `${scenes.length}件のシーンをコピーしました` : `${scenes[0].name} をコピーしました`, 'success');
  }, [ctx.scenes, ctx.allObjects, ctx.bgms, ctx.showToast]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      await handleClipboardImport(
        text,
        (data) => ctx.addCharacter({ ...data, owner_id: ctx.user?.uid ?? '' }),
        ctx.showToast,
        undefined,
        (data) => pasteSceneFromClipboard(data, ctx),
      );
    } catch {
      ctx.showToast('クリップボードの読み取りに失敗しました', 'error');
    }
  }, [ctx]);

  // Ctrl+C / Ctrl+D / Backspace / Delete
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.contentEditable === 'true')) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (window.getSelection()?.toString()) return;
        // シーンが明示的に選択されている場合のみコピー
        if (selectedSceneIds.length > 0) {
          e.preventDefault();
          handleCopy(selectedSceneIds);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (selectedSceneIds.length > 0) {
          e.preventDefault();
          handleDuplicateScenes(selectedSceneIds);
        }
      } else if (e.key === 'Delete') {
        if (selectedSceneIds.length > 0 && selectedSceneIds.length < ctx.scenes.length) {
          e.preventDefault();
          setPendingDeleteIds(selectedSceneIds);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedSceneIds, ctx.scenes.length, ctx.room?.active_scene_id, handleCopy, handleDuplicateScenes, handleRemoveScenes]);

  return (
    <>
    <ScenePanel
      scenes={ctx.scenes}
      activeSceneId={ctx.room?.active_scene_id ?? null}
      selectedSceneIds={selectedSceneIds}
      onSelectedSceneIdsChange={setSelectedSceneIds}
      onActivateScene={ctx.activateScene}
      onAddScene={handleAddScene}
      onDuplicateScenes={handleDuplicateScenes}
      onEditScene={(scene) => { ctx.setEditingScene(scene); }}
      onUpdateSceneName={(id, name) => ctx.updateScene(id, { name })}
      onRemoveScenes={handleRemoveScenes}
      onReorderScenes={ctx.reorderScenes}
      onCopy={handleCopy}
      onPaste={handlePaste}
      bgms={ctx.bgms}
    />
    {pendingDeleteIds && (
      <ConfirmModal
        message={pendingDeleteIds.length > 1 ? `${pendingDeleteIds.length}件のシーンを削除しますか？` : 'このシーンを削除しますか？'}
        confirmLabel="削除"
        danger
        onConfirm={() => { handleRemoveScenes(pendingDeleteIds); setPendingDeleteIds(null); }}
        onCancel={() => setPendingDeleteIds(null)}
      />
    )}
    </>
  );
}
