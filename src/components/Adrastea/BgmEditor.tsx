import React from 'react';
import type { BgmTrack } from '../../types/adrastea.types';
import { theme } from '../../styles/theme';
import { AdInput, AdSlider, AdCheckbox, AdSection } from './ui';
import { X } from 'lucide-react';

interface BgmEditorProps {
  track: BgmTrack;
  activeSceneId: string | null;
  onUpdate: (id: string, data: Partial<BgmTrack>) => void;
  onClose: () => void;
}

export function BgmEditor({ track, activeSceneId, onUpdate, onClose }: BgmEditorProps) {
  const isAutoPlay = activeSceneId ? track.auto_play_scene_ids.includes(activeSceneId) : false;

  const handleAutoPlayToggle = (checked: boolean) => {
    if (!activeSceneId) return;
    const next = checked
      ? [...track.auto_play_scene_ids, activeSceneId]
      : track.auto_play_scene_ids.filter(id => id !== activeSceneId);
    onUpdate(track.id, { auto_play_scene_ids: next });
  };

  const panelStyle: React.CSSProperties = {
    background: theme.bgSurface,
    padding: '8px',
    height: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: '4px', borderBottom: `1px solid ${theme.border}`,
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: theme.textPrimary }}>
          BGM設定
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: theme.textMuted, display: 'flex', alignItems: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Name (read-only) */}
      <div>
        <div style={{ fontSize: '12px', color: theme.textSecondary, marginBottom: '2px' }}>名前</div>
        <div style={{ fontSize: '12px', color: theme.textPrimary }}>{track.name}</div>
      </div>

      {/* Auto play */}
      <AdCheckbox
        label="シーン切替時に自動再生"
        checked={isAutoPlay}
        onChange={handleAutoPlayToggle}
      />

      {/* Loop */}
      <AdCheckbox
        label="ループ再生"
        checked={track.bgm_loop}
        onChange={(val) => onUpdate(track.id, { bgm_loop: val })}
      />

      {/* Fade */}
      <AdSection label="フェード">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <AdCheckbox
            label="イン"
            checked={track.fade_in}
            onChange={(val) => onUpdate(track.id, { fade_in: val })}
          />
          <AdCheckbox
            label="アウト"
            checked={track.fade_out}
            onChange={(val) => onUpdate(track.id, { fade_out: val })}
          />
        </div>
        <AdSlider
          label="時間"
          value={track.fade_duration}
          min={100} max={3000} step={100}
          onChange={(val) => onUpdate(track.id, { fade_duration: val })}
          suffix="ms"
        />
      </AdSection>
    </div>
  );
}
