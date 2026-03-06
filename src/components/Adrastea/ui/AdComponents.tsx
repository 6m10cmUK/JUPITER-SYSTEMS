import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { RgbaColorPicker } from 'react-colorful';
import { theme } from '../../../styles/theme';
import { ChevronRight, ChevronDown, X } from 'lucide-react';

// ── Shared compact styles ──
const FONT_SIZE = '12px';
const HEIGHT = '24px';
const PADDING = '2px 6px';
const GAP = '4px';

// ── AdInput ──
interface AdInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  fullWidth?: boolean;
  inputWidth?: string;
}

export function AdInput({ label, fullWidth = true, inputWidth, style, ...props }: AdInputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {label && <label style={{ fontSize: FONT_SIZE, color: theme.textSecondary }}>{label}</label>}
      <input
        {...props}
        style={{
          height: HEIGHT,
          padding: PADDING,
          fontSize: FONT_SIZE,
          background: theme.bgInput,
          border: `1px solid ${theme.borderInput}`,
          borderRadius: 0,
          color: theme.textPrimary,
          outline: 'none',
          boxSizing: 'border-box',
          width: inputWidth ?? (fullWidth ? '100%' : undefined),
          ...style,
        }}
      />
    </div>
  );
}

// ── AdTextArea ──
interface AdTextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'style'> {
  label?: string;
}

export function AdTextArea({ label, ...props }: AdTextAreaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {label && <label style={{ fontSize: FONT_SIZE, color: theme.textSecondary }}>{label}</label>}
      <textarea
        {...props}
        style={{
          padding: PADDING,
          fontSize: FONT_SIZE,
          background: theme.bgInput,
          border: `1px solid ${theme.borderInput}`,
          borderRadius: 0,
          color: theme.textPrimary,
          outline: 'none',
          boxSizing: 'border-box',
          width: '100%',
          minHeight: '60px',
          resize: 'vertical',
        }}
      />
    </div>
  );
}

// ── AdButton ──
interface AdButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'default' | 'danger';
  fullWidth?: boolean;
}

export function AdButton({ variant = 'default', fullWidth, children, style, className, ...props }: AdButtonProps) {
  const bg = variant === 'primary' ? theme.accent
    : variant === 'danger' ? 'transparent'
    : theme.bgInput;
  const color = variant === 'primary' ? theme.textOnAccent
    : variant === 'danger' ? theme.danger
    : theme.textPrimary;
  const border = variant === 'danger' ? `1px solid ${theme.danger}` : 'none';

  return (
    <button
      {...props}
      className={`ad-btn ${className ?? ''}`}
      style={{
        height: HEIGHT,
        padding: '0 10px',
        fontSize: FONT_SIZE,
        fontWeight: variant === 'primary' ? 600 : 400,
        background: bg,
        color,
        border,
        borderRadius: 0,
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : undefined,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: GAP,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── AdSelect ──
interface AdSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'style'> {
  label?: string;
  options: { value: string; label: string }[];
}

export function AdSelect({ label, options, ...props }: AdSelectProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {label && <label style={{ fontSize: FONT_SIZE, color: theme.textSecondary }}>{label}</label>}
      <select
        {...props}
        style={{
          height: HEIGHT,
          padding: PADDING,
          fontSize: FONT_SIZE,
          background: theme.bgInput,
          border: `1px solid ${theme.borderInput}`,
          borderRadius: 0,
          color: theme.textPrimary,
          outline: 'none',
          boxSizing: 'border-box',
          width: '100%',
          cursor: 'pointer',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── AdCheckbox ──
interface AdCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function AdCheckbox({ label, checked, onChange }: AdCheckboxProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        fontSize: FONT_SIZE,
        color: theme.textSecondary,
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onClick={(e) => { e.preventDefault(); onChange(!checked); }}
    >
      {label}
      <div
        style={{
          position: 'relative',
          width: 28,
          height: 16,
          borderRadius: 8,
          backgroundColor: checked ? theme.accent : theme.border,
          transition: 'background-color 0.15s',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? 14 : 2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: '#fff',
            transition: 'left 0.15s',
          }}
        />
      </div>
    </label>
  );
}

// ── AdSlider ──
interface AdSliderProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  displayValue?: string;
  onChange: (value: number) => void;
}

export function AdSlider({ label, value, min, max, step = 1, displayValue, onChange }: AdSliderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: FONT_SIZE, color: theme.textSecondary }}>{label}</label>
        <span style={{ fontSize: '11px', color: theme.textMuted }}>{displayValue ?? value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', height: '14px' }}
      />
    </div>
  );
}

// ── AdSection ──
interface AdSectionProps {
  title?: string;
  label?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function AdSection({ title, label, defaultOpen = true, children }: AdSectionProps) {
  const heading = title ?? label;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: GAP }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          width: '100%',
          padding: '2px 0',
          background: 'transparent',
          border: 'none',
          borderBottom: `1px solid ${theme.border}`,
          color: theme.textPrimary,
          fontSize: FONT_SIZE,
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {heading}
      </button>
      {open && (
        <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', gap: GAP }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── AdColorPicker ──
interface AdColorPickerProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  enableAlpha?: boolean;
}

type RgbaColor = { r: number; g: number; b: number; a: number };

const PALETTE_KEY = 'adrastea-color-palette';

function loadPalette(): string[] {
  try {
    const raw = localStorage.getItem(PALETTE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function savePalette(colors: string[]) {
  localStorage.setItem(PALETTE_KEY, JSON.stringify(colors.slice(0, 16)));
}

const DEFAULT_PALETTE = [
  '#ffffff', '#c0c0c0', '#808080', '#404040', '#000000',
  '#ff0000', '#ff8000', '#ffff00', '#80ff00', '#00ff00',
  '#00ff80', '#00ffff', '#0080ff', '#0000ff', '#8000ff',
  '#ff00ff', '#ff0080',
  '#1e1e2e', '#313244', '#45475a', '#585b70',
  'rgba(255,255,255,0.5)', 'rgba(0,0,0,0.5)',
];

function cssToRgba(value: string): RgbaColor {
  const rgbaMatch = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgbaMatch) {
    return {
      r: Number(rgbaMatch[1]), g: Number(rgbaMatch[2]), b: Number(rgbaMatch[3]),
      a: rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1,
    };
  }
  if (value.match(/^#[0-9a-fA-F]{6,8}$/)) {
    const r = parseInt(value.slice(1, 3), 16);
    const g = parseInt(value.slice(3, 5), 16);
    const b = parseInt(value.slice(5, 7), 16);
    const a = value.length === 9 ? parseInt(value.slice(7, 9), 16) / 255 : 1;
    return { r, g, b, a: Math.round(a * 100) / 100 };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

function rgbaToCss(c: RgbaColor): string {
  if (c.a >= 1) return '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('');
  return `rgba(${c.r},${c.g},${c.b},${Math.round(c.a * 100) / 100})`;
}

function rgbaToDisplayBg(c: RgbaColor): string {
  return `rgba(${c.r},${c.g},${c.b},${c.a})`;
}

export function AdColorPicker({ label, value, onChange, enableAlpha }: AdColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(loadPalette);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [popPos, setPopPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const rgba = cssToRgba(value);

  // ポップオーバー位置計算
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const popW = 210;
    const popH = 300;
    let top = rect.bottom + 4;
    let left = rect.left;
    // 画面外にはみ出す場合は調整
    if (top + popH > window.innerHeight) top = rect.top - popH - 4;
    if (left + popW > window.innerWidth) left = window.innerWidth - popW - 8;
    if (left < 0) left = 8;
    setPopPos({ top, left });
  }, [open]);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // コンテキストメニュー外クリックで閉じる
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  const handleChange = useCallback((c: RgbaColor) => {
    onChange(enableAlpha ? rgbaToCss(c) : rgbaToCss({ ...c, a: 1 }));
  }, [onChange, enableAlpha]);

  const handleSaveToPalette = useCallback(() => {
    const css = rgbaToCss(rgba);
    const next = [css, ...palette.filter(c => c !== css)].slice(0, 16);
    setPalette(next);
    savePalette(next);
  }, [rgba, palette]);

  const handleRemoveFromPalette = useCallback((index: number) => {
    const next = palette.filter((_, i) => i !== index);
    setPalette(next);
    savePalette(next);
    setContextMenu(null);
  }, [palette]);

  const checkerBg = `linear-gradient(45deg, #808080 25%, transparent 25%, transparent 75%, #808080 75%),
    linear-gradient(45deg, #808080 25%, transparent 25%, transparent 75%, #808080 75%)`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {label && <label style={{ fontSize: FONT_SIZE, color: theme.textSecondary }}>{label}</label>}
      <div style={{ display: 'flex', gap: GAP, alignItems: 'center' }}>
        {/* 色プレビューボタン */}
        <button
          ref={btnRef}
          onClick={() => setOpen(!open)}
          style={{
            width: '24px', height: '22px', border: `1px solid ${theme.border}`,
            background: checkerBg,
            backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px',
            cursor: 'pointer', padding: 0, position: 'relative', flexShrink: 0,
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: rgbaToDisplayBg(rgba) }} />
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1, height: HEIGHT, padding: PADDING, fontSize: FONT_SIZE,
            background: theme.bgInput, border: `1px solid ${theme.borderInput}`,
            borderRadius: 0, color: theme.textPrimary, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* ポップオーバー（Portal） */}
      {open && createPortal(
        <div
          ref={popRef}
          style={{
            position: 'fixed', top: popPos.top, left: popPos.left, zIndex: 10000,
            background: theme.bgSurface, border: `1px solid ${theme.border}`,
            padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          <div className="ad-color-picker-popover">
            <RgbaColorPicker
              color={enableAlpha ? rgba : { ...rgba, a: 1 }}
              onChange={handleChange}
            />
          </div>

          {/* デフォルトパレット（削除不可） */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
            {DEFAULT_PALETTE.map((c, i) => (
              <button
                key={`d-${i}`}
                onClick={() => onChange(c)}
                title={c}
                style={{
                  width: '16px', height: '16px', border: `1px solid ${theme.border}`,
                  background: checkerBg,
                  backgroundSize: '6px 6px', backgroundPosition: '0 0, 3px 3px',
                  cursor: 'pointer', padding: 0, position: 'relative',
                }}
              >
                <div style={{ position: 'absolute', inset: 0, background: c }} />
              </button>
            ))}
          </div>

          {/* ユーザー保存パレット */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', color: theme.textMuted }}>保存色</span>
            <button
              onClick={handleSaveToPalette}
              style={{
                background: 'transparent', border: `1px solid ${theme.border}`,
                color: theme.textSecondary, fontSize: '10px', padding: '1px 5px',
                cursor: 'pointer', lineHeight: 1,
              }}
            >
              +
            </button>
          </div>
          {palette.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
              {palette.map((c, i) => (
                <button
                  key={`u-${i}`}
                  onClick={() => onChange(c)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, index: i });
                  }}
                  title={c}
                  style={{
                    width: '16px', height: '16px', border: `1px solid ${theme.border}`,
                    background: checkerBg,
                    backgroundSize: '6px 6px', backgroundPosition: '0 0, 3px 3px',
                    cursor: 'pointer', padding: 0, position: 'relative',
                  }}
                >
                  <div style={{ position: 'absolute', inset: 0, background: c }} />
                </button>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '10px', color: theme.textMuted }}>なし</div>
          )}
        </div>,
        document.body,
      )}

      {/* パレット右クリックメニュー（Portal） */}
      {contextMenu && createPortal(
        <div
          style={{
            position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 10001,
            background: theme.bgSurface, border: `1px solid ${theme.border}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)', padding: '2px 0',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleRemoveFromPalette(contextMenu.index)}
            style={{
              display: 'block', width: '100%', padding: '4px 12px',
              background: 'transparent', border: 'none', color: theme.error,
              fontSize: '11px', cursor: 'pointer', textAlign: 'left',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
          >
            パレットから削除
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── AdModal ──
interface AdModalProps {
  title: string;
  width?: string;
  maxHeight?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AdModal({ title, width = '600px', maxHeight = '80vh', onClose, children, footer }: AdModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: theme.bgOverlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme.bgSurface,
          border: `1px solid ${theme.border}`,
          borderRadius: 0,
          padding: '12px',
          width,
          maxHeight,
          color: theme.textPrimary,
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
          paddingBottom: '4px',
          borderBottom: `1px solid ${theme.border}`,
        }}>
          <span style={{ fontSize: FONT_SIZE, fontWeight: 600 }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.textSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
            }}
          >
            <X size={14} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
        {footer && (
          <div style={{
            display: 'flex',
            gap: GAP,
            justifyContent: 'flex-end',
            paddingTop: '8px',
            borderTop: `1px solid ${theme.border}`,
            marginTop: '8px',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── AdToggleButtons ── (ボタン群トグル、BGMタイプ選択等に使用)
interface AdToggleButtonsProps<T extends string | null> {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

// ── AdTagInput（候補ドロップダウン付きタグ入力） ──
interface AdTagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  existingTags?: string[];
}

export function AdTagInput({ tags, onChange, existingTags = [] }: AdTagInputProps) {
  const [input, setInput] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const composingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dropOpen, setDropOpen] = useState(false);

  // 既に選択済みのタグを除外した候補（入力に近いもの優先、最大5件）
  const suggestions = React.useMemo(() => {
    const excluded = new Set(tags);
    const available = existingTags.filter((t) => !excluded.has(t));
    const q = input.trim().toLowerCase();
    if (!q) return available.slice(0, 5);
    return available.filter((t) => t.toLowerCase().includes(q)).slice(0, 5);
  }, [existingTags, tags, input]);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        wrapRef.current && !wrapRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [input]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[highlightIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) {
      onChange([...tags, t]);
    }
    setInput('');
    setDropOpen(false);
  };

  const getDropPos = () => {
    if (!wrapRef.current) return { top: 0, left: 0, width: 0 };
    const rect = wrapRef.current.getBoundingClientRect();
    return { top: rect.bottom, left: rect.left, width: rect.width };
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (composingRef.current) return;
    if (dropOpen && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
          return;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightIndex((i) => Math.max(i - 1, 0));
          return;
        case 'Enter':
          e.preventDefault();
          addTag(suggestions[highlightIndex]);
          return;
        case 'Escape':
          setDropOpen(false);
          return;
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim()) addTag(input);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: FONT_SIZE, color: theme.textSecondary }}>タグ</label>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                padding: '1px 6px',
                fontSize: '11px',
                background: theme.accentBgSubtle,
                color: theme.accent,
                border: `1px solid ${theme.accentBorderSubtle}`,
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.textMuted,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '11px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div ref={wrapRef} style={{ display: 'flex', gap: '4px' }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setDropOpen(true);
          }}
          onFocus={() => setDropOpen(true)}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { composingRef.current = false; }}
          onKeyDown={handleKeyDown}
          placeholder="タグを入力"
          style={{
            flex: 1,
            height: HEIGHT,
            padding: PADDING,
            fontSize: FONT_SIZE,
            background: theme.bgInput,
            border: `1px solid ${theme.borderInput}`,
            borderRadius: 0,
            color: theme.textPrimary,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button
          className="ad-btn"
          type="button"
          onClick={() => { if (input.trim()) addTag(input); }}
          disabled={!input.trim()}
          style={{
            height: HEIGHT,
            padding: '0 8px',
            fontSize: FONT_SIZE,
            background: input.trim() ? theme.accent : theme.bgInput,
            color: input.trim() ? theme.textOnAccent : theme.textMuted,
            border: 'none',
            borderRadius: 0,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          追加
        </button>
      </div>
      {dropOpen && suggestions.length > 0 && createPortal(
        <div
          ref={dropRef}
          className="adrastea-root"
          style={{
            position: 'fixed',
            top: getDropPos().top,
            left: getDropPos().left,
            width: getDropPos().width,
            zIndex: 9999,
            background: theme.bgSurface,
            border: `1px solid ${theme.border}`,
            maxHeight: '150px',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          <div ref={listRef}>
            {suggestions.map((tag, i) => (
              <div
                key={tag}
                onClick={() => addTag(tag)}
                onMouseEnter={() => setHighlightIndex(i)}
                style={{
                  padding: '4px 8px',
                  fontSize: FONT_SIZE,
                  cursor: 'pointer',
                  background: i === highlightIndex ? theme.accentHighlight : 'transparent',
                  color: theme.textPrimary,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export function AdToggleButtons<T extends string | null>({ label, value, options, onChange }: AdToggleButtonsProps<T>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {label && <label style={{ fontSize: FONT_SIZE, color: theme.textSecondary }}>{label}</label>}
      <div style={{ display: 'flex', gap: '2px' }}>
        {options.map((opt) => (
          <button
            className="ad-btn"
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            style={{
              height: HEIGHT,
              padding: '0 8px',
              fontSize: '11px',
              background: value === opt.value ? theme.accent : theme.bgInput,
              color: value === opt.value ? theme.textOnAccent : theme.textPrimary,
              border: 'none',
              borderRadius: 0,
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
