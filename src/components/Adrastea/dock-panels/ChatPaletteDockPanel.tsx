import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { useAuth } from '../../../contexts/AuthContext';
import { theme } from '../../../styles/theme';

export function ChatPaletteDockPanel() {
  const ctx = useAdrasteaContext();
  const { user } = useAuth();

  // 自分のキャラのみ
  const myChars = ctx.characters.filter(c => c.owner_id === user?.uid);

  // 選択中キャラ
  const activeChar = myChars.find(c => c.id === ctx.activeSpeakerCharId) ?? null;

  // chat_palette を改行で分割してボタン一覧に
  const paletteItems = activeChar
    ? activeChar.chat_palette.split('\n').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: theme.bgBase, color: theme.textPrimary,
    }}>
      {/* キャラ選択 */}
      <div style={{ padding: '6px 8px', borderBottom: `1px solid ${theme.border}` }}>
        <select
          value={ctx.activeSpeakerCharId ?? ''}
          onChange={e => ctx.setActiveSpeakerCharId(e.target.value || null)}
          style={{
            width: '100%', background: theme.bgInput, color: theme.textPrimary,
            border: `1px solid ${theme.border}`, padding: '4px 6px', fontSize: '0.85rem',
          }}
        >
          <option value="">キャラクターを選択...</option>
          {myChars.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* パレット一覧 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
        {!activeChar ? (
          <div style={{ padding: '12px 8px', color: theme.textMuted, fontSize: '0.85rem', textAlign: 'center' }}>
            キャラクターを選択してください
          </div>
        ) : paletteItems.length === 0 ? (
          <div style={{ padding: '12px 8px', color: theme.textMuted, fontSize: '0.85rem', textAlign: 'center' }}>
            チャットパレットが登録されていません
          </div>
        ) : paletteItems.map((item, i) => (
          <button
            key={i}
            onClick={() => ctx.handleSendMessage(item, 'message', activeChar.name, activeChar.avatar_url)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '6px 8px', marginBottom: '2px',
              background: theme.bgPanel, color: theme.textPrimary,
              border: `1px solid ${theme.border}`, cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
