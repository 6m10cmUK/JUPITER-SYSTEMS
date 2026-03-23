import React from 'react';
import type { Scene } from '../../types/adrastea.types';
import { theme } from '../../styles/theme';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { useEntityEditor } from '../../hooks/useEntityEditor';
import { AdInput, AdSlider, AdCheckbox, AdSection, AdButton } from './ui';
import { Trash2 } from 'lucide-react';

interface SceneEditorProps {
  scene?: Scene | null;
  roomId: string;
  onSave: (data: Partial<Scene>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function SceneEditor({ scene, roomId: _roomId, onSave: _onSave, onDelete, onClose: _onClose }: SceneEditorProps) {
  const ctx = useAdrasteaContext();

  const { state, set } = useEntityEditor({
    entity: scene as Record<string, unknown> | null | undefined,
    entityId: scene?.id ?? null,
    editType: 'scene',
    fields: {
      name:                   { debounce: true, defaultValue: '' },
      bg_transition_duration: { debounce: true, defaultValue: 500 },
      fg_transition_duration: { debounce: true, defaultValue: 500 },
      bg_transition:          { immediate: true, defaultValue: 'none' },
      fg_transition:          { immediate: true, defaultValue: 'none' },
      bg_blur:                { immediate: true, defaultValue: true },
    },
    onDebounceSave: (key, data) => ctx.setPendingEdit(key, data as any),
    onImmediateUpdate: (id, data) => ctx.updateScene(id, data as any),
    buildSaveData: (s: any) => ({
      name: ((s.name as string)?.trim()) || '無題',
      bg_transition: s.bg_transition,
      bg_transition_duration: s.bg_transition_duration,
      fg_transition: s.fg_transition,
      fg_transition_duration: s.fg_transition_duration,
      bg_blur: s.bg_blur,
    }),
  });

  const panelStyle: React.CSSProperties = {
    background: theme.bgSurface,
    padding: '0',
    color: theme.textPrimary,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
    minHeight: 0,
  };

  const canDelete = scene && ctx.scenes.length > 1;

  return (
    <div style={panelStyle}>
      <div style={contentStyle}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, margin: '0 0 8px' }}>
          {scene ? 'シーン編集' : '新規シーン'}
        </h3>

        {/* 名前 */}
        <AdSection label="シーン名">
          <AdInput
            value={state.name as string}
            onChange={(e) => set('name', e.target.value)}
            placeholder="シーン名"
          />
        </AdSection>

        {/* トランジション設定 */}
        {/* 背景ぼかし */}
        <AdSection label="背景">
          <AdCheckbox
            checked={state.bg_blur as boolean}
            onChange={(v: boolean) => set('bg_blur', v)}
            label="ぼかし"
          />
        </AdSection>

        <AdSection label="背景トランジション">
          <AdCheckbox
            checked={state.bg_transition === 'fade'}
            onChange={(v) => set('bg_transition', v ? 'fade' : 'none')}
            label="フェード"
          />
          {state.bg_transition === 'fade' && (
            <AdSlider
              min={100}
              max={3000}
              step={100}
              value={state.bg_transition_duration as number}
              onChange={(v) => set('bg_transition_duration', v)}
              displayValue={`${state.bg_transition_duration}ms`}
            />
          )}
        </AdSection>

        <AdSection label="前景トランジション">
          <AdCheckbox
            checked={state.fg_transition === 'fade'}
            onChange={(v) => set('fg_transition', v ? 'fade' : 'none')}
            label="フェード"
          />
          {state.fg_transition === 'fade' && (
            <AdSlider
              min={100}
              max={3000}
              step={100}
              value={state.fg_transition_duration as number}
              onChange={(v) => set('fg_transition_duration', v)}
              displayValue={`${state.fg_transition_duration}ms`}
            />
          )}
        </AdSection>
      </div>

      {/* フッター削除ボタン */}
      {canDelete && onDelete && (
        <div style={{ padding: '8px', borderTop: `1px solid ${theme.borderSubtle}`, flexShrink: 0 }}>
          <AdButton variant="danger" onClick={onDelete}>
            <Trash2 size={14} style={{ marginRight: '4px' }} />
            削除
          </AdButton>
        </div>
      )}
    </div>
  );
}
