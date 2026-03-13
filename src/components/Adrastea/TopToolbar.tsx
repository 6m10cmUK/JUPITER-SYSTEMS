import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Eye, FolderOpen, LogOut, Volume2, VolumeX, Terminal, User, Pencil } from 'lucide-react';
import { AssetLibraryModal } from './AssetLibraryModal';
import { useAuth } from '../../contexts/AuthContext';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
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
  onSignOut,
  onOpenLayout,
  activeScene: _activeScene,
  profile,
  dockviewApi,
  roomName,
}: TopToolbarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userMenuPos, setUserMenuPos] = useState({ top: 0, left: 0 });
  const userMenuBtnRef = useRef<HTMLButtonElement>(null);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const { isGuest } = useAuth();

  const openUserMenu = useCallback(() => {
    const rect = userMenuBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setUserMenuPos({ top: rect.bottom + 4, left: rect.right - 180 });
      setShowUserMenu(true);
    }
  }, []);

  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (userMenuBtnRef.current?.contains(target)) return;
      const menuEl = document.querySelector('[data-user-menu]');
      if (menuEl?.contains(target)) return;
      setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserMenu]);
  const { masterVolume, setMasterVolume, bgmMuted, setBgmMuted } = useAdrasteaContext();

  const togglePanel = useCallback(
    (panelId: string, component: string, title: string) => {
      if (!dockviewApi) return;
      const existing = dockviewApi.getPanel(panelId);
      if (existing) {
        existing.api.setActive();
      } else {
        // board 以外のグループを探す
        let targetGroup = dockviewApi.activeGroup;
        if (targetGroup?.panels.some(p => p.id === 'board')) {
          targetGroup = dockviewApi.groups.find(g => !g.panels.some(p => p.id === 'board')) ?? undefined;
        }
        if (targetGroup) {
          dockviewApi.addPanel({
            id: panelId,
            component,
            title,
            position: { referenceGroup: targetGroup, direction: 'within' },
          });
        } else {
          // フォールバック: board の右に新グループ作成
          dockviewApi.addPanel({
            id: panelId,
            component,
            title,
            position: { referencePanel: 'board', direction: 'right' },
          });
        }
      }
    },
    [dockviewApi],
  );

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
            className="ad-btn ad-btn--ghost"
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

      {/* ユーザーメニュー（プロフィール編集・設定・開発者モード・ログアウト） */}
      <div style={{ position: 'relative' }}>
        <button
          ref={userMenuBtnRef}
          type="button"
          onClick={() => (showUserMenu ? setShowUserMenu(false) : openUserMenu())}
          title="メニュー"
          className="ad-btn ad-btn--ghost"
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
        {showUserMenu &&
          createPortal(
            <div
              data-user-menu
              className="adrastea-root"
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: userMenuPos.top,
                left: userMenuPos.left,
                minWidth: 200,
                background: theme.bgElevated,
                border: `1px solid ${theme.border}`,
                boxShadow: theme.shadowMd,
                zIndex: 10000,
                padding: '4px 0',
              }}
            >
              <button
                type="button"
                className="ad-list-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  color: theme.textPrimary,
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onClick={() => {
                  onOpenProfile();
                  setShowUserMenu(false);
                }}
              >
                <User size={14} />
                プロフィール編集
              </button>
              <button
                type="button"
                className="ad-list-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  color: theme.textPrimary,
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onClick={() => {
                  togglePanel('debugConsole', 'debugConsole', 'Debug Console');
                  setShowUserMenu(false);
                }}
              >
                <Terminal size={14} />
                開発者モード（デバッグログ表示）
              </button>
              <button
                type="button"
                className="ad-list-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  color: theme.danger,
                  fontSize: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onClick={() => {
                  onSignOut();
                  setShowUserMenu(false);
                }}
              >
                <LogOut size={14} />
                ログアウト
              </button>
            </div>,
            document.body
          )}
      </div>

      {showAssetLibrary && <AssetLibraryModal onClose={() => setShowAssetLibrary(false)} />}
    </div>
  );
}
