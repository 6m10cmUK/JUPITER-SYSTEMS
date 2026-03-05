import React, { useState, useEffect } from 'react';
import type { BoardObject, BoardObjectType, BoardObjectScope } from '../../types/adrastea.types';
import { AssetPicker } from './AssetPicker';
import { theme } from '../../styles/theme';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { AdInput, AdTextArea, AdButton, AdSection, AdSlider, AdCheckbox, AdColorPicker, AdToggleButtons } from './ui';

interface ObjectEditorProps {
  object?: BoardObject | null;
  scope: BoardObjectScope;
  defaultType?: BoardObjectType;
  roomId: string;
  onSave: (data: Partial<BoardObject>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function ObjectEditor({ object, scope: _scope, defaultType, roomId: _roomId, onSave, onDelete, onClose }: ObjectEditorProps) {
  const [type, setType] = useState<BoardObjectType>(object?.type ?? defaultType ?? 'panel');
  const [name, setName] = useState(object?.name ?? '');
  const [imageUrl, setImageUrl] = useState(object?.image_url ?? '');
  const [backgroundColor, setBackgroundColor] = useState(object?.background_color ?? 'transparent');
  const [textContent, setTextContent] = useState(object?.text_content ?? '');
  const [fontSize, setFontSize] = useState(object?.font_size ?? 16);
  const [textColor, setTextColor] = useState(object?.text_color ?? '#ffffff');
  const [width, setWidth] = useState(object?.width ?? 4);
  const [height, setHeight] = useState(object?.height ?? 4);
  const [imageFit, setImageFit] = useState<'cover' | 'contain' | 'stretch'>(object?.image_fit ?? 'cover');
  const [opacity, setOpacity] = useState(object?.opacity ?? 1);
  const [visible, setVisible] = useState(object?.visible ?? true);

  // 外部からの変更（画像選択モーダル、ボード上リサイズ等）をローカルstateに同期
  useEffect(() => {
    if (object && object.image_url !== undefined) {
      setImageUrl(object.image_url ?? '');
    }
  }, [object?.image_url]);
  useEffect(() => {
    if (object) {
      setWidth(object.width);
      setHeight(object.height);
    }
  }, [object?.width, object?.height]);

  const ctx = useAdrasteaContext();
  const isSceneScope = _scope === 'scene';

  if (object === undefined) return null;

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
      data.image_url = imageUrl || null;
      data.background_color = backgroundColor;
      data.width = width;
      data.height = height;
      data.image_fit = imageFit;
    } else if (type === 'text') {
      data.text_content = textContent;
      data.font_size = fontSize;
      data.text_color = textColor;
      data.background_color = backgroundColor;
      data.width = width;
      data.height = height;
    } else if (type === 'foreground') {
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
      scope: _scope,
    });
  }, [type, name, imageUrl, backgroundColor, textContent, fontSize, textColor, width, height, imageFit, opacity, visible]);

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
        : isSceneScope
          ? 'シーンオブジェクト'
          : 'ルームオブジェクト';

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
                  <AdCheckbox
                    checked={imageFit === 'cover'}
                    onChange={(v) => setImageFit(v ? 'cover' : 'stretch')}
                    label="トリミング（比率を維持して切り抜き）"
                  />
                </AdSection>
              )}
              <AdSection label="背景色">
                <AdInput
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  placeholder="transparent"
                />
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
              <AdSection label="フォントサイズ">
                <AdSlider
                  min={8}
                  max={72}
                  step={1}
                  value={fontSize}
                  onChange={setFontSize}
                  displayValue={`${fontSize}px`}
                />
              </AdSection>
              <AdSection label="テキスト色">
                <AdColorPicker value={textColor} onChange={setTextColor} />
              </AdSection>
              <AdSection label="背景色">
                <AdInput
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  placeholder="transparent"
                />
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
                  <AdCheckbox
                    checked={imageFit === 'cover'}
                    onChange={(v) => setImageFit(v ? 'cover' : 'stretch')}
                    label="トリミング（比率を維持して切り抜き）"
                  />
                </AdSection>
              )}
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
            </>
          )}

          {/* ボタン */}
          {!isNew && onDelete && type !== 'foreground' && (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <AdButton variant="danger" onClick={() => { onDelete(); onClose(); }} style={{ marginRight: 'auto' }}>削除</AdButton>
            </div>
          )}
        </>
      )}
    </div>
  );
}
