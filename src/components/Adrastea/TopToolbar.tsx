import { useState, useCallback } from 'react';
import { Eye, FolderOpen, Settings, LogOut, Volume2, VolumeX, Terminal, Wifi, WifiOff, Loader } from 'lucide-react';
import { AssetLibraryModal } from './AssetLibraryModal';
import { useAuth } from '../../contexts/AuthContext';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { BgmMiniPlayer } from './BgmMiniPlayer';
import { DebugConsole } from './DebugConsole';
import type { Scene } from '../../types/adrastea.types';
import type { DockviewApi } from 'dockview';
import { theme } from '../../styles/theme';

const PANEL_DEFS = [
  { id: 'scene', component: 'scene', title: 'シーン' },
  { id: 'character', component: 'character', title: 'キャラクター' },
  { id: 'scenarioText', component: 'scenarioText', title: 'テキスト' },
  { id: 'cutin', component: 'cutin', title: 'カットイン' },
  { id: 'layer', component: 'layer', title: 'レイヤー' },
  { id: 'property', component: 'property', title: 'プロパティ' },
  { id: 'chat', component: 'chat', title: 'チャット' },
  { id: 'board', component: 'board', title: 'Board' },
  { id: 'pdfViewer', component: 'pdfViewer', title: 'PDF' },
  { id: 'bgm', component: 'bgm', title: 'BGM' },
] as const;

function P2PIndicator() {
  const { p2pConnectionState, isHost } = useAdrasteaContext();

  // ホスト中のときは色を変える
  let config = {
    connected: { icon: <Wifi size={14} />, color: theme.success, label: 'P2P接続中' },
    connecting: { icon: <Loader size={14} />, color: theme.warning, label: 'P2P接続中...' },
    reconnecting: { icon: <Loader size={14} />, color: theme.warning, label: 'P2P再接続中...' },
    disconnected: { icon: <WifiOff size={14} />, color: theme.textSecondary, label: 'P2P未接続' },
  }[p2pConnectionState];

  if (isHost && p2pConnectionState === 'connected') {
    config = { icon: <Wifi size={14} />, color: theme.warning, label: 'ホスト中' };
  }

  return (
    <div
      title={config.label}
      style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        color: config.color, fontSize: '11px', padding: '0 6px',
      }}
    >
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
}

interface TopToolbarProps {
  onAddPiece: (label: string, color: string) => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
  activeScene?: Scene | null;
  profile: { display_name?: string; avatar_url?: string | null } | null;
  dockviewApi: DockviewApi | null;
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
  activeScene: _activeScene,
  profile,
  dockviewApi,
}: TopToolbarProps) {
  const [showPanelMenu, setShowPanelMenu] = useState(false);
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const { isGuest } = useAuth();
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
      setShowPanelMenu(false);
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
      {/* アプリ名 */}
      <span style={{ color: theme.textMuted, fontSize: '0.75rem', fontWeight: 600, marginRight: 4 }}>
        Adrastea (α)
      </span>

      {/* セパレータ */}
      <div style={{ width: 1, height: 20, background: theme.border, margin: '0 4px' }} />

      {/* セパレータ */}
      <div style={{ width: 1, height: 20, background: theme.border, margin: '0 4px' }} />

      {/* パネル表示メニュー */}
      <div style={{ position: 'relative' }}>
        <IconButton onClick={() => setShowPanelMenu(!showPanelMenu)} title="パネル表示" active={showPanelMenu}>
          <Eye size={14} />
        </IconButton>
        {showPanelMenu && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 99 }}
              onClick={() => setShowPanelMenu(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 4,
                background: theme.bgBase,
                border: `1px solid ${theme.border}`,
                borderRadius: 0,
                padding: '4px 0',
                zIndex: 100,
                minWidth: 160,
              }}
            >
              {PANEL_DEFS.map((p) => {
                const exists = !!dockviewApi?.getPanel(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePanel(p.id, p.component, p.title)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '4px 8px',
                      background: 'transparent',
                      color: exists ? theme.textSecondary : theme.textPrimary,
                      border: 'none',
                      textAlign: 'left',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    {p.title} {exists ? '(表示中)' : ''}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* スペーサー */}
      <div style={{ flex: 1 }} />

      {/* P2P接続状態 */}
      <P2PIndicator />

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

      {/* デバッグコンソール */}
      <IconButton onClick={() => setShowDebug(true)} title="デバッグコンソール">
        <Terminal size={14} />
      </IconButton>

      {/* 設定 */}
      <IconButton onClick={onOpenSettings} title="設定">
        <Settings size={14} />
      </IconButton>

      {/* プロフィール */}
      <button
        onClick={onOpenProfile}
        title="プロフィール"
        style={{
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: 0,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: theme.accent, color: theme.bgBase,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 700,
          }}>
            {(profile?.display_name ?? 'U').charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {/* ログアウト */}
      <IconButton onClick={onSignOut} title="ログアウト">
        <LogOut size={14} />
      </IconButton>

      {showAssetLibrary && <AssetLibraryModal onClose={() => setShowAssetLibrary(false)} />}
      {showDebug && <DebugConsole onClose={() => setShowDebug(false)} />}
    </div>
  );
}
