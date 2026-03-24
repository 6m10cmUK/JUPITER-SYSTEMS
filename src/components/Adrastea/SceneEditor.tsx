import type { Scene } from '../../types/adrastea.types';
import { theme } from '../../styles/theme';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { useEntityEditor } from '../../hooks/useEntityEditor';
import { AdInput, AdSlider, AdCheckbox } from './ui';
import { Droplets, Grid3X3 } from 'lucide-react';
import { FadeInIcon } from './ui/FadeInIcon';

interface SceneEditorProps {
  scene?: Scene | null;
  roomId: string;
  onSave: (data: Partial<Scene>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function SceneEditor({ scene, roomId: _roomId, onSave: _onSave, onClose: _onClose }: SceneEditorProps) {
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
      grid_visible:           { immediate: true, defaultValue: false },
    },
    onDebounceSave: (key, data) => ctx.setPendingEdit(key, data as any),
    onImmediateUpdate: async (id, data) => {
      await ctx.updateScene(id, data as any);
      if ('grid_visible' in (data as Record<string, unknown>)) {
        ctx.setGridVisible(!!(data as Record<string, unknown>).grid_visible);
      }
    },
    buildSaveData: (s: any) => ({
      name: ((s.name as string)?.trim()) || '無題',
      bg_transition: s.bg_transition,
      bg_transition_duration: s.bg_transition_duration,
      fg_transition: s.fg_transition,
      fg_transition_duration: s.fg_transition_duration,
      bg_blur: s.bg_blur,
      grid_visible: s.grid_visible,
    }),
  });

  const bgFade = state.bg_transition === 'fade';
  const fgFade = state.fg_transition === 'fade';

  return (
    <div style={{ background: theme.bgSurface, padding: '8px', color: theme.textPrimary, boxSizing: 'border-box' }}>
        <h3 style={{ fontSize: '12px', fontWeight: 600, margin: '0 0 8px' }}>
          {scene ? 'シーン編集' : '新規シーン'}
        </h3>

        {/* シーン名 */}
        <div style={{ marginBottom: '12px' }}>
          <AdInput
            value={state.name as string}
            onChange={(e) => set('name', e.target.value)}
            placeholder="シーン名"
          />
        </div>

        {/* 背景ぼかし */}
        <div style={{ marginBottom: '12px' }}>
          <AdCheckbox
            label={<span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Droplets size={14} style={{ color: state.bg_blur ? theme.accent : theme.textMuted }} />背景ぼかし</span>}
            checked={state.bg_blur as boolean}
            onChange={(v) => set('bg_blur', v)}
          />
        </div>

        {/* 背景フェードイン */}
        <div style={{ marginBottom: '12px' }}>
          <AdCheckbox
            label={<span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FadeInIcon size={16} color={bgFade ? theme.accent : theme.textMuted} />背景フェードイン</span>}
            checked={bgFade}
            onChange={(v) => set('bg_transition', v ? 'fade' : 'none')}
          />
        </div>
        {bgFade && (
          <div style={{ marginBottom: '12px', paddingLeft: '20px' }}>
            <AdSlider
              label="時間"
              min={100} max={3000} step={100}
              value={state.bg_transition_duration as number}
              onChange={(v) => set('bg_transition_duration', v)}
              suffix="ms"
            />
          </div>
        )}

        {/* 前景フェードイン */}
        <div style={{ marginBottom: '12px' }}>
          <AdCheckbox
            label={<span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FadeInIcon size={16} color={fgFade ? theme.accent : theme.textMuted} />前景フェードイン</span>}
            checked={fgFade}
            onChange={(v) => set('fg_transition', v ? 'fade' : 'none')}
          />
        </div>
        {fgFade && (
          <div style={{ marginBottom: '12px', paddingLeft: '20px' }}>
            <AdSlider
              label="時間"
              min={100} max={3000} step={100}
              value={state.fg_transition_duration as number}
              onChange={(v) => set('fg_transition_duration', v)}
              suffix="ms"
            />
          </div>
        )}

        {/* グリッド表示 */}
        <div style={{ marginBottom: '12px' }}>
          <AdCheckbox
            label={<span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Grid3X3 size={14} style={{ color: state.grid_visible ? theme.accent : theme.textMuted }} />グリッド表示</span>}
            checked={!!state.grid_visible}
            onChange={(v) => set('grid_visible', v)}
          />
        </div>
    </div>
  );
}
