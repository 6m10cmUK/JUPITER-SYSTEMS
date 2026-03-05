import React, { useState } from 'react';
import type { Character, PieceStatus } from '../../types/adrastea.types';
import { AssetPicker } from './AssetPicker';
import { theme } from '../../styles/theme';
import { AdInput, AdTextArea, AdButton, AdColorPicker } from './ui';

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
        <h3 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600 }}>
          {character ? 'キャラクター編集' : '新規キャラクター'}
        </h3>

        {/* 名前 */}
        <div style={sectionStyle}>
          <AdInput
            label="名前"
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
          <AdColorPicker
            label="テーマカラー"
            value={color}
            onChange={setColor}
          />
        </div>

        {/* ステータス */}
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
              <AdButton variant="danger" onClick={() => removeStatus(i)}>x</AdButton>
            </div>
          ))}
        </div>

        {/* タグ */}
        <div style={sectionStyle}>
          <label style={{ fontSize: '12px', color: theme.textSecondary, display: 'block', marginBottom: '2px' }}>タグ</label>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
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
                  fontSize: '11px',
                }}
              >
                {tag}
                <button
                  onClick={() => removeTag(i)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme.danger,
                    fontSize: '10px',
                    cursor: 'pointer',
                    padding: '0 2px',
                  }}
                >
                  x
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <AdInput
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              placeholder="タグを追加"
            />
            <AdButton onClick={addTag}>追加</AdButton>
          </div>
        </div>

        {/* メモ */}
        <div style={sectionStyle}>
          <AdTextArea
            label="メモ"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="キャラクターメモ"
          />
        </div>

        {/* ボタン */}
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          <AdButton variant="primary" onClick={handleSave}>保存</AdButton>
        </div>
    </div>
  );
}
