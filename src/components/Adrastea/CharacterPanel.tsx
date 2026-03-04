import { theme } from '../../styles/theme';
import type { Character } from '../../types/adrastea.types';

interface CharacterPanelProps {
  characters: Character[];
  onAddCharacter: () => void;
  onEditCharacter: (char: Character) => void;
  onRemoveCharacter: (charId: string) => void;
  onClose: () => void;
}

export function CharacterPanel({
  characters,
  onAddCharacter,
  onEditCharacter,
  onRemoveCharacter,
  onClose,
}: CharacterPanelProps) {
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
          キャラクター
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

      {/* リスト */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {characters.length === 0 && (
          <div style={{ color: theme.textMuted, fontSize: '0.8rem', textAlign: 'center', padding: '16px' }}>
            キャラクターがありません
          </div>
        )}
        {characters.map((char) => (
          <div
            key={char.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              marginBottom: '4px',
              borderRadius: 0,
              border: `1px solid ${theme.border}`,
              background: theme.bgToolbar,
            }}
          >
            {/* アバター */}
            {char.image_url ? (
              <img
                src={char.image_url}
                alt={char.name}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 0,
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 0,
                  background: char.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  flexShrink: 0,
                }}
              >
                {char.name.charAt(0)}
              </div>
            )}

            {/* 情報 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: theme.textPrimary,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {char.name}
              </div>
              {char.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '3px', marginTop: '2px', flexWrap: 'wrap' }}>
                  {char.tags.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        padding: '1px 6px',
                        background: theme.bgInput,
                        borderRadius: 0,
                        color: theme.textSecondary,
                        fontSize: '0.65rem',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {/* ステータスサマリー */}
              {char.statuses.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
                  {char.statuses.map((s, i) => (
                    <span key={i} style={{ color: s.color, fontSize: '0.7rem' }}>
                      {s.label}: {s.value}/{s.max}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 操作 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
              <button
                onClick={() => onEditCharacter(char)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.textSecondary,
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                編集
              </button>
              <button
                onClick={() => onRemoveCharacter(char.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.danger,
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 追加ボタン */}
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${theme.border}` }}>
        <button
          onClick={onAddCharacter}
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
          + キャラクター追加
        </button>
      </div>
    </div>
  );
}
