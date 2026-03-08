
import { useState, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { theme } from '../../styles/theme';
import type { Scene } from '../../types/adrastea.types';
import { Plus, Copy, Trash2, Pencil } from 'lucide-react';
import { SortableListPanel, SortableListItem, ConfirmModal } from './ui';

interface ScenePanelProps {
  scenes: Scene[];
  activeSceneId: string | null;
  selectedSceneIds: string[];
  onSelectedSceneIdsChange: (ids: string[]) => void;
  onActivateScene: (sceneId: string | null) => void;
  onAddScene: () => void;
  onDuplicateScenes?: (sceneIds: string[]) => void;
  onEditScene: (scene: Scene) => void;
  onUpdateSceneName: (sceneId: string, name: string) => void;
  onRemoveScenes: (sceneIds: string[]) => void;
  onReorderScenes?: (orderedIds: string[]) => void;
}

export function ScenePanel({
  scenes,
  activeSceneId,
  selectedSceneIds,
  onSelectedSceneIdsChange,
  onActivateScene,
  onAddScene,
  onDuplicateScenes,
  onEditScene,
  onUpdateSceneName,
  onRemoveScenes,
  onReorderScenes,
}: ScenePanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameValue, setNameValue] = useState('');
  const [pendingRemove, setPendingRemove] = useState<{ ids: string[]; msg: string } | null>(null);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorderScenes) return;
    const oldIndex = scenes.findIndex(s => s.id === active.id);
    const newIndex = scenes.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(scenes, oldIndex, newIndex);
    onReorderScenes(reordered.map(s => s.id));
  }, [scenes, onReorderScenes]);

  const startEdit = (scene: Scene) => {
    setEditingId(scene.id);
    setNameValue(scene.name);
  };

  const commitEdit = () => {
    if (editingId && nameValue.trim()) {
      onUpdateSceneName(editingId, nameValue.trim());
    }
    setEditingId(null);
  };

  const handleRowClick = useCallback((e: React.MouseEvent, scene: Scene) => {
    if (e.shiftKey && selectedSceneIds.length > 0) {
      const lastSelected = selectedSceneIds[selectedSceneIds.length - 1];
      const anchorIdx = scenes.findIndex(s => s.id === lastSelected);
      const targetIdx = scenes.findIndex(s => s.id === scene.id);
      if (anchorIdx >= 0 && targetIdx >= 0) {
        const start = Math.min(anchorIdx, targetIdx);
        const end = Math.max(anchorIdx, targetIdx);
        onSelectedSceneIdsChange(scenes.slice(start, end + 1).map(s => s.id));
      }
    } else if (e.metaKey || e.ctrlKey) {
      onSelectedSceneIdsChange(
        selectedSceneIds.includes(scene.id)
          ? selectedSceneIds.filter(id => id !== scene.id)
          : [...selectedSceneIds, scene.id]
      );
    } else {
      onSelectedSceneIdsChange([scene.id]);
      onActivateScene(scene.id);
    }
  }, [scenes, selectedSceneIds, onSelectedSceneIdsChange, onActivateScene]);

  const handleRemoveClick = useCallback((e: React.MouseEvent, scene: Scene) => {
    e.stopPropagation();
    const ids = selectedSceneIds.length > 1 && selectedSceneIds.includes(scene.id)
      ? selectedSceneIds
      : [scene.id];
    // 全シーン削除は防ぐ
    if (ids.length >= scenes.length) return;
    const msg = ids.length > 1
      ? `${ids.length}件のシーンを削除しますか？`
      : 'このシーンを削除しますか？';
    setPendingRemove({ ids, msg });
  }, [selectedSceneIds, scenes.length]);

  const canDuplicate = onDuplicateScenes && selectedSceneIds.length > 0;
  const canDelete = selectedSceneIds.length > 0 && selectedSceneIds.length < scenes.length;

  return (
    <>
    <SortableListPanel
      title="シーン"
      headerActions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={() => {
              if (selectedSceneIds.length === 1) {
                const scene = scenes.find(s => s.id === selectedSceneIds[0]);
                if (scene) {
                  onActivateScene(scene.id);
                  onEditScene(scene);
                }
              }
            }}
            disabled={selectedSceneIds.length !== 1}
            aria-label="シーンを編集"
            title="選択中のシーンを編集"
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.textSecondary,
              cursor: selectedSceneIds.length === 1 ? 'pointer' : 'default',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              opacity: selectedSceneIds.length === 1 ? 1 : 0.3,
            }}
          >
            <Pencil size={13} />
          </button>
          {onDuplicateScenes && (
            <button
              onClick={() => onDuplicateScenes(selectedSceneIds)}
              disabled={!canDuplicate}
              aria-label="シーンを複製"
              title="選択中のシーンを複製"
              style={{
                background: 'transparent',
                border: 'none',
                color: theme.accent,
                cursor: canDuplicate ? 'pointer' : 'default',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                opacity: canDuplicate ? 1 : 0.3,
              }}
            >
              <Copy size={13} />
            </button>
          )}
          <button
            onClick={() => {
              if (canDelete) {
                const msg = selectedSceneIds.length > 1
                  ? `${selectedSceneIds.length}件のシーンを削除しますか？`
                  : 'このシーンを削除しますか？';
                setPendingRemove({ ids: selectedSceneIds, msg });
              }
            }}
            disabled={!canDelete}
            aria-label="シーンを削除"
            title="選択中のシーンを削除"
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.danger,
              cursor: canDelete ? 'pointer' : 'default',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              opacity: canDelete ? 1 : 0.3,
            }}
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={onAddScene}
            aria-label="シーンを追加"
            title="シーンを追加"
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.accent,
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Plus size={15} />
          </button>
        </div>
      }
      items={scenes}
      onDragEnd={handleDragEnd}
      emptyMessage="シーンがありません"
    >
      {scenes.map((scene) => {
        const isSelected = selectedSceneIds.includes(scene.id);
        return (
        <SortableListItem
          key={scene.id}
          id={scene.id}
          isSelected={activeSceneId === scene.id || isSelected}
          onClick={(e) => handleRowClick(e, scene)}
          handleExtra={
            <div
              onClick={(e) => {
                e.stopPropagation();
                onSelectedSceneIdsChange(
                  isSelected
                    ? selectedSceneIds.filter(id => id !== scene.id)
                    : [...selectedSceneIds, scene.id]
                );
              }}
              style={{
                width: '12px',
                height: '12px',
                border: `1px solid ${theme.textMuted}`,
                borderRadius: '2px',
                background: isSelected ? theme.textMuted : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                color: theme.bgBase,
                lineHeight: 1,
              }}
            >
              {isSelected && '✓'}
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0px' }}>
            {/* サムネイル */}
            <div
              style={{
                height: '40px',
                background: scene.foreground_url
                  ? `url(${scene.foreground_url}) center/cover`
                  : theme.bgInput,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {!scene.foreground_url && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.textMuted,
                    fontSize: '0.7rem',
                  }}
                >
                  背景なし
                </div>
              )}
            </div>

            {/* 情報 */}
            <div
              style={{
                padding: '4px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {editingId === scene.id ? (
                <input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                  style={{
                    flex: 1, minWidth: 0,
                    background: theme.bgInput, border: `1px solid ${theme.border}`,
                    color: theme.textPrimary, fontSize: '11px', padding: '1px 4px',
                    outline: 'none',
                  }}
                />
              ) : (
                <span
                  onDoubleClick={(e) => { e.stopPropagation(); startEdit(scene); }}
                  style={{
                    color: theme.textPrimary,
                    fontSize: '11px',
                    cursor: 'pointer',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {scene.name}
                </span>
              )}
            </div>
          </div>
        </SortableListItem>
        );
      })}
    </SortableListPanel>

    {pendingRemove && (
      <ConfirmModal
        message={pendingRemove.msg}
        confirmLabel="削除"
        danger
        onConfirm={() => { onRemoveScenes(pendingRemove.ids); setPendingRemove(null); }}
        onCancel={() => setPendingRemove(null)}
      />
    )}
    </>
  );
}
