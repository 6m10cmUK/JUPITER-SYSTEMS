import { useCallback } from 'react';
import { ExternalLink } from 'lucide-react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { useAuth } from '../../../contexts/AuthContext';
import { hasRole } from '../../../config/permissions';
import { theme } from '../../../styles/theme';

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function formatInitiative(val: number): string {
  if (val === 0) return '0';
  const rounded = Math.round(val * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function StatusDockPanel() {
  const ctx = useAdrasteaContext();
  const { user } = useAuth();
  const currentUserId = user?.uid ?? '';

  const visible = [...ctx.characters]
    .filter(c => !c.is_hidden_on_board)
    .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));

  const isSubOwnerPlus = hasRole(ctx.roomRole, 'sub_owner');

  const handleClick = useCallback((charId: string) => {
    const char = ctx.characters.find(c => c.id === charId);
    if (char && (char.owner_id === user?.uid || isSubOwnerPlus)) {
      ctx.clearAllEditing();
      ctx.setEditingCharacter(char);
    }
  }, [ctx, user?.uid, isSubOwnerPlus]);

  const handleDoubleClick = useCallback((charId: string) => {
    const char = ctx.characters.find(c => c.id === charId);
    if (char && (char.owner_id === user?.uid || isSubOwnerPlus)) {
      ctx.setCharacterToOpenModal(char);
    }
  }, [ctx, user?.uid, isSubOwnerPlus]);

  return (
    <div style={{
      height: '100%',
      overflow: 'auto',
      background: theme.bgSurface,
      color: theme.textPrimary,
      padding: 6,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      {visible.length === 0 ? (
        <div style={{ padding: 16, color: theme.textMuted, textAlign: 'center', fontSize: 12 }}>
          表示するキャラクターがいません
        </div>
      ) : visible.map(char => {
        const isOwner = char.owner_id === currentUserId;
        const imgUrl = char.images[char.active_image_index]?.url ?? null;
        const isPrivate = char.is_status_private && !isOwner && !isSubOwnerPlus;
        const initiative = char.initiative ?? 0;
        const textColor = isLightColor(char.color) ? '#000' : '#fff';
        const showStatuses = !isPrivate && char.statuses.length > 0;
        const hasSheetUrl = !!char.sheet_url;

        return (
          <div
            key={char.id}
            style={{
              display: 'flex',
              gap: 6,
              padding: 4,
              borderLeft: `3px solid ${char.color}`,
              cursor: (isOwner || isSubOwnerPlus) ? 'pointer' : 'default',
            }}
            onClick={() => handleClick(char.id)}
            onDoubleClick={() => handleDoubleClick(char.id)}
          >
            {/* アイコン + イニシアチブバッジ */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {imgUrl ? (
                <img
                  src={imgUrl}
                  style={{ width: 48, height: 48, objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                  draggable={false}
                />
              ) : (
                <div style={{
                  width: 48, height: 48, background: char.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 18, fontWeight: 700,
                }}>
                  {char.name.charAt(0)}
                </div>
              )}
              {/* イニシアチブバッジ */}
              <div style={{
                position: 'absolute',
                top: -2,
                left: -2,
                background: char.color,
                color: textColor,
                fontSize: 10,
                fontWeight: 700,
                padding: '0 3px',
                lineHeight: '16px',
                minWidth: 16,
                textAlign: 'center',
              }}>
                {isPrivate ? '?' : formatInitiative(initiative)}
              </div>
            </div>
            {/* 右側: 名前 + ステータスバー */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* 名前行: 名前 + 右端にボタン群 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: 2,
              }}>
                {/* 名前 */}
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: theme.textPrimary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {char.name}
                  {!isOwner && char.is_status_private && (
                    <span style={{ marginLeft: 3, color: theme.textMuted, fontSize: 9 }}>🔒</span>
                  )}
                </span>
                {/* 外部URL */}
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: hasSheetUrl ? 'pointer' : 'default',
                    opacity: hasSheetUrl ? 0.8 : 0.25,
                    color: theme.textPrimary,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={hasSheetUrl ? char.sheet_url! : '外部URLが未設定'}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasSheetUrl) window.open(char.sheet_url!, '_blank', 'noopener');
                  }}
                  disabled={!hasSheetUrl}
                >
                  <ExternalLink size={11} />
                </button>
              </div>
              {/* ステータスバー 2列グリッド */}
              {showStatuses ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}>
                  {char.statuses.map((s, i) => {
                    const ratio = s.max > 0 ? s.value / s.max : 0;
                    const barColor = s.max > 0 && ratio <= 4 / 5 ? '#d9534f' : 'rgba(255,255,255,0.7)';
                    return (
                      <div key={i} style={{
                        position: 'relative',
                        height: 16,
                        background: 'rgba(255,255,255,0.1)',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${s.max > 0 ? Math.min(100, ratio * 100) : 0}%`,
                          background: barColor,
                          transition: 'width 0.2s ease',
                        }} />
                        <span style={{
                          position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
                          fontSize: 10, color: '#000', fontWeight: 700, pointerEvents: 'none',
                        }}>
                          {s.label}
                        </span>
                        <span style={{
                          position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                          fontSize: 10, color: '#000', fontWeight: 600, pointerEvents: 'none',
                        }}>
                          {s.value}/{s.max}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : !isPrivate ? (
                <div style={{ color: theme.textMuted, fontSize: 10, padding: '2px 0' }}>
                  ステータスなし
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
