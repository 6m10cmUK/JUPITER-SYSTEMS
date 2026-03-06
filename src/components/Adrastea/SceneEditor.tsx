import React, { useState, useEffect } from 'react';
import type { Scene } from '../../types/adrastea.types';
import { theme } from '../../styles/theme';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { AdInput, AdSlider, AdCheckbox, AdSection } from './ui';

interface SceneEditorProps {
  scene?: Scene | null;
  roomId: string;
  onSave: (data: Partial<Scene>) => void;
  onClose: () => void;
}

export function SceneEditor({ scene, roomId, onSave: _onSave, onClose: _onClose }: SceneEditorProps) {
  const ctx = useAdrasteaContext();
  const [name, setName] = useState(scene?.name ?? '');
  const [bgTransition, setBgTransition] = useState(scene?.bg_transition ?? 'none');
  const [bgTransitionDuration, setBgTransitionDuration] = useState(scene?.bg_transition_duration ?? 500);
  const [fgTransition, setFgTransition] = useState(scene?.fg_transition ?? 'none');
  const [fgTransitionDuration, setFgTransitionDuration] = useState(scene?.fg_transition_duration ?? 500);

  // 外部からの変更（シーンパネルでのリネーム等）をローカルstateに同期
  useEffect(() => {
    if (scene && scene.name !== undefined) {
      setName(scene.name);
    }
  }, [scene?.name]);

  useEffect(() => {
    ctx.setPendingEdit(`scene:${scene?.id ?? 'new'}`, {
      type: 'scene',
      id: scene?.id ?? null,
      data: {
        name: name.trim() || '無題',
        bg_transition: bgTransition,
        bg_transition_duration: bgTransitionDuration,
        fg_transition: fgTransition,
        fg_transition_duration: fgTransitionDuration,
      },
    });
  }, [name, bgTransition, bgTransitionDuration, fgTransition, fgTransitionDuration]);

  const panelStyle: React.CSSProperties = {
    background: theme.bgSurface,
    padding: '8px',
    height: '100%',
    overflowY: 'auto',
    color: theme.textPrimary,
    boxSizing: 'border-box',
  };

  return (
    <div style={panelStyle}>
      <h3 style={{ fontSize: '12px', fontWeight: 600, margin: '0 0 8px' }}>
        {scene ? 'シーン編集' : '新規シーン'}
      </h3>

      {/* 名前 */}
      <AdSection label="シーン名">
        <AdInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="シーン名"
        />
      </AdSection>

      {/* トランジション設定 */}
      <AdSection label="背景トランジション">
        <AdCheckbox
          checked={bgTransition === 'fade'}
          onChange={(v) => setBgTransition(v ? 'fade' : 'none')}
          label="フェード"
        />
        {bgTransition === 'fade' && (
          <AdSlider
            min={100}
            max={3000}
            step={100}
            value={bgTransitionDuration}
            onChange={setBgTransitionDuration}
            displayValue={`${bgTransitionDuration}ms`}
          />
        )}
      </AdSection>

      <AdSection label="前景トランジション">
        <AdCheckbox
          checked={fgTransition === 'fade'}
          onChange={(v) => setFgTransition(v ? 'fade' : 'none')}
          label="フェード"
        />
        {fgTransition === 'fade' && (
          <AdSlider
            min={100}
            max={3000}
            step={100}
            value={fgTransitionDuration}
            onChange={setFgTransitionDuration}
            displayValue={`${fgTransitionDuration}ms`}
          />
        )}
      </AdSection>
    </div>
  );
}
