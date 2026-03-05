
import { theme } from '../../styles/theme';
import type { Scene } from '../../types/adrastea.types';
import { X } from 'lucide-react';

interface ScenePanelProps {
  scenes: Scene[];
  activeSceneId: string | null;
  onActivateScene: (sceneId: string | null) => void;
  onAddScene: () => void;
  onEditScene: (scene: Scene) => void;
  onRemoveScene: (sceneId: string) => void;
  onClose: () => void;
}

export function ScenePanel({
  scenes,
  activeSceneId,
  onActivateScene,
  onAddScene,
  onEditScene,
  onRemoveScene,
  onClose,
}: ScenePanelProps) {
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
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: theme.textSecondary,
            cursor: 'pointer',
            padding: '0 4px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* シーンリスト */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
        {scenes.map((scene) => (
          <div
            key={scene.id}
            style={{
              marginBottom: '4px',
              border:
                activeSceneId === scene.id
                  ? `1px solid ${theme.accent}`
                  : '1px solid transparent',
              borderRadius: 0,
              background:
                activeSceneId === scene.id
                  ? 'rgba(137,180,250,0.15)'
                  : 'transparent',
              overflow: 'hidden',
            }}
          >
            {/* サムネイル */}
            <div
              onClick={() => onActivateScene(scene.id)}
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
                onClick={() => onActivateScene(scene.id)}
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditScene(scene);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme.textSecondary,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    padding: '2px 4px',
                  }}
                >
                  編集
                </button>
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
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      padding: '2px 4px',
                    }}
                  >
                    削除
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 追加ボタン */}
      <div style={{ padding: '4px 8px', borderTop: `1px solid ${theme.border}` }}>
        <button
          onClick={onAddScene}
          style={{
            width: '100%',
            padding: '4px 8px',
            background: theme.accent,
            color: theme.textOnAccent,
            border: 'none',
            borderRadius: 0,
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          + シーン追加
        </button>
      </div>
    </div>
  );
}
