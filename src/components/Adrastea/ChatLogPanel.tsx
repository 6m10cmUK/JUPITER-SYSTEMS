import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { theme } from '../../styles/theme';
import { Trash2, MoreVertical, Plus } from 'lucide-react';
import type { ChatMessage, Character, ChatChannel } from '../../types/adrastea.types';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { DEFAULT_CHANNELS } from '../../hooks/useChannels';
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

function SortableChannelTab({
  channel,
  isActive,
  onSelect,
}: {
  channel: ChatChannel;
  isActive: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: channel.channel_id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`ad-btn ad-tab${isActive ? ' ad-tab--active' : ''}`}
      onClick={onSelect}
      style={{
        padding: '6px 12px',
        background: isActive ? theme.bgSurface : undefined,
        border: 'none',
        borderBottom: isActive ? `2px solid ${theme.accent}` : '2px solid transparent',
        cursor: isDragging ? 'grabbing' : 'grab',
        fontSize: '11px',
        fontWeight: isActive ? 600 : 400,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...style,
      }}
      title={channel.label}
      {...attributes}
      {...listeners}
    >
      {channel.label}
    </button>
  );
}

const ChatLogPanel: React.FC<ChatLogPanelProps> = ({
  messages,
  loading,
  hasMore,
  roomName,
  characters,
  onLoadMore,
  onClearMessages,
}) => {
  const { activeChatChannel, setActiveChatChannel, channels, upsertChannel, deleteChannel } = useAdrasteaContext();
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [pendingDeleteChannel, setPendingDeleteChannel] = useState<ChatChannel | null>(null);

  const canDeleteActiveChannel = useMemo(
    () => !DEFAULT_CHANNELS.some((dc) => dc.channel_id === activeChatChannel),
    [activeChatChannel]
  );
  const activeChannel = useMemo(
    () => channels.find((ch) => ch.channel_id === activeChatChannel) ?? null,
    [channels, activeChatChannel]
  );

  const fixedChannels = useMemo(
    () => channels.filter((ch) => DEFAULT_CHANNELS.some((dc) => dc.channel_id === ch.channel_id)),
    [channels]
  );
  const customChannels = useMemo(
    () => channels.filter((ch) => !DEFAULT_CHANNELS.some((dc) => dc.channel_id === ch.channel_id)),
    [channels]
  );

  const [optimisticCustomOrder, setOptimisticCustomOrder] = useState<string[] | null>(null);
  const displayCustomChannels = useMemo(() => {
    if (!optimisticCustomOrder?.length) return customChannels;
    return optimisticCustomOrder
      .map((id) => customChannels.find((c) => c.channel_id === id))
      .filter(Boolean) as ChatChannel[];
  }, [customChannels, optimisticCustomOrder]);

  useEffect(() => {
    if (
      optimisticCustomOrder &&
      customChannels.length === optimisticCustomOrder.length &&
      customChannels.every((c, i) => c.channel_id === optimisticCustomOrder[i])
    ) {
      setOptimisticCustomOrder(null);
    }
  }, [customChannels, optimisticCustomOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleChannelDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = customChannels.findIndex((ch) => ch.channel_id === active.id);
      const newIndex = customChannels.findIndex((ch) => ch.channel_id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(customChannels, oldIndex, newIndex);
      setOptimisticCustomOrder(reordered.map((c) => c.channel_id));
      const baseOrder = DEFAULT_CHANNELS.length;
      reordered.forEach((ch, i) => {
        upsertChannel({ ...ch, order: baseOrder + i });
      });
    },
    [customChannels, upsertChannel]
  );

  const createInputRef = useRef<HTMLInputElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuBtnRef.current?.contains(target)) return;
      setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const openMenu = () => {
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (rect) setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
    setShowMenu(true);
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
      {/* チャンネルタブ（スクロール）＋ 右端に常時表示のメニュー */}
      <div
        style={{
          position: 'relative',
          flexShrink: 0,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '2px',
            padding: '4px 8px',
            paddingRight: 40,
            overflowX: 'auto',
            alignItems: 'center',
          }}
        >
          {/* メイン・情報・雑談は固定（並び替え不可） */}
          {fixedChannels.map((ch) => (
            <button
              key={ch.channel_id}
              type="button"
              className={`ad-btn ad-tab${activeChatChannel === ch.channel_id ? ' ad-tab--active' : ''}`}
              onClick={() => setActiveChatChannel(ch.channel_id)}
              style={{
                padding: '6px 12px',
                background: activeChatChannel === ch.channel_id ? theme.bgSurface : undefined,
                border: 'none',
                borderBottom: activeChatChannel === ch.channel_id ? `2px solid ${theme.accent}` : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: activeChatChannel === ch.channel_id ? 600 : 400,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              title={ch.label}
            >
              {ch.label}
            </button>
          ))}

          {/* カスタムチャンネルのみ DnD で並び替え（楽観的更新で一瞬戻るのを防ぐ） */}
          {displayCustomChannels.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleChannelDragEnd}
            >
              <SortableContext
                items={displayCustomChannels.map((c) => c.channel_id)}
                strategy={horizontalListSortingStrategy}
              >
                {displayCustomChannels.map((ch) => (
                  <SortableChannelTab
                    key={ch.channel_id}
                    channel={ch}
                    isActive={activeChatChannel === ch.channel_id}
                    onSelect={() => setActiveChatChannel(ch.channel_id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}

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
        </div>

        {/* 右端に常時表示（タブのスクロールはこの背後に隠れる） */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            paddingRight: '4px',
            background: theme.bgSurface,
            boxShadow: '-4px 0 8px rgba(0,0,0,0.2)',
            zIndex: 1,
          }}
        >
          {!showCreateChannel && (
            <button
              ref={menuBtnRef}
              type="button"
              className="ad-btn ad-btn--ghost"
              onClick={() => (showMenu ? setShowMenu(false) : openMenu())}
              title="メニュー"
              style={{
                border: 'none',
                color: theme.textSecondary,
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MoreVertical size={16} />
            </button>
          )}
        </div>
      </div>

      {/* メニュードロップダウン */}
      {showMenu && createPortal(
        <div
          className="adrastea-root"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            minWidth: '160px',
            background: theme.bgElevated,
            border: `1px solid ${theme.border}`,
            boxShadow: theme.shadowMd,
            zIndex: 10000,
            padding: '4px 0',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="ad-list-item"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              color: theme.textPrimary,
              fontSize: '12px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onClick={() => {
              setShowCreateChannel(true);
              setShowMenu(false);
            }}
          >
            <Plus size={14} />
            チャンネルを追加
          </button>
          <button
            type="button"
            className="ad-list-item"
            disabled={!canDeleteActiveChannel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              color: canDeleteActiveChannel ? theme.textPrimary : theme.textMuted,
              fontSize: '12px',
              cursor: canDeleteActiveChannel ? 'pointer' : 'not-allowed',
              textAlign: 'left',
              opacity: canDeleteActiveChannel ? 1 : 0.6,
            }}
            onClick={() => {
              if (!canDeleteActiveChannel || !activeChannel) return;
              setPendingDeleteChannel(activeChannel);
              setShowMenu(false);
            }}
          >
            <Trash2 size={14} />
            チャンネルを削除
          </button>
          {onClearMessages && (
            <button
              type="button"
              className="ad-list-item"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                color: theme.danger,
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onClick={() => {
                setShowClearConfirm(true);
                setShowMenu(false);
              }}
            >
              <Trash2 size={14} />
              チャットをクリア
            </button>
          )}
        </div>,
        document.body
      )}

      {pendingDeleteChannel && (
        <ConfirmModal
          message={`「${pendingDeleteChannel.label}」を削除しますか？`}
          confirmLabel="削除"
          danger
          onConfirm={() => {
            const id = pendingDeleteChannel.channel_id;
            deleteChannel(id);
            if (activeChatChannel === id) setActiveChatChannel('main');
            setPendingDeleteChannel(null);
          }}
          onCancel={() => setPendingDeleteChannel(null)}
        />
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
            className="ad-btn ad-btn--ghost"
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
              background: 'transparent',
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
