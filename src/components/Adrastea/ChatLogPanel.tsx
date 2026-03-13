import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { theme } from '../../styles/theme';
import { Trash2 } from 'lucide-react';
import type { ChatMessage, Character } from '../../types/adrastea.types';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { ConfirmModal } from './ui';
import { genId } from '../../utils/id';

/**
 * インラインマークアップをパースしてReact要素の配列を返す
 * サポート構文:
 * - **テキスト** → <strong>
 * - *テキスト* → <em>
 * - ~~テキスト~~ → <span style="text-decoration: line-through">
 * - [color=#ff0000]テキスト[/color] → <span style="color: #ff0000">
 */

const parseMarkup = (text: string): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyCounter = 0;

  // 全マークアップに対する正規表現（優先度順）
  // <color=#...>...</color>, **...**, ~~...~~, *...*
  const markupRegex = /(<color=#[a-fA-F0-9]{6}>.*?<\/color>|\*\*.*?\*\*|~~.*?~~|\*.*?\*)/g;

  let match: RegExpExecArray | null;
  const regex = new RegExp(markupRegex);

  while ((match = regex.exec(text)) !== null) {
    const matchText = match[0];
    const matchIndex = match.index;

    // マッチ前のプレーンテキストを追加
    if (matchIndex > lastIndex) {
      elements.push(
        <React.Fragment key={`text-${keyCounter++}`}>
          {text.slice(lastIndex, matchIndex)}
        </React.Fragment>
      );
    }

    // マークアップをパース
    let element: React.ReactNode | null = null;

    // <color=#...>...</color>
    if (matchText.startsWith('<color=')) {
      const colorMatch = matchText.match(/<color=(#[a-fA-F0-9]{6})>(.*?)<\/color>/);
      if (colorMatch) {
        const [, colorValue, content] = colorMatch;
        element = (
          <span key={`markup-${keyCounter++}`} style={{ color: colorValue }}>
            {content}
          </span>
        );
      }
    }
    // **テキスト**
    else if (matchText.startsWith('**') && matchText.endsWith('**')) {
      const content = matchText.slice(2, -2);
      element = (
        <strong key={`markup-${keyCounter++}`}>
          {content}
        </strong>
      );
    }
    // ~~テキスト~~
    else if (matchText.startsWith('~~') && matchText.endsWith('~~')) {
      const content = matchText.slice(2, -2);
      element = (
        <span key={`markup-${keyCounter++}`} style={{ textDecoration: 'line-through' }}>
          {content}
        </span>
      );
    }
    // *テキスト*
    else if (matchText.startsWith('*') && matchText.endsWith('*')) {
      const content = matchText.slice(1, -1);
      element = (
        <em key={`markup-${keyCounter++}`}>
          {content}
        </em>
      );
    }

    if (element) {
      elements.push(element);
    }

    lastIndex = matchIndex + matchText.length;
  }

  // 末尾のプレーンテキストを追加
  if (lastIndex < text.length) {
    elements.push(
      <React.Fragment key={`text-${keyCounter++}`}>
        {text.slice(lastIndex)}
      </React.Fragment>
    );
  }

  // テキストが空の場合は元のテキストを返す
  return elements.length === 0 ? [text] : elements;
};

/**
 * 行頭の # でフォントサイズを変える構文に対応したパーサー
 * サポート構文:
 * - # テキスト → 18px
 * - ## テキスト → 15px
 * - ### テキスト → 13px
 * 各行のインラインマークアップも parseMarkup で処理される
 */
const parseContent = (text: string): React.ReactNode => {
  const lines = text.split('\n');

  return (
    <>
      {lines.map((line, lineIndex) => {
        // 行頭の # 数を確認
        let hashCount = 0;
        let i = 0;
        while (i < line.length && line[i] === '#') {
          hashCount++;
          i++;
        }

        // フォントサイズを決定
        let fontSize = '12px'; // デフォルト
        if (hashCount === 1) {
          fontSize = '18px';
        } else if (hashCount === 2) {
          fontSize = '15px';
        } else if (hashCount === 3) {
          fontSize = '13px';
        }

        // # を除いたテキスト（先頭のスペースも削除）
        const contentText = hashCount > 0 ? line.slice(hashCount).trimStart() : line;

        // # がない場合は hashCount = 0 なので contentText = line のままになる
        if (hashCount === 0) {
          // 通常の行
          return (
            <div key={lineIndex} style={{ fontSize: '12px' }}>
              {parseMarkup(line)}
            </div>
          );
        } else {
          // ヘッダー行
          return (
            <div key={lineIndex} style={{ fontSize }}>
              {parseMarkup(contentText)}
            </div>
          );
        }
      })}
    </>
  );
};

interface ChatLogPanelProps {
  messages: ChatMessage[];
  loading: boolean;
  hasMore: boolean;
  roomName?: string;
  characters?: Character[];
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

const FallbackAvatar: React.FC<{ name: string; color?: string | null }> = ({ name, color }) => (
  <div
    style={{
      width: 24,
      height: 24,
      borderRadius: '50%',
      background: color ?? theme.bgInput,
      flexShrink: 0,
    }}
  />
);

const Avatar: React.FC<{ src?: string | null; name: string; color?: string | null }> = ({ src, name, color }) => {
  if (src) {
    return (
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: color ?? undefined,
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        <img
          src={src}
          alt={name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top',
            display: 'block',
          }}
        />
      </div>
    );
  }
  return <FallbackAvatar name={name} color={color} />;
};

const ChatLogPanel: React.FC<ChatLogPanelProps> = ({
  messages,
  loading,
  hasMore,
  roomName,
  characters,
  onLoadMore,
  onClearMessages,
}) => {
  const { activeChatChannel, setActiveChatChannel, channels, upsertChannel } = useAdrasteaContext();
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const createInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(messages.length);
  const isLoadingMoreRef = useRef(false);

  // アクティブチャンネルでメッセージをフィルタ
  const filteredMessages = useMemo(
    () => messages.filter(m => (m.channel ?? 'main') === activeChatChannel),
    [messages, activeChatChannel]
  );

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
    if (filteredMessages.length > prevMessageCountRef.current) {
      if (!isLoadingMoreRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setHasNewMessage(false);
      }
      isLoadingMoreRef.current = false;
    }
    prevMessageCountRef.current = filteredMessages.length;
  }, [filteredMessages.length]);

  useEffect(() => {
    if (!loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasNewMessage(false);
  };

  // フォーカス時に入力欄にフォーカス
  useEffect(() => {
    if (showCreateChannel) {
      setTimeout(() => createInputRef.current?.focus(), 0);
    }
  }, [showCreateChannel]);

  const handleCreateChannel = async () => {
    const trimmed = newChannelName.trim();
    if (!trimmed) {
      setShowCreateChannel(false);
      setNewChannelName('');
      return;
    }

    const newChannelId = genId();
    await upsertChannel({
      channel_id: newChannelId,
      label: trimmed,
      order: channels.length,
      is_archived: false,
      allowed_user_ids: [],
    });

    setActiveChatChannel(newChannelId);
    setShowCreateChannel(false);
    setNewChannelName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateChannel();
    } else if (e.key === 'Escape') {
      setShowCreateChannel(false);
      setNewChannelName('');
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    const charColor = characters?.find(c => c.name === msg.sender_name)?.color ?? null;
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
          <Avatar src={msg.sender_avatar} name={msg.sender_name} color={charColor} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: charColor ?? accent, fontSize: '11px', fontWeight: 600, textShadow: charColor ? '0 1px 3px rgba(0,0,0,0.7)' : undefined }}>
                🎲 {msg.sender_name}
              </span>
              <span style={{ color: theme.textMuted, fontSize: '10px' }}>
                {formatTime(msg.created_at)}
              </span>
            </div>
            <div style={{ color: accent, fontSize: '12px', marginTop: '1px' }}>
              {parseContent(msg.content)}
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
        <Avatar src={msg.sender_avatar} name={msg.sender_name} color={charColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: charColor ?? theme.textSecondary, fontSize: '11px', fontWeight: 600, textShadow: charColor ? '0 1px 3px rgba(0,0,0,0.7)' : undefined }}>
              {msg.sender_name}
            </span>
            <span style={{ color: theme.textMuted, fontSize: '10px' }}>
              {formatTime(msg.created_at)}
            </span>
          </div>
          <div style={{ color: theme.textPrimary, fontSize: '12px', marginTop: '1px' }}>
            {parseContent(msg.content)}
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

      {/* チャンネルタブ */}
      {channels.length >= 1 && (
        <div
          style={{
            display: 'flex',
            gap: '2px',
            padding: '4px 8px',
            borderBottom: `1px solid ${theme.border}`,
            overflowX: 'auto',
            alignItems: 'center',
          }}
        >
          {channels.map((ch) => (
            <button
              key={ch.channel_id}
              onClick={() => setActiveChatChannel(ch.channel_id)}
              style={{
                padding: '4px 10px',
                background: activeChatChannel === ch.channel_id ? theme.bgInput : 'transparent',
                color: activeChatChannel === ch.channel_id ? theme.textPrimary : theme.textSecondary,
                border: 'none',
                borderBottom: activeChatChannel === ch.channel_id ? `2px solid ${theme.accent}` : 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: activeChatChannel === ch.channel_id ? 600 : 400,
                whiteSpace: 'nowrap',
                transition: 'background 0.2s, color 0.2s',
              }}
              title={ch.label}
            >
              {ch.label}
            </button>
          ))}

          {/* チャンネル作成フォーム（展開時） */}
          {showCreateChannel && (
            <input
              ref={createInputRef}
              type="text"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              onBlur={handleCreateChannel}
              onKeyDown={handleKeyDown}
              placeholder="チャンネル名"
              style={{
                padding: '4px 6px',
                background: theme.bgInput,
                border: `1px solid ${theme.border}`,
                color: theme.textPrimary,
                fontSize: '11px',
                flex: 1,
                minWidth: '80px',
                maxWidth: '150px',
                outline: 'none',
              }}
            />
          )}

          {/* 「+」ボタン */}
          {!showCreateChannel && (
            <button
              onClick={() => setShowCreateChannel(true)}
              title="チャンネルを作成"
              style={{
                background: 'transparent',
                border: 'none',
                color: theme.textMuted,
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: '14px',
                marginLeft: 'auto',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = theme.textSecondary;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = theme.textMuted;
              }}
            >
              +
            </button>
          )}
        </div>
      )}

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

        {filteredMessages.map(renderMessage)}
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
