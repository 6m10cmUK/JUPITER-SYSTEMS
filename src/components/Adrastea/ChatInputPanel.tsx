import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { User, SendHorizonal, Maximize2, Minimize2 } from 'lucide-react';
import { theme } from '../../styles/theme';
import type { Character } from '../../types/adrastea.types';
import { Tooltip, DropdownMenu } from './ui';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { resolveTemplateVars } from './utils/chatEditorUtils';
import ChatEditor from './ChatEditor';
import type { ChatEditorHandle } from './ChatEditor';

interface ChatInputPanelProps {
  characters?: Character[];
  onSendMessage: (content: string, messageType: 'chat' | 'dice' | 'system', characterName?: string, characterAvatar?: string | null) => void;
}

const ChatInputPanel: React.FC<ChatInputPanelProps> = ({
  characters = [],
  onSendMessage,
}) => {
  const ctx = useAdrasteaContext();
  const [senderName, setSenderName] = useState(() => localStorage.getItem('adrastea-last-sender') ?? '');
  const editorRef = useRef<ChatEditorHandle>(null);
  const modalEditorRef = useRef<ChatEditorHandle>(null);
  const [expanded, setExpanded] = useState(false);

  const selectedCharacterForIcon = useMemo(
    () => (senderName ? (characters.find((c) => c.name === senderName) ?? null) : null),
    [characters, senderName]
  );

  // マウント時に senderName → activeSpeakerCharId を同期
  useEffect(() => {
    if (!senderName) return;
    const found = characters.find((c) => c.name === senderName) ?? null;
    ctx.setActiveSpeakerCharId(found?.id ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characters]);

  // チャットパレットからのテキスト注入
  useEffect(() => {
    if (ctx.chatInjectText === null) return;
    const el = editorRef.current;
    if (!el) return;
    // 現在のテキストの末尾に追加（空なら置き換え）
    const current = el.getText();
    const newText = current ? current + '\n' + ctx.chatInjectText : ctx.chatInjectText;
    el.setText(newText);
    ctx.setChatInjectText(null);
  }, [ctx.chatInjectText, ctx.setChatInjectText]);


  // expanded 切り替え時にテキストを同期
  const prevExpandedRef = useRef(false);
  useEffect(() => {
    if (expanded && !prevExpandedRef.current) {
      // 開く: メインのテキストをモーダルに転送
      requestAnimationFrame(() => {
        const text = editorRef.current?.getText() ?? '';
        modalEditorRef.current?.setText(text);
        modalEditorRef.current?.focus();
      });
    } else if (!expanded && prevExpandedRef.current) {
      // 閉じる: モーダルのテキストをメインに転送
      const text = modalEditorRef.current?.getText() ?? '';
      editorRef.current?.setText(text);
    }
    prevExpandedRef.current = expanded;
  }, [expanded]);

  const handleSend = useCallback((text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    const charName = senderName.trim() || 'noname';
    if (senderName.trim()) localStorage.setItem('adrastea-last-sender', senderName.trim());
    const charAvatar = selectedCharacterForIcon?.images[selectedCharacterForIcon.active_image_index]?.url ?? null;

    const resolved = resolveTemplateVars(trimmedText, selectedCharacterForIcon);
    onSendMessage(resolved, 'chat', charName, charAvatar);

    editorRef.current?.clear();
  }, [senderName, selectedCharacterForIcon, onSendMessage]);

  const handleSendFromModal = useCallback((text: string) => {
    handleSend(text);
    modalEditorRef.current?.clear();
  }, [handleSend]);




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
      {/* キャラクター選択エリア + 送信ボタン */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 0',
          position: 'relative',
        }}
      >
        <Tooltip label="キャラクター選択">
          <DropdownMenu
            trigger={
              <button
                className="adra-btn-icon"
                data-avatar={selectedCharacterForIcon ? 'true' : undefined}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: selectedCharacterForIcon
                    ? selectedCharacterForIcon.images[selectedCharacterForIcon.active_image_index]?.url
                      ? `url(${selectedCharacterForIcon.images[selectedCharacterForIcon.active_image_index]?.url}) top center/cover ${selectedCharacterForIcon.color}`
                      : selectedCharacterForIcon.color
                    : undefined,
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
                  <User size={14} color={theme.textSecondary} />
                ) : null}
              </button>
            }
            align="left"
            direction="down"
            items={characters.map(c => ({
              id: c.id,
              label: c.name,
              onClick: () => {
                setSenderName(c.name);
                ctx.setActiveSpeakerCharId(c.id);
              },
            }))}
            selectedId={ctx.activeSpeakerCharId ?? undefined}
            renderItem={(item, isSelected) => {
              const char = characters.find(c => c.id === item.id);
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '150px', minWidth: 0 }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    background: char?.color ?? theme.textMuted, overflow: 'hidden', flexShrink: 0,
                  }}>
                    {char?.images[char.active_image_index]?.url && (
                      <img src={char.images[char.active_image_index].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                    )}
                  </div>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{item.label}</span>
                  {isSelected && <span style={{ flexShrink: 0, color: theme.accent, fontSize: '10px' }}>●</span>}
                </div>
              );
            }}
          />
        </Tooltip>

        <input
            type="text"
            value={senderName}
            onChange={(e) => {
              const name = e.target.value;
              setSenderName(name);
              const found = characters.find((c) => c.name === name) ?? null;
              ctx.setActiveSpeakerCharId(found?.id ?? null);
            }}
            placeholder="noname"
            maxLength={128}
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

        <Tooltip label="送信">
          <button
            className="adra-btn"
            onClick={() => {
              const text = editorRef.current?.getText() ?? '';
              handleSend(text);
            }}
            title="送信"
            style={{
              width: '32px',
              height: '32px',
              minWidth: '32px',
              padding: 0,
              background: theme.accent,
              color: theme.textOnAccent,
              border: 'none',
              borderRadius: 0,
              cursor: 'pointer',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SendHorizonal size={16} />
          </button>
        </Tooltip>
      </div>

      {/* チャットエディタ */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <ChatEditor
          ref={editorRef}
          characters={characters}
          onSend={handleSend}
          enterToSend
          channels={ctx.channels}
          activeChannelId={ctx.activeChatChannel}
          onChannelChange={ctx.setActiveChatChannel}
        />
        <button
          onClick={() => setExpanded(true)}
          style={{ position: 'absolute', top: '4px', right: '4px', background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, padding: '2px', display: 'flex', opacity: 0.6 }}
          title="拡大"
        >
          <Maximize2 size={12} />
        </button>
      </div>


      {/* 拡大モーダル */}
      {expanded && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 10003, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setExpanded(false)}
        >
          <div
            style={{
              width: '80vw', maxWidth: '800px', height: '70vh',
              background: theme.bgSurface, borderRadius: '8px', boxShadow: theme.shadowLg,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: `1px solid ${theme.borderSubtle}` }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: theme.textPrimary }}>チャット入力</span>
              <button type="button" onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, display: 'flex' }}>
                <Minimize2 size={16} />
              </button>
            </div>
            <ChatEditor
              ref={modalEditorRef}
              characters={characters}
              onSend={handleSendFromModal}
              enterToSend
              channels={ctx.channels}
              activeChannelId={ctx.activeChatChannel}
              onChannelChange={ctx.setActiveChatChannel}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ChatInputPanel;
