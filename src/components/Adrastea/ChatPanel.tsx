import React, { useState, useEffect, useRef, useCallback } from 'react';
import { theme } from '../../styles/theme';
import { Trash2 } from 'lucide-react';
import type { ChatMessage, Character } from '../../types/adrastea.types';
import { ConfirmModal, AdComboBox } from './ui';

interface ChatPanelProps {
  messages: ChatMessage[];
  loading: boolean;
  hasMore: boolean;
  senderName: string;
  senderAvatar?: string | null;
  roomName?: string;
  characters?: Character[];
  onSendMessage: (content: string, messageType: 'chat' | 'dice' | 'system', characterName?: string, characterAvatar?: string | null) => void;
  onLoadMore: () => void;
  onClearMessages?: () => void;
}


const formatTime = (timestamp: number): string => {
  const d = new Date(timestamp);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

const getDiceAccentColor = (content: string): string => {
  if (content.includes('成功') || content.includes('クリティカル')) return theme.success;
  if (content.includes('失敗') || content.includes('ファンブル')) return theme.danger;
  return theme.accent;
};

const FallbackAvatar: React.FC<{ name: string }> = ({ name }) => (
  <div
    style={{
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: theme.bgInput,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      fontWeight: 700,
      color: theme.textPrimary,
      flexShrink: 0,
    }}
  >
    {name.charAt(0).toUpperCase()}
  </div>
);

const Avatar: React.FC<{ src?: string | null; name: string }> = ({ src, name }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    );
  }
  return <FallbackAvatar name={name} />;
};

const DICE_BUTTONS = [
  { label: 'd4', faces: 4 },
  { label: 'd6', faces: 6 },
  { label: 'd8', faces: 8 },
  { label: 'd10', faces: 10 },
  { label: 'd12', faces: 12 },
  { label: 'd20', faces: 20 },
  { label: 'd100', faces: 100 },
];

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  loading,
  hasMore,
  roomName,
  characters = [],
  onSendMessage,
  onLoadMore,
  onClearMessages,
}) => {
  const [input, setInput] = useState('');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const selectedCharacter = selectedCharacterId
    ? characters.find(c => c.id === selectedCharacterId)
    : null;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(messages.length);
  const isLoadingMoreRef = useRef(false);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 80;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    if (isNearBottomRef.current) {
      setHasNewMessage(false);
    }
  }, []);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      if (isNearBottomRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else if (!isLoadingMoreRef.current) {
        setHasNewMessage(true);
      }
      isLoadingMoreRef.current = false;
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasNewMessage(false);
  };

  const handleSend = () => {
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
  };

  const renderMessage = (msg: ChatMessage) => {
    if (msg.message_type === 'system') {
      return (
        <div
          key={msg.id}
          style={{
            textAlign: 'center',
            color: theme.textMuted,
            fontSize: '11px',
            padding: '2px 0',
          }}
        >
          {msg.content}
        </div>
      );
    }

    if (msg.message_type === 'dice') {
      const accent = getDiceAccentColor(msg.content);
      return (
        <div
          key={msg.id}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            padding: '4px 0',
            borderBottom: `1px solid ${theme.borderSubtle}`,
          }}
        >
          <Avatar src={msg.sender_avatar} name={msg.sender_name} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: accent, fontSize: '11px', fontWeight: 600 }}>
                🎲 {msg.sender_name}
              </span>
              <span style={{ color: theme.textMuted, fontSize: '10px' }}>
                {formatTime(msg.created_at)}
              </span>
            </div>
            <div style={{ color: accent, fontSize: '12px', marginTop: '1px' }}>
              {msg.content}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '6px',
          padding: '4px 0',
          borderBottom: `1px solid ${theme.borderSubtle}`,
        }}
      >
        <Avatar src={msg.sender_avatar} name={msg.sender_name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: theme.textSecondary, fontSize: '11px', fontWeight: 600 }}>
              {msg.sender_name}
            </span>
            <span style={{ color: theme.textMuted, fontSize: '10px' }}>
              {formatTime(msg.created_at)}
            </span>
          </div>
          <div style={{ color: theme.textPrimary, fontSize: '12px', marginTop: '1px' }}>
            {msg.content}
          </div>
        </div>
      </div>
    );
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
          alignItems: 'baseline',
          gap: '6px',
        }}
      >
        <span style={{ color: theme.textPrimary, fontSize: '12px', fontWeight: 600, flex: 1 }}>
          ルームチャット
        </span>
        {roomName && (
          <span style={{ color: theme.textMuted, fontSize: '11px' }}>
            {roomName}
          </span>
        )}
        {onClearMessages && (
          <button
            onClick={() => setShowClearConfirm(true)}
            title="チャットクリア"
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.textMuted,
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* メッセージ一覧 */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 8px',
          position: 'relative',
        }}
      >
        {hasMore && (
          <button
            onClick={() => {
              isLoadingMoreRef.current = true;
              onLoadMore();
            }}
            disabled={loading}
            style={{
              display: 'block',
              width: '100%',
              padding: '4px',
              marginBottom: '4px',
              background: theme.bgInput,
              border: 'none',
              borderRadius: 0,
              color: theme.textSecondary,
              fontSize: '11px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '読み込み中...' : 'もっと読み込む'}
          </button>
        )}

        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>

      {/* 新着バッジ */}
      {hasNewMessage && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={scrollToBottom}
            style={{
              position: 'absolute',
              bottom: '4px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: theme.accent,
              color: theme.textOnAccent,
              border: 'none',
              borderRadius: 0,
              padding: '2px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              zIndex: 1,
            }}
          >
            ↓ 新着あり
          </button>
        </div>
      )}

      {/* 入力エリア */}
      <div
        style={{
          padding: '6px 8px',
          borderTop: `1px solid ${theme.border}`,
          display: 'flex',
          flexDirection: 'column',
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

        <div style={{ display: 'flex', gap: '4px' }}>
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

      {showClearConfirm && onClearMessages && (
        <ConfirmModal
          message="チャットログを全件削除しますか？"
          confirmLabel="削除"
          danger
          onConfirm={() => { setShowClearConfirm(false); onClearMessages(); }}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  );
};

export default ChatPanel;
