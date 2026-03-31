import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
import { Trash2, MoreVertical, Plus, Download } from 'lucide-react';
import type { ChatMessage, Character, ChatChannel } from '../../types/adrastea.types';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { useAuth } from '../../contexts/AuthContext';
import { DEFAULT_CHANNELS } from '../../hooks/useChannels';
import { resolveAssetId } from '../../hooks/useAssets';
import { ConfirmModal, DropdownMenu, Tooltip } from './ui';
import { genId } from '../../utils/id';
import { API_BASE_URL } from '../../config/api';

// スピナーアニメーション用のスタイル注入
if (typeof document !== 'undefined' && !document.getElementById('chat-spinner-style')) {
  const style = document.createElement('style');
  style.id = 'chat-spinner-style';
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}

/**
 * インラインマークアップをパースしてReact要素の配列を返す
 * サポート構文:
 * - **テキスト** → <strong>
 * - *テキスト* → <em>
 * - ~~テキスト~~ → <span style="text-decoration: line-through">
 * - [color=#ff0000]テキスト[/color] → <span style="color: #ff0000">
 */

export const parseMarkup = (text: string): React.ReactNode[] => {
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
export const parseContent = (text: string): React.ReactNode => {
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
  loadingMore: boolean;
  hasMore: boolean;
  roomName?: string;
  roomId?: string;
  authToken?: string;
  characters?: Character[];
  onLoadMore: () => void | Promise<void>;
  onClearMessages?: () => void;
  onOpenSecretDice?: (messageId: string) => Promise<void>;
}

const formatTime = (timestamp: number): string => {
  const d = new Date(timestamp);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

function generateLogHtml(messages: ChatMessage[], channelFilter: string | null, characters: Character[], roomName?: string): string {
  const filtered = messages.filter(m => {
    if (m.message_type === 'system') return false;
    if (channelFilter !== null && (m.channel ?? 'main') !== channelFilter) return false;
    return true;
  });
  const lines = filtered.map(m => {
    const charColor = characters.find(c => c.name === m.sender_name)?.color ?? '#888888';
    const ch = m.channel ?? 'main';
    const content = m.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const name = m.sender_name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<p style="color:${charColor}">
  <span> [${ch}]</span>
  <span>${name}</span> :
  <span>
    ${content}
  </span>
</p>`;
  });
  const title = roomName ? `ログ - ${roomName}` : 'ログ';
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body>

${lines.join('\n\n')}

</body>
</html>`;
}

function downloadLog(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const MAX_LOG_MESSAGES = 10000;

async function fetchAllArchivedMessages(roomId: string, token: string, existingMessages: ChatMessage[]): Promise<ChatMessage[]> {
  const allArchived: ChatMessage[] = [];
  // existingMessages の最古の created_at を起点にする（それより古いものだけD1から取る）
  const oldestExisting = existingMessages.length > 0
    ? existingMessages[0].created_at
    : Date.now();
  let before = oldestExisting;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({ before: String(before), limit: '200' });
    const res = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/messages?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;
    const data = await res.json() as { messages: any[]; has_more: boolean };
    hasMore = data.has_more;
    if (data.messages.length === 0) break;
    const msgs: ChatMessage[] = data.messages.map((m: any) => ({
      id: m.id,
      room_id: m.room_id,
      sender_name: m.sender_name,
      sender_uid: m.sender_uid ?? undefined,
      sender_avatar_asset_id: m.sender_avatar_asset_id ?? null,
      content: m.content,
      message_type: m.message_type as ChatMessage['message_type'],
      channel: m.channel ?? 'main',
      allowed_user_ids: m.allowed_user_ids,
      created_at: m.created_at,
    }));
    allArchived.push(...msgs);
    if (allArchived.length >= MAX_LOG_MESSAGES) {
      allArchived.splice(MAX_LOG_MESSAGES);
      break;
    }
    before = msgs[msgs.length - 1].created_at;
  }
  return allArchived;
}

const getDiceAccentColor = (content: string): string => {
  if (content.includes('成功') || content.includes('クリティカル')) return theme.success;
  if (content.includes('失敗') || content.includes('ファンブル')) return theme.danger;
  return theme.accent;
};

const FallbackAvatar: React.FC<{ name: string; color?: string | null }> = ({ name: _name, color }) => (
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
  onReclick,
  hasUnread,
}: {
  channel: ChatChannel;
  isActive: boolean;
  onSelect: () => void;
  onReclick: () => void;
  hasUnread?: boolean;
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
      className={`adra-btn adra-tab${isActive ? ' adra-tab--active' : ''}`}
      onClick={() => isActive ? onReclick() : onSelect()}
      style={{
        padding: '6px 12px',
        background: isActive ? theme.bgSurface : undefined,
        border: 'none',
        borderBottom: isActive ? `2px solid ${theme.accent}` : '2px solid transparent',
        cursor: isDragging ? 'grabbing' : 'grab',
        fontSize: '12px',
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
      {hasUnread && (
        <span style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: theme.accent,
          marginLeft: '4px',
          verticalAlign: 'middle',
        }} />
      )}
    </button>
  );
}

const ChatLogPanel: React.FC<ChatLogPanelProps> = ({
  messages,
  loading,
  loadingMore,
  hasMore,
  roomName: _roomName,
  roomId,
  authToken,
  characters,
  onLoadMore,
  onClearMessages,
  onOpenSecretDice,
}) => {
  const { activeChatChannel, setActiveChatChannel, channels, upsertChannel, deleteChannel } = useAdrasteaContext();
  const { user } = useAuth();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [pendingDeleteChannel, setPendingDeleteChannel] = useState<ChatChannel | null>(null);

  // チャンネルごとの最終確認メッセージ数
  const lastSeenCountRef = useRef<Map<string, number>>(new Map());

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(messages.length);
  const isLoadingMoreRef = useRef(false);
  const initialLoadRef = useRef(true);

  // アクティブチャンネルでメッセージをフィルタ
  const filteredMessages = useMemo(
    () => messages.filter(m => {
      if ((m.channel ?? 'main') !== activeChatChannel) return false;
      // 送信者自身の秘密ダイス通知を非表示（結果メッセージだけ表示）
      if (m.content === 'シークレットダイス' && m.sender_uid === user?.uid) return false;
      return true;
    }),
    [messages, activeChatChannel, user?.uid]
  );

  // 未読チャンネルを検出
  const unreadChannels = useMemo(() => {
    const unread = new Set<string>();
    const channelIds = channels.map(ch => ch.channel_id);
    for (const chId of channelIds) {
      const count = messages.filter(m => (m.channel ?? 'main') === chId).length;
      const lastSeen = lastSeenCountRef.current.get(chId) ?? 0;
      if (count > lastSeen) {
        unread.add(chId);
      }
    }
    return unread;
  }, [messages, channels]);

  // アクティブチャンネルの既読を更新（チャンネル切り替え時 or 下端スクロール時）
  useEffect(() => {
    if (isNearBottomRef.current) {
      const count = messages.filter(m => (m.channel ?? 'main') === activeChatChannel).length;
      lastSeenCountRef.current.set(activeChatChannel, count);
    }
  }, [activeChatChannel, messages]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 80;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    // スクロール位置をリアルタイム保存（チャンネル切替時の復元用）
    scrollPositionMap.current.set(activeChatChannel, el.scrollTop);
    if (isNearBottomRef.current) {
      // 下端到達 → アクティブチャンネルの既読を更新
      const count = messages.filter(m => (m.channel ?? 'main') === activeChatChannel).length;
      lastSeenCountRef.current.set(activeChatChannel, count);
    }
  }, [messages, activeChatChannel]);

  // 上端センチネル: 可視になったら過去ログ読み込み
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !isLoadingMoreRef.current) {
          isLoadingMoreRef.current = true;
          const prevScrollHeight = container.scrollHeight;
          Promise.resolve(onLoadMore()).then(() => {
            requestAnimationFrame(() => {
              const newScrollHeight = container.scrollHeight;
              container.scrollTop = newScrollHeight - prevScrollHeight;
              isLoadingMoreRef.current = false;
            });
          }).catch(() => {
            isLoadingMoreRef.current = false;
          });
        }
      },
      { root: container, rootMargin: '200px 0px 0px 0px', threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  // チャンネル切替時のスクロール位置保存・復元
  const prevChannelRef = useRef(activeChatChannel);
  const scrollPositionMap = useRef<Map<string, number>>(new Map());

  // ① チャンネル切替時: RAF で paint 後に復元
  useEffect(() => {
    if (prevChannelRef.current === activeChatChannel) return;
    prevChannelRef.current = activeChatChannel;
    prevMessageCountRef.current = filteredMessages.length;
    const savedChannel = activeChatChannel;
    requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const saved = scrollPositionMap.current.get(savedChannel);
      if (saved !== undefined) {
        container.scrollTop = saved;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      }
    });
  }, [activeChatChannel]);

  // ② 新着メッセージ時: 下端にいるなら自動スクロール
  useEffect(() => {
    if (filteredMessages.length <= prevMessageCountRef.current) {
      prevMessageCountRef.current = filteredMessages.length;
      return;
    }
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
    } else if (!isLoadingMoreRef.current && isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCountRef.current = filteredMessages.length;
  }, [filteredMessages.length]);

  useEffect(() => {
    if (!loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [loading]);

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

  const renderMessage = useCallback((msg: ChatMessage) => {
    const charColor = characters?.find(c => c.name === msg.sender_name)?.color ?? null;
    if (msg.message_type === 'system') {
      return (
        <div
          key={msg.id}
          style={{
            textAlign: 'center',
            color: theme.textMuted,
            fontSize: '12px',
            padding: '2px 0',
          }}
        >
          {msg.content}
        </div>
      );
    }

    if (msg.message_type === 'dice') {
      const accent = getDiceAccentColor(msg.content);
      const isSecretDice = msg.allowed_user_ids && msg.allowed_user_ids.length > 0;
      const isSender = user?.uid === msg.sender_uid;
      const canOpen = isSecretDice && isSender;

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
          <Avatar src={resolveAssetId(msg.sender_avatar_asset_id)} name={msg.sender_name} color={charColor} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: charColor ?? accent, fontSize: '11px', fontWeight: 600, textShadow: charColor ? '0 1px 3px rgba(0,0,0,0.7)' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                🎲 {msg.sender_name}
              </span>
              <span style={{ color: theme.textMuted, fontSize: '10px' }}>
                {formatTime(msg.created_at)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
              <div style={{ color: theme.textPrimary, fontSize: '12px', flex: 1 }}>
                {parseContent(msg.content)}
              </div>
              {canOpen && onOpenSecretDice && (
                <button
                  type="button"
                  onClick={() => onOpenSecretDice(msg.id)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: theme.textPrimary,
                    background: theme.bgInput,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '3px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = theme.bgHover ?? theme.bgInput;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = theme.bgInput;
                  }}
                >
                  オープン
                </button>
              )}
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
        <Avatar src={resolveAssetId(msg.sender_avatar_asset_id)} name={msg.sender_name} color={charColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: charColor ?? theme.textSecondary, fontSize: '11px', fontWeight: 600, textShadow: charColor ? '0 1px 3px rgba(0,0,0,0.7)' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
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
  }, [characters, user, onOpenSecretDice]);

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
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY * 0.3;
              e.preventDefault();
            }
          }}
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
              className={`adra-btn adra-tab${activeChatChannel === ch.channel_id ? ' adra-tab--active' : ''}`}
              onClick={() => {
                if (activeChatChannel === ch.channel_id) {
                  // アクティブタブ再クリック → 一番下にスクロール + 既読更新
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  const count = messages.filter(m => (m.channel ?? 'main') === ch.channel_id).length;
                  lastSeenCountRef.current.set(ch.channel_id, count);
                } else {
                  setActiveChatChannel(ch.channel_id);
                }
              }}
              style={{
                padding: '6px 12px',
                background: activeChatChannel === ch.channel_id ? theme.bgSurface : undefined,
                border: 'none',
                borderBottom: activeChatChannel === ch.channel_id ? `2px solid ${theme.accent}` : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: activeChatChannel === ch.channel_id ? 600 : 400,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              title={ch.label}
            >
              {ch.label}
              {unreadChannels.has(ch.channel_id) && (
                <span style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: theme.accent,
                  marginLeft: '4px',
                  verticalAlign: 'middle',
                }} />
              )}
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
                    onReclick={() => {
                      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                      const count = messages.filter(m => (m.channel ?? 'main') === ch.channel_id).length;
                      lastSeenCountRef.current.set(ch.channel_id, count);
                    }}
                    hasUnread={unreadChannels.has(ch.channel_id)}
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
              maxLength={128}
              style={{
                padding: '4px 6px',
                background: theme.bgInput,
                border: `1px solid ${theme.border}`,
                color: theme.textPrimary,
                fontSize: '12px',
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
            <DropdownMenu
              trigger={
                <Tooltip label="メニュー">
                  <button
                    type="button"
                    className="adra-btn adra-btn--ghost"
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
                </Tooltip>
              }
              items={[
                {
                  label: 'チャンネルを追加',
                  icon: <Plus size={14} />,
                  onClick: () => setShowCreateChannel(true),
                },
                {
                  label: 'チャンネルを削除',
                  icon: <Trash2 size={14} />,
                  disabled: !canDeleteActiveChannel,
                  onClick: () => {
                    if (!canDeleteActiveChannel || !activeChannel) return;
                    setPendingDeleteChannel(activeChannel);
                  },
                },
                ...(onClearMessages
                  ? [
                      'separator' as const,
                      {
                        label: 'チャットをクリア',
                        icon: <Trash2 size={14} />,
                        onClick: () => setShowClearConfirm(true),
                      },
                    ]
                  : []),
                'separator' as const,
                {
                  label: 'ログ出力',
                  icon: <Download size={14} />,
                  onClick: async () => {
                    let allMessages = messages;
                    if (roomId && authToken) {
                      const archived = await fetchAllArchivedMessages(roomId, authToken, messages);
                      // D1 + 既存メッセージを ID 重複排除でマージ
                      const merged = new Map<string, ChatMessage>();
                      for (const m of archived) merged.set(m.id, m);
                      for (const m of messages) merged.set(m.id, m);
                      allMessages = Array.from(merged.values()).sort((a, b) => a.created_at - b.created_at);
                    }
                    const html = generateLogHtml(allMessages, activeChatChannel, characters ?? [], _roomName);
                    const chName = activeChatChannel === 'main' ? 'メイン' : activeChatChannel;
                    downloadLog(html, `log_${chName}.html`);
                  },
                },
                {
                  label: '全ログ出力',
                  icon: <Download size={14} />,
                  onClick: async () => {
                    let allMessages = messages;
                    if (roomId && authToken) {
                      const archived = await fetchAllArchivedMessages(roomId, authToken, messages);
                      const merged = new Map<string, ChatMessage>();
                      for (const m of archived) merged.set(m.id, m);
                      for (const m of messages) merged.set(m.id, m);
                      allMessages = Array.from(merged.values()).sort((a, b) => a.created_at - b.created_at);
                    }
                    const html = generateLogHtml(allMessages, null, characters ?? [], _roomName);
                    downloadLog(html, 'log_all.html');
                  },
                },
              ]}
            />
          )}
        </div>
      </div>

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
        className="ad-selectable"
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 8px',
          position: 'relative',
        }}
      >
        {/* 上端センチネル + ローディング */}
        <div ref={sentinelRef} style={{ height: '1px' }} />
        {hasMore && loadingMore && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '8px',
              minHeight: '32px',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                border: `2px solid ${theme.textSecondary}`,
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          </div>
        )}

        {filteredMessages.map(renderMessage)}
        <div ref={messagesEndRef} />
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

export default ChatLogPanel;
