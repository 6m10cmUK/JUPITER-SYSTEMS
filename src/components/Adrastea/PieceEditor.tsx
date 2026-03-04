import React, { useState } from 'react';
import type { Piece, PieceStatus, Character } from '../../types/adrastea.types';
import { AssetPicker } from './AssetPicker';
import { theme } from '../../styles/theme';

interface PieceEditorProps {
  piece: Piece;
  characters?: Character[];
  roomId?: string;
  onSave: (pieceId: string, updates: Partial<Piece>) => void;
  onClose: () => void;
}

const STATUS_COLORS = [theme.statusRed, theme.statusBlue, theme.statusGreen, theme.statusYellow];

export function PieceEditor({ piece, characters = [], roomId, onSave, onClose }: PieceEditorProps) {
  const [label, setLabel] = useState(piece.label);
  const [color, setColor] = useState(piece.color);
  const [imageUrl, setImageUrl] = useState(piece.image_url ?? '');
  const [initiative, setInitiative] = useState(piece.initiative);
  const [memo, setMemo] = useState(piece.memo);
  const [statuses, setStatuses] = useState<PieceStatus[]>(piece.statuses ?? []);
  const [characterId, setCharacterId] = useState<string | null>(piece.character_id ?? null);

  const addStatus = () => {
    setStatuses([...statuses, { label: 'HP', value: 10, max: 10, color: STATUS_COLORS[statuses.length % STATUS_COLORS.length] }]);
  };

  const removeStatus = (index: number) => {
    setStatuses(statuses.filter((_, i) => i !== index));
  };

  const updateStatus = (index: number, field: keyof PieceStatus, value: string | number) => {
    setStatuses(statuses.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleCharacterChange = (charId: string | null) => {
    setCharacterId(charId);
    if (charId) {
      const char = characters.find((c) => c.id === charId);
      if (char) {
        setLabel(char.name);
        setColor(char.color);
        setImageUrl(char.image_url ?? '');
        setStatuses(char.statuses.length > 0 ? [...char.statuses] : statuses);
      }
    }
  };

  const handleSave = () => {
    onSave(piece.id, {
      label,
      color,
      image_url: imageUrl || null,
      initiative,
      memo,
      statuses,
      character_id: characterId,
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
    width: '400px',
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

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem' }}>コマ編集</h3>

        {/* キャラクター紐付け */}
        {characters.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>キャラクター紐付け</label>
            <select
              value={characterId ?? ''}
              onChange={(e) => handleCharacterChange(e.target.value || null)}
              style={{
                ...inputStyle,
                cursor: 'pointer',
              }}
            >
              <option value="">なし</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>名前</label>
          <input style={inputStyle} value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>

        {/* コマ画像 */}
        {roomId && (
          <div style={{ marginBottom: '12px' }}>
            <AssetPicker
              label="コマ画像"
              currentUrl={imageUrl || null}
              onSelect={(url) => setImageUrl(url)}
            />
          </div>
        )}

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>色</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
            style={{ width: '48px', height: '32px', border: 'none', background: 'transparent', cursor: 'pointer' }} />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>イニシアティブ</label>
          <input type="number" style={inputStyle} value={initiative}
            onChange={(e) => setInitiative(Number(e.target.value))} />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>メモ</label>
          <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
            value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>

        <div style={{ marginBottom: '12px' }}>
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

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
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
