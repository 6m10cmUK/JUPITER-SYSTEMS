import React, { useState } from 'react';
import { theme } from '../../../styles/theme';
import { ChevronRight, ChevronDown, X } from 'lucide-react';

// ── Shared compact styles ──
const FONT_SIZE = '12px';
const HEIGHT = '24px';
const PADDING = '2px 6px';
const GAP = '4px';

// ── AdInput ──
interface AdInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> {
  label?: string;
  fullWidth?: boolean;
  inputWidth?: string;
}

export function AdInput({ label, fullWidth = true, inputWidth, ...props }: AdInputProps) {
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
interface AdButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  variant?: 'primary' | 'default' | 'danger';
  fullWidth?: boolean;
}

export function AdButton({ variant = 'default', fullWidth, children, ...props }: AdButtonProps) {
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
        gap: GAP,
        fontSize: FONT_SIZE,
        color: theme.textSecondary,
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ margin: 0 }}
      />
      {label}
    </label>
  );
}

// ── AdSlider ──
interface AdSliderProps {
  label: string;
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
}

export function AdColorPicker({ label, value, onChange }: AdColorPickerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {label && <label style={{ fontSize: FONT_SIZE, color: theme.textSecondary }}>{label}</label>}
      <div style={{ display: 'flex', gap: GAP, alignItems: 'center' }}>
        <input
          type="color"
          value={value.startsWith('#') ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '24px',
            height: HEIGHT,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
          }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
      </div>
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

export function AdToggleButtons<T extends string | null>({ label, value, options, onChange }: AdToggleButtonsProps<T>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {label && <label style={{ fontSize: FONT_SIZE, color: theme.textSecondary }}>{label}</label>}
      <div style={{ display: 'flex', gap: '2px' }}>
        {options.map((opt) => (
          <button
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
