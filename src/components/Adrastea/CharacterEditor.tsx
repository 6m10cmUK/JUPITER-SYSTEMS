import React, { useState } from 'react';
import type { Character } from '../../types/adrastea.types';
import { AssetPicker } from './AssetPicker';
import { theme } from '../../styles/theme';
import { AdInput, AdTextArea, AdButton, AdColorPicker } from './ui';
import { Trash2 } from 'lucide-react';

interface CharacterEditorProps {
  character?: Character | null;
  roomId: string;
  currentUserId: string;
  onSave: (data: Partial<Character>) => void;
  onDuplicate?: (data: Partial<Character>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function CharacterEditor({
  character,
  roomId: _roomId,
  currentUserId,
  onSave,
  onDuplicate,
  onDelete,
  onClose,
}: CharacterEditorProps) {
  // 基本情報
  const [name, setName] = useState(character?.name ?? '');
  const [color, setColor] = useState(character?.color ?? theme.accent);
  const [sheetUrl, setSheetUrl] = useState(character?.sheet_url ?? '');

  // 立ち絵・差分
  const [images, setImages] = useState(character?.images ?? []);
  const [activeImageIndex, setActiveImageIndex] = useState(character?.active_image_index ?? 0);

  // 盤面設定
  const [initiative, setInitiative] = useState(character?.initiative ?? 0);
  const [size, setSize] = useState(character?.size ?? 1);

  // ステータス
  const [statuses, setStatuses] = useState(
    character?.statuses ?? []
  );

  // パラメータ
  const [parameters, setParameters] = useState(
    character?.parameters ?? []
  );

  // メモ
  const [memo, setMemo] = useState(character?.memo ?? '');
  const [secretMemo, setSecretMemo] = useState(character?.secret_memo ?? '');
  const [chatPalette, setChatPalette] = useState(character?.chat_palette ?? '');

  // 設定フラグ
  const [isStatusPrivate, setIsStatusPrivate] = useState(character?.is_status_private ?? false);
  const [isHiddenOnBoard, setIsHiddenOnBoard] = useState(character?.is_hidden_on_board ?? false);
  const [isSpeechHidden, setIsSpeechHidden] = useState(character?.is_speech_hidden ?? false);

  // ステータス操作
  const addStatus = () => {
    setStatuses([...statuses, { label: 'HP', value: 10, max: 10 }]);
  };

  const removeStatus = (index: number) => {
    setStatuses(statuses.filter((_, i) => i !== index));
  };

  const updateStatus = (index: number, field: 'label' | 'value' | 'max', value: string | number) => {
    setStatuses(
      statuses.map((s, i) => (i === index ? { ...s, [field]: field === 'label' ? value : Number(value) } : s))
    );
  };

  // パラメータ操作
  const addParameter = () => {
    setParameters([...parameters, { label: 'パラメータ', value: '' }]);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const updateParameter = (index: number, field: 'label' | 'value', value: string | number) => {
    setParameters(
      parameters.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  // 立ち絵操作
  const addImage = () => {
    setImages([...images, { url: '', label: '' }]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    // 削除したイメージが選択されていた場合は0にリセット
    if (activeImageIndex >= newImages.length) {
      setActiveImageIndex(Math.max(0, newImages.length - 1));
    }
  };

  const updateImage = (index: number, field: 'url' | 'label', value: string) => {
    setImages(images.map((img, i) => (i === index ? { ...img, [field]: value } : img)));
  };

  // データ構築
  const buildData = (): Partial<Character> => ({
    name: name.trim() || '無名',
    color,
    sheet_url: sheetUrl || null,
    images,
    active_image_index: activeImageIndex,
    initiative: Number(initiative),
    size: Math.max(1, Math.min(10, Number(size))),
    statuses,
    parameters,
    memo,
    secret_memo: secretMemo,
    chat_palette: chatPalette,
    is_status_private: isStatusPrivate,
    is_hidden_on_board: isHiddenOnBoard,
    is_speech_hidden: isSpeechHidden,
    ...(character ? {} : { owner_id: currentUserId }),
  });

  const handleSave = () => {
    onSave(buildData());
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

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: theme.textSecondary,
    marginBottom: '4px',
    display: 'block',
  };

  const ToggleButton = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: '36px',
        height: '20px',
        background: value ? theme.accent : theme.bgInput,
        border: `1px solid ${theme.border}`,
        borderRadius: '10px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.15s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: value ? '18px' : '2px',
          width: '14px',
          height: '14px',
          background: theme.textPrimary,
          borderRadius: '50%',
          transition: 'left 0.15s',
        }}
      />
    </button>
  );

  return (
    <div style={panelStyle}>
      <h3 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600 }}>
        {character ? 'キャラクター編集' : '新規キャラクター'}
      </h3>

      {/* 1. 基本情報 */}
      <div style={sectionStyle}>
        <AdInput
          label="名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="キャラクター名"
        />
      </div>

      <div style={sectionStyle}>
        <AdColorPicker label="テーマカラー" value={color} onChange={setColor} />
      </div>

      <div style={sectionStyle}>
        <AdInput
          label="キャラクターシート URL"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      {/* 2. 立ち絵・差分 */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label style={labelStyle}>立ち絵・差分</label>
          <AdButton onClick={addImage} style={{ fontSize: '11px', padding: '2px 6px' }}>
            + 追加
          </AdButton>
        </div>
        {images.map((img, i) => (
          <div
            key={i}
            style={{
              border: `1px solid ${theme.borderSubtle}`,
              padding: '6px',
              marginBottom: '4px',
              borderRadius: 0,
              background: activeImageIndex === i ? theme.accentBgSubtle : 'transparent',
            }}
          >
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
              <input
                type="radio"
                name="active-image"
                checked={activeImageIndex === i}
                onChange={() => setActiveImageIndex(i)}
                style={{ cursor: 'pointer', width: '14px', height: '14px' }}
              />
              <AssetPicker
                currentUrl={img.url || null}
                onSelect={(url) => updateImage(i, 'url', url)}
                label={`差分 ${i + 1}`}
              />
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <AdInput
                value={img.label}
                onChange={(e) => updateImage(i, 'label', e.target.value)}
                placeholder="ラベル"
                style={{ flex: 1 }}
              />
              <button
                onClick={() => removeImage(i)}
                style={{
                  padding: '4px 6px',
                  background: theme.bgInput,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.danger,
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 3. 盤面設定 */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <AdInput
            label="イニシアティブ"
            type="number"
            value={initiative}
            onChange={(e) => setInitiative(parseInt(e.target.value, 10))}
            style={{ flex: 1 }}
          />
          <AdInput
            label="駒サイズ"
            type="number"
            value={size}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSize(Math.max(1, Math.min(10, v)));
            }}
            min="1"
            max="10"
            style={{ flex: 1 }}
          />
        </div>
      </div>

      {/* 4. ステータス */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label style={labelStyle}>ステータス</label>
          <AdButton onClick={addStatus} style={{ fontSize: '11px', padding: '2px 6px' }}>
            +
          </AdButton>
        </div>
        {statuses.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
            <AdInput
              value={s.label}
              onChange={(e) => updateStatus(i, 'label', e.target.value)}
              placeholder="ラベル"
              style={{ width: '70px' }}
            />
            <AdInput
              type="number"
              value={s.value}
              onChange={(e) => updateStatus(i, 'value', e.target.value)}
              placeholder="現在値"
              style={{ width: '50px' }}
            />
            <span style={{ color: theme.textMuted, fontSize: '12px' }}>/</span>
            <AdInput
              type="number"
              value={s.max}
              onChange={(e) => updateStatus(i, 'max', e.target.value)}
              placeholder="最大値"
              style={{ width: '50px' }}
            />
            <button
              onClick={() => removeStatus(i)}
              style={{
                padding: '4px 6px',
                background: theme.bgInput,
                border: `1px solid ${theme.border}`,
                borderRadius: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.danger,
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* 5. パラメータ */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label style={labelStyle}>パラメータ</label>
          <AdButton onClick={addParameter} style={{ fontSize: '11px', padding: '2px 6px' }}>
            +
          </AdButton>
        </div>
        {parameters.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
            <AdInput
              value={p.label}
              onChange={(e) => updateParameter(i, 'label', e.target.value)}
              placeholder="ラベル"
              style={{ width: '70px' }}
            />
            <AdInput
              value={String(p.value)}
              onChange={(e) => updateParameter(i, 'value', e.target.value)}
              placeholder="値"
              style={{ flex: 1 }}
            />
            <button
              onClick={() => removeParameter(i)}
              style={{
                padding: '4px 6px',
                background: theme.bgInput,
                border: `1px solid ${theme.border}`,
                borderRadius: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.danger,
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* 6. メモ */}
      <div style={sectionStyle}>
        <AdTextArea
          label="メモ"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="メモ"
        />
      </div>

      {/* 7. シークレットメモ */}
      <div style={sectionStyle}>
        <div style={{ ...labelStyle, marginBottom: '2px' }}>
          シークレットメモ<span style={{ fontSize: '11px', color: theme.textMuted }}> （自分とGMのみ）</span>
        </div>
        <AdTextArea
          value={secretMemo}
          onChange={(e) => setSecretMemo(e.target.value)}
          placeholder="シークレットメモ"
        />
      </div>

      {/* 8. チャットパレット */}
      <div style={sectionStyle}>
        <div style={{ ...labelStyle, marginBottom: '2px' }}>
          チャットパレット<span style={{ fontSize: '11px', color: theme.textMuted }}> （改行区切りで登録）</span>
        </div>
        <AdTextArea
          value={chatPalette}
          onChange={(e) => setChatPalette(e.target.value)}
          placeholder="改行区切りで登録"
          rows={6}
        />
      </div>

      {/* 9. 設定 */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', padding: '6px 0' }}>
          <span style={{ fontSize: '12px', flex: 1 }}>ステータスを非公開にする</span>
          <ToggleButton value={isStatusPrivate} onChange={setIsStatusPrivate} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', padding: '6px 0' }}>
          <span style={{ fontSize: '12px', flex: 1 }}>盤面一覧に表示しない</span>
          <ToggleButton value={isHiddenOnBoard} onChange={setIsHiddenOnBoard} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
          <span style={{ fontSize: '12px', flex: 1 }}>発言時表示設定</span>
          <ToggleButton value={isSpeechHidden} onChange={setIsSpeechHidden} />
        </div>
      </div>

      {/* フッターボタン */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '12px',
          paddingTop: '8px',
          borderTop: `1px solid ${theme.border}`,
        }}
      >
        <div style={{ display: 'flex', gap: '4px' }}>
          {onDelete && (
            <AdButton variant="danger" onClick={onDelete}>
              削除
            </AdButton>
          )}
          {onDuplicate && (
            <AdButton onClick={() => onDuplicate(buildData())}>
              複製
            </AdButton>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <AdButton onClick={onClose}>キャンセル</AdButton>
          <AdButton variant="primary" onClick={handleSave}>
            保存
          </AdButton>
        </div>
      </div>
    </div>
  );
}
