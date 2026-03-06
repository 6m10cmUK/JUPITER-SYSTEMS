import React, { useState, useRef, useCallback } from 'react';
import { theme } from '../../styles/theme';
import { useAssets } from '../../hooks/useAssets';
import { useAuth } from '../../contexts/AuthContext';
import { X, ImageOff } from 'lucide-react';

// ---------------------------------------------------------------------------
// AssetPickerModal - モーダル単体（外部から直接呼べる）
// ---------------------------------------------------------------------------

interface AssetPickerModalProps {
  onSelect: (url: string) => void;
  onClose: () => void;
  assetType?: 'image' | 'audio';
}

export function AssetPickerModal({ onSelect, onClose, assetType = 'image' }: AssetPickerModalProps) {
  const { assets, uploadAsset, uploadAudioAsset } = useAssets();
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = assets.filter(a => a.asset_type === assetType);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const asset = assetType === 'audio'
          ? await uploadAudioAsset(file)
          : await uploadAsset(file);
        if (asset) {
          onSelect(asset.url);
        }
      } catch (err) {
        console.error('アップロード失敗:', err);
      } finally {
        setUploading(false);
      }
    },
    [assetType, uploadAsset, uploadAudioAsset, onSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload]
  );

  const handleUrlSubmit = useCallback(() => {
    const url = urlInput.trim();
    if (url) {
      onSelect(url);
      setUrlInput('');
    }
  }, [urlInput, onSelect]);

  const isAudio = assetType === 'audio';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme.bgSurface, border: `1px solid ${theme.border}`,
          borderRadius: 0, padding: '12px', width: '600px', maxHeight: '80vh',
          color: theme.textPrimary, display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>
            {isAudio ? '音声を選択' : 'アセット選択'}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: theme.textSecondary,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* アップロードエリア */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? theme.accent : theme.borderInput}`,
            borderRadius: 0, padding: '8px', textAlign: 'center',
            cursor: 'pointer', marginBottom: '8px',
            background: dragging ? 'rgba(137,180,250,0.1)' : 'rgba(0,0,0,0.2)',
            transition: 'all 0.2s',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={isAudio ? 'audio/*' : 'image/*'}
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = '';
            }}
          />
          {uploading ? (
            <div style={{ fontSize: '12px', color: theme.textSecondary }}>
              アップロード中...
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: theme.textSecondary }}>
              新規アップロード（ドラッグ&ドロップ / クリック）
            </div>
          )}
        </div>

        {/* URL入力 */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleUrlSubmit(); }}
            placeholder={isAudio ? 'URL / YouTube URL を入力' : 'URLを入力'}
            style={{
              flex: 1, padding: '6px 8px',
              background: theme.bgInput, border: `1px solid ${theme.borderInput}`,
              borderRadius: 0, color: theme.textPrimary, fontSize: '12px', outline: 'none',
            }}
          />
          <button
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim()}
            style={{
              padding: '6px 12px', fontSize: '12px',
              background: theme.accent, color: theme.textOnAccent,
              border: 'none', borderRadius: 0,
              cursor: urlInput.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            追加
          </button>
        </div>

        {/* アセット一覧 */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {isAudio ? (
            /* 音声: リスト表示 */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', color: theme.textMuted, fontSize: '12px', padding: '16px 0' }}>
                  ライブラリに音声がありません
                </div>
              )}
              {filtered.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => onSelect(asset.url)}
                  style={{
                    cursor: 'pointer', border: `1px solid ${theme.border}`,
                    borderRadius: 0, padding: '8px',
                    background: 'rgba(0,0,0,0.2)', transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.accent; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; }}
                >
                  <div style={{
                    fontSize: '12px', color: theme.textPrimary, marginBottom: '4px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {asset.title || asset.filename}
                  </div>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio
                    controls
                    src={asset.url}
                    style={{ width: '100%', height: '28px' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              ))}
            </div>
          ) : (
            /* 画像: グリッド表示 */
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '4px',
            }}>
              {/* No Image タイル */}
              <div
                onClick={() => onSelect('')}
                style={{
                  cursor: 'pointer', border: `1px solid ${theme.border}`,
                  borderRadius: 0, overflow: 'hidden',
                  background: 'rgba(0,0,0,0.2)', transition: 'border-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.accent; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; }}
              >
                <div style={{
                  width: '100%', aspectRatio: '1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: '4px',
                  color: theme.textMuted,
                }}>
                  <ImageOff size={24} />
                </div>
                <div style={{
                  padding: '4px 6px', fontSize: '11px',
                  color: theme.textMuted, textAlign: 'center',
                }}>
                  no image
                </div>
              </div>
              {filtered.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => onSelect(asset.url)}
                  style={{
                    cursor: 'pointer', border: `1px solid ${theme.border}`,
                    borderRadius: 0, overflow: 'hidden',
                    background: 'rgba(0,0,0,0.2)', transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = theme.accent; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = theme.border; }}
                >
                  <img
                    src={asset.url}
                    alt={asset.filename}
                    style={{
                      width: '100%', aspectRatio: '1', objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <div style={{
                    padding: '4px 6px', fontSize: '11px',
                    color: theme.textMuted, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {asset.filename}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AssetPicker - インライン表示 + モーダル（既存のフォーム内で使う用）
// ---------------------------------------------------------------------------

interface AssetPickerProps {
  currentUrl?: string | null;
  onSelect: (url: string) => void;
  label?: string;
}

export function AssetPicker({ currentUrl, onSelect, label }: AssetPickerProps) {
  const { isGuest } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [guestUrl, setGuestUrl] = useState('');

  // ゲスト時: URL手入力フィールド
  if (isGuest) {
    return (
      <div>
        {label && (
          <div style={{ fontSize: '12px', color: theme.textSecondary, marginBottom: '4px' }}>
            {label}
          </div>
        )}
        <div style={{ display: 'flex', gap: '4px' }}>
          <input
            value={guestUrl}
            onChange={(e) => setGuestUrl(e.target.value)}
            placeholder="画像URLを入力"
            style={{
              flex: 1,
              padding: '4px 6px',
              background: theme.bgInput,
              border: `1px solid ${theme.borderInput}`,
              borderRadius: 0,
              color: theme.textPrimary,
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <button
            onClick={() => {
              if (guestUrl.trim()) {
                onSelect(guestUrl.trim());
                setGuestUrl('');
              }
            }}
            style={{
              padding: '4px 8px',
              background: theme.accent,
              color: theme.textOnAccent,
              border: 'none',
              borderRadius: 0,
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            設定
          </button>
        </div>
        {currentUrl && (
          <div style={{ position: 'relative', marginTop: '8px' }}>
            <img
              src={currentUrl}
              alt="preview"
              style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: 0, objectFit: 'contain' }}
            />
            <button
              onClick={() => onSelect('')}
              style={{
                position: 'absolute', top: '-4px', right: '-4px',
                width: '20px', height: '20px', borderRadius: '50%',
                background: theme.danger, color: theme.textOnAccent,
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {label && (
        <div style={{ fontSize: '12px', color: theme.textSecondary, marginBottom: '4px' }}>
          {label}
        </div>
      )}

      {/* プレビュー or ドロップゾーン */}
      <div
        onClick={() => setShowModal(true)}
        style={{
          border: `2px dashed ${theme.borderInput}`,
          borderRadius: 0,
          padding: currentUrl ? '8px' : '20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: 'rgba(0,0,0,0.2)',
          transition: 'all 0.2s',
          position: 'relative',
        }}
      >
        {currentUrl ? (
          <div style={{ position: 'relative' }}>
            <img
              src={currentUrl}
              alt="preview"
              style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: 0, objectFit: 'contain' }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect('');
              }}
              style={{
                position: 'absolute', top: '-4px', right: '-4px',
                width: '20px', height: '20px', borderRadius: '50%',
                background: theme.danger, color: theme.textOnAccent,
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div style={{ color: theme.textSecondary, fontSize: '0.8rem' }}>
            クリックしてアセットを選択
            <div style={{ fontSize: '11px', marginTop: '4px', color: theme.textMuted }}>
              ライブラリから選択 / 新規アップロード
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <AssetPickerModal
          onSelect={(url) => {
            onSelect(url);
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
