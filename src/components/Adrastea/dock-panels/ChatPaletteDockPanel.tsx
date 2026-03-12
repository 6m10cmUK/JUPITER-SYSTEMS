import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { useAuth } from '../../../contexts/AuthContext';
import { theme } from '../../../styles/theme';

export function ChatPaletteDockPanel() {
  const ctx = useAdrasteaContext();
  const { user } = useAuth();

  // 自分のキャラのみを対象
  const myCharacters = ctx.characters.filter((char) => char.owner_id === user?.uid);

  // アクティブなキャラを取得
  const activeCharacter = ctx.activeSpeakerCharId
    ? myCharacters.find((c) => c.id === ctx.activeSpeakerCharId) ?? null
    : null;

  // チャットパレットを改行で分割
  const paletteItems = activeCharacter?.chat_palette
    ? activeCharacter.chat_palette.split('\n').filter((item) => item.trim())
    : [];

  const handleSendPaletteMessage = (text: string) => {
    if (!activeCharacter) return;
    ctx.handleSendMessage(text, 'chat', activeCharacter.name, activeCharacter.images[activeCharacter.active_image_index]?.url ?? null);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: theme.bgSurface,
        borderLeft: `1px solid ${theme.border}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          padding: '6px 8px',
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span style={{ color: theme.textPrimary, fontSize: '12px', fontWeight: 600, flex: 1 }}>
          チャットパレット
        </span>
      </div>

      {/* パレット一覧 */}
      {myCharacters.length === 0 ? (
        <div
          style={{
            flex: 1,
            padding: '12px 8px',
            color: theme.textMuted,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          キャラクターが登録されていません
        </div>
      ) : !activeCharacter ? (
        <div
          style={{
            flex: 1,
            padding: '12px 8px',
            color: theme.textMuted,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          キャラクターを選択してください
        </div>
      ) : paletteItems.length === 0 ? (
        <div
          style={{
            flex: 1,
            padding: '12px 8px',
            color: theme.textMuted,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          チャットパレットが登録されていません
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '4px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {paletteItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSendPaletteMessage(item)}
              style={{
                padding: '6px 8px',
                background: theme.bgInput,
                border: `1px solid ${theme.border}`,
                borderRadius: 0,
                color: theme.textPrimary,
                fontSize: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = theme.bgHover;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = theme.bgInput;
              }}
              title={item}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {/* キャラクター選択セクション */}
      {myCharacters.length > 0 && (
        <div
          style={{
            padding: '6px 8px',
            borderTop: `1px solid ${theme.border}`,
            background: theme.bgBase,
          }}
        >
          <label
            style={{
              display: 'block',
              color: theme.textSecondary,
              fontSize: '11px',
              fontWeight: 600,
              marginBottom: '4px',
            }}
          >
            キャラクター選択
          </label>
          <select
            value={activeCharacter?.id ?? ''}
            onChange={(e) => ctx.setActiveSpeakerCharId(e.target.value || null)}
            style={{
              width: '100%',
              padding: '4px 6px',
              background: theme.bgInput,
              border: `1px solid ${theme.border}`,
              borderRadius: 0,
              color: theme.textPrimary,
              fontSize: '12px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          >
            <option value="">なし（地の文）</option>
            {myCharacters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
