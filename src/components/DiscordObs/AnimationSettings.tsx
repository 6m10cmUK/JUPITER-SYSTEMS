import React from 'react';
import type { AnimationSettings } from '../../types/discordObs.types';

interface Props {
  animationSettings: AnimationSettings;
  setAnimationSettings: React.Dispatch<React.SetStateAction<AnimationSettings>>;
}

export const AnimationSettingsPanel: React.FC<Props> = ({ animationSettings, setAnimationSettings }) => (
  <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
    <h3 style={{ margin: '0 0 15px 0' }}>🎭 喋ってる時のアニメーション</h3>

    <div style={{ marginBottom: '15px' }}>
      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
        アニメーション速度: {animationSettings.duration}ms
      </label>
      <input
        type="range" min="200" max="2000" step="50"
        value={animationSettings.duration}
        onChange={(e) => setAnimationSettings(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
        style={{ width: '100%' }}
      />
    </div>

    <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <input
          type="checkbox"
          checked={animationSettings.bounce.enabled}
          onChange={(e) => setAnimationSettings(prev => ({
            ...prev, bounce: { ...prev.bounce, enabled: e.target.checked },
          }))}
        />
        <span style={{ fontWeight: 'bold' }}>バウンス（上下に跳ねる）</span>
      </label>
      {animationSettings.bounce.enabled && (
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            距離: {animationSettings.bounce.distance}px
          </label>
          <input
            type="range" min="1" max="50"
            value={animationSettings.bounce.distance}
            onChange={(e) => setAnimationSettings(prev => ({
              ...prev, bounce: { ...prev.bounce, distance: parseInt(e.target.value) },
            }))}
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>

    <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <input
          type="checkbox"
          checked={animationSettings.border.enabled}
          onChange={(e) => setAnimationSettings(prev => ({
            ...prev, border: { ...prev.border, enabled: e.target.checked },
          }))}
        />
        <span style={{ fontWeight: 'bold' }}>縁取り（白い輪郭）</span>
      </label>
      {animationSettings.border.enabled && (
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            太さ: {Math.max(1, Math.round(animationSettings.border.thickness / 10))}px
          </label>
          <input
            type="range" min="10" max="100"
            value={animationSettings.border.thickness}
            onChange={(e) => setAnimationSettings(prev => ({
              ...prev, border: { ...prev.border, thickness: parseInt(e.target.value) },
            }))}
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>
  </div>
);
