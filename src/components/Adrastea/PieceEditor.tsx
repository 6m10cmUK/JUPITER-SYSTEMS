import React, { useState } from 'react';
import type { Piece, PieceStatus, Character } from '../../types/adrastea.types';
import { AssetPicker } from './AssetPicker';
import { theme } from '../../styles/theme';
import { X } from 'lucide-react';
import { AdInput, AdTextArea, AdButton, AdSelect, AdColorPicker } from './ui';

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
  };

  const panelStyle: React.CSSProperties = {
    background: theme.bgSurface,
    padding: '8px',
    height: '100%',
    overflowY: 'auto',
    color: theme.textPrimary,
    boxSizing: 'border-box',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '8px',
  };

  return (
    <div style={panelStyle}>
        <h3 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600 }}>コマ編集</h3>

        {/* キャラクター紐付け */}
        {characters.length > 0 && (
          <div style={sectionStyle}>
            <AdSelect
              label="キャラクター紐付け"
              value={characterId ?? ''}
              onChange={(e) => handleCharacterChange(e.target.value || null)}
              options={[
                { value: '', label: 'なし' },
                ...characters.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
        )}

        <div style={sectionStyle}>
          <AdInput label="名前" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>

        {/* コマ画像 */}
        {roomId && (
          <div style={sectionStyle}>
            <AssetPicker
              label="コマ画像"
              currentUrl={imageUrl || null}
              onSelect={(url) => setImageUrl(url)}
            />
          </div>
        )}

        <div style={sectionStyle}>
          <AdColorPicker label="色" value={color} onChange={setColor} />
        </div>

        <div style={sectionStyle}>
          <AdInput
            label="イニシアティブ"
            type="number"
            value={initiative}
            onChange={(e) => setInitiative(Number(e.target.value))}
          />
        </div>

        <div style={sectionStyle}>
          <AdTextArea label="メモ" value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>

        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '12px', color: theme.textSecondary }}>ステータス</label>
            <AdButton variant="primary" onClick={addStatus}>+ 追加</AdButton>
          </div>
          {statuses.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
              <AdInput fullWidth={false} value={s.label}
                onChange={(e) => updateStatus(i, 'label', e.target.value)} placeholder="HP"
                style={{ width: '60px' }} />
              <AdInput type="number" fullWidth={false} value={s.value}
                onChange={(e) => updateStatus(i, 'value', Number(e.target.value))}
                style={{ width: '60px' }} />
              <span style={{ color: theme.textMuted, fontSize: '12px' }}>/</span>
              <AdInput type="number" fullWidth={false} value={s.max}
                onChange={(e) => updateStatus(i, 'max', Number(e.target.value))}
                style={{ width: '60px' }} />
              <AdColorPicker value={s.color} onChange={(v) => updateStatus(i, 'color', v)} />
              <button onClick={() => removeStatus(i)} style={{
                background: 'transparent', border: `1px solid ${theme.danger}`, color: theme.danger,
                borderRadius: 0, cursor: 'pointer', display: 'flex', alignItems: 'center',
                padding: '2px 4px', flexShrink: 0,
              }}><X size={12} /></button>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <AdButton variant="primary" onClick={handleSave}>保存</AdButton>
        </div>
    </div>
  );
}
