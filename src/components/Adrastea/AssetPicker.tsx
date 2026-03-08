import { useState } from 'react';
import { theme } from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';
import { X } from 'lucide-react';
import { AssetLibraryModal } from './AssetLibraryModal';

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
        <AssetLibraryModal
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
