
import { useState, useCallback } from 'react';
import { theme } from '../../styles/theme';
import type { Scene } from '../../types/adrastea.types';
import { Plus, Trash2 } from 'lucide-react';

interface ScenePanelProps {
  scenes: Scene[];
  activeSceneId: string | null;
  onActivateScene: (sceneId: string | null) => void;
  onAddScene: () => void;
  onEditScene: (scene: Scene) => void;
  onRemoveScene: (sceneId: string) => void;
  onReorderScenes?: (orderedIds: string[]) => void;
}

export function ScenePanel({
  scenes,
  activeSceneId,
  onActivateScene,
  onAddScene,
  onEditScene,
  onRemoveScene,
  onReorderScenes,
}: ScenePanelProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  // dropPosition: { id: シーンID, position: 'before' | 'after' }
  const [dropPosition, setDropPosition] = useState<{ id: string; position: 'before' | 'after' } | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, sceneId: string) => {
    setDragId(sceneId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, sceneId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (sceneId === dragId) { setDropPosition(null); return; }
    // カーソル位置がカード上半分なら before、下半分なら after
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';
    setDropPosition({ id: sceneId, position });
  }, [dragId]);

  const handleDragLeave = useCallback(() => {
    setDropPosition(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragId || dragId === targetId || !onReorderScenes || !dropPosition) {
      setDragId(null);
      setDropPosition(null);
      return;
    }
    const ids = scenes.map(s => s.id);
    const fromIdx = ids.indexOf(dragId);
    if (fromIdx === -1) { setDragId(null); setDropPosition(null); return; }
    // ドラッグ元を削除
    ids.splice(fromIdx, 1);
    // 挿入先のインデックスを再計算（削除後のリスト基準）
    const toIdx = ids.indexOf(dropPosition.id);
    if (toIdx === -1) { setDragId(null); setDropPosition(null); return; }
    const insertIdx = dropPosition.position === 'before' ? toIdx : toIdx + 1;
    ids.splice(insertIdx, 0, dragId);
    onReorderScenes(ids);
    setDragId(null);
    setDropPosition(null);
  }, [dragId, dropPosition, scenes, onReorderScenes]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDropPosition(null);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: theme.bgSurface,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          padding: '6px 8px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ color: theme.textPrimary, fontWeight: 600, fontSize: '12px' }}>
          シーン
        </span>
        <button
          onClick={onAddScene}
          style={{
            background: 'transparent',
            border: 'none',
            color: theme.textPrimary,
            cursor: 'pointer',
            padding: '0 4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Plus size={18} />
        </button>
      </div>

      {/* シーンリスト */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
        {scenes.map((scene) => {
          const isDropBefore = dropPosition?.id === scene.id && dropPosition.position === 'before';
          const isDropAfter = dropPosition?.id === scene.id && dropPosition.position === 'after';
          return (
          <div
            key={scene.id}
            draggable
            onDragStart={(e) => handleDragStart(e, scene.id)}
            onDragOver={(e) => handleDragOver(e, scene.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, scene.id)}
            onDragEnd={handleDragEnd}
            style={{
              position: 'relative',
              marginBottom: '4px',
              border: activeSceneId === scene.id
                ? `1px solid ${theme.accent}`
                : '1px solid transparent',
              borderRadius: 0,
              background: activeSceneId === scene.id
                ? 'rgba(137,180,250,0.15)'
                : 'transparent',
              overflow: 'visible',
              opacity: dragId === scene.id ? 0.4 : 1,
              cursor: 'grab',
            }}
          >
            {/* 挿入インジケーター: before */}
            {isDropBefore && (
              <div style={{
                position: 'absolute',
                top: '-3px',
                left: 0,
                right: 0,
                height: '2px',
                background: theme.accent,
                borderRadius: '1px',
                zIndex: 10,
                pointerEvents: 'none',
              }} />
            )}
            {/* 挿入インジケーター: after */}
            {isDropAfter && (
              <div style={{
                position: 'absolute',
                bottom: '-3px',
                left: 0,
                right: 0,
                height: '2px',
                background: theme.accent,
                borderRadius: '1px',
                zIndex: 10,
                pointerEvents: 'none',
              }} />
            )}
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
                padding: '4px 6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                onClick={() => { onActivateScene(scene.id); onEditScene(scene); }}
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
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {scenes.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveScene(scene.id);
                    }}
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
          );
        })}
      </div>

    </div>
  );
}
