import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { theme } from '../../../styles/theme';

export function ChatPaletteDockPanel() {
  const ctx = useAdrasteaContext();

  // アクティブなキャラを取得
  const activeCharacter = ctx.activeSpeakerCharId
    ? ctx.characters.find((c) => c.id === ctx.activeSpeakerCharId) ?? null
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
    </div>
  );
}
