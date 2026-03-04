
import { theme } from '../../styles/theme';
import type { Scene } from '../../types/adrastea.types';

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
          padding: '12px 16px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ color: theme.textPrimary, fontWeight: 600, fontSize: '0.9rem' }}>
          シーン
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: theme.textSecondary,
            fontSize: '1.2rem',
            cursor: 'pointer',
            padding: '0 4px',
          }}
        >
          x
        </button>
      </div>

      {/* シーンリスト */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {/* デフォルト（シーンなし） */}
        <button
          onClick={() => onActivateScene(null)}
          style={{
            width: '100%',
            padding: '10px 12px',
            marginBottom: '4px',
            background: activeSceneId === null ? 'rgba(137,180,250,0.15)' : 'transparent',
            border: activeSceneId === null ? `1px solid ${theme.accent}` : '1px solid transparent',
            borderRadius: 0,
            color: theme.textPrimary,
            fontSize: '0.85rem',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          デフォルト
        </button>

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
                height: '60px',
                background: scene.background_url
                  ? `url(${scene.background_url}) center/cover`
                  : theme.bgInput,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {!scene.background_url && (
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
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                onClick={() => onActivateScene(scene.id)}
                style={{
                  color: theme.textPrimary,
                  fontSize: '0.8rem',
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
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 追加ボタン */}
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${theme.border}` }}>
        <button
          onClick={onAddScene}
          style={{
            width: '100%',
            padding: '8px',
            background: theme.accent,
            color: theme.textOnAccent,
            border: 'none',
            borderRadius: 0,
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          + シーン追加
        </button>
      </div>
    </div>
  );
}
