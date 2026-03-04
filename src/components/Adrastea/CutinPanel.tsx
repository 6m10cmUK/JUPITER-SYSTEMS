import { theme } from '../../styles/theme';
import type { Cutin } from '../../types/adrastea.types';

interface CutinPanelProps {
  cutins: Cutin[];
  onTrigger: (cutinId: string) => void;
  onAdd: () => void;
  onEdit: (cutin: Cutin) => void;
  onRemove: (cutinId: string) => void;
  onClose: () => void;
}

export function CutinPanel({ cutins, onTrigger, onAdd, onEdit, onRemove, onClose }: CutinPanelProps) {
  const animLabel = (anim: string) => {
    switch (anim) {
      case 'slide': return 'スライド';
      case 'fade': return 'フェード';
      case 'zoom': return 'ズーム';
      default: return anim;
    }
  };

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
          カットイン
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {cutins.length === 0 && (
          <div style={{ color: theme.textMuted, fontSize: '0.8rem', textAlign: 'center', padding: '16px' }}>
            カットインがありません
          </div>
        )}
        {cutins.map((cutin) => (
          <div
            key={cutin.id}
            style={{
              marginBottom: '6px',
              padding: '8px 10px',
              border: `1px solid ${theme.border}`,
              borderRadius: 0,
              background: theme.bgToolbar,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              {cutin.image_url ? (
                <img
                  src={cutin.image_url}
                  alt=""
                  style={{ width: '36px', height: '36px', borderRadius: 0, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: '36px', height: '36px', borderRadius: 0,
                  background: cutin.background_color, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: cutin.text_color, fontSize: '0.7rem', fontWeight: 700,
                }}>
                  CI
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: theme.textPrimary, fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cutin.name}
                </div>
                <div style={{ color: theme.textMuted, fontSize: '0.7rem' }}>
                  {animLabel(cutin.animation)} / {cutin.duration / 1000}秒
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => onTrigger(cutin.id)}
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  background: theme.danger,
                  color: theme.textOnAccent,
                  border: 'none',
                  borderRadius: 0,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                再生
              </button>
              <button
                onClick={() => onEdit(cutin)}
                style={{
                  padding: '4px 8px',
                  background: theme.bgInput,
                  color: theme.textSecondary,
                  border: 'none',
                  borderRadius: 0,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                編集
              </button>
              <button
                onClick={() => onRemove(cutin.id)}
                style={{
                  padding: '4px 8px',
                  background: 'transparent',
                  color: theme.danger,
                  border: `1px solid ${theme.danger}`,
                  borderRadius: 0,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 12px', borderTop: `1px solid ${theme.border}` }}>
        <button
          onClick={onAdd}
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
          + カットイン追加
        </button>
      </div>
    </div>
  );
}
