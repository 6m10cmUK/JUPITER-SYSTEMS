import React, { useState } from 'react';
import type { BoardObject, BoardObjectType, BoardObjectScope } from '../../types/adrastea.types';
import { AssetPicker } from './AssetPicker';
import { theme } from '../../styles/theme';

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
  const [imageFit, setImageFit] = useState<'cover' | 'contain'>(object?.image_fit ?? 'cover');
  const [opacity, setOpacity] = useState(object?.opacity ?? 1);
  const [visible, setVisible] = useState(object?.visible ?? true);

  if (object === undefined) return null;

  const isNew = object === null;
  const isBackground = type === 'background';

  const handleSave = () => {
    const data: Partial<BoardObject> = {
      type,
      name: name.trim() || '無題',
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

    onSave(data);
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

  const title = isNew
    ? '新規オブジェクト'
    : isBackground
      ? '背景設定'
      : 'オブジェクト編集';

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem' }}>{title}</h3>

        {/* タイプ選択（新規のみ） */}
        {isNew && (
          <div style={sectionStyle}>
            <label style={labelStyle}>タイプ</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['panel', 'text', 'foreground'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    padding: '4px 12px',
                    background: type === t ? theme.accent : theme.bgInput,
                    color: type === t ? theme.textOnAccent : theme.textPrimary,
                    border: 'none',
                    borderRadius: 0,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {t === 'panel' ? 'パネル' : t === 'text' ? 'テキスト' : '前景'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* background: 画像・透過率・表示の編集 */}
        {isBackground && !isNew && (
          <>
            <div style={sectionStyle}>
              <AssetPicker
                label="背景画像"
                currentUrl={imageUrl || null}
                onSelect={(url) => setImageUrl(url)}
              />
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>透過率: {Math.round(opacity * 100)}%</label>
              <input type="range" min="0" max="1" step="0.05" value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div style={sectionStyle}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: theme.textSecondary, cursor: 'pointer' }}>
                <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
                表示する
              </label>
            </div>
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
          </>
        )}

        {/* panel / text / foreground の編集フォーム */}
        {!isBackground && (
          <>
            {/* 名前 */}
            <div style={sectionStyle}>
              <label style={labelStyle}>名前</label>
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="オブジェクト名" />
            </div>

            {/* panel: 画像 + 背景色 + サイズ */}
            {type === 'panel' && (
              <>
                <div style={sectionStyle}>
                  <AssetPicker
                    label="画像"
                    currentUrl={imageUrl || null}
                    onSelect={(url) => setImageUrl(url)}
                  />
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>背景色</label>
                  <input style={inputStyle} value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)}
                    placeholder="transparent" />
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>サイズ</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.75rem', color: theme.textMuted }}>横マス</label>
                    <input type="number" style={{ ...inputStyle, width: '80px' }} value={width}
                      onChange={(e) => setWidth(Number(e.target.value))} />
                    <label style={{ fontSize: '0.75rem', color: theme.textMuted }}>縦マス</label>
                    <input type="number" style={{ ...inputStyle, width: '80px' }} value={height}
                      onChange={(e) => setHeight(Number(e.target.value))} />
                  </div>
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>画像フィット</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {([['contain', '比率維持'], ['cover', 'トリミング']] as const).map(([v, l]) => (
                      <button key={v} onClick={() => setImageFit(v)} style={{
                        padding: '4px 12px',
                        background: imageFit === v ? theme.accent : theme.bgInput,
                        color: imageFit === v ? theme.textOnAccent : theme.textPrimary,
                        border: 'none', borderRadius: 0, fontSize: '0.8rem', cursor: 'pointer',
                      }}>{l}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* text: テキスト内容 + フォント + 色 + 背景色 + サイズ */}
            {type === 'text' && (
              <>
                <div style={sectionStyle}>
                  <label style={labelStyle}>テキスト内容</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="表示するテキスト"
                  />
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>フォントサイズ: {fontSize}px</label>
                  <input type="range" min="8" max="72" value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))} style={{ width: '100%' }} />
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>テキスト色</label>
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
                    style={{ width: '48px', height: '32px', border: 'none', background: 'transparent', cursor: 'pointer' }} />
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>背景色</label>
                  <input style={inputStyle} value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)}
                    placeholder="transparent" />
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>サイズ</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.75rem', color: theme.textMuted }}>横マス</label>
                    <input type="number" style={{ ...inputStyle, width: '80px' }} value={width}
                      onChange={(e) => setWidth(Number(e.target.value))} />
                    <label style={{ fontSize: '0.75rem', color: theme.textMuted }}>縦マス</label>
                    <input type="number" style={{ ...inputStyle, width: '80px' }} value={height}
                      onChange={(e) => setHeight(Number(e.target.value))} />
                  </div>
                </div>
              </>
            )}

            {/* foreground: 画像 + サイズ + image_fit */}
            {type === 'foreground' && (
              <>
                <div style={sectionStyle}>
                  <AssetPicker
                    label="前景画像"
                    currentUrl={imageUrl || null}
                    onSelect={(url) => setImageUrl(url)}
                  />
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>サイズ</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.75rem', color: theme.textMuted }}>横マス</label>
                    <input type="number" style={{ ...inputStyle, width: '80px' }} value={width}
                      onChange={(e) => setWidth(Number(e.target.value))} />
                    <label style={{ fontSize: '0.75rem', color: theme.textMuted }}>縦マス</label>
                    <input type="number" style={{ ...inputStyle, width: '80px' }} value={height}
                      onChange={(e) => setHeight(Number(e.target.value))} />
                  </div>
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>画像フィット</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {([['contain', '比率維持'], ['cover', 'トリミング']] as const).map(([v, l]) => (
                      <button key={v} onClick={() => setImageFit(v)} style={{
                        padding: '4px 12px',
                        background: imageFit === v ? theme.accent : theme.bgInput,
                        color: imageFit === v ? theme.textOnAccent : theme.textPrimary,
                        border: 'none', borderRadius: 0, fontSize: '0.8rem', cursor: 'pointer',
                      }}>{l}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* 透過率 */}
            <div style={sectionStyle}>
              <label style={labelStyle}>透過率: {Math.round(opacity * 100)}%</label>
              <input type="range" min="0" max="1" step="0.05" value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))} style={{ width: '100%' }} />
            </div>

            {/* 表示 */}
            <div style={sectionStyle}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: theme.textSecondary, cursor: 'pointer' }}>
                <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
                表示する
              </label>
            </div>

            {/* ボタン */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              {!isNew && onDelete && type !== 'foreground' && (
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
          </>
        )}
      </div>
    </div>
  );
}
