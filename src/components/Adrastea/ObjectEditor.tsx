import React, { useState, useEffect } from 'react';
import type { BoardObject, BoardObjectType } from '../../types/adrastea.types';
import { AssetPicker } from './AssetPicker';
import { theme } from '../../styles/theme';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { AdInput, AdTextArea, AdButton, AdSection, AdCheckbox, AdColorPicker, AdToggleButtons } from './ui';

const FONT_OPTIONS = [
  { value: 'sans-serif', label: 'ゴシック体' },
  { value: 'serif', label: '明朝体' },
  { value: '"Noto Sans JP", sans-serif', label: 'Noto Sans JP' },
  { value: '"Noto Serif JP", serif', label: 'Noto Serif JP' },
  { value: 'monospace', label: '等幅' },
  { value: '"M PLUS Rounded 1c", sans-serif', label: 'M PLUS Rounded' },
  { value: '"Zen Maru Gothic", sans-serif', label: 'Zen 丸ゴシック' },
  { value: '"Kosugi Maru", sans-serif', label: '小杉丸ゴシック' },
  { value: 'cursive', label: '筆記体' },
  { value: 'fantasy', label: 'ファンタジー' },
];

interface ObjectEditorProps {
  object?: BoardObject | null;
  defaultType?: BoardObjectType;
  roomId: string;
  onSave: (data: Partial<BoardObject>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function ObjectEditor({ object, defaultType, roomId: _roomId, onSave: _onSave, onDelete, onClose }: ObjectEditorProps) {
  const [type, setType] = useState<BoardObjectType>(object?.type ?? defaultType ?? 'panel');
  const [name, setName] = useState(object?.name ?? '');
  const [imageUrl, setImageUrl] = useState(object?.image_url ?? '');
  const [backgroundColor, setBackgroundColor] = useState(() => {
    const c = object?.background_color;
    return c && c !== 'transparent' ? c : '#1e1e2e';
  });
  const [bgEnabled, setBgEnabled] = useState(
    !!object?.background_color && object.background_color !== 'transparent'
  );
  const [textContent, setTextContent] = useState(object?.text_content ?? '');
  const [fontSize, setFontSize] = useState(object?.font_size ?? 16);
  const [fontFamily, setFontFamily] = useState(object?.font_family ?? 'sans-serif');
  const [letterSpacing, setLetterSpacing] = useState(object?.letter_spacing ?? 0);
  const [lineHeight, setLineHeight] = useState(object?.line_height ?? 1.2);
  const [autoSize, setAutoSize] = useState(object?.auto_size ?? true);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>(object?.text_align ?? 'left');
  const [textVerticalAlign, setTextVerticalAlign] = useState<'top' | 'middle' | 'bottom'>(object?.text_vertical_align ?? 'top');
  const [textColor, setTextColor] = useState(object?.text_color ?? '#ffffff');
  const [scaleX, setScaleX] = useState(object?.scale_x ?? 1);
  const [scaleY, setScaleY] = useState(object?.scale_y ?? 1);
  const [posX, setPosX] = useState(object?.x ?? 50);
  const [posY, setPosY] = useState(object?.y ?? 50);
  const [width, setWidth] = useState(object?.width ?? 4);
  const [height, setHeight] = useState(object?.height ?? 4);
  const [imageFit, setImageFit] = useState<'cover' | 'contain' | 'stretch'>(object?.image_fit ?? 'contain');
  const [positionLocked, setPositionLocked] = useState(object?.position_locked ?? false);
  const [sizeLocked, setSizeLocked] = useState(object?.size_locked ?? false);
  const [opacity, _setOpacity] = useState(object?.opacity ?? 1);
  const [visible, _setVisible] = useState(object?.visible ?? true);

  // 外部からの変更（レイヤーパネルでのリネーム、画像選択モーダル、ボード上リサイズ等）をローカルstateに同期
  useEffect(() => {
    if (object && object.name !== undefined) {
      setName(object.name);
    }
  }, [object?.name]);
  useEffect(() => {
    if (object && object.image_url !== undefined) {
      setImageUrl(object.image_url ?? '');
    }
  }, [object?.image_url]);
  useEffect(() => {
    if (object && object.font_size !== undefined) {
      setFontSize(object.font_size);
    }
  }, [object?.font_size]);
  useEffect(() => {
    if (object) {
      setPosX(object.x);
      setPosY(object.y);
      setWidth(object.width);
      setHeight(object.height);
    }
  }, [object?.x, object?.y, object?.width, object?.height]);

  const ctx = useAdrasteaContext();
  const isGlobal = object?.global ?? false;

  const isNew = object === null;
  const isBackground = type === 'background';
  const isForeground = type === 'foreground';

  useEffect(() => {
    if (isNew) return;
    const data: Record<string, unknown> = {
      type,
      name: isForeground ? '前景' : (name.trim() || '無題'),
      visible,
      opacity,
    };
    if (type === 'panel') {
      data.x = posX;
      data.y = posY;
      data.image_url = imageUrl || null;
      data.background_color = bgEnabled ? backgroundColor : 'transparent';
      data.width = width;
      data.height = height;
      data.image_fit = imageFit;
      data.position_locked = positionLocked;
      data.size_locked = sizeLocked;
    } else if (type === 'text') {
      data.x = posX;
      data.y = posY;
      data.text_content = textContent;
      data.font_size = fontSize;
      data.font_family = fontFamily;
      data.letter_spacing = letterSpacing;
      data.line_height = lineHeight;
      data.auto_size = autoSize;
      data.text_align = textAlign;
      data.text_vertical_align = textVerticalAlign;
      data.text_color = textColor;
      data.background_color = bgEnabled ? backgroundColor : 'transparent';
      data.width = width;
      data.height = height;
      data.position_locked = positionLocked;
      data.size_locked = sizeLocked;
      data.scale_x = scaleX;
      data.scale_y = scaleY;
    } else if (type === 'foreground') {
      data.x = posX;
      data.y = posY;
      data.image_url = imageUrl || null;
      data.width = width;
      data.height = height;
      data.image_fit = imageFit;
    } else if (type === 'background') {
      data.image_url = imageUrl || null;
      data.opacity = opacity;
      data.visible = visible;
    }
    ctx.setPendingEdit(`object:${object?.id ?? 'new'}`, {
      type: 'object',
      id: object?.id ?? null,
      data,
    });
  }, [type, name, posX, posY, imageUrl, backgroundColor, bgEnabled, textContent, fontSize, fontFamily, letterSpacing, lineHeight, autoSize, textAlign, textVerticalAlign, textColor, scaleX, scaleY, width, height, imageFit, positionLocked, sizeLocked, opacity, visible]);

  if (object === undefined) return null;

  const panelStyle: React.CSSProperties = {
    background: theme.bgSurface,
    padding: '8px',
    height: '100%',
    overflowY: 'auto',
    color: theme.textPrimary,
    boxSizing: 'border-box',
  };

  const title = isNew
    ? '新規オブジェクト'
    : isBackground
      ? '背景'
      : isForeground
        ? '前景'
        : isGlobal
          ? 'ルームオブジェクト'
          : 'シーンオブジェクト';

  return (
    <div style={panelStyle}>
      <h3 style={{ fontSize: '12px', fontWeight: 600, margin: '0 0 8px' }}>{title}</h3>

      {/* タイプ選択（新規のみ） */}
      {isNew && (
        <AdSection label="タイプ">
          <AdToggleButtons
            value={type}
            onChange={(v) => setType(v as BoardObjectType)}
            options={[
              { value: 'panel', label: 'パネル' },
              { value: 'text', label: 'テキスト' },
            ]}
          />
        </AdSection>
      )}

      {/* background: 画像・グリッドの編集 */}
      {isBackground && !isNew && (
        <>
          <AdSection title="背景画像">
            <AssetPicker
              currentUrl={imageUrl || null}
              onSelect={(url) => setImageUrl(url)}
            />
          </AdSection>
          <AdSection title="設定">
            <AdCheckbox
              checked={ctx.gridVisible}
              onChange={ctx.setGridVisible}
              label="グリッド表示"
            />
          </AdSection>
        </>
      )}

      {/* panel / text / foreground の編集フォーム */}
      {!isBackground && (
        <>
          {/* 名前（前景は固定） */}
          {!isForeground && (
            <AdSection label="名前">
              <AdInput value={name} onChange={(e) => setName(e.target.value)} placeholder="オブジェクト名" />
            </AdSection>
          )}

          {/* panel: 画像 + 背景色 + サイズ */}
          {type === 'panel' && (
            <>
              <AdSection>
                <AssetPicker
                  label="画像"
                  currentUrl={imageUrl || null}
                  onSelect={(url) => setImageUrl(url)}
                />
              </AdSection>
              {imageUrl && (
                <AdSection label="画像表示">
                  <AdToggleButtons
                    value={imageFit}
                    options={[
                      { value: 'contain', label: '全体表示' },
                      { value: 'cover', label: 'トリミング' },
                      { value: 'stretch', label: '引き伸ばし' },
                    ]}
                    onChange={(v) => setImageFit(v as 'contain' | 'cover' | 'stretch')}
                  />
                </AdSection>
              )}
              <AdSection label="背景色">
                <AdCheckbox
                  checked={bgEnabled}
                  onChange={setBgEnabled}
                  label="背景色を使用"
                />
                {bgEnabled && (
                  <div style={{ marginTop: '6px' }}>
                    <AdColorPicker value={backgroundColor} onChange={setBackgroundColor} enableAlpha />
                  </div>
                )}
              </AdSection>
              <AdSection label="位置">
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>x:</span>
                  <AdInput
                    type="number"
                    value={String(posX)}
                    onChange={(e) => setPosX(Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>y:</span>
                  <AdInput
                    type="number"
                    value={String(posY)}
                    onChange={(e) => setPosY(Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                </div>
              </AdSection>
              <AdSection label="サイズ">
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>x:</span>
                  <AdInput
                    type="number"
                    value={String(width)}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>y:</span>
                  <AdInput
                    type="number"
                    value={String(height)}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                </div>
              </AdSection>
              <AdSection label="ロック">
                <AdCheckbox checked={positionLocked} onChange={setPositionLocked} label="位置を固定" />
                <AdCheckbox checked={sizeLocked} onChange={setSizeLocked} label="サイズを固定" />
              </AdSection>
            </>
          )}

          {/* text: テキスト内容 + フォント + 色 + 背景色 + サイズ */}
          {type === 'text' && (
            <>
              <AdSection label="テキスト内容">
                <AdTextArea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="表示するテキスト"
                  rows={3}
                />
              </AdSection>
              <AdSection label="フォント">
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  style={{
                    width: '100%',
                    height: '24px',
                    padding: '2px 6px',
                    fontSize: '12px',
                    background: theme.bgInput,
                    border: `1px solid ${theme.borderInput}`,
                    borderRadius: 0,
                    color: theme.textPrimary,
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: fontFamily,
                  }}
                >
                  {FONT_OPTIONS.map(f => (
                    <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </AdSection>
              <AdSection label="フォントサイズ">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AdInput
                    type="number"
                    value={String(fontSize)}
                    onChange={(e) => setFontSize(Math.max(1, Number(e.target.value)))}
                    fullWidth={false}
                    inputWidth="64px"
                  />
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>px</span>
                </div>
              </AdSection>
              <AdSection label="間隔">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: theme.textMuted, whiteSpace: 'nowrap' }}>文字:</span>
                  <AdInput
                    type="number"
                    value={String(letterSpacing)}
                    onChange={(e) => setLetterSpacing(Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>px</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: theme.textMuted, whiteSpace: 'nowrap' }}>行:</span>
                  <AdInput
                    type="number"
                    value={String(lineHeight)}
                    onChange={(e) => setLineHeight(Math.max(0.5, Number(e.target.value)))}
                    fullWidth={false}
                    inputWidth="52px"
                    step="0.1"
                  />
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>倍</span>
                </div>
              </AdSection>
              <AdSection label="比率">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: theme.textMuted, whiteSpace: 'nowrap' }}>水平:</span>
                  <AdInput
                    type="number"
                    value={String(scaleX)}
                    onChange={(e) => setScaleX(Math.max(0.01, Number(e.target.value)))}
                    fullWidth={false}
                    inputWidth="52px"
                    step="0.1"
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: theme.textMuted, whiteSpace: 'nowrap' }}>垂直:</span>
                  <AdInput
                    type="number"
                    value={String(scaleY)}
                    onChange={(e) => setScaleY(Math.max(0.01, Number(e.target.value)))}
                    fullWidth={false}
                    inputWidth="52px"
                    step="0.1"
                  />
                </div>
              </AdSection>
              <AdSection label="配置">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>横:</span>
                  <AdToggleButtons
                    value={textAlign}
                    onChange={(v) => setTextAlign(v as 'left' | 'center' | 'right')}
                    options={[
                      { value: 'left', label: '左' },
                      { value: 'center', label: '中央' },
                      { value: 'right', label: '右' },
                    ]}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>縦:</span>
                  <AdToggleButtons
                    value={textVerticalAlign}
                    onChange={(v) => setTextVerticalAlign(v as 'top' | 'middle' | 'bottom')}
                    options={[
                      { value: 'top', label: '上' },
                      { value: 'middle', label: '中央' },
                      { value: 'bottom', label: '下' },
                    ]}
                  />
                </div>
              </AdSection>
              <AdSection label="テキスト色">
                <AdColorPicker value={textColor} onChange={setTextColor} enableAlpha />
              </AdSection>
              <AdSection label="背景色">
                <AdCheckbox
                  checked={bgEnabled}
                  onChange={setBgEnabled}
                  label="背景色を使用"
                />
                {bgEnabled && (
                  <div style={{ marginTop: '6px' }}>
                    <AdColorPicker value={backgroundColor} onChange={setBackgroundColor} enableAlpha />
                  </div>
                )}
              </AdSection>
              <AdSection label="位置">
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>x:</span>
                  <AdInput
                    type="number"
                    value={String(posX)}
                    onChange={(e) => setPosX(Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>y:</span>
                  <AdInput
                    type="number"
                    value={String(posY)}
                    onChange={(e) => setPosY(Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                </div>
              </AdSection>
              <AdSection label="サイズ">
                <AdCheckbox
                  checked={!autoSize}
                  onChange={(v) => setAutoSize(!v)}
                  label="サイズを指定"
                />
                {!autoSize && (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: theme.textMuted }}>x:</span>
                    <AdInput
                      type="number"
                      value={String(width)}
                      onChange={(e) => setWidth(Number(e.target.value))}
                      fullWidth={false}
                      inputWidth="52px"
                    />
                    <span style={{ fontSize: '11px', color: theme.textMuted }}>y:</span>
                    <AdInput
                      type="number"
                      value={String(height)}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      fullWidth={false}
                      inputWidth="52px"
                    />
                  </div>
                )}
              </AdSection>
            </>
          )}

          {/* foreground: 画像 + サイズ */}
          {type === 'foreground' && (
            <>
              <AdSection>
                <AssetPicker
                  label="前景画像"
                  currentUrl={imageUrl || null}
                  onSelect={(url) => setImageUrl(url)}
                />
              </AdSection>
              {imageUrl && (
                <AdSection label="画像表示">
                  <AdToggleButtons
                    value={imageFit}
                    options={[
                      { value: 'contain', label: '全体表示' },
                      { value: 'cover', label: 'トリミング' },
                      { value: 'stretch', label: '引き伸ばし' },
                    ]}
                    onChange={(v) => setImageFit(v as 'contain' | 'cover' | 'stretch')}
                  />
                </AdSection>
              )}
              <AdSection label="位置">
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>x:</span>
                  <AdInput
                    type="number"
                    value={String(posX)}
                    onChange={(e) => setPosX(Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>y:</span>
                  <AdInput
                    type="number"
                    value={String(posY)}
                    onChange={(e) => setPosY(Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                </div>
              </AdSection>
              <AdSection label="サイズ">
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>x:</span>
                  <AdInput
                    type="number"
                    value={String(width)}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>y:</span>
                  <AdInput
                    type="number"
                    value={String(height)}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                </div>
              </AdSection>
              <AdSection label="ロック">
                <AdCheckbox checked={positionLocked} onChange={setPositionLocked} label="位置を固定" />
                <AdCheckbox checked={sizeLocked} onChange={setSizeLocked} label="サイズを固定" />
              </AdSection>
            </>
          )}

          {/* ボタン */}
          {!isNew && onDelete && type !== 'foreground' && (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <div style={{ marginRight: 'auto' }}>
                <AdButton variant="danger" onClick={() => { onDelete(); onClose(); }}>削除</AdButton>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
