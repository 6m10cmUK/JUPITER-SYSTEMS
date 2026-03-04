import React, { useState } from 'react';
import type { Cutin } from '../../types/adrastea.types';
import { AssetPicker } from './AssetPicker';
import { theme } from '../../styles/theme';

interface CutinEditorProps {
  cutin?: Cutin | null;
  roomId: string;
  onSave: (data: Partial<Cutin>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function CutinEditor({ cutin, roomId: _roomId, onSave, onDelete, onClose }: CutinEditorProps) {
  const [name, setName] = useState(cutin?.name ?? '');
  const [imageUrl, setImageUrl] = useState(cutin?.image_url ?? '');
  const [text, setText] = useState(cutin?.text ?? '');
  const [animation, setAnimation] = useState<Cutin['animation']>(cutin?.animation ?? 'slide');
  const [duration, setDuration] = useState(cutin?.duration ?? 3000);
  const [textColor, setTextColor] = useState(cutin?.text_color ?? '#ffffff');
  const [backgroundColor, setBackgroundColor] = useState(cutin?.background_color ?? 'rgba(0,0,0,0.8)');

  const handleSave = () => {
    onSave({
      name: name.trim() || '無題',
      image_url: imageUrl || null,
      text,
      animation,
      duration,
      text_color: textColor,
      background_color: backgroundColor,
    });
    onClose();
  };

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  };

  const panelStyle: React.CSSProperties = {
    background: theme.bgSurface,
    border: `1px solid ${theme.border}`,
    borderRadius: 0,
    padding: '24px',
    width: '420px',
    maxHeight: '80vh',
    overflowY: 'auto',
    color: theme.textPrimary,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    background: theme.bgInput,
    border: `1px solid ${theme.borderInput}`,
    borderRadius: 0,
    color: theme.textPrimary,
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: theme.textSecondary,
    marginBottom: '4px',
    display: 'block',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '14px',
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem' }}>
          {cutin ? 'カットイン編集' : '新規カットイン'}
        </h3>

        <div style={sectionStyle}>
          <label style={labelStyle}>名前</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="カットイン名" />
        </div>

        <div style={sectionStyle}>
          <AssetPicker
            label="演出画像"
            currentUrl={imageUrl || null}
            onSelect={(url) => setImageUrl(url)}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>テキスト</label>
          <input style={inputStyle} value={text} onChange={(e) => setText(e.target.value)} placeholder="表示テキスト" />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>アニメーション</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {([
              { key: 'slide' as const, label: 'スライド' },
              { key: 'fade' as const, label: 'フェード' },
              { key: 'zoom' as const, label: 'ズーム' },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setAnimation(opt.key)}
                style={{
                  padding: '4px 12px',
                  background: animation === opt.key ? theme.accent : theme.bgInput,
                  color: animation === opt.key ? theme.textOnAccent : theme.textPrimary,
                  border: 'none',
                  borderRadius: 0,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>表示時間: {duration / 1000}秒</label>
          <input
            type="range"
            min="1000"
            max="10000"
            step="500"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>テキスト色</label>
          <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
            style={{ width: '48px', height: '32px', border: 'none', background: 'transparent', cursor: 'pointer' }} />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>背景色</label>
          <input style={inputStyle} value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)}
            placeholder="rgba(0,0,0,0.8)" />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {cutin && onDelete && (
            <button onClick={() => { onDelete(); onClose(); }} style={{
              padding: '8px 16px', background: 'transparent', color: theme.danger,
              border: `1px solid ${theme.danger}`, borderRadius: 0, cursor: 'pointer', marginRight: 'auto',
            }}>削除</button>
          )}
          <button onClick={onClose} style={{
            padding: '8px 16px', background: theme.bgInput, color: theme.textPrimary,
            border: 'none', borderRadius: 0, cursor: 'pointer',
          }}>キャンセル</button>
          <button onClick={handleSave} style={{
            padding: '8px 16px', background: theme.accent, color: theme.textOnAccent,
            border: 'none', borderRadius: 0, fontWeight: 600, cursor: 'pointer',
          }}>保存</button>
        </div>
      </div>
    </div>
  );
}
