import React, { useState } from 'react';
import type { Scene } from '../../types/adrastea.types';
import { FileDropZone } from './FileDropZone';
import { AssetPicker } from './AssetPicker';
import { theme } from '../../styles/theme';

interface SceneEditorProps {
  scene?: Scene | null;
  roomId: string;
  onSave: (data: Partial<Scene>) => void;
  onClose: () => void;
}

export function SceneEditor({ scene, roomId, onSave, onClose }: SceneEditorProps) {
  const [name, setName] = useState(scene?.name ?? '');
  const [backgroundUrl, setBackgroundUrl] = useState(scene?.background_url ?? '');
  const [foregroundUrl, setForegroundUrl] = useState(scene?.foreground_url ?? '');
  const [foregroundOpacity, setForegroundOpacity] = useState(scene?.foreground_opacity ?? 0.5);
  const [bgmType, setBgmType] = useState<Scene['bgm_type']>(scene?.bgm_type ?? null);
  const [bgmSource, setBgmSource] = useState(scene?.bgm_source ?? '');
  const [bgmVolume, setBgmVolume] = useState(scene?.bgm_volume ?? 0.5);
  const [bgmLoop, setBgmLoop] = useState(scene?.bgm_loop ?? true);

  const handleSave = () => {
    onSave({
      name: name.trim() || '無題',
      background_url: backgroundUrl || null,
      foreground_url: foregroundUrl || null,
      foreground_opacity: foregroundOpacity,
      bgm_type: bgmType,
      bgm_source: bgmSource || null,
      bgm_volume: bgmVolume,
      bgm_loop: bgmLoop,
    });
    onClose();
  };

  // YouTube動画IDを抽出
  const extractYoutubeId = (url: string): string => {
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : url;
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
    width: '460px',
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
    marginBottom: '16px',
  };

  const sceneIdSlug = scene?.id ?? 'new';
  const basePath = `rooms/${roomId}/scenes/${sceneIdSlug}`;

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem' }}>
          {scene ? 'シーン編集' : '新規シーン'}
        </h3>

        {/* 名前 */}
        <div style={sectionStyle}>
          <label style={labelStyle}>シーン名</label>
          <input
            style={inputStyle}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="シーン名"
          />
        </div>

        {/* 背景画像 */}
        <div style={sectionStyle}>
          <AssetPicker
            label="背景画像"
            currentUrl={backgroundUrl || null}
            onSelect={(url) => setBackgroundUrl(url)}
          />
        </div>

        {/* 前景画像 */}
        <div style={sectionStyle}>
          <AssetPicker
            label="前景画像"
            currentUrl={foregroundUrl || null}
            onSelect={(url) => setForegroundUrl(url)}
          />
        </div>

        {/* 前景透過率 */}
        {foregroundUrl && (
          <div style={sectionStyle}>
            <label style={labelStyle}>
              前景透過率: {Math.round(foregroundOpacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={foregroundOpacity}
              onChange={(e) => setForegroundOpacity(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        )}

        {/* BGM設定 */}
        <div style={sectionStyle}>
          <label style={labelStyle}>BGM</label>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            {([
              { key: null, label: 'なし' },
              { key: 'youtube', label: 'YouTube' },
              { key: 'url', label: 'URL' },
              { key: 'upload', label: 'アップロード' },
            ] as { key: Scene['bgm_type']; label: string }[]).map((opt) => (
              <button
                key={String(opt.key)}
                onClick={() => setBgmType(opt.key)}
                style={{
                  padding: '4px 10px',
                  background: bgmType === opt.key ? theme.accent : theme.bgInput,
                  color: bgmType === opt.key ? theme.textOnAccent : theme.textPrimary,
                  border: 'none',
                  borderRadius: 0,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {bgmType === 'youtube' && (
            <input
              style={inputStyle}
              value={bgmSource}
              onChange={(e) => setBgmSource(extractYoutubeId(e.target.value))}
              placeholder="YouTube URLまたは動画ID"
            />
          )}

          {bgmType === 'url' && (
            <input
              style={inputStyle}
              value={bgmSource}
              onChange={(e) => setBgmSource(e.target.value)}
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
        </div>

        {/* BGMボリューム・ループ */}
        {bgmType && (
          <div style={sectionStyle}>
            <label style={labelStyle}>
              ボリューム: {Math.round(bgmVolume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={bgmVolume}
              onChange={(e) => setBgmVolume(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '8px',
                fontSize: '0.8rem',
                color: theme.textSecondary,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={bgmLoop}
                onChange={(e) => setBgmLoop(e.target.checked)}
              />
              ループ再生
            </label>
          </div>
        )}

        {/* ボタン */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: theme.bgInput,
              color: theme.textPrimary,
              border: 'none',
              borderRadius: 0,
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              background: theme.accent,
              color: theme.textOnAccent,
              border: 'none',
              borderRadius: 0,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
