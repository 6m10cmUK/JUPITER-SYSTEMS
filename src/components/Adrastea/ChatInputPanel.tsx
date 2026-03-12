import React, { useState, useCallback, useRef, useEffect } from 'react';
import { User } from 'lucide-react';
import { theme } from '../../styles/theme';
import type { Character } from '../../types/adrastea.types';

interface ChatInputPanelProps {
  characters?: Character[];
  onSendMessage: (content: string, messageType: 'chat' | 'dice' | 'system', characterName?: string, characterAvatar?: string | null) => void;
}


const ChatInputPanel: React.FC<ChatInputPanelProps> = ({
  characters = [],
  onSendMessage,
}) => {
  const [input, setInput] = useState('');
  const [senderName, setSenderName] = useState('noname');
  const [selectedCharacterForIcon, setSelectedCharacterForIcon] = useState<Character | null>(null);
  const [showCharacterList, setShowCharacterList] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const charListRef = useRef<HTMLDivElement>(null);
  const charIconRef = useRef<HTMLButtonElement>(null);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;

    const charName = senderName.trim() || undefined;
    const charAvatar = selectedCharacterForIcon?.images[selectedCharacterForIcon.active_image_index]?.url ?? null;

    if (text.startsWith('/')) {
      const command = text.slice(1);
      if (command) {
        onSendMessage(command, 'dice', charName, charAvatar);
      }
    } else {
      onSendMessage(text, 'chat', charName, charAvatar);
    }
    setInput('');
  }, [input, senderName, selectedCharacterForIcon, onSendMessage]);

  useEffect(() => {
    if (!showCharacterList) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        charListRef.current && !charListRef.current.contains(e.target as Node) &&
        charIconRef.current && !charIconRef.current.contains(e.target as Node)
      ) {
        setShowCharacterList(false);
        setDropdownPos(null);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [showCharacterList]);

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
      {/* キャラクター選択エリア */}
      {characters.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 0',
            position: 'relative',
          }}
        >
          {/* 丸アイコンボタン */}
          <button
            ref={charIconRef}
            onClick={() => {
              if (showCharacterList) {
                setShowCharacterList(false);
                setDropdownPos(null);
              } else {
                const rect = charIconRef.current?.getBoundingClientRect();
                if (rect) {
                  setDropdownPos({ top: rect.bottom + 4, left: rect.left });
                }
                setShowCharacterList(true);
              }
            }}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: selectedCharacterForIcon
                ? selectedCharacterForIcon.images[selectedCharacterForIcon.active_image_index]?.url
                  ? `url(${selectedCharacterForIcon.images[selectedCharacterForIcon.active_image_index]?.url}) center/cover`
                  : selectedCharacterForIcon.color
                : theme.border,
              border: `1px solid ${theme.border}`,
              flexShrink: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              outline: 'none',
            }}
            title="キャラクター選択"
          >
            {!selectedCharacterForIcon || !selectedCharacterForIcon.images[selectedCharacterForIcon.active_image_index]?.url ? (
              <User size={12} color={theme.textMuted} />
            ) : null}
          </button>

          {/* 名前入力テキストフィールド */}
          <input
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="noname"
            style={{
              flex: 1,
              padding: '4px 6px',
              background: theme.bgBase,
              border: `1px solid ${theme.border}`,
              borderRadius: 0,
              color: theme.textPrimary,
              fontSize: '12px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* キャラクター一覧ドロップダウン */}
          {showCharacterList && (
            <div
              ref={charListRef}
              style={{
                position: 'fixed',
                top: dropdownPos?.top ?? 0,
                left: dropdownPos?.left ?? 0,
                width: '200px',
                background: theme.bgSurface,
                border: `1px solid ${theme.border}`,
                zIndex: 100,
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >

              {/* キャラクターリスト */}
              {characters.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSenderName(c.name);
                    setSelectedCharacterForIcon(c);
                    setShowCharacterList(false);
                    setDropdownPos(null);
                  }}
                  style={{
                    padding: '6px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    color: theme.textPrimary,
                    fontSize: '12px',
                    borderBottom: `1px solid ${theme.border}`,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = theme.bgInput;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                  }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: c.images[c.active_image_index]?.url
                        ? `url(${c.images[c.active_image_index]?.url}) center/cover`
                        : c.color,
                      border: `1px solid ${theme.border}`,
                      flexShrink: 0,
                    }}
                  />
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* テキスト入力 + 送信 */}
      <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && handleSend()}
          placeholder="メッセージ（/2d6 でダイス）"
          style={{
            flex: 1,
            padding: '4px 6px',
            background: theme.bgInput,
            border: `1px solid ${theme.border}`,
            borderRadius: 0,
            color: theme.textPrimary,
            fontSize: '12px',
            boxSizing: 'border-box',
            resize: 'none',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          style={{
            padding: '0 10px',
            background: input.trim() ? theme.accent : theme.bgInput,
            color: input.trim() ? theme.textOnAccent : theme.textMuted,
            border: 'none',
            borderRadius: 0,
            fontSize: '11px',
            fontWeight: 600,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            alignSelf: 'flex-end',
          }}
        >
          送信
        </button>
      </div>
    </div>
  );
};

export default ChatInputPanel;
