import { useState } from 'react';
import { Eye, FolderOpen, Volume2, VolumeX, Pencil } from 'lucide-react';
import { AssetLibraryModal } from './AssetLibraryModal';
import { useAuth } from '../../contexts/AuthContext';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { usePermission } from '../../hooks/usePermission';
import { BgmMiniPlayer } from './BgmMiniPlayer';
import type { Scene } from '../../types/adrastea.types';
import type { DockviewApi } from 'dockview';
import { theme } from '../../styles/theme';
import { ADRASTEA_VERSION, ADRASTEA_STAGE } from '../../config/adrastea';


interface TopToolbarProps {
  onAddPiece: (label: string, color: string) => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
  onOpenLayout: () => void;
  activeScene?: Scene | null;
  profile: { display_name?: string; avatar_url?: string | null } | null;
  dockviewApi: DockviewApi | null;
  roomName?: string;
}

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  owner:     { label: 'owner',     color: theme.accent },
  sub_owner: { label: 'sub_owner', color: theme.warning ?? '#f5a623' },
  user:      { label: 'user',      color: theme.textSecondary },
  guest:     { label: 'guest',     color: theme.textMuted },
};

function IconButton({ onClick, title, children, active }: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? theme.bgInput : 'transparent',
        color: active ? theme.textPrimary : theme.textSecondary,
        border: 'none',
        borderRadius: 0,
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

export function TopToolbar({
  onAddPiece: _onAddPiece,
  onOpenSettings,
  onOpenProfile,
  onSignOut: _onSignOut,
  onOpenLayout,
  activeScene: _activeScene,
  profile,
  dockviewApi: _dockviewApi,
  roomName,
}: TopToolbarProps) {
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const { isGuest } = useAuth();
  const { roomRole } = usePermission();

  const { masterVolume, setMasterVolume, bgmMuted, setBgmMuted } = useAdrasteaContext();

  return (
    <div
      style={{
        height: 32,
        minHeight: 32,
        background: theme.bgToolbar,
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 8px',
        zIndex: 10,
      }}
    >
      {/* ロゴ */}
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: '4px',
        paddingRight: '8px',
        borderRight: `1px solid ${theme.border}`,
        marginRight: '4px',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', color: theme.textPrimary }}>
          Adrastea
        </span>
        <span style={{ fontSize: '9px', color: theme.textMuted, opacity: 0.7 }}>
          {ADRASTEA_STAGE} {ADRASTEA_VERSION}
        </span>
      </div>

      {/* セパレータ */}
      <div style={{ width: 1, height: 20, background: theme.border, margin: '0 4px' }} />

      {/* ルーム名 + 編集ボタン */}
      {roomName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <span style={{
            fontSize: '11px',
            color: theme.textSecondary,
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {roomName}
          </span>
          <button
            type="button"
            className="adra-btn adra-btn--ghost"
            onClick={onOpenSettings}
            title="ルーム設定"
            style={{
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Pencil size={11} />
          </button>
        </div>
      )}

      {/* セパレータ */}
      <div style={{ width: 1, height: 20, background: theme.border, margin: '0 4px' }} />

      {/* パネルレイアウト切替 */}
      <IconButton onClick={onOpenLayout} title="パネルレイアウト">
        <Eye size={14} />
      </IconButton>

      {/* スペーサー */}
      <div style={{ flex: 1 }} />

      {/* ロールバッジ */}
      {(() => {
        const badge = ROLE_BADGE[roomRole] ?? { label: roomRole, color: theme.textMuted };
        return (
          <span style={{
            fontSize: '9px',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: badge.color,
            border: `1px solid ${badge.color}`,
            borderRadius: 2,
            padding: '1px 4px',
            opacity: 0.8,
          }}>
            {badge.label}
          </span>
        );
      })()}

      {/* BGMプレイヤー */}
      <BgmMiniPlayer />

      {/* マスターボリューム */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={() => setBgmMuted(!bgmMuted)}
          title={bgmMuted ? 'ミュート解除' : 'ミュート'}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: bgmMuted ? theme.danger : theme.textSecondary,
            padding: '2px', display: 'flex', alignItems: 'center',
          }}
        >
          {bgmMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <input
          type="range"
          min="0" max="1" step="0.05"
          value={bgmMuted ? 0 : masterVolume}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (bgmMuted && v > 0) setBgmMuted(false);
            setMasterVolume(v);
          }}
          title={`マスターボリューム: ${Math.round(masterVolume * 100)}%`}
          style={{ width: '60px' }}
        />
      </div>

      {/* セパレータ */}
      <div style={{ width: 1, height: 20, background: theme.border, margin: '0 4px' }} />

      {/* アセット管理 */}
      {!isGuest && (
        <IconButton onClick={() => setShowAssetLibrary(true)} title="アセット管理">
          <FolderOpen size={14} />
        </IconButton>
      )}

      {/* プロフィール設定 */}
      <button
        type="button"
        onClick={onOpenProfile}
        title="ユーザー設定"
        className="adra-btn adra-btn--ghost"
        style={{
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: theme.accent, color: theme.bgBase,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', fontWeight: 700,
          }}>
            {(profile?.display_name ?? 'U').charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {showAssetLibrary && <AssetLibraryModal onClose={() => setShowAssetLibrary(false)} />}
    </div>
  );
}
