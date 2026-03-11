import React, { useState } from 'react';
import type { Character, CharacterImage, PieceStatus, CharacterParameter } from '../../types/adrastea.types';
import { AssetPicker } from './AssetPicker';
import { theme } from '../../styles/theme';
import { AdInput, AdTextArea, AdButton, AdColorPicker } from './ui';
import { Trash2, Copy } from 'lucide-react';

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
  onClose: _onClose,
}: CharacterEditorProps) {
  // 基本情報
  const [name, setName] = useState(character?.name ?? '');
  const [color, setColor] = useState(character?.color ?? theme.accent);
  const [sheetUrl, setSheetUrl] = useState(character?.sheet_url ?? '');

  // 立ち絵・差分
  const [images, setImages] = useState<CharacterImage[]>(character?.images ?? []);
  const [activeImageIndex, setActiveImageIndex] = useState(character?.active_image_index ?? 0);

  // 盤面設定
  const [initiative, setInitiative] = useState(character?.initiative ?? 0);
  const [size, setSize] = useState(character?.size ?? 1);

  // ステータス
  const [statuses, setStatuses] = useState<PieceStatus[]>(character?.statuses ?? []);

  // パラメータ
  const [parameters, setParameters] = useState<CharacterParameter[]>(character?.parameters ?? []);

  // メモ
  const [memo, setMemo] = useState(character?.memo ?? '');
  const [secretMemo, setSecretMemo] = useState(character?.secret_memo ?? '');
  const [chatPalette, setChatPalette] = useState(character?.chat_palette ?? '');

  // 設定
  const [isStatusPrivate, setIsStatusPrivate] = useState(character?.is_status_private ?? false);
  const [isHiddenOnBoard, setIsHiddenOnBoard] = useState(character?.is_hidden_on_board ?? false);
  const [isSpeechHidden, setIsSpeechHidden] = useState(character?.is_speech_hidden ?? false);

  // ─── 立ち絵管理 ───
  const addImage = () => {
    setImages([...images, { url: '', label: '' }]);
  };

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    if (activeImageIndex === index) {
      setActiveImageIndex(Math.max(0, updated.length - 1));
    }
  };

  const updateImage = (index: number, field: keyof CharacterImage, value: string) => {
    setImages(images.map((img, i) => i === index ? { ...img, [field]: value } : img));
  };

  // ─── ステータス管理 ───
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

  // ─── パラメータ管理 ───
  const addParameter = () => {
    setParameters([...parameters, { label: '力', value: 10 }]);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const updateParameter = (index: number, field: keyof CharacterParameter, value: string | number) => {
    setParameters(parameters.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  // ─── 保存 ───
  const handleSave = () => {
    onSave({
      name: name.trim() || '無名',
      color,
      sheet_url: sheetUrl.trim() || null,
      images,
      active_image_index: Math.min(activeImageIndex, Math.max(0, images.length - 1)),
      initiative,
      size,
      statuses,
      parameters,
      memo,
      secret_memo: secretMemo,
      chat_palette: chatPalette,
      is_status_private: isStatusPrivate,
      is_hidden_on_board: isHiddenOnBoard,
      is_speech_hidden: isSpeechHidden,
    });
  };

  // ─── 複製 ───
  const handleDuplicate = () => {
    if (!onDuplicate) return;
    onDuplicate({
      name: `${name}(複製)`,
      color,
      sheet_url: sheetUrl || null,
      images,
      active_image_index: activeImageIndex,
      initiative,
      size,
      statuses,
      parameters,
      memo,
      secret_memo: secretMemo,
      chat_palette: chatPalette,
      is_status_private: isStatusPrivate,
      is_hidden_on_board: isHiddenOnBoard,
      is_speech_hidden: isSpeechHidden,
    });
  };
  };

  const panelStyle: React.CSSProperties = {
    background: theme.bgSurface,
    padding: '8px',
    maxHeight: '100%',
    overflowY: 'auto',
    color: theme.textPrimary,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: `1px solid ${theme.borderSubtle}`,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: theme.textSecondary,
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    marginBottom: '4px',
    alignItems: 'center',
  };

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 8px',
    background: active ? theme.accent : theme.bgInput,
    color: active ? theme.textOnAccent : theme.textPrimary,
    border: `1px solid ${active ? theme.accent : theme.borderInput}`,
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '11px',
    transition: 'all 0.2s',
  });

  return (
    <div style={panelStyle}>
      {/* タイトル */}
      <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700 }}>
        {character ? 'キャラクター編集' : '新規キャラクター'}
      </h3>

      {/* スクロール可能エリア */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* 1. 基本情報 */}
        <div style={sectionStyle}>
          <div style={labelStyle}>基本情報</div>

          <div style={{ ...rowStyle, marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <AdInput
                label="名前"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="キャラクター名"
              />
            </div>
          </div>

          <div style={{ ...rowStyle, marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <AdColorPicker
                label="テーマカラー"
                value={color}
                onChange={setColor}
              />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <AdInput
                label="外部URL"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="キャラクターシートURL等"
              />
            </div>
          </div>
        </div>

        {/* 2. 立ち絵・差分 */}
        <div style={sectionStyle}>
          <div style={{ ...labelStyle, marginBottom: '8px' }}>立ち絵・差分</div>
          {images.length === 0 ? (
            <div style={{ color: theme.textMuted, fontSize: '11px', marginBottom: '8px' }}>
              立ち絵が登録されていません
            </div>
          ) : (
            images.map((img, i) => (
              <div key={i} style={{ ...rowStyle, marginBottom: '8px', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '4px', width: '100%', alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="active_image"
                    checked={activeImageIndex === i}
                    onChange={() => setActiveImageIndex(i)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <AssetPicker
                      currentUrl={img.url || null}
                      onSelect={(url) => updateImage(i, 'url', url)}
                    />
                  </div>
                  <AdButton variant="danger" onClick={() => removeImage(i)}>
                    削除
                  </AdButton>
                </div>
                <div style={{ width: '100%', marginTop: '4px' }}>
                  <AdInput
                    value={img.label}
                    onChange={(e) => updateImage(i, 'label', e.target.value)}
                    placeholder="画像ラベル（例：通常、怒り）"
                  />
                </div>
              </div>
            ))
          )}
          <AdButton variant="primary" onClick={addImage}>
            + 追加
          </AdButton>
        </div>

        {/* 3. 盤面設定 */}
        <div style={sectionStyle}>
          <div style={labelStyle}>盤面設定</div>

          <div style={{ ...rowStyle, marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <AdInput
                type="number"
                label="イニシアティブ"
                value={initiative}
                onChange={(e) => setInitiative(Number(e.target.value))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <AdInput
                type="number"
                label="駒サイズ"
                value={size}
                onChange={(e) => setSize(Math.max(1, Number(e.target.value)))}
              />
            </div>
          </div>
        </div>

        {/* 4. ステータス */}
        <div style={sectionStyle}>
          <div style={{ ...labelStyle, marginBottom: '8px' }}>ステータス</div>
          {statuses.map((s, i) => (
            <div key={i} style={{ ...rowStyle, marginBottom: '6px' }}>
              <AdInput
                value={s.label}
                onChange={(e) => updateStatus(i, 'label', e.target.value)}
                placeholder="HP"
                style={{ flex: 0, minWidth: '60px' }}
              />
              <AdInput
                type="number"
                value={s.value}
                onChange={(e) => updateStatus(i, 'value', Number(e.target.value))}
                style={{ flex: 0, minWidth: '50px' }}
              />
              <span style={{ color: theme.textMuted, fontSize: '12px' }}>/</span>
              <AdInput
                type="number"
                value={s.max}
                onChange={(e) => updateStatus(i, 'max', Number(e.target.value))}
                style={{ flex: 0, minWidth: '50px' }}
              />
              <AdButton variant="danger" onClick={() => removeStatus(i)}>
                削除
              </AdButton>
            </div>
          ))}
          <AdButton variant="primary" onClick={addStatus}>
            + 追加
          </AdButton>
        </div>

        {/* 5. パラメータ */}
        <div style={sectionStyle}>
          <div style={{ ...labelStyle, marginBottom: '8px' }}>パラメータ</div>
          {parameters.map((p, i) => (
            <div key={i} style={{ ...rowStyle, marginBottom: '6px' }}>
              <AdInput
                value={p.label}
                onChange={(e) => updateParameter(i, 'label', e.target.value)}
                placeholder="能力名"
                style={{ flex: 0, minWidth: '70px' }}
              />
              <AdInput
                value={String(p.value)}
                onChange={(e) => updateParameter(i, 'value', e.target.value)}
                placeholder="値"
                style={{ flex: 1 }}
              />
              <AdButton variant="danger" onClick={() => removeParameter(i)}>
                削除
              </AdButton>
            </div>
          ))}
          <AdButton variant="primary" onClick={addParameter}>
            + 追加
          </AdButton>
        </div>

        {/* 6. メモ */}
        <div style={sectionStyle}>
          <div style={labelStyle}>メモ</div>
          <AdTextArea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="キャラクターメモ"
            style={{ minHeight: '80px' }}
          />
        </div>

        {/* 7. シークレットメモ */}
        <div style={sectionStyle}>
          <div style={labelStyle}>シークレットメモ</div>
          <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px' }}>
            自分だけが見えます
          </div>
          <AdTextArea
            value={secretMemo}
            onChange={(e) => setSecretMemo(e.target.value)}
            placeholder="秘密のメモ"
            style={{ minHeight: '80px' }}
          />
        </div>

        {/* 8. チャットパレット */}
        <div style={sectionStyle}>
          <div style={labelStyle}>チャットパレット</div>
          <div style={{ fontSize: '11px', color: theme.textMuted, marginBottom: '4px' }}>
            改行区切りでコマンドや定型文を登録
          </div>
          <AdTextArea
            value={chatPalette}
            onChange={(e) => setChatPalette(e.target.value)}
            placeholder="通常攻撃&#10;魔法&#10;防御"
            style={{ minHeight: '80px' }}
          />
        </div>

        {/* 9. 設定 */}
        <div style={sectionStyle}>
          <div style={labelStyle}>設定</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => setIsStatusPrivate(!isStatusPrivate)}
              style={toggleStyle(isStatusPrivate)}
            >
              {isStatusPrivate ? '✓' : '○'} ステータスを非公開にする
            </button>
            <button
              onClick={() => setIsHiddenOnBoard(!isHiddenOnBoard)}
              style={toggleStyle(isHiddenOnBoard)}
            >
              {isHiddenOnBoard ? '✓' : '○'} 盤面一覧に表示しない
            </button>
            <button
              onClick={() => setIsSpeechHidden(!isSpeechHidden)}
              style={toggleStyle(isSpeechHidden)}
            >
              {isSpeechHidden ? '✓' : '○'} 発言時に表示しない
            </button>
          </div>
        </div>
      </div>

      {/* フッターボタン */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '8px',
        borderTop: `1px solid ${theme.borderSubtle}`,
        flexShrink: 0,
      }}>
        {/* 左側: 削除 */}
        {character && onDelete && (
          <AdButton variant="danger" onClick={onDelete}>
            <Trash2 size={14} style={{ marginRight: '4px' }} />
            削除
          </AdButton>
        )}
        {!character && <div />}

        {/* 中央: 複製 */}
        {character && onDuplicate && (
          <AdButton variant="primary" onClick={handleDuplicate}>
            <Copy size={14} style={{ marginRight: '4px' }} />
            複製
          </AdButton>
        )}

        {/* 右側: キャンセル / 保存 */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <AdButton variant="secondary" onClick={() => _onClose?.()}>
            キャンセル
          </AdButton>
          <AdButton variant="primary" onClick={handleSave}>
            保存
          </AdButton>
        </div>
      </div>
    </div>
  );
}
