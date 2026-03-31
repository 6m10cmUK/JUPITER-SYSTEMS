import { useState, useRef } from 'react';
import { theme } from '../../styles/theme';
import type { UserProfile } from '../../types/adrastea.types';
import { useAuth } from '../../contexts/AuthContext';
import { uploadAvatarToR2 } from '../../services/assetService';
import { AdInput, AdButton, AdModal } from './ui';

interface ProfileEditModalProps {
  profile: UserProfile;
  onSave: (data: { display_name: string; avatar_url: string | null }) => Promise<void>;
  onSignOut: () => void;
  onClose: () => void;
}

export function ProfileEditModal({ profile, onSave, onSignOut, onClose }: ProfileEditModalProps) {
  const { user, token } = useAuth();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    try {
      const url = await uploadAvatarToR2(file, user.uid, token);
      setAvatarUrl(url);
    } catch {
      setError('アバターアップロード失敗');
    }
  };

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
      title="ユーザー設定"
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div style={{ padding: '6px 10px', background: theme.danger, color: theme.textOnAccent, fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        {/* アバター */}
        <div>
          <div style={{ fontSize: '12px', color: theme.textSecondary, marginBottom: '6px' }}>アイコン画像</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              onClick={() => avatarInputRef.current?.click()}
              style={{
                width: 64, height: 64, borderRadius: '50%', overflow: 'hidden',
                border: `2px solid ${theme.border}`, background: theme.bgDeep,
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', color: theme.textMuted,
                }}>
                  {(displayName || '?')[0]}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: theme.accent, fontSize: '12px', padding: 0,
              }}
            >
              画像を変更
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        {/* 表示名 */}
        <AdInput
          label="表示名"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="表示名を入力"
        />

        {/* ログアウト */}
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '16px' }}>
          <AdButton
            variant="danger"
            onClick={() => { onSignOut(); onClose(); }}
          >
            ログアウト
          </AdButton>
        </div>
      </div>
    </AdModal>
  );
}
