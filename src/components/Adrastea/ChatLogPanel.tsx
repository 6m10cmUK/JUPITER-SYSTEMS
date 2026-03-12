import React, { useCallback, useEffect, useRef, useState } from 'react';
import { theme } from '../../styles/theme';
import { Trash2 } from 'lucide-react';
import type { ChatMessage, Character } from '../../types/adrastea.types';
import { ConfirmModal } from './ui';

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
      if (!isLoadingMoreRef.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setHasNewMessage(false);
      }
      isLoadingMoreRef.current = false;
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (!loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasNewMessage(false);
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
              <span style={{ color: charColor ?? accent, fontSize: '11px', fontWeight: 600 }}>
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
            <span style={{ color: charColor ?? theme.textSecondary, fontSize: '11px', fontWeight: 600 }}>
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
