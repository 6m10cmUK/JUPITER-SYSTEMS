import React, { useState, useEffect } from 'react';
import type { Scene } from '../../types/adrastea.types';
import { FileDropZone } from './FileDropZone';
import { theme } from '../../styles/theme';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { AdInput, AdSlider, AdCheckbox, AdToggleButtons, AdSection } from './ui';

interface SceneEditorProps {
  scene?: Scene | null;
  roomId: string;
  onSave: (data: Partial<Scene>) => void;
  onClose: () => void;
}

export function SceneEditor({ scene, roomId, onSave, onClose }: SceneEditorProps) {
  const ctx = useAdrasteaContext();
  const [name, setName] = useState(scene?.name ?? '');
  const [bgmType, setBgmType] = useState<Scene['bgm_type']>(scene?.bgm_type ?? null);
  const [bgmSource, setBgmSource] = useState(scene?.bgm_source ?? '');
  const [bgmVolume, setBgmVolume] = useState(scene?.bgm_volume ?? 0.5);
  const [bgmLoop, setBgmLoop] = useState(scene?.bgm_loop ?? true);

  useEffect(() => {
    ctx.setPendingEdit(`scene:${scene?.id ?? 'new'}`, {
      type: 'scene',
      id: scene?.id ?? null,
      data: {
        name: name.trim() || '無題',
        bgm_type: bgmType,
        bgm_source: bgmSource || null,
        bgm_volume: bgmVolume,
        bgm_loop: bgmLoop,
      },
    });
  }, [name, bgmType, bgmSource, bgmVolume, bgmLoop]);

  // YouTube動画IDを抽出
  const extractYoutubeId = (url: string): string => {
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : url;
  };

  const panelStyle: React.CSSProperties = {
    background: theme.bgSurface,
    padding: '8px',
    height: '100%',
    overflowY: 'auto',
    color: theme.textPrimary,
    boxSizing: 'border-box',
  };

  const sceneIdSlug = scene?.id ?? 'new';
  const basePath = `rooms/${roomId}/scenes/${sceneIdSlug}`;

  return (
    <div style={panelStyle}>
      <h3 style={{ fontSize: '12px', fontWeight: 600, margin: '0 0 8px' }}>
        {scene ? 'シーン編集' : '新規シーン'}
      </h3>

      {/* 名前 */}
      <AdSection label="シーン名">
        <AdInput
          value={name}
          onChange={setName}
          placeholder="シーン名"
        />
      </AdSection>

      {/* BGM設定 */}
      <AdSection label="BGM">
        <AdToggleButtons
          value={bgmType}
          onChange={(v) => setBgmType(v as Scene['bgm_type'])}
          options={[
            { value: null as unknown as string, label: 'なし' },
            { value: 'youtube', label: 'YouTube' },
            { value: 'url', label: 'URL' },
            { value: 'upload', label: 'アップロード' },
          ]}
        />

        {bgmType === 'youtube' && (
          <AdInput
            value={bgmSource}
            onChange={(v) => setBgmSource(extractYoutubeId(v))}
            placeholder="YouTube URLまたは動画ID"
          />
        )}

        {bgmType === 'url' && (
          <AdInput
            value={bgmSource}
            onChange={setBgmSource}
            placeholder="音声ファイルURL"
          />
        )}

        {bgmType === 'upload' && (
          <FileDropZone
            accept="audio/*"
            currentUrl={bgmSource || null}
            storagePath={`${basePath}/bgm`}
            onFileUploaded={(url) => setBgmSource(url)}
          />
        )}
      </AdSection>

      {/* BGMボリューム・ループ */}
      {bgmType && (
        <>
          <AdSection label="ボリューム">
            <AdSlider
              min={0}
              max={1}
              step={0.05}
              value={bgmVolume}
              onChange={setBgmVolume}
              displayValue={`${Math.round(bgmVolume * 100)}%`}
            />
          </AdSection>
          <AdSection>
            <AdCheckbox
              checked={bgmLoop}
              onChange={setBgmLoop}
              label="ループ再生"
            />
          </AdSection>
        </>
      )}
    </div>
  );
}
