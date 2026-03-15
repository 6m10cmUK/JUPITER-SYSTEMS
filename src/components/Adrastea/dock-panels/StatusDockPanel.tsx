import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { useAuth } from '../../../contexts/AuthContext';
import { theme } from '../../../styles/theme';

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function formatInitiative(val: number): string {
  if (val === 0) return '-';
  const rounded = Math.round(val * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function StatusDockPanel() {
  const ctx = useAdrasteaContext();
  const { user } = useAuth();
  const currentUserId = user?.uid ?? '';

  // is_hidden_on_board=false のキャラのみ、initiative 降順でソート
  const visible = [...ctx.characters]
    .filter(c => !c.is_hidden_on_board)
    .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));

  return (
    <div style={{
      height: '100%',
      overflow: 'auto',
      background: theme.bgSurface,
      color: theme.textPrimary,
      fontSize: 12,
    }}>
      {visible.length === 0 ? (
        <div style={{ padding: 16, color: theme.textMuted, textAlign: 'center' }}>
          表示するキャラクターがいません
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.border}`, fontSize: 10, color: theme.textMuted }}>
              <th style={{ padding: '4px 6px', textAlign: 'center', width: 30 }}>Init</th>
              <th style={{ padding: '4px 6px', textAlign: 'left' }}>キャラクター</th>
              <th style={{ padding: '4px 6px', textAlign: 'left' }}>ステータス</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(char => {
              const isOwner = char.owner_id === currentUserId;
              const imgUrl = char.images[char.active_image_index]?.url ?? null;
              const initiative = char.initiative ?? 0;
              const textColor = isLightColor(char.color) ? '#000' : '#fff';
              const showStatuses = (!char.is_status_private || isOwner) && char.statuses.length > 0;

              return (
                <tr key={char.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  {/* イニシアチブ */}
                  <td style={{
                    padding: '6px',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    background: char.color,
                    color: textColor,
                    width: 30,
                  }}>
                    {formatInitiative(initiative)}
                  </td>
                  {/* アイコン + 名前 */}
                  <td style={{ padding: '6px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          style={{ width: 28, height: 28, objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }}
                          draggable={false}
                        />
                      ) : (
                        <div style={{
                          width: 28, height: 28, background: char.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
                        }}>
                          {char.name.charAt(0)}
                        </div>
                      )}
                      <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {char.name}
                      </span>
                      {!isOwner && char.is_status_private && (
                        <span style={{ color: theme.textMuted, fontSize: 10 }}>🔒</span>
                      )}
                    </div>
                  </td>
                  {/* ステータスバー群 */}
                  <td style={{ padding: '6px', width: '50%' }}>
                    {showStatuses ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {char.statuses.map((s, i) => {
                          const ratio = s.max > 0 ? s.value / s.max : 0;
                          const barColor = s.max > 0 && ratio <= 4 / 5 ? '#d9534f' : 'rgba(255,255,255,0.7)';
                          return (
                            <div key={i} style={{ position: 'relative', height: 14, background: 'rgba(255,255,255,0.15)', borderRadius: 2 }}>
                              <div style={{
                                height: '100%',
                                width: `${s.max > 0 ? Math.min(100, ratio * 100) : 0}%`,
                                background: barColor,
                                borderRadius: 2,
                                transition: 'width 0.2s ease',
                              }} />
                              <span style={{
                                position: 'absolute', left: 3, top: '50%', transform: 'translateY(-50%)',
                                fontSize: 10, color: '#000', fontWeight: 600, pointerEvents: 'none',
                              }}>
                                {s.label}
                              </span>
                              <span style={{
                                position: 'absolute', right: 3, top: '50%', transform: 'translateY(-50%)',
                                fontSize: 10, color: '#000', fontWeight: 600, pointerEvents: 'none',
                              }}>
                                {s.value}/{s.max}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ color: theme.textMuted, fontSize: 10 }}>
                        {char.is_status_private && !isOwner ? '非公開' : '-'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
