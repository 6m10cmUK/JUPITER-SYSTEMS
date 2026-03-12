import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User } from 'lucide-react';
import { theme } from '../../styles/theme';
import type { Character } from '../../types/adrastea.types';

const COLOR_TEXT_PRIMARY = '#e0e0e0';
const COLOR_TEXT_MUTED = '#707070';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function parseInlineHtml(text: string): string {
  const markupRegex = /(<color=#[a-fA-F0-9]{6}>.*?<\/color>|\*\*.*?\*\*|~~.*?~~|(?<!\*)\*(?!\*).*?(?<!\*)\*(?!\*))/g;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markupRegex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) result += esc(before);

    const m = match[0];
    if (m.startsWith('<color=')) {
      const cm = m.match(/<color=(#[a-fA-F0-9]{6})>(.*?)<\/color>/);
      if (cm) {
        const [, color, inner] = cm;
        result += `<span style="color:${COLOR_TEXT_MUTED}">&lt;color=${color}&gt;</span>`
          + `<span style="color:${color}">${esc(inner)}</span>`
          + `<span style="color:${COLOR_TEXT_MUTED}">&lt;/color&gt;</span>`;
      }
    } else if (m.startsWith('**') && m.endsWith('**')) {
      const inner = m.slice(2, -2);
      result += `<span style="color:${COLOR_TEXT_MUTED}">**</span>`
        + `<strong style="color:${COLOR_TEXT_PRIMARY}">${esc(inner)}</strong>`
        + `<span style="color:${COLOR_TEXT_MUTED}">**</span>`;
    } else if (m.startsWith('~~') && m.endsWith('~~')) {
      const inner = m.slice(2, -2);
      result += `<span style="color:${COLOR_TEXT_MUTED}">~~</span>`
        + `<span style="text-decoration:line-through;color:${COLOR_TEXT_PRIMARY}">${esc(inner)}</span>`
        + `<span style="color:${COLOR_TEXT_MUTED}">~~</span>`;
    } else if (m.startsWith('*') && m.endsWith('*')) {
      const inner = m.slice(1, -1);
      result += `<span style="color:${COLOR_TEXT_MUTED}">*</span>`
        + `<em style="color:${COLOR_TEXT_PRIMARY}">${esc(inner)}</em>`
        + `<span style="color:${COLOR_TEXT_MUTED}">*</span>`;
    }
    lastIndex = match.index + m.length;
  }

  const trailing = text.slice(lastIndex);
  if (trailing) result += esc(trailing);
  return result;
}

function highlightMarkup(code: string): string {
  const lines = code.split('\n');
  let html = lines.map((line) => {
    let hashCount = 0;
    while (hashCount < line.length && line[hashCount] === '#') hashCount++;
    const isHeading = hashCount > 0 && (line[hashCount] === ' ' || line.length === hashCount);

    if (isHeading) {
      const marker = line.slice(0, hashCount + 1);
      const content = line.slice(hashCount + 1);
      let fontSize = '13px';
      if (hashCount === 1) fontSize = '18px';
      else if (hashCount === 2) fontSize = '15px';
      return `<span style="color:${COLOR_TEXT_MUTED};font-size:${fontSize}">${esc(marker)}</span>`
        + `<span style="font-size:${fontSize}">${parseInlineHtml(content)}</span>`;
    }

    return parseInlineHtml(line);
  }).join('<br>');

  // 末尾が改行で終わる場合、sentinel <br> を追加
  // これがないと contentEditable の innerText が末尾の改行を吸収してしまう
  if (code.endsWith('\n')) {
    html += '<br>';
  }

  return html;
}

// カーソル位置を文字オフセットとして取得
function getCursorOffset(el: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return 0;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.endContainer)) return 0;

  let offset = 0;
  let found = false;

  function countAll(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      offset += node.textContent?.length ?? 0;
    } else if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR') {
      offset += 1;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        countAll(node.childNodes[i]);
      }
    }
  }

  function walk(node: Node): boolean {
    if (found) return true;
    if (node === range.endContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += range.endOffset;
      } else {
        // element node: endOffset は childNodes のインデックス
        for (let i = 0; i < range.endOffset; i++) {
          const child = node.childNodes[i];
          if (child) countAll(child);
        }
      }
      found = true;
      return true;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      offset += node.textContent?.length ?? 0;
    } else if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR') {
      offset += 1;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        if (walk(node.childNodes[i])) return true;
      }
    }
    return false;
  }

  walk(el);
  return offset;
}

// 文字オフセットにカーソルを復元
function setCursorOffset(el: HTMLElement, offset: number) {
  const sel = window.getSelection();
  if (!sel) return;

  let remaining = offset;

  function walk(node: Node): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent?.length ?? 0;
      if (remaining <= len) {
        const r = document.createRange();
        r.setStart(node, remaining);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        return true;
      }
      remaining -= len;
    } else if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR') {
      if (remaining === 0) {
        const r = document.createRange();
        r.setStartBefore(node);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        return true;
      }
      remaining -= 1;
    } else {
      for (let i = 0; i < node.childNodes.length; i++) {
        if (walk(node.childNodes[i])) return true;
      }
    }
    return false;
  }

  if (!walk(el)) {
    // 末尾に設定
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    sel.removeAllRanges();
    sel.addRange(r);
  }

  // span 内テキストノードの末尾にカーソルがある場合、span の外に移動する
  // Chrome は span 末尾にカーソルがあると次の入力を span 外の新テキストノードに
  // 追加するため、getCursorOffset が正しいオフセットを返せなくなる
  const cur = sel.getRangeAt(0);
  if (
    cur.startContainer.nodeType === Node.TEXT_NODE &&
    cur.startOffset === (cur.startContainer.textContent?.length ?? 0) &&
    cur.startContainer.parentElement &&
    cur.startContainer.parentElement !== el
  ) {
    const parent = cur.startContainer.parentElement;
    const r = document.createRange();
    r.setStartAfter(parent);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
  }
}

interface ChatInputPanelProps {
  characters?: Character[];
  onSendMessage: (content: string, messageType: 'chat' | 'dice' | 'system', characterName?: string, characterAvatar?: string | null) => void;
}

const ChatInputPanel: React.FC<ChatInputPanelProps> = ({
  characters = [],
  onSendMessage,
}) => {
  const [senderName, setSenderName] = useState(() => localStorage.getItem('adrastea-last-sender') ?? '');
  const [selectedCharacterForIcon, setSelectedCharacterForIcon] = useState<Character | null>(null);
  const [showCharacterList, setShowCharacterList] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);
  const isUpdating = useRef(false);
  const compositionJustEnded = useRef(false);
  const charListRef = useRef<HTMLDivElement>(null);
  const charIconRef = useRef<HTMLButtonElement>(null);

  // 初回 or characters 変更時に、保存された名前と一致するキャラをセット
  useEffect(() => {
    if (!senderName || !characters.length) return;
    const matched = characters.find((c) => c.name === senderName) ?? null;
    setSelectedCharacterForIcon(matched);
  }, [characters]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyHighlight = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = el.innerText.replace(/\n$/, '');
    const offset = getCursorOffset(el);
    isUpdating.current = true;
    el.innerHTML = highlightMarkup(text) || '';
    setCursorOffset(el, offset);
    isUpdating.current = false;
  }, []);

  const getInputText = useCallback((): string => {
    const el = editorRef.current;
    if (!el) return '';
    return el.innerText.replace(/\n$/, '');
  }, []);

  const handleSend = useCallback(() => {
    const text = getInputText().trim();
    if (!text) return;

    const charName = senderName.trim() || 'noname';
    if (senderName.trim()) localStorage.setItem('adrastea-last-sender', senderName.trim());
    const charAvatar = selectedCharacterForIcon?.images[selectedCharacterForIcon.active_image_index]?.url ?? null;

    if (text.startsWith('/')) {
      const command = text.slice(1);
      if (command) onSendMessage(command, 'dice', charName, charAvatar);
    } else {
      onSendMessage(text, 'chat', charName, charAvatar);
    }

    if (editorRef.current) editorRef.current.innerHTML = '';
    setIsEmpty(true);
  }, [getInputText, senderName, selectedCharacterForIcon, onSendMessage]);

  const handleInput = useCallback(() => {
    if (isUpdating.current || isComposing.current || compositionJustEnded.current) return;
    applyHighlight();
    const el = editorRef.current;
    if (el) {
      setIsEmpty(el.innerText.replace(/\n$/, '').length === 0);
    }
  }, [applyHighlight]);

  const handleCompositionStart = useCallback(() => {
    isComposing.current = true;
    compositionJustEnded.current = false;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposing.current = false;
    compositionJustEnded.current = true;
    // input イベントより後に実行して一回だけ applyHighlight を呼ぶ
    setTimeout(() => {
      compositionJustEnded.current = false;
      applyHighlight();
      const el = editorRef.current;
      if (el) setIsEmpty(el.innerText.replace(/\n$/, '').length === 0);
    }, 0);
  }, [applyHighlight]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isComposing.current) {
      e.preventDefault();
      if (e.shiftKey) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const br = document.createElement('br');
          const sentinel = document.createElement('br');
          range.insertNode(sentinel);
          range.insertNode(br);
          range.setStartAfter(br);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        applyHighlight();
        const el = editorRef.current;
        if (el) setIsEmpty(el.innerText.replace(/\n$/, '').length === 0);
      } else {
        handleSend();
      }
    }
  }, [handleSend, applyHighlight]);

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
        {characters.length > 0 && (
          <button
            ref={charIconRef}
            onClick={() => {
              if (showCharacterList) {
                setShowCharacterList(false);
                setDropdownPos(null);
              } else {
                const rect = charIconRef.current?.getBoundingClientRect();
                if (rect) setDropdownPos({ top: rect.bottom + 4, left: rect.left });
                setShowCharacterList(true);
              }
            }}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: selectedCharacterForIcon
                ? selectedCharacterForIcon.images[selectedCharacterForIcon.active_image_index]?.url
                  ? `url(${selectedCharacterForIcon.images[selectedCharacterForIcon.active_image_index]?.url}) top/cover`
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
        )}

        {characters.length > 0 && (
          <input
            type="text"
            value={senderName}
            onChange={(e) => {
              const val = e.target.value;
              setSenderName(val);
              const matched = characters.find((c) => c.name === val) ?? null;
              setSelectedCharacterForIcon(matched);
            }}
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
        )}

        <button
          onClick={handleSend}
          style={{
            padding: '0 10px',
            background: theme.accent,
            color: theme.textOnAccent,
            border: 'none',
            borderRadius: 0,
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          送信
        </button>

        {showCharacterList &&
          createPortal(
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
              }}
            >
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
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = theme.bgInput; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                >
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: c.images[c.active_image_index]?.url
                        ? `url(${c.images[c.active_image_index]?.url}) top/cover`
                        : c.color,
                      border: `1px solid ${theme.border}`,
                      flexShrink: 0,
                    }}
                  />
                  <span>{c.name}</span>
                </div>
              ))}
            </div>,
            document.body
          )}
      </div>

      {/* エディタ */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          background: theme.bgInput,
          border: `1px solid ${theme.border}`,
          overflow: 'auto',
          minHeight: '60px',
        }}
      >
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onKeyDown={handleKeyDown}
          style={{
            minHeight: '60px',
            height: '100%',
            padding: '4px 6px',
            fontSize: '12px',
            lineHeight: 1.5,
            fontFamily: 'inherit',
            color: COLOR_TEXT_PRIMARY,
            outline: 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            caretColor: COLOR_TEXT_PRIMARY,
          }}
        />
        {/* プレースホルダー */}
        {isEmpty && (
          <div
            style={{
              position: 'absolute',
              top: '4px',
              left: '6px',
              color: COLOR_TEXT_MUTED,
              fontSize: '12px',
              lineHeight: 1.5,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            メッセージを入力...
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInputPanel;
