import React, { useState } from 'react';
import type { Character, PieceStatus } from '../../types/adrastea.types';
import { AssetPicker } from './AssetPicker';
import { theme } from '../../styles/theme';

interface CharacterEditorProps {
  character?: Character | null;
  roomId: string;
  onSave: (data: Partial<Character>) => void;
  onClose: () => void;
}

const STATUS_COLORS = [theme.statusRed, theme.statusBlue, theme.statusGreen, theme.statusYellow];

export function CharacterEditor({ character, roomId: _roomId, onSave, onClose }: CharacterEditorProps) {
  const [name, setName] = useState(character?.name ?? '');
  const [imageUrl, setImageUrl] = useState(character?.image_url ?? '');
  const [color, setColor] = useState(character?.color ?? theme.statusBlue);
  const [statuses, setStatuses] = useState<PieceStatus[]>(character?.statuses ?? []);
  const [tags, setTags] = useState<string[]>(character?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [memo, setMemo] = useState(character?.memo ?? '');

  const addStatus = () => {
    setStatuses([...statuses, {
      label: 'HP',
      value: 10,
      max: 10,
      color: STATUS_COLORS[statuses.length % STATUS_COLORS.length],
    }]);
  };

  const removeStatus = (index: number) => {
    setStatuses(statuses.filter((_, i) => i !== index));
  };

  const updateStatus = (index: number, field: keyof PieceStatus, value: string | number) => {
    setStatuses(statuses.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave({
      name: name.trim() || '無名',
      image_url: imageUrl || null,
      color,
      statuses,
      tags,
      memo,
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
    width: '440px',
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
          {character ? 'キャラクター編集' : '新規キャラクター'}
        </h3>

        {/* 名前 */}
        <div style={sectionStyle}>
          <label style={labelStyle}>名前</label>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="キャラクター名"
          />
        </div>

        {/* 画像 */}
        <div style={sectionStyle}>
          <AssetPicker
            label="キャラクター画像"
            currentUrl={imageUrl || null}
            onSelect={(url) => setImageUrl(url)}
          />
        </div>

        {/* 色 */}
        <div style={sectionStyle}>
          <label style={labelStyle}>テーマカラー</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: '48px', height: '32px', border: 'none', background: 'transparent', cursor: 'pointer' }}
          />
        </div>

        {/* ステータス */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>ステータス</label>
            <button onClick={addStatus} style={{
              padding: '4px 10px', background: theme.accent, color: theme.textOnAccent,
              border: 'none', borderRadius: 0, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
            }}>+ 追加</button>
          </div>
          {statuses.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
              <input style={{ ...inputStyle, width: '60px', flex: 'none' }} value={s.label}
                onChange={(e) => updateStatus(i, 'label', e.target.value)} placeholder="HP" />
              <input type="number" style={{ ...inputStyle, width: '60px', flex: 'none' }} value={s.value}
                onChange={(e) => updateStatus(i, 'value', Number(e.target.value))} />
              <span style={{ color: theme.textMuted }}>/</span>
              <input type="number" style={{ ...inputStyle, width: '60px', flex: 'none' }} value={s.max}
                onChange={(e) => updateStatus(i, 'max', Number(e.target.value))} />
              <input type="color" value={s.color} onChange={(e) => updateStatus(i, 'color', e.target.value)}
                style={{ width: '32px', height: '28px', border: 'none', background: 'transparent', cursor: 'pointer', flex: 'none' }} />
              <button onClick={() => removeStatus(i)} style={{
                padding: '4px 8px', background: 'transparent', color: theme.danger,
                border: `1px solid ${theme.danger}`, borderRadius: 0, fontSize: '0.75rem', cursor: 'pointer', flex: 'none',
              }}>x</button>
            </div>
          ))}
        </div>

        {/* タグ */}
        <div style={sectionStyle}>
          <label style={labelStyle}>タグ</label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
            {tags.map((tag, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  background: theme.bgInput,
                  borderRadius: 0,
                  color: theme.textPrimary,
                  fontSize: '0.75rem',
                }}
              >
                {tag}
                <button
                  onClick={() => removeTag(i)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme.danger,
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    padding: '0 2px',
                  }}
                >
                  x
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="タグを追加"
            />
            <button onClick={addTag} style={{
              padding: '6px 12px', background: theme.bgInput, color: theme.textPrimary,
              border: `1px solid ${theme.borderInput}`, borderRadius: 0, fontSize: '0.8rem', cursor: 'pointer',
            }}>追加</button>
          </div>
        </div>

        {/* メモ */}
        <div style={sectionStyle}>
          <label style={labelStyle}>メモ</label>
          <textarea
            style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="キャラクターメモ"
          />
        </div>

        {/* ボタン */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
