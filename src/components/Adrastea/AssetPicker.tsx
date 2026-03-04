import React, { useState, useRef, useCallback } from 'react';
import { theme } from '../../styles/theme';
import { useAssets } from '../../hooks/useAssets';
import { useAuth } from '../../contexts/AuthContext';

interface AssetPickerProps {
  currentUrl?: string | null;
  onSelect: (url: string) => void;
  label?: string;
}

export function AssetPicker({ currentUrl, onSelect, label }: AssetPickerProps) {
  const { isGuest } = useAuth();
  const { assets, uploadAsset } = useAssets();
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [guestUrl, setGuestUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const asset = await uploadAsset(file);
        if (asset) {
          onSelect(asset.url);
          setShowModal(false);
        }
      } catch (err) {
        console.error('アップロード失敗:', err);
      } finally {
        setUploading(false);
      }
    },
    [uploadAsset, onSelect]
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

  // ゲスト時: URL手入力フィールド
  if (isGuest) {
    return (
      <div>
        {label && (
          <div style={{ fontSize: '0.8rem', color: theme.textSecondary, marginBottom: '4px' }}>
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
              padding: '8px 10px',
              background: theme.bgInput,
              border: `1px solid ${theme.borderInput}`,
              borderRadius: 0,
              color: theme.textPrimary,
              fontSize: '0.85rem',
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
              padding: '8px 12px',
              background: theme.accent,
              color: theme.textOnAccent,
              border: 'none',
              borderRadius: 0,
              cursor: 'pointer',
              fontSize: '0.8rem',
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
                border: 'none', fontSize: '12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}
            >
              x
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {label && (
        <div style={{ fontSize: '0.8rem', color: theme.textSecondary, marginBottom: '4px' }}>
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
                border: 'none', fontSize: '12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}
            >
              x
            </button>
          </div>
        ) : (
          <div style={{ color: theme.textSecondary, fontSize: '0.8rem' }}>
            クリックしてアセットを選択
            <div style={{ fontSize: '0.7rem', marginTop: '4px', color: theme.textMuted }}>
              ライブラリから選択 / 新規アップロード
            </div>
          </div>
        )}
      </div>

      {/* アセット選択モーダル */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: theme.bgSurface, border: `1px solid ${theme.border}`,
              borderRadius: 0, padding: '24px', width: '600px', maxHeight: '80vh',
              color: theme.textPrimary, display: 'flex', flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>アセット選択</h3>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none', border: 'none', color: theme.textSecondary,
                  cursor: 'pointer', fontSize: '1.2rem',
                }}
              >
                ✕
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
                borderRadius: 0, padding: '16px', textAlign: 'center',
                cursor: 'pointer', marginBottom: '16px',
                background: dragging ? 'rgba(137,180,250,0.1)' : 'rgba(0,0,0,0.2)',
                transition: 'all 0.2s',
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = '';
                }}
              />
              {uploading ? (
                <div style={{ fontSize: '0.8rem', color: theme.textSecondary }}>
                  アップロード中...
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: theme.textSecondary }}>
                  新規アップロード（ドラッグ&ドロップ / クリック）
                </div>
              )}
            </div>

            {/* アセットグリッド */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {assets.length === 0 ? (
                <div style={{ textAlign: 'center', color: theme.textMuted, fontSize: '0.85rem', padding: '24px 0' }}>
                  アセットがありません
                </div>
              ) : (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                }}>
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => {
                        onSelect(asset.url);
                        setShowModal(false);
                      }}
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
                        padding: '4px 6px', fontSize: '0.65rem',
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
      )}
    </div>
  );
}
