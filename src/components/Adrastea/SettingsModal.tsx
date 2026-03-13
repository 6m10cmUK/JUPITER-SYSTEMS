import { useState } from 'react';
import type { Room } from '../../types/adrastea.types';
import type { DockviewApi } from 'dockview';
import type { PermissionKey } from '../../config/permissions';
import { AdButton, AdInput, AdTextArea } from './ui';
import { theme } from '../../styles/theme';
import { X } from 'lucide-react';
import { AssetPicker } from './AssetPicker';

type SettingsSection = 'room' | 'layout' | 'user';

interface SettingsModalProps {
  initialSection?: SettingsSection;
  room: Room;
  onSaveRoom: (updates: { name?: string; description?: string; dice_system?: string }) => void;
  onDeleteRoom: () => void;
  dockviewApi: DockviewApi | null;
  can: (permission: PermissionKey) => boolean;
  profile: { display_name?: string; avatar_url?: string | null } | null;
  onSaveProfile: (data: { display_name: string; avatar_url: string | null }) => Promise<void>;
  isGuest: boolean;
  onSignOut: () => void;
  onClose: () => void;
}

interface PanelDef {
  id: string;
  component: string;
  title: string;
  permission: PermissionKey;
}

const PANEL_DEFS: PanelDef[] = [
  { id: 'scene', component: 'scene', title: 'シーン', permission: 'panel_scene' },
  { id: 'character', component: 'character', title: 'キャラクター', permission: 'panel_character' },
  { id: 'scenarioText', component: 'scenarioText', title: 'テキスト', permission: 'panel_scenarioText' },
  { id: 'cutin', component: 'cutin', title: 'カットイン', permission: 'panel_cutin' },
  { id: 'layer', component: 'layer', title: 'レイヤー', permission: 'panel_layer' },
  { id: 'property', component: 'property', title: 'プロパティ', permission: 'panel_property' },
  { id: 'chatLog', component: 'chatLog', title: 'チャットログ', permission: 'panel_chat' },
  { id: 'chatInput', component: 'chatInput', title: 'チャット入力', permission: 'panel_chat' },
  { id: 'chatPalette', component: 'chatPalette', title: 'チャットパレット', permission: 'panel_chat' },
  { id: 'board', component: 'board', title: 'Board', permission: 'panel_board' },
  { id: 'pdfViewer', component: 'pdfViewer', title: 'PDF', permission: 'panel_pdfViewer' },
  { id: 'bgm', component: 'bgm', title: 'BGM', permission: 'panel_bgm' },
];

const NAV_ITEMS: Array<{ key: SettingsSection; label: string }> = [
  { key: 'room', label: 'ルーム設定' },
  { key: 'layout', label: 'レイアウト' },
  { key: 'user', label: 'ユーザー' },
];

function RoomSettingsSection({
  room,
  onSaveRoom,
  onDeleteRoom,
  onClose,
}: {
  room: Room;
  onSaveRoom: (updates: { name?: string; description?: string; dice_system?: string }) => void;
  onDeleteRoom: () => void;
  onClose: () => void;
}) {
  const [roomName, setRoomName] = useState(room.name);
  const [description, setDescription] = useState('');
  const [diceSystem, setDiceSystem] = useState(room.dice_system);

  const handleSave = () => {
    onSaveRoom({
      name: roomName,
      description,
      dice_system: diceSystem,
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('このルームを削除してもよろしいですか？')) {
      onDeleteRoom();
      onClose();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <AdInput
        label="ルーム名"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
      />
      <AdTextArea
        label="説明"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="セッションの説明など（任意）"
        rows={3}
      />
      <AdInput
        label="ダイスシステム"
        value={diceSystem}
        onChange={(e) => setDiceSystem(e.target.value)}
        placeholder="DiceBot"
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
        <AdButton variant="danger" onClick={handleDelete}>
          ルームを削除
        </AdButton>
        <AdButton variant="primary" onClick={handleSave}>
          保存
        </AdButton>
      </div>
    </div>
  );
}

function LayoutSection({
  dockviewApi,
  can,
  onClose: _onClose,
}: {
  dockviewApi: DockviewApi | null;
  can: (permission: PermissionKey) => boolean;
  onClose: () => void;
}) {
  const togglePanel = (panelId: string, component: string, title: string) => {
    if (!dockviewApi) return;
    const existing = dockviewApi.getPanel(panelId);
    if (existing) {
      existing.api.setActive();
    } else {
      let targetGroup = dockviewApi.activeGroup;
      if (targetGroup?.panels.some((p) => p.id === 'board')) {
        targetGroup = dockviewApi.groups.find((g) => !g.panels.some((p) => p.id === 'board')) ?? undefined;
      }
      if (targetGroup) {
        dockviewApi.addPanel({
          id: panelId,
          component,
          title,
          position: { referenceGroup: targetGroup, direction: 'within' },
        });
      } else {
        dockviewApi.addPanel({
          id: panelId,
          component,
          title,
          position: { referencePanel: 'board', direction: 'right' },
        });
      }
    }
  };

  const filteredPanels = PANEL_DEFS.filter((p) => can(p.permission));

  return (
    <div>
      <div
        style={{
          fontSize: '11px',
          color: theme.textMuted,
          marginBottom: '8px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        パネル表示
      </div>
      <div>
        {filteredPanels.map((p) => {
          const exists = !!dockviewApi?.getPanel(p.id);
          return (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: `1px solid ${theme.borderSubtle}`,
              }}
            >
              <span style={{ fontSize: '12px', color: theme.textPrimary }}>
                {p.title}
              </span>
              <AdButton
                onClick={() => togglePanel(p.id, p.component, p.title)}
                style={{ fontSize: '11px' }}
              >
                {exists ? '表示中' : '表示する'}
              </AdButton>
            </div>
          );
        })}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 0',
            borderBottom: `1px solid ${theme.borderSubtle}`,
          }}
        >
          <span style={{ fontSize: '12px', color: theme.textPrimary }}>
            デバッグコンソール
          </span>
          <AdButton
            onClick={() => togglePanel('debugConsole', 'debugConsole', 'Debug Console')}
            style={{ fontSize: '11px' }}
          >
            {dockviewApi?.getPanel('debugConsole') ? '表示中' : '表示する'}
          </AdButton>
        </div>
      </div>
    </div>
  );
}

function UserSection({
  profile,
  onSaveProfile,
  isGuest,
  onSignOut,
  onClose,
  dockviewApi,
}: {
  profile: { display_name?: string; avatar_url?: string | null } | null;
  onSaveProfile: (data: { display_name: string; avatar_url: string | null }) => Promise<void>;
  isGuest: boolean;
  onSignOut: () => void;
  onClose: () => void;
  dockviewApi: DockviewApi | null;
}) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  return (
    <div>
      {isGuest ? (
        <div style={{ color: theme.textMuted, fontSize: 12 }}>
          ゲストユーザーはプロフィールを編集できません
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {profileError && (
            <div style={{ padding: '6px 10px', background: theme.danger, color: theme.textOnAccent, fontSize: 12 }}>
              {profileError}
            </div>
          )}
          <AdInput
            label="表示名"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="表示名を入力"
          />
          <AssetPicker
            label="アイコン画像"
            currentUrl={avatarUrl || null}
            onSelect={(url) => setAvatarUrl(url)}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <div /> {/* spacer */}
            <AdButton
              variant="primary"
              disabled={profileSaving || !displayName.trim()}
              onClick={async () => {
                if (!displayName.trim()) return;
                setProfileSaving(true);
                setProfileError(null);
                try {
                  await onSaveProfile({
                    display_name: displayName.trim(),
                    avatar_url: avatarUrl.trim() || null,
                  });
                } catch {
                  setProfileError('プロフィールの保存に失敗しました');
                } finally {
                  setProfileSaving(false);
                }
              }}
            >
              {profileSaving ? '保存中...' : '保存'}
            </AdButton>
          </div>
          <div style={{ height: 1, background: theme.border }} />
          <AdButton
            variant="danger"
            onClick={() => { onSignOut(); onClose(); }}
          >
            ログアウト
          </AdButton>
        </div>
      )}

      {/* 開発者モード */}
      <div>
        <div style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, marginTop: isGuest ? 16 : 0 }}>
          開発者
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: theme.textPrimary }}>デバッグコンソール</span>
          <AdButton
            onClick={() => {
              if (!dockviewApi) return;
              const existing = dockviewApi.getPanel('debugConsole');
              if (existing) {
                existing.api.setActive();
              } else {
                let targetGroup = dockviewApi.activeGroup;
                if (targetGroup?.panels.some(p => p.id === 'board')) {
                  targetGroup = dockviewApi.groups.find(g => !g.panels.some(p => p.id === 'board')) ?? undefined;
                }
                if (targetGroup) {
                  dockviewApi.addPanel({ id: 'debugConsole', component: 'debugConsole', title: 'Debug Console', position: { referenceGroup: targetGroup, direction: 'within' } });
                }
              }
            }}
          >
            {dockviewApi?.getPanel('debugConsole') ? '表示中' : '表示する'}
          </AdButton>
        </div>
      </div>
    </div>
  );
}

export function SettingsModal({
  initialSection = 'room',
  room,
  onSaveRoom,
  onDeleteRoom,
  dockviewApi,
  can,
  profile,
  onSaveProfile,
  isGuest,
  onSignOut,
  onClose,
}: SettingsModalProps) {
  const [section, setSection] = useState<SettingsSection>(initialSection);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        className="adrastea-root"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '440px',
          background: theme.bgSurface,
          border: `1px solid ${theme.border}`,
          boxShadow: theme.shadowLg,
          display: 'flex',
          zIndex: 9999,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* サイドバー */}
        <div
          style={{
            width: '160px',
            background: theme.bgSurface,
            borderRight: `1px solid ${theme.border}`,
            position: 'relative',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '16px 12px 8px',
              fontSize: '11px',
              color: theme.textMuted,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            設定
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => setSection(item.key)}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  display: 'block',
                  background:
                    section === item.key ? theme.bgElevated : 'transparent',
                  color:
                    section === item.key ? theme.textPrimary : theme.textSecondary,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* 閉じるボタン */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'transparent',
              border: 'none',
              color: theme.textMuted,
              cursor: 'pointer',
              fontSize: '16px',
              lineHeight: 1,
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="閉じる"
          >
            <X size={16} />
          </button>
        </div>

        {/* コンテンツエリア */}
        <div
          style={{
            flex: 1,
            background: theme.bgElevated,
            overflowY: 'auto',
            padding: '20px 24px',
          }}
        >
          {section === 'room' && (
            <RoomSettingsSection
              room={room}
              onSaveRoom={onSaveRoom}
              onDeleteRoom={onDeleteRoom}
              onClose={onClose}
            />
          )}
          {section === 'layout' && (
            <LayoutSection
              dockviewApi={dockviewApi}
              can={can}
              onClose={onClose}
            />
          )}
          {section === 'user' && (
            <UserSection
              profile={profile}
              onSaveProfile={onSaveProfile}
              isGuest={isGuest}
              onSignOut={onSignOut}
              onClose={onClose}
              dockviewApi={dockviewApi}
            />
          )}
        </div>
      </div>
    </div>
  );
}
