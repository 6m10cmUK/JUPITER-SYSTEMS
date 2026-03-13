import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { theme } from '../../../styles/theme';
import { CharacterEditor } from '../CharacterEditor';
import { AdModal } from '../ui';
import { Pencil } from 'lucide-react';

export function ChatPaletteDockPanel() {
  const { user } = useAuth();
  const ctx = useAdrasteaContext();
  const [showEditor, setShowEditor] = useState(false);

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
      {/* ヘッダーなし（タイトルは Dockview のタブに表示されるので不要） */}

      {/* パレット一覧 */}
      {ctx.characters.length === 0 ? (
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
      ) : !activeCharacter ? null : paletteItems.length === 0 ? (
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
              className="ad-btn ad-btn--ghost"
              onClick={(e) => {
                if (e.detail >= 2) return;
                ctx.setChatInjectText(item);
              }}
              onDoubleClick={() => {
                handleSendPaletteMessage(item);
              }}
              style={{
                padding: '6px 8px',
                borderRadius: 0,
                color: theme.textPrimary,
                fontSize: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%',
                display: 'block',
              }}
              title={item}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {/* 右下の編集ボタン */}
      {activeCharacter && (
        <div style={{ padding: '4px 8px', display: 'flex', justifyContent: 'flex-end', borderTop: `1px solid ${theme.border}` }}>
          <button
            className="ad-btn ad-btn--ghost"
            onClick={() => setShowEditor(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 8px',
              borderRadius: 0,
              color: theme.textSecondary,
              fontSize: '11px',
              cursor: 'pointer',
            }}
            title="チャットパレットを編集"
          >
            <Pencil size={11} />
            編集
          </button>
        </div>
      )}

      {/* モーダル */}
      {showEditor && activeCharacter && (
        <AdModal
          title="チャットパレット編集"
          width="500px"
          onClose={() => setShowEditor(false)}
        >
          <CharacterEditor
            key={activeCharacter.id}
            character={activeCharacter}
            roomId={ctx.roomId}
            currentUserId={user?.uid ?? ''}
            initialSection="chat_palette"
            onSave={(data) => {
              ctx.updateCharacter(activeCharacter.id, data);
              setShowEditor(false);
            }}
            onClose={() => setShowEditor(false)}
          />
        </AdModal>
      )}
    </div>
  );
}
