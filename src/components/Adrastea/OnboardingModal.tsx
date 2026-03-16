import { useState } from 'react';
import { theme } from '../../styles/theme';
import { AdInput, AdButton } from './ui';
import { AssetPicker } from './AssetPicker';

interface OnboardingModalProps {
  defaultName: string;
  defaultImage: string | null;
  isGuest: boolean;
  onComplete: (data: { display_name: string; avatar_url: string | null }) => Promise<void>;
  onSkip: () => Promise<void>;
}

export function OnboardingModal({ defaultName, defaultImage, isGuest, onComplete, onSkip }: OnboardingModalProps) {
  const [name, setName] = useState(defaultName);
  const [image, setImage] = useState<string | null>(defaultImage);
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onComplete({ display_name: name.trim(), avatar_url: image });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await onSkip();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: theme.bgBase, zIndex: 9999,
    }}>
      <div style={{
        background: theme.bgSurface, border: `1px solid ${theme.border}`,
        padding: '40px', width: '400px', color: theme.textPrimary,
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.3rem', textAlign: 'center' }}>
          プロフィール設定
        </h2>
        <p style={{ margin: '0 0 24px', color: theme.textSecondary, fontSize: '0.85rem', textAlign: 'center' }}>
          表示名とアバターを設定してください
        </p>

        {/* アバター */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
              border: `2px solid ${theme.border}`, margin: '0 auto 8px',
              background: theme.bgDeep,
            }}>
              {image ? (
                <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', color: theme.textMuted,
                }}>
                  {name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>
            {!isGuest && (
              <AssetPicker
                currentUrl={image}
                onSelect={(url) => setImage(url)}
                label="アバターを変更"
              />
            )}
            {isGuest && (
              <AdInput
                value={image ?? ''}
                onChange={(e) => setImage(e.target.value || null)}
                placeholder="画像URL（省略可）"
                style={{ fontSize: '0.8rem', marginTop: '4px' }}
              />
            )}
          </div>
        </div>

        {/* 表示名 */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: theme.textSecondary }}>
            表示名
          </label>
          <AdInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="表示名を入力"
            style={{ width: '100%' }}
            maxLength={30}
          />
        </div>

        {/* ボタン */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <AdButton
            onClick={handleSkip}
            disabled={saving}
            style={{ flex: 1, background: 'transparent', border: `1px solid ${theme.border}`, color: theme.textSecondary }}
          >
            スキップ
          </AdButton>
          <AdButton
            onClick={handleComplete}
            disabled={saving || !name.trim()}
            style={{ flex: 1, background: theme.accent, color: theme.textOnAccent }}
          >
            {saving ? '保存中...' : '保存'}
          </AdButton>
        </div>
      </div>
    </div>
  );
}
