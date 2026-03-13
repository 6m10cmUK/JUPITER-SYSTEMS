import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { User, Bold, Italic, Strikethrough, Heading1, SendHorizonal } from 'lucide-react';
import { theme } from '../../styles/theme';
import type { Character } from '../../types/adrastea.types';
import { AdColorPicker } from './ui/AdComponents';
import { Tooltip } from './ui';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { calcPopupPos } from '../../utils/calcPopupPos';

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

// 選択範囲の start と end のオフセットを取得
function getSelectionOffsets(el: HTMLElement): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return null;

  function calcOffset(container: Node, containerOffset: number): number {
    let offset = 0;
    let found = false;

    function countAll(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += node.textContent?.length ?? 0;
      } else if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR') {
        offset += 1;
      } else {
        for (let i = 0; i < node.childNodes.length; i++) countAll(node.childNodes[i]);
      }
    }

    function walk(node: Node): boolean {
      if (found) return true;
      if (node === container) {
        if (node.nodeType === Node.TEXT_NODE) {
          offset += containerOffset;
        } else {
          for (let i = 0; i < containerOffset; i++) {
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

  const start = calcOffset(range.startContainer, range.startOffset);
  const end = calcOffset(range.endContainer, range.endOffset);
  return { start, end };
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
  const ctx = useAdrasteaContext();
  const [senderName, setSenderName] = useState(() => localStorage.getItem('adrastea-last-sender') ?? '');
  const [showCharacterList, setShowCharacterList] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [showChannelList, setShowChannelList] = useState(false);
  const [channelDropdownPos, setChannelDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);
  const isUpdating = useRef(false);
  const compositionJustEnded = useRef(false);
  const charListRef = useRef<HTMLDivElement>(null);
  const charIconRef = useRef<HTMLButtonElement>(null);
  const channelBtnRef = useRef<HTMLButtonElement>(null);
  const channelListRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const [suggestionPos, setSuggestionPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const selectedCharacterForIcon = useMemo(
    () => (senderName ? (characters.find((c) => c.name === senderName) ?? null) : null),
    [characters, senderName]
  );

  const activeCharForPalette = useMemo(
    () => senderName ? (characters.find((c) => c.name === senderName) ?? null) : null,
    [senderName, characters]
  );

  const paletteItems = useMemo(
    () => (activeCharForPalette?.chat_palette
      ? activeCharForPalette.chat_palette.split('\n').filter((s) => s.trim())
      : []),
    [activeCharForPalette?.chat_palette]
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
    const current = el.innerText.replace(/\n$/, '');
    const newText = current ? current + '\n' + ctx.chatInjectText : ctx.chatInjectText;
    isUpdating.current = true;
    el.innerHTML = highlightMarkup(newText) || '';
    setCursorOffset(el, newText.length);
    isUpdating.current = false;
    setIsEmpty(false);
    ctx.setChatInjectText(null);
  }, [ctx.chatInjectText, ctx.setChatInjectText]);

  const updateSuggestions = useCallback((text: string) => {
    if (!text.trim()) {
      setSuggestions([]);
      setSuggestionIndex(0);
      return;
    }
    const matched = paletteItems.filter((item) => item.startsWith(text));
    setSuggestions(matched);
    setSuggestionIndex(0);
  }, [paletteItems]);

  const applySuggestion = useCallback((text: string) => {
    const el = editorRef.current;
    if (!el) return;
    isUpdating.current = true;
    el.innerHTML = highlightMarkup(text) || '';
    setCursorOffset(el, text.length);
    isUpdating.current = false;
    setIsEmpty(false);
    setSuggestions([]);
  }, []);

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

  const wrapSelection = useCallback((prefix: string, suffix: string) => {
    const el = editorRef.current;
    if (!el) return;
    const offsets = getSelectionOffsets(el);
    if (!offsets) return;

    const text = el.innerText.replace(/\n$/, '');
    const { start, end } = offsets;
    const selectedText = text.slice(start, end);
    const newText = text.slice(0, start) + prefix + selectedText + suffix + text.slice(end);

    isUpdating.current = true;
    el.innerHTML = highlightMarkup(newText) || '';
    const newCursorOffset = start + prefix.length + selectedText.length;
    setCursorOffset(el, newCursorOffset);
    isUpdating.current = false;

    setIsEmpty(newText.length === 0);
  }, []);

  const toggleHeading = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = el.innerText.replace(/\n$/, '');
    const offset = getCursorOffset(el);

    // カーソルがある行を特定
    const lines = text.split('\n');
    let charCount = 0;
    let lineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineEnd = charCount + lines[i].length;
      if (offset <= lineEnd) {
        lineIndex = i;
        break;
      }
      charCount += lines[i].length + 1; // +1 for \n
    }

    const line = lines[lineIndex];
    let newLine: string;
    let cursorDelta: number;
    if (line.startsWith('# ')) {
      // 見出しを解除
      newLine = line.slice(2);
      cursorDelta = -2;
    } else if (line.startsWith('#')) {
      // # だけの場合も解除
      newLine = line.slice(1);
      cursorDelta = -1;
    } else {
      // 見出しを追加
      newLine = '# ' + line;
      cursorDelta = 2;
    }

    lines[lineIndex] = newLine;
    const newText = lines.join('\n');
    const newOffset = Math.max(0, offset + cursorDelta);

    isUpdating.current = true;
    el.innerHTML = highlightMarkup(newText) || '';
    setCursorOffset(el, newOffset);
    isUpdating.current = false;
    setIsEmpty(newText.length === 0);
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
    setSuggestions([]);
  }, [getInputText, senderName, selectedCharacterForIcon, onSendMessage]);

  const handleInput = useCallback(() => {
    if (isUpdating.current || isComposing.current || compositionJustEnded.current) return;
    applyHighlight();
    const el = editorRef.current;
    if (el) {
      const text = el.innerText.replace(/\n$/, '');
      setIsEmpty(text.length === 0);
      if (!isComposing.current) {
        updateSuggestions(text);
      }
    }
  }, [applyHighlight, updateSuggestions]);

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
      if (el) {
        const text = el.innerText.replace(/\n$/, '');
        setIsEmpty(text.length === 0);
        updateSuggestions(text);
      }
    }, 0);
  }, [applyHighlight, updateSuggestions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // サジェストが表示されている場合のキー操作
    if (suggestions.length > 0 && !isComposing.current) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        applySuggestion(suggestions[suggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSuggestions([]);
        return;
      }
    }

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
  }, [handleSend, applyHighlight, suggestions, suggestionIndex, applySuggestion]);

  useEffect(() => {
    if (suggestions.length === 0) {
      setSuggestionPos(null);
      return;
    }
    const el = editorContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const { top } = calcPopupPos(rect, rect.width, 160, 'up');
    setSuggestionPos({ top, left: rect.left, width: rect.width });
  }, [suggestions.length]);

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

  useEffect(() => {
    if (!showChannelList) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        channelListRef.current && !channelListRef.current.contains(e.target as Node) &&
        channelBtnRef.current && !channelBtnRef.current.contains(e.target as Node)
      ) {
        setShowChannelList(false);
        setChannelDropdownPos(null);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [showChannelList]);


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
          <button
            ref={charIconRef}
            className="ad-btn-icon"
            data-avatar={selectedCharacterForIcon ? 'true' : undefined}
            onClick={() => {
              if (showCharacterList) {
                setShowCharacterList(false);
                setDropdownPos(null);
              } else {
                const rect = charIconRef.current?.getBoundingClientRect();
                if (rect) setDropdownPos(calcPopupPos(rect, 200, 240, 'down'));
                setShowCharacterList(true);
              }
            }}
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
            className="ad-btn"
            onClick={handleSend}
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

        {showCharacterList &&
          createPortal(
            <div
              ref={charListRef}
              style={{
                position: 'fixed',
                top: dropdownPos?.top ?? 0,
                left: dropdownPos?.left ?? 0,
                width: '200px',
                background: theme.bgElevated,
                border: `1px solid ${theme.border}`,
                boxShadow: theme.shadowMd,
                zIndex: 100,
              }}
            >
              {characters.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSenderName(c.name);
                    ctx.setActiveSpeakerCharId(c.id);
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
                        ? `url(${c.images[c.active_image_index]?.url}) top/cover ${c.color}`
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
        ref={editorContainerRef}
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

      {/* 修飾子ツールバー */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 6px',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        {([
          { icon: Bold, prefix: '**', suffix: '**' },
          { icon: Italic, prefix: '*', suffix: '*' },
          { icon: Strikethrough, prefix: '~~', suffix: '~~' },
        ] as const).map(({ icon: Icon, prefix, suffix }) => (
          <Tooltip key={prefix} label={prefix === '**' ? '太字' : prefix === '*' ? '斜体' : '打消し'}>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                wrapSelection(prefix, suffix);
              }}
              className="ad-btn-icon"
              style={{
                width: '28px',
                height: '28px',
                border: 'none',
                borderRadius: 0,
                color: theme.textSecondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
              title={prefix === '**' ? '太字' : prefix === '*' ? '斜体' : '打消し'}
            >
              <Icon size={14} />
            </button>
          </Tooltip>
        ))}
        {/* 見出しボタン */}
        <Tooltip label="見出し">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              toggleHeading();
            }}
            className="ad-btn-icon"
            style={{
              width: '28px',
              height: '28px',
              border: 'none',
              borderRadius: 0,
              color: theme.textSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            title="見出し"
          >
            <Heading1 size={14} />
          </button>
        </Tooltip>
        {/* 色ボタン */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip label="文字色">
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <AdColorPicker
            compact
            enableAlpha={false}
            value="#ff0000"
            onChange={() => {}}
            onOpen={() => {
              const el = editorRef.current;
              if (el) {
                savedSelectionRef.current = getSelectionOffsets(el);
              }
            }}
            onClose={(color) => {
              const saved = savedSelectionRef.current;
              const el = editorRef.current;
              if (!el || !saved) return;
              const text = el.innerText.replace(/\n$/, '');
              const { start, end } = saved;
              const selectedText = text.slice(start, end);
              const prefix = `<color=${color}>`;
              const suffix = '</color>';
              const newText = text.slice(0, start) + prefix + selectedText + suffix + text.slice(end);
              isUpdating.current = true;
              el.innerHTML = highlightMarkup(newText) || '';
              setCursorOffset(el, start + prefix.length + selectedText.length);
              isUpdating.current = false;
              setIsEmpty(newText.length === 0);
              savedSelectionRef.current = null;
            }}
          />
            </span>
          </Tooltip>
        </div>

        {/* スペーサー */}
        <div style={{ flex: 1 }} />

        {/* チャンネル選択 */}
        <Tooltip label="チャンネル選択">
          <button
            ref={channelBtnRef}
            className="ad-btn ad-btn--ghost"
            onClick={() => {
              if (showChannelList) {
                setShowChannelList(false);
                setChannelDropdownPos(null);
              } else {
                const rect = channelBtnRef.current?.getBoundingClientRect();
                if (rect) setChannelDropdownPos(calcPopupPos(rect, 160, 120, 'up'));
                setShowChannelList(true);
              }
            }}
            style={{
              padding: '6px 10px',
              border: `1px solid ${theme.borderSubtle}`,
              color: theme.textSecondary,
              fontSize: '11px',
              cursor: 'pointer',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {ctx.channels.find(ch => ch.channel_id === ctx.activeChatChannel)?.label ?? 'ch'}
          </button>
        </Tooltip>

        {/* チャンネル選択ドロップダウン */}
        {showChannelList && channelDropdownPos &&
          createPortal(
            <div
              ref={channelListRef}
              className="adrastea-root"
              style={{
                position: 'fixed',
                top: channelDropdownPos.top,
                left: channelDropdownPos.left,
                minWidth: '120px',
                background: theme.bgElevated,
                border: `1px solid ${theme.border}`,
                boxShadow: theme.shadowMd,
                zIndex: 100,
              }}
            >
              {ctx.channels.map((ch) => (
                <div
                  key={ch.channel_id}
                  className={`ad-list-item${ch.channel_id === ctx.activeChatChannel ? ' ad-list-item--selected' : ''}`}
                  onClick={() => {
                    ctx.setActiveChatChannel(ch.channel_id);
                    setShowChannelList(false);
                    setChannelDropdownPos(null);
                  }}
                  style={{
                    padding: '6px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    color: theme.textPrimary,
                    fontSize: '12px',
                    borderBottom: `1px solid ${theme.borderSubtle}`,
                  }}
                >
                  <span>{ch.label}</span>
                </div>
              ))}
            </div>,
            document.body
          )}
      </div>

      {suggestions.length > 0 && suggestionPos && createPortal(
        <div
          ref={suggestionRef}
          style={{
            position: 'fixed',
            top: suggestionPos.top,
            left: suggestionPos.left,
            width: suggestionPos.width,
            background: theme.bgElevated,
            border: `1px solid ${theme.border}`,
            boxShadow: theme.shadowMd,
            zIndex: 10000,
            maxHeight: '160px',
            overflowY: 'auto',
          }}
        >
          {suggestions.map((item, i) => (
            <div
              key={i}
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(item);
              }}
              style={{
                padding: '5px 8px',
                fontSize: '12px',
                color: i === suggestionIndex ? theme.textOnAccent : theme.textPrimary,
                background: i === suggestionIndex ? theme.accent : 'transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              onMouseEnter={() => setSuggestionIndex(i)}
            >
              {item}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ChatInputPanel;
