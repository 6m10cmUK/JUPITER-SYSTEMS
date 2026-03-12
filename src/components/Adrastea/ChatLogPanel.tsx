import React, { useCallback, useEffect, useRef, useState } from 'react';
import { theme } from '../../styles/theme';
import { Trash2 } from 'lucide-react';
import type { ChatMessage } from '../../types/adrastea.types';
import { ConfirmModal } from './ui';

interface ChatLogPanelProps {
  messages: ChatMessage[];
  loading: boolean;
  hasMore: boolean;
  roomName?: string;
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

const ChatLogPanel: React.FC<ChatLogPanelProps> = ({
  messages,
  loading,
  hasMore,
  roomName,
  onLoadMore,
  onClearMessages,
}) => {
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
          ログ
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

export default ChatLogPanel;
