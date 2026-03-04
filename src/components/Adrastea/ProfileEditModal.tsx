import React, { useState } from 'react';
import type { UserProfile } from '../../types/adrastea.types';
import { AssetPicker } from './AssetPicker';
import { theme } from '../../styles/theme';

interface ProfileEditModalProps {
  profile: UserProfile;
  onSave: (data: { display_name: string; avatar_url: string | null }) => Promise<void>;
  onClose: () => void;
}

export function ProfileEditModal({ profile, onSave, onClose }: ProfileEditModalProps) {
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await onSave({
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
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
    width: '400px',
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

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem' }}>プロフィール編集</h3>

        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>表示名</label>
          <input
            style={inputStyle}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="表示名を入力"
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <AssetPicker
            label="アイコン画像"
            currentUrl={avatarUrl || null}
            onSelect={(url) => setAvatarUrl(url)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '8px 16px', background: theme.bgInput, color: theme.textPrimary,
              border: 'none', borderRadius: 0, cursor: 'pointer',
            }}
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            style={{
              padding: '8px 16px',
              background: saving || !displayName.trim() ? theme.borderInput : theme.accent,
              color: theme.textOnAccent,
              border: 'none', borderRadius: 0, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
