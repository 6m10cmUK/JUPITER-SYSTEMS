import React, { useEffect } from 'react';
import { MockAdrasteaProvider } from '../contexts/MockAdrasteaProvider';
import { DockLayout } from '../components/Adrastea/DockLayout';
import { TopToolbar } from '../components/Adrastea/TopToolbar';
import { SettingsModal } from '../components/Adrastea/SettingsModal';
import { CutinOverlay } from '../components/Adrastea/CutinOverlay';
import { ToastContainer } from '../components/Adrastea/ui/Toast';
import { useAdrasteaContext } from '../contexts/AdrasteaContext';
import { usePermission } from '../hooks/usePermission';
import { usePasteHandler } from '../hooks/usePasteHandler';
import { pasteSceneFromClipboard } from '../utils/clipboardImport';
import { theme } from '../styles/theme';

function AdrasteaDemoRoom() {
  const ctx = useAdrasteaContext();
  const { can } = usePermission();
  const isOwner = ctx.roomRole === 'owner';

  usePasteHandler({
    addCharacter: (data) => ctx.addCharacter({ ...data, owner_id: ctx.user?.uid ?? '' }),
    addObject: async (data) => {
      const targetSort = data.sort_order ?? ctx.activeObjects.length;
      const shifts = ctx.activeObjects
        .filter(o => o.sort_order >= targetSort)
        .map(o => ({ id: o.id, sort: o.sort_order + 1 }));
      if (shifts.length > 0) await ctx.batchUpdateSort(shifts);
      return ctx.addObject({ ...data, sort_order: targetSort, scene_ids: ctx.activeScene ? [ctx.activeScene.id] : [] });
    },
    addScene: (data) => pasteSceneFromClipboard(data, ctx),
    addBgm: (data) => ctx.addBgm({ ...data, scene_ids: ctx.activeScene ? [ctx.activeScene.id] : [], auto_play_scene_ids: ctx.activeScene ? [ctx.activeScene.id] : [] }),
    showToast: ctx.showToast,
  });

  const handleAddPiece = React.useCallback((label: string, color: string) => {
    const center = ctx.getBoardCenter();
    const px = center.x * 50;
    const py = center.y * 50;
    ctx.addPiece(label, color, px, py);
  }, [ctx.getBoardCenter, ctx.addPiece]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: theme.bgBase,
        display: 'flex',
        flexDirection: 'column',
      }}
      className="adrastea-root"
    >
      <TopToolbar
        onAddPiece={handleAddPiece}
        onOpenSettings={() => ctx.setShowSettings(true, 'room')}
        onOpenProfile={() => ctx.setShowSettings(true, 'user')}
        onOpenLayout={() => ctx.setShowSettings(true, 'layout')}
        onSignOut={() => {
          ctx.showToast('ログアウト機能はデモ環境では無効です', 'error');
        }}
        activeScene={ctx.activeScene}
        profile={ctx.profile}
        dockviewApi={ctx.dockviewApi}
        roomName={ctx.room?.name}
      />

      <div style={{ flex: 1, position: 'relative', zIndex: 0 }}>
        <DockLayout />
      </div>

      {ctx.scenarioTexts.filter((t) => t.visible).map((text) => (
        <div
          key={text.id}
          style={{
            position: 'absolute',
            bottom: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 18,
            background: 'rgba(255,255,255,0.95)',
            border: `1px solid ${theme.border}`,
            borderRadius: 0,
            padding: '16px 24px',
            maxWidth: '600px',
            maxHeight: '200px',
            overflowY: 'auto',
            color: theme.textPrimary,
          }}
        >
          {text.title && (
            <div
              style={{
                fontWeight: 600,
                fontSize: '0.9rem',
                marginBottom: '6px',
                color: theme.warning,
              }}
            >
              {text.title}
            </div>
          )}
          <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {text.content}
          </div>
        </div>
      ))}

      <CutinOverlay
        cutins={ctx.cutins}
        activeCutin={ctx.room?.active_cutin ?? null}
        onCutinEnd={ctx.clearCutin}
      />

      {ctx.showSettings && ctx.room && (
        <SettingsModal
          initialSection={ctx.settingsSection}
          room={ctx.room}
          onSaveRoom={(updates) => {
            ctx.updateRoom(updates);
            ctx.showToast('設定を保存しました', 'success');
          }}
          onDeleteRoom={() => {
            ctx.showToast('デモ環境ではルーム削除はサポートされていません', 'error');
          }}
          dockviewApi={ctx.dockviewApi}
          can={can}
          profile={ctx.profile}
          onSaveProfile={async (data) => {
            await ctx.updateProfile(data);
            ctx.showToast('プロフィールを保存しました', 'success');
          }}
          isOwner={isOwner}
          members={[]}
          onAssignRole={() => {
            ctx.showToast('デモ環境ではメンバー管理はサポートされていません', 'error');
          }}
          onSignOut={() => {
            ctx.showToast('ログアウト機能はデモ環境では無効です', 'error');
          }}
          onClose={() => ctx.setShowSettings(false)}
        />
      )}

      <ToastContainer toasts={ctx.toasts} />
    </div>
  );
}

export default function AdrasteaDemo() {
  useEffect(() => {
    document.title = 'Adrastea Demo';
  }, []);

  return (
    <MockAdrasteaProvider>
      <AdrasteaDemoRoom />
    </MockAdrasteaProvider>
  );
}
