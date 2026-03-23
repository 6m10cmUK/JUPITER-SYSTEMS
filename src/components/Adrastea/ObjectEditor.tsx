import React from 'react';
import type { BoardObject, BoardObjectType } from '../../types/adrastea.types';
import { AssetPicker } from './AssetPicker';
import { theme } from '../../styles/theme';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { useEntityEditor } from '../../hooks/useEntityEditor';
import { AdInput, AdTextArea, AdSection, AdCheckbox, AdColorPicker, AdToggleButtons } from './ui';


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

export function ObjectEditor({ object, defaultType, roomId: _roomId, onSave: _onSave }: ObjectEditorProps) {
  const ctx = useAdrasteaContext();
  const isGlobal = object?.global ?? false;
  const isNew = object === null;

  const { state, set } = useEntityEditor({
    entity: object as Record<string, unknown> | null | undefined,
    entityId: object?.id ?? null,
    editType: 'object',
    fields: {
      // debounce: テキスト入力・数値入力（連続入力）
      name:               { debounce: true, defaultValue: '' },
      x:                  { debounce: true, defaultValue: 50 },
      y:                  { debounce: true, defaultValue: 50 },
      width:              { debounce: true, defaultValue: 4 },
      height:             { debounce: true, defaultValue: 4 },
      text_content:       { debounce: true, defaultValue: '' },
      font_size:          { debounce: true, defaultValue: 16 },
      font_family:        { debounce: true, defaultValue: 'sans-serif' },
      letter_spacing:     { debounce: true, defaultValue: 0 },
      line_height:        { debounce: true, defaultValue: 1.2 },
      text_color:         { debounce: true, defaultValue: '#ffffff' },
      scale_x:            { debounce: true, defaultValue: 1 },
      scale_y:            { debounce: true, defaultValue: 1 },
      memo:               { debounce: true, defaultValue: '' },
      opacity:            { debounce: true, defaultValue: 1 },

      // immediate: トグル・選択（1回の操作 = 1回の書き込み）
      type:               { defaultValue: defaultType ?? 'panel' },
      visible:            { immediate: true, defaultValue: true },
      position_locked:    { immediate: true, defaultValue: false },
      size_locked:        { immediate: true, defaultValue: false },
      image_url:          { immediate: true, defaultValue: '' },
      image_fit:          { immediate: true, defaultValue: 'contain' },
      background_color:   { immediate: true, defaultValue: '#1e1e2e' },
      auto_size:          { immediate: true, defaultValue: true },
      text_align:         { immediate: true, defaultValue: 'left' },
      text_vertical_align: { immediate: true, defaultValue: 'top' },
      global:             { defaultValue: false },
    },
    onDebounceSave: (key, data) => ctx.setPendingEdit(key, data as any),
    onImmediateUpdate: (id, data) => (ctx as any).updateObject(id, data),
    buildSaveData: (s: any) => {
      const type = s.type as string;
      const isForeground = type === 'foreground';
      const data: Record<string, unknown> = {
        type,
        name: isForeground ? '前景' : ((s.name as string)?.trim() || '無題'),
        visible: s.visible,
        opacity: s.opacity,
      };
      if (type === 'panel') {
        data.x = s.x;
        data.y = s.y;
        data.image_url = s.image_url || null;
        data.background_color = s.background_color && s.background_color !== 'transparent'
          ? s.background_color : 'transparent';
        data.width = s.width;
        data.height = s.height;
        data.image_fit = s.image_fit;
        data.position_locked = s.position_locked;
        data.size_locked = s.size_locked;
      } else if (type === 'text') {
        data.x = s.x;
        data.y = s.y;
        data.text_content = s.text_content;
        data.font_size = s.font_size;
        data.font_family = s.font_family;
        data.letter_spacing = s.letter_spacing;
        data.line_height = s.line_height;
        data.auto_size = s.auto_size;
        data.text_align = s.text_align;
        data.text_vertical_align = s.text_vertical_align;
        data.text_color = s.text_color;
        data.background_color = s.background_color && s.background_color !== 'transparent'
          ? s.background_color : 'transparent';
        data.width = s.width;
        data.height = s.height;
        data.position_locked = s.position_locked;
        data.size_locked = s.size_locked;
        data.scale_x = s.scale_x;
        data.scale_y = s.scale_y;
      } else if (type === 'foreground') {
        data.x = s.x;
        data.y = s.y;
        data.image_url = s.image_url || null;
        data.width = s.width;
        data.height = s.height;
        data.image_fit = s.image_fit;
      } else if (type === 'background') {
        data.image_url = s.image_url || null;
        data.opacity = s.opacity;
        data.visible = s.visible;
      }
      if (type !== 'background') {
        data.memo = ((s.memo as string) ?? '').slice(0, 2048);
      }
      return data;
    },
  });

  const bgEnabled = !!state.background_color && (state.background_color as string) !== 'transparent';
  const isBackground = (state.type as string) === 'background';
  const isForeground = (state.type as string) === 'foreground';

  if (object === undefined) return null;

  const panelStyle: React.CSSProperties = {
    background: theme.bgSurface,
    color: theme.textPrimary,
    padding: '8px',
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
            value={state.type as BoardObjectType}
            onChange={(v) => set('type', v as BoardObjectType)}
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
              currentUrl={(state.image_url as string) || null}
              onSelect={(url) => set('image_url', url)}
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
              <AdInput value={(state.name as string) ?? ''} onChange={(e) => set('name', e.target.value)} placeholder="オブジェクト名" />
            </AdSection>
          )}

          {/* panel: 画像 + 背景色 + サイズ */}
          {(state.type as string) === 'panel' && (
            <>
              <AdSection>
                <AssetPicker
                  label="画像"
                  currentUrl={(state.image_url as string) || null}
                  onSelect={(url) => set('image_url', url)}
                />
              </AdSection>
              {(state.image_url as string) && (
                <AdSection label="画像表示">
                  <AdToggleButtons
                    value={state.image_fit as string}
                    options={[
                      { value: 'contain', label: '全体表示' },
                      { value: 'cover', label: 'トリミング' },
                      { value: 'stretch', label: '引き伸ばし' },
                    ]}
                    onChange={(v) => set('image_fit', v)}
                  />
                </AdSection>
              )}
              <AdSection label="背景色">
                <AdCheckbox
                  checked={bgEnabled}
                  onChange={(v) => set('background_color', v ? '#1e1e2e' : 'transparent')}
                  label="背景色を使用"
                />
                {bgEnabled && (
                  <div style={{ marginTop: '6px' }}>
                    <AdColorPicker value={state.background_color as string} onChange={(c) => set('background_color', c)} enableAlpha />
                  </div>
                )}
              </AdSection>
              <AdSection label="位置">
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>x:</span>
                  <AdInput
                    type="number"
                    value={String(state.x as number)}
                    onChange={(e) => set('x', Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>y:</span>
                  <AdInput
                    type="number"
                    value={String(state.y as number)}
                    onChange={(e) => set('y', Number(e.target.value))}
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
                    value={String(state.width as number)}
                    onChange={(e) => set('width', Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>y:</span>
                  <AdInput
                    type="number"
                    value={String(state.height as number)}
                    onChange={(e) => set('height', Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                </div>
              </AdSection>
              <AdSection label="ロック">
                <AdCheckbox checked={state.position_locked as boolean} onChange={(v) => set('position_locked', v)} label="位置を固定" />
                <AdCheckbox checked={state.size_locked as boolean} onChange={(v) => set('size_locked', v)} label="サイズを固定" />
              </AdSection>
            </>
          )}

          {/* text: テキスト内容 + フォント + 色 + 背景色 + サイズ */}
          {(state.type as string) === 'text' && (
            <>
              <AdSection label="テキスト内容">
                <AdTextArea
                  expandable
                  value={(state.text_content as string) ?? ''}
                  onChange={(e) => set('text_content', e.target.value)}
                  placeholder="表示するテキスト"
                  rows={3}
                />
              </AdSection>
              <AdSection label="フォント">
                <select
                  value={state.font_family as string}
                  onChange={(e) => set('font_family', e.target.value)}
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
                    fontFamily: state.font_family as string,
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
                    value={String(state.font_size as number)}
                    onChange={(e) => {
                  const n = Number(e.target.value);
                  set('font_size', Number.isNaN(n) || n < 1 ? 16 : Math.max(1, n));
                }}
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
                    value={String(state.letter_spacing as number)}
                    onChange={(e) => set('letter_spacing', Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>px</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: theme.textMuted, whiteSpace: 'nowrap' }}>行:</span>
                  <AdInput
                    type="number"
                    value={String(state.line_height as number)}
                    onChange={(e) => set('line_height', Math.max(0.5, Number(e.target.value)))}
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
                    value={String(state.scale_x as number)}
                    onChange={(e) => set('scale_x', Math.max(0.01, Number(e.target.value)))}
                    fullWidth={false}
                    inputWidth="52px"
                    step="0.1"
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: theme.textMuted, whiteSpace: 'nowrap' }}>垂直:</span>
                  <AdInput
                    type="number"
                    value={String(state.scale_y as number)}
                    onChange={(e) => set('scale_y', Math.max(0.01, Number(e.target.value)))}
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
                    value={state.text_align as string}
                    onChange={(v) => set('text_align', v)}
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
                    value={state.text_vertical_align as string}
                    onChange={(v) => set('text_vertical_align', v)}
                    options={[
                      { value: 'top', label: '上' },
                      { value: 'middle', label: '中央' },
                      { value: 'bottom', label: '下' },
                    ]}
                  />
                </div>
              </AdSection>
              <AdSection label="テキスト色">
                <AdColorPicker value={state.text_color as string} onChange={(c) => set('text_color', c)} enableAlpha />
              </AdSection>
              <AdSection label="背景色">
                <AdCheckbox
                  checked={bgEnabled}
                  onChange={(v) => set('background_color', v ? '#1e1e2e' : 'transparent')}
                  label="背景色を使用"
                />
                {bgEnabled && (
                  <div style={{ marginTop: '6px' }}>
                    <AdColorPicker value={state.background_color as string} onChange={(c) => set('background_color', c)} enableAlpha />
                  </div>
                )}
              </AdSection>
              <AdSection label="位置">
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>x:</span>
                  <AdInput
                    type="number"
                    value={String(state.x as number)}
                    onChange={(e) => set('x', Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>y:</span>
                  <AdInput
                    type="number"
                    value={String(state.y as number)}
                    onChange={(e) => set('y', Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                </div>
              </AdSection>
              <AdSection label="サイズ">
                <AdCheckbox
                  checked={!(state.auto_size as boolean)}
                  onChange={(v) => set('auto_size', !v)}
                  label="サイズを指定"
                />
                {!(state.auto_size as boolean) && (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: theme.textMuted }}>x:</span>
                    <AdInput
                      type="number"
                      value={String(state.width as number)}
                      onChange={(e) => set('width', Number(e.target.value))}
                      fullWidth={false}
                      inputWidth="52px"
                    />
                    <span style={{ fontSize: '11px', color: theme.textMuted }}>y:</span>
                    <AdInput
                      type="number"
                      value={String(state.height as number)}
                      onChange={(e) => set('height', Number(e.target.value))}
                      fullWidth={false}
                      inputWidth="52px"
                    />
                  </div>
                )}
              </AdSection>
            </>
          )}

          {/* foreground: 画像 + サイズ */}
          {(state.type as string) === 'foreground' && (
            <>
              <AdSection>
                <AssetPicker
                  label="前景画像"
                  currentUrl={(state.image_url as string) || null}
                  onSelect={(url) => set('image_url', url)}
                />
              </AdSection>
              {(state.image_url as string) && (
                <AdSection label="画像表示">
                  <AdToggleButtons
                    value={state.image_fit as string}
                    options={[
                      { value: 'contain', label: '全体表示' },
                      { value: 'cover', label: 'トリミング' },
                      { value: 'stretch', label: '引き伸ばし' },
                    ]}
                    onChange={(v) => set('image_fit', v)}
                  />
                </AdSection>
              )}
              <AdSection label="位置">
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>x:</span>
                  <AdInput
                    type="number"
                    value={String(state.x as number)}
                    onChange={(e) => set('x', Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>y:</span>
                  <AdInput
                    type="number"
                    value={String(state.y as number)}
                    onChange={(e) => set('y', Number(e.target.value))}
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
                    value={String(state.width as number)}
                    onChange={(e) => set('width', Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                  <span style={{ fontSize: '11px', color: theme.textMuted }}>y:</span>
                  <AdInput
                    type="number"
                    value={String(state.height as number)}
                    onChange={(e) => set('height', Number(e.target.value))}
                    fullWidth={false}
                    inputWidth="52px"
                  />
                </div>
              </AdSection>
              <AdSection label="ロック">
                <AdCheckbox checked={state.position_locked as boolean} onChange={(v) => set('position_locked', v)} label="位置を固定" />
                <AdCheckbox checked={state.size_locked as boolean} onChange={(v) => set('size_locked', v)} label="サイズを固定" />
              </AdSection>
            </>
          )}

          {!isBackground && !isForeground && (
            <AdSection label="メモ">
              <AdTextArea
                expandable
                value={(state.memo as string) ?? ''}
                onChange={(e) => set('memo', e.target.value.slice(0, 2048))}
                placeholder="ホバー時に表示されるメモ（最大2048文字）"
                rows={4}
              />
              <div style={{ textAlign: 'right', fontSize: '10px', color: theme.textMuted, marginTop: '2px' }}>
                {(((state.memo as string) ?? '').length)} / 2048
              </div>
            </AdSection>
          )}

        </>
      )}
    </div>
  );
}
