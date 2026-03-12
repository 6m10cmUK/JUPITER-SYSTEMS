import React, { useState, useCallback } from 'react';
import { theme } from '../../styles/theme';
import type { Character } from '../../types/adrastea.types';

interface ChatInputPanelProps {
  characters?: Character[];
  onSendMessage: (content: string, messageType: 'chat' | 'dice' | 'system', characterName?: string, characterAvatar?: string | null) => void;
}

const DICE_BUTTONS = [
  { label: 'd4', faces: 4 },
  { label: 'd6', faces: 6 },
  { label: 'd8', faces: 8 },
  { label: 'd10', faces: 10 },
  { label: 'd12', faces: 12 },
  { label: 'd20', faces: 20 },
  { label: 'd100', faces: 100 },
];

const ChatInputPanel: React.FC<ChatInputPanelProps> = ({
  characters = [],
  onSendMessage,
}) => {
  const [input, setInput] = useState('');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const selectedCharacter = selectedCharacterId
    ? characters.find(c => c.id === selectedCharacterId)
    : null;

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const charName = selectedCharacter?.name;
    const charAvatar = selectedCharacter?.images[selectedCharacter.active_image_index]?.url;

    if (text.startsWith('/')) {
      const command = text.slice(1);
      if (command) {
        onSendMessage(command, 'dice', charName, charAvatar);
      }
    } else {
      onSendMessage(text, 'chat', charName, charAvatar);
    }
    setInput('');
  }, [input, selectedCharacter, onSendMessage]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: theme.bgSurface,
        borderLeft: `1px solid ${theme.border}`,
        display: 'flex',
        flexDirection: 'column',
        padding: '6px 8px',
        gap: '4px',
      }}
    >
      {/* 発言キャラクター選択（アクティブキャラ情報表示） */}
      {characters.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 6px',
            background: theme.bgInput,
            borderRadius: 0,
            border: `1px solid ${theme.border}`,
          }}
        >
          {selectedCharacter ? (
            <>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: selectedCharacter.images[selectedCharacter.active_image_index]?.url
                    ? `url(${selectedCharacter.images[selectedCharacter.active_image_index]?.url}) center/cover`
                    : selectedCharacter.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: theme.textPrimary, fontSize: '12px', fontWeight: 600, flex: 1 }}>
                {selectedCharacter.name}
              </span>
            </>
          ) : (
            <span style={{ color: theme.textMuted, fontSize: '12px', flex: 1 }}>
              地の文で発言
            </span>
          )}
          <select
            value={selectedCharacterId ?? ''}
            onChange={(e) => setSelectedCharacterId(e.target.value || null)}
            style={{
              padding: '2px 4px',
              background: theme.bgBase,
              border: `1px solid ${theme.border}`,
              borderRadius: 0,
              color: theme.textSecondary,
              fontSize: '11px',
              outline: 'none',
              cursor: 'pointer',
            }}
            title="発言キャラクターを選択"
          >
            <option value="">変更</option>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ダイスボタンバー */}
      <div
        style={{
          display: 'flex',
          gap: '2px',
          overflowX: 'auto',
        }}
      >
        {DICE_BUTTONS.map((dice) => (
          <button
            key={dice.label}
            onClick={() => onSendMessage(`1d${dice.faces}`, 'dice', selectedCharacter?.name, selectedCharacter?.images[selectedCharacter.active_image_index]?.url)}
            style={{
              padding: '2px 6px',
              borderRadius: 0,
              border: 'none',
              background: theme.bgInput,
              color: theme.textSecondary,
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {dice.label}
          </button>
        ))}
      </div>

      {/* テキスト入力 + 送信 */}
      <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
          placeholder="メッセージ（/2d6 でダイス）"
          style={{
            flex: 1,
            padding: '4px 6px',
            background: theme.bgInput,
            border: `1px solid ${theme.border}`,
            borderRadius: 0,
            color: theme.textPrimary,
            fontSize: '12px',
            height: '24px',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          style={{
            padding: '0 10px',
            height: '24px',
            background: input.trim() ? theme.accent : theme.bgInput,
            color: input.trim() ? theme.textOnAccent : theme.textMuted,
            border: 'none',
            borderRadius: 0,
            fontSize: '11px',
            fontWeight: 600,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          送信
        </button>
      </div>
    </div>
  );
};

export default ChatInputPanel;
