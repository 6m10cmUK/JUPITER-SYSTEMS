import React from 'react';
import type { BgmTrack } from '../../types/adrastea.types';
import { theme } from '../../styles/theme';
import { AdSlider, AdCheckbox, AdSection, AdButton } from './ui';
import { X, Trash2 } from 'lucide-react';

interface BgmEditorProps {
  track: BgmTrack;
  activeSceneId: string | null;
  onUpdate: (id: string, data: Partial<BgmTrack>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function BgmEditor({ track, activeSceneId, onUpdate, onDelete, onClose }: BgmEditorProps) {
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
    padding: '0',
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

  return (
    <div style={panelStyle}>
      <div style={contentStyle}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingBottom: '8px', marginBottom: '8px', borderBottom: `1px solid ${theme.borderSubtle}`,
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
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: theme.textSecondary, marginBottom: '2px' }}>名前</div>
          <div style={{ fontSize: '12px', color: theme.textPrimary }}>{track.name}</div>
        </div>

        {/* Auto play */}
        <div style={{ marginBottom: '12px' }}>
          <AdCheckbox
            label="シーン切替時に自動再生"
            checked={isAutoPlay}
            onChange={handleAutoPlayToggle}
          />
        </div>

        {/* Loop */}
        <div style={{ marginBottom: '12px' }}>
          <AdCheckbox
            label="ループ再生"
            checked={track.bgm_loop}
            onChange={(val) => onUpdate(track.id, { bgm_loop: val })}
          />
        </div>

        {/* Fade */}
        <AdSection label="フェード">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
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

      {/* フッター削除ボタン */}
      {onDelete && (
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
