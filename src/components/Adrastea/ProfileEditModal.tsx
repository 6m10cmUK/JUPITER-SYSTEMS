import { useState } from 'react';
import { theme } from '../../styles/theme';
import type { UserProfile } from '../../types/adrastea.types';
import { useAuth } from '../../contexts/AuthContext';
import { AssetPicker } from './AssetPicker';
import { AdInput, AdButton, AdModal } from './ui';

interface ProfileEditModalProps {
  profile: UserProfile;
  onSave: (data: { display_name: string; avatar_url: string | null }) => Promise<void>;
  onClose: () => void;
}

export function ProfileEditModal({ profile, onSave, onClose }: ProfileEditModalProps) {
  const { isGuest } = useAuth();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ゲストは編集不可
  if (isGuest) return null;

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim() || null,
      });
      onClose();
    } catch {
      setError('プロフィールの保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdModal
      title="プロフィール編集"
      width="400px"
      onClose={onClose}
      footer={
        <>
          <AdButton onClick={onClose} disabled={saving}>キャンセル</AdButton>
          <AdButton
            variant="primary"
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
          >
            {saving ? '保存中...' : '保存'}
          </AdButton>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {error && (
          <div style={{ padding: '6px 10px', background: theme.danger, color: theme.textOnAccent, fontSize: '0.8rem' }}>
            {error}
          </div>
        )}
        <AdInput
          label="表示名"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="表示名を入力"
        />
        <div>
          <AssetPicker
            label="アイコン画像"
            currentUrl={avatarUrl || null}
            onSelect={(url) => setAvatarUrl(url)}
          />
        </div>
      </div>
    </AdModal>
  );
}
