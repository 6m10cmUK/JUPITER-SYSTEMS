import React from 'react';
import type { GeneralSettings } from '../../types/discordObs.types';

interface Props {
  generalSettings: GeneralSettings;
  setGeneralSettings: React.Dispatch<React.SetStateAction<GeneralSettings>>;
}

export const GeneralSettingsPanel: React.FC<Props> = ({ generalSettings, setGeneralSettings }) => (
  <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
    <h3 style={{ margin: '0 0 15px 0' }}>⚙️ 一般設定</h3>

    {[
      { key: 'hideNames', label: 'ユーザー名を非表示' },
      { key: 'hideOtherUsers', label: '登録していないユーザーを非表示' },
      { key: 'transparentBackground', label: '背景を透明化' },
    ].map(({ key, label }) => (
      <div key={key} style={{ marginBottom: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={generalSettings[key as keyof GeneralSettings] as boolean}
            onChange={(e) => setGeneralSettings(prev => ({ ...prev, [key]: e.target.checked }))}
          />
          {label}
        </label>
      </div>
    ))}

    {[
      { key: 'maxImageWidth', label: '画像最大幅', min: 100, max: 1200, step: 50 },
      { key: 'maxImageHeight', label: '画像最大高さ', min: 100, max: 800, step: 50 },
      { key: 'borderRadius', label: '角の丸み', min: 0, max: 50, step: 1 },
    ].map(({ key, label, min, max, step }) => (
      <div key={key} style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          {label}: {generalSettings[key as keyof GeneralSettings]}px
        </label>
        <input
          type="range" min={min} max={max} step={step}
          value={generalSettings[key as keyof GeneralSettings] as number}
          onChange={(e) => setGeneralSettings(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
          style={{ width: '100%' }}
        />
      </div>
    ))}

    <div style={{ marginBottom: '10px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="checkbox"
          checked={generalSettings.showDefaultImage}
          onChange={(e) => setGeneralSettings(prev => ({ ...prev, showDefaultImage: e.target.checked }))}
        />
        チャット非表示時でもデフォルト画像を表示
      </label>
    </div>

    <div style={{ marginBottom: '10px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="checkbox"
          checked={generalSettings.hideWhenNotSpeaking}
          onChange={(e) => setGeneralSettings(prev => ({ ...prev, hideWhenNotSpeaking: e.target.checked }))}
        />
        黙ってる時は完全に非表示
      </label>
    </div>

    {!generalSettings.hideWhenNotSpeaking && (
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={generalSettings.dimWhenNotSpeaking}
            onChange={(e) => setGeneralSettings(prev => ({ ...prev, dimWhenNotSpeaking: e.target.checked }))}
          />
          黙ってる時に暗くする
        </label>
      </div>
    )}
  </div>
);
