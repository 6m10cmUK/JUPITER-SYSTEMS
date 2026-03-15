import { useState, useEffect } from 'react';
import type { Room } from '../../types/adrastea.types';
import type { DockviewApi } from 'dockview';
import type { PermissionKey } from '../../config/permissions';
import { AdButton, AdInput, AdTextArea } from './ui';
import { DiceSystemPicker } from './ui/DiceSystemPicker';
import { theme } from '../../styles/theme';
import { X } from 'lucide-react';
import { AssetPicker } from './AssetPicker';
import { getAvailableSystems } from '../../services/diceRoller';
import { getSavedLayouts, addLayout, deleteLayout, setGmDefault, setPlDefault, getGmDefaultId, getPlDefaultId, validateForPl } from '../../services/layoutStorage';

type SettingsSection = 'room' | 'layout' | 'user' | 'members';

interface SettingsModalProps {
  initialSection?: SettingsSection;
  room: Room;
  onSaveRoom: (updates: { name?: string; description?: string; dice_system?: string; default_login_role?: 'sub_owner' | 'user' | 'guest'; default_guest_role?: 'sub_owner' | 'user' | 'guest' }) => void;
  onDeleteRoom: () => void;
  dockviewApi: DockviewApi | null;
  can: (permission: PermissionKey) => boolean;
  profile: { display_name?: string; avatar_url?: string | null } | null;
  onSaveProfile: (data: { display_name: string; avatar_url: string | null }) => Promise<void>;
  isGuest: boolean;
  onSignOut: () => void;
  onClose: () => void;
  isOwner: boolean;
  members: Array<{ user_id: string; role: string; joined_at: number; display_name: string | null; avatar_url: string | null }>;
  onAssignRole: (targetUserId: string, role: 'sub_owner' | 'user' | 'guest') => void;
}

interface PanelDef {
  id: string;
  component: string;
  title: string;
  permission: PermissionKey;
  disabled?: boolean;
}

const PANEL_DEFS: PanelDef[] = [
  { id: 'character', component: 'character', title: 'キャラクター', permission: 'panel_character' },
  { id: 'chatLog', component: 'chatLog', title: 'チャットログ', permission: 'panel_chat' },
  { id: 'chatInput', component: 'chatInput', title: 'チャット入力', permission: 'panel_chat' },
  { id: 'chatPalette', component: 'chatPalette', title: 'チャットパレット', permission: 'panel_chat' },
  { id: 'status', component: 'status', title: 'ステータス', permission: 'panel_status' },
  { id: 'property', component: 'property', title: 'プロパティ', permission: 'panel_property' },
  { id: 'pdfViewer', component: 'pdfViewer', title: 'PDF', permission: 'panel_pdfViewer' },
  { id: 'scene', component: 'scene', title: 'シーン', permission: 'panel_scene' },
  { id: 'layer', component: 'layer', title: 'レイヤー', permission: 'panel_layer' },
  { id: 'bgm', component: 'bgm', title: 'BGM', permission: 'panel_bgm' },
  { id: 'scenarioText', component: 'scenarioText', title: 'テキスト (開発中)', permission: 'panel_scenarioText', disabled: true },
  { id: 'cutin', component: 'cutin', title: 'カットイン (開発中)', permission: 'panel_cutin', disabled: true },
];

const NAV_ITEMS: Array<{ key: SettingsSection; label: string }> = [
  { key: 'room', label: 'ルーム設定' },
  { key: 'layout', label: 'レイアウト' },
  { key: 'user', label: 'ユーザー' },
  { key: 'members', label: 'メンバー管理' },
];

function RoomSettingsSection({
  room,
  onSaveRoom,
  onDeleteRoom,
  onClose,
  isOwner,
  systems,
}: {
  room: Room;
  onSaveRoom: (updates: { name?: string; description?: string; dice_system?: string; default_login_role?: 'sub_owner' | 'user' | 'guest'; default_guest_role?: 'sub_owner' | 'user' | 'guest' }) => void;
  onDeleteRoom: () => void;
  onClose: () => void;
  isOwner: boolean;
  systems: { id: string; name: string }[];
}) {
  const [roomName, setRoomName] = useState(room.name);
  const [description, setDescription] = useState('');
  const [diceSystem, setDiceSystem] = useState(room.dice_system);
  const [defaultLoginRole, setDefaultLoginRole] = useState<'sub_owner' | 'user' | 'guest'>(room.default_login_role as 'sub_owner' | 'user' | 'guest' ?? 'user');
  const [defaultGuestRole, setDefaultGuestRole] = useState<'sub_owner' | 'user' | 'guest'>(room.default_guest_role as 'sub_owner' | 'user' | 'guest' ?? 'guest');

  const handleSave = () => {
    onSaveRoom({
      name: roomName,
      description,
      dice_system: diceSystem,
      ...(isOwner && {
        default_login_role: defaultLoginRole,
        default_guest_role: defaultGuestRole,
      }),
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
      <DiceSystemPicker
        value={diceSystem}
        onChange={setDiceSystem}
        systems={systems}
      />
      {isOwner && (
        <>
          <div style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 8 }}>
            デフォルトロール
          </div>
          <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 6 }}>
            新しく参加するユーザーに自動で付与されるロール
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>ログインユーザー</div>
              <select
                value={defaultLoginRole}
                onChange={(e) => setDefaultLoginRole(e.target.value as 'sub_owner' | 'user' | 'guest')}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: 12,
                  background: theme.bgSurface,
                  color: theme.textPrimary,
                  border: `1px solid ${theme.border}`,
                  outline: 'none',
                }}
              >
                <option value="sub_owner">サブオーナー</option>
                <option value="user">ユーザー</option>
                <option value="guest">ゲスト</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>ゲスト</div>
              <select
                value={defaultGuestRole}
                onChange={(e) => setDefaultGuestRole(e.target.value as 'sub_owner' | 'user' | 'guest')}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: 12,
                  background: theme.bgSurface,
                  color: theme.textPrimary,
                  border: `1px solid ${theme.border}`,
                  outline: 'none',
                }}
              >
                <option value="sub_owner">サブオーナー</option>
                <option value="user">ユーザー</option>
                <option value="guest">ゲスト</option>
              </select>
            </div>
          </div>
        </>
      )}
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
  const [, forceUpdate] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [layouts, setLayouts] = useState(() => getSavedLayouts());
  const [gmDefaultId, setGmDefaultIdState] = useState(() => getGmDefaultId());
  const [plDefaultId, setPlDefaultIdState] = useState(() => getPlDefaultId());
  const [newLayoutName, setNewLayoutName] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);

  const togglePanel = (panelId: string, component: string, title: string) => {
    if (!dockviewApi) return;
    const existing = dockviewApi.getPanel(panelId);
    if (existing) {
      dockviewApi.removePanel(existing);
    } else {
      dockviewApi.addPanel({
        id: panelId,
        component,
        title,
        floating: true,
      });
    }
    forceUpdate((n) => n + 1);
  };

  const filteredPanels = PANEL_DEFS.filter((p) => can(p.permission));

  // ユーザー権限とサブオーナー以上で分ける
  const userPanels = filteredPanels.filter((p) =>
    ['panel_board', 'panel_character', 'panel_chat', 'panel_status', 'panel_property', 'panel_pdfViewer'].includes(p.permission)
  );
  const subOwnerPanels = filteredPanels.filter((p) =>
    ['panel_scene', 'panel_layer', 'panel_bgm', 'panel_scenarioText', 'panel_cutin'].includes(p.permission)
  );

  const sectionHeaderStyle = {
    fontSize: '11px',
    color: theme.textMuted,
    marginBottom: '8px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  };

  const renderPanelRow = (p: PanelDef) => {
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
          opacity: p.disabled ? 0.4 : 1,
        }}
      >
        <span style={{ fontSize: '12px', color: p.disabled ? theme.textMuted : theme.textPrimary }}>
          {p.title}
        </span>
        <AdButton
          onClick={() => togglePanel(p.id, p.component, p.title)}
          style={{ fontSize: '11px' }}
          disabled={p.disabled}
        >
          {exists ? '非表示' : '表示する'}
        </AdButton>
      </div>
    );
  };

  return (
    <div>
      {userPanels.length > 0 && (
        <>
          <div style={sectionHeaderStyle}>パネル</div>
          <div>{userPanels.map(renderPanelRow)}</div>
        </>
      )}
      {subOwnerPanels.length > 0 && (
        <>
          <div style={{ ...sectionHeaderStyle, marginTop: '16px' }}>管理者パネル</div>
          <div>{subOwnerPanels.map(renderPanelRow)}</div>
        </>
      )}
      {/* 保存済みレイアウト */}
      <div style={{ ...sectionHeaderStyle, marginTop: '16px' }}>保存済みレイアウト</div>
      <div style={{ padding: '6px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {layouts.length === 0 && (
          <div style={{ fontSize: '11px', color: theme.textMuted }}>保存済みレイアウトはありません</div>
        )}
        {layouts.map((l) => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
            <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {l.name}
            </div>
            {/* タグ表示 */}
            {gmDefaultId === l.id && (
              <span style={{ fontSize: '10px', padding: '1px 4px', borderRadius: '3px', background: theme.accent, color: theme.bgDeep }}>GM</span>
            )}
            {plDefaultId === l.id && (
              <span style={{ fontSize: '10px', padding: '1px 4px', borderRadius: '3px', background: theme.success, color: theme.bgDeep }}>PL</span>
            )}
            {/* GMタグ付け/解除 */}
            <AdButton
              onClick={() => {
                const newId = gmDefaultId === l.id ? null : l.id;
                setGmDefault(newId);
                setGmDefaultIdState(newId);
                setTagError(null);
              }}
              style={{ fontSize: '10px', padding: '2px 6px' }}
            >
              {gmDefaultId === l.id ? 'GM解除' : 'GM'}
            </AdButton>
            {/* PLタグ付け/解除 */}
            <AdButton
              onClick={() => {
                if (plDefaultId === l.id) {
                  // 解除
                  setPlDefault(null);
                  setPlDefaultIdState(null);
                  setTagError(null);
                } else {
                  // バリデーション
                  const violations = validateForPl(l.layout);
                  if (violations.length > 0) {
                    setTagError(`PLデフォルトに設定できません: ${violations.join('、')} はPL権限では使用できないパネルです`);
                    setTimeout(() => setTagError(null), 5000);
                    return;
                  }
                  setPlDefault(l.id);
                  setPlDefaultIdState(l.id);
                  setTagError(null);
                }
              }}
              style={{ fontSize: '10px', padding: '2px 6px' }}
            >
              {plDefaultId === l.id ? 'PL解除' : 'PL'}
            </AdButton>
            {/* 適用 */}
            <AdButton
              onClick={() => {
                if (!dockviewApi) return;
                try {
                  dockviewApi.fromJSON(l.layout as Parameters<typeof dockviewApi.fromJSON>[0]);
                  forceUpdate((c) => c + 1);
                } catch {
                  setTagError('レイアウトの適用に失敗しました');
                  setTimeout(() => setTagError(null), 5000);
                }
              }}
              style={{ fontSize: '10px', padding: '2px 6px' }}
            >
              適用
            </AdButton>
            {/* 削除 */}
            <AdButton
              onClick={() => {
                deleteLayout(l.id);
                setLayouts(getSavedLayouts());
                if (gmDefaultId === l.id) setGmDefaultIdState(null);
                if (plDefaultId === l.id) setPlDefaultIdState(null);
              }}
              style={{ fontSize: '10px', padding: '2px 6px', color: theme.danger }}
            >
              削除
            </AdButton>
          </div>
        ))}
        {tagError && (
          <div style={{ fontSize: '11px', color: theme.danger }}>{tagError}</div>
        )}
        {/* 新規保存 */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
          <input
            type="text"
            value={newLayoutName}
            onChange={(e) => setNewLayoutName(e.target.value)}
            placeholder="レイアウト名"
            style={{
              flex: 1,
              fontSize: '11px',
              padding: '4px 6px',
              background: theme.bgInput,
              color: theme.textPrimary,
              border: `1px solid ${theme.border}`,
              borderRadius: '4px',
              outline: 'none',
            }}
          />
          <AdButton
            onClick={() => {
              if (!dockviewApi || !newLayoutName.trim()) return;
              addLayout(newLayoutName.trim(), dockviewApi.toJSON());
              setLayouts(getSavedLayouts());
              setNewLayoutName('');
            }}
            style={{ fontSize: '11px', flexShrink: 0 }}
          >
            保存
          </AdButton>
        </div>
      </div>
      {/* レイアウトエクスポート */}
      <div style={{ ...sectionHeaderStyle, marginTop: '16px' }}>レイアウト操作</div>
      <div style={{ padding: '6px 0' }}>
        <AdButton
          onClick={() => {
            if (!dockviewApi) return;
            const json = JSON.stringify(dockviewApi.toJSON(), null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `adrastea-layout-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          style={{ fontSize: '11px' }}
        >
          レイアウトをエクスポート
        </AdButton>
        <AdButton
          onClick={() => {
            if (!dockviewApi) return;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const layout = JSON.parse(reader.result as string);
                  dockviewApi.fromJSON(layout);
                  forceUpdate((c) => c + 1);
                } catch (err) {
                  setImportError('読み込みに失敗しました。正しいJSONファイルか確認してください。');
                  setTimeout(() => setImportError(null), 5000);
                }
              };
              reader.readAsText(file);
            };
            input.click();
          }}
          style={{ fontSize: '11px', marginTop: '4px' }}
        >
          レイアウトをインポート
        </AdButton>
        {importError && (
          <div style={{ fontSize: '11px', color: theme.danger, marginTop: '4px' }}>{importError}</div>
        )}
      </div>
    </div>
  );
}

function MembersSection({
  members,
  onAssignRole,
}: {
  members: Array<{ user_id: string; role: string; joined_at: number; display_name: string | null; avatar_url: string | null }>;
  onAssignRole: (targetUserId: string, role: 'sub_owner' | 'user' | 'guest') => void;
}) {
  return (
    <div>
      <div style={{
        fontSize: 11,
        color: theme.textMuted,
        marginBottom: 8,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        メンバー一覧
      </div>
      <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 8 }}>
        オーナーのロールは変更できません
      </div>
      {members.length === 0 ? (
        <div style={{ color: theme.textMuted, fontSize: 12 }}>メンバーがいません</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {members.map((m) => (
            <div
              key={m.user_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 0',
                borderBottom: `1px solid ${theme.borderSubtle}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                {m.avatar_url ? (
                  <img
                    src={m.avatar_url}
                    style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    draggable={false}
                  />
                ) : (
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', background: theme.border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: theme.textMuted, flexShrink: 0,
                  }}>
                    {(m.display_name ?? '?').charAt(0)}
                  </div>
                )}
                <span style={{ fontSize: 12, color: theme.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.display_name ?? m.user_id}
                </span>
              </div>
              {m.role === 'owner' ? (
                <span style={{ fontSize: 11, color: theme.textMuted, padding: '2px 8px' }}>オーナー</span>
              ) : (
                <select
                  value={m.role}
                  onChange={(e) => onAssignRole(m.user_id, e.target.value as 'sub_owner' | 'user' | 'guest')}
                  style={{
                    padding: '4px 6px',
                    fontSize: 11,
                    background: theme.bgSurface,
                    color: theme.textPrimary,
                    border: `1px solid ${theme.border}`,
                    outline: 'none',
                  }}
                >
                  <option value="sub_owner">サブオーナー</option>
                  <option value="user">ユーザー</option>
                  <option value="guest">ゲスト</option>
                </select>
              )}
            </div>
          ))}
        </div>
      )}
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
  isOwner,
  members,
  onAssignRole,
}: SettingsModalProps) {
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const [diceSystems, setDiceSystems] = useState<{id:string;name:string}[]>([]);

  useEffect(() => {
    getAvailableSystems().then(setDiceSystems).catch(console.error);
  }, []);

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
            {NAV_ITEMS.filter(item => item.key !== 'members' || isOwner).map((item) => (
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
              isOwner={isOwner}
              systems={diceSystems}
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
          {section === 'members' && (
            <MembersSection
              members={members}
              onAssignRole={onAssignRole}
            />
          )}
        </div>
      </div>
    </div>
  );
}
