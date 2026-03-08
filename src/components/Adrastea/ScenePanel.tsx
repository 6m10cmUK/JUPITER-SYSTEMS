
import { useState, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { theme } from '../../styles/theme';
import type { Scene } from '../../types/adrastea.types';
import { Plus, Copy, Trash2 } from 'lucide-react';
import { SortableListPanel, SortableListItem, ConfirmModal } from './ui';

interface ScenePanelProps {
  scenes: Scene[];
  activeSceneId: string | null;
  onActivateScene: (sceneId: string | null) => void;
  onAddScene: () => void;
  onDuplicateScene?: () => void;
  onEditScene: (scene: Scene) => void;
  onUpdateSceneName: (sceneId: string, name: string) => void;
  onRemoveScene: (sceneId: string) => void;
  onReorderScenes?: (orderedIds: string[]) => void;
}

export function ScenePanel({
  scenes,
  activeSceneId,
  onActivateScene,
  onAddScene,
  onDuplicateScene,
  onEditScene,
  onUpdateSceneName,
  onRemoveScene,
  onReorderScenes,
}: ScenePanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameValue, setNameValue] = useState('');
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

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

  return (
    <>
    <SortableListPanel
      title="シーン"
      headerActions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {onDuplicateScene && (
            <button
              onClick={onDuplicateScene}
              aria-label="シーンを複製"
              title="シーンを複製"
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
              <Copy size={13} />
            </button>
          )}
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
      {scenes.map((scene) => (
        <SortableListItem
          key={scene.id}
          id={scene.id}
          isSelected={activeSceneId === scene.id}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0px' }}>
            {/* サムネイル */}
            <div
              onClick={() => { onActivateScene(scene.id); onEditScene(scene); }}
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
                  onClick={() => { onActivateScene(scene.id); onEditScene(scene); }}
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
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {scenes.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingRemoveId(scene.id);
                    }}
                    aria-label="シーンを削除"
                    title="シーンを削除"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: theme.danger,
                      cursor: 'pointer',
                      padding: '2px 4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </SortableListItem>
      ))}
    </SortableListPanel>

    {pendingRemoveId && (
      <ConfirmModal
        message="このシーンを削除しますか？"
        confirmLabel="削除"
        danger
        onConfirm={() => { onRemoveScene(pendingRemoveId); setPendingRemoveId(null); }}
        onCancel={() => setPendingRemoveId(null)}
      />
    )}
    </>
  );
}
