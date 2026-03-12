import React, { useCallback, useMemo, useEffect, useRef, memo } from 'react';
import {
  DockviewReact,
  DockviewDefaultTab,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
  type IDockviewPanelHeaderProps,
  type DockviewApi,
  type IDockviewHeaderActionsProps,
  type DockviewTheme,
} from 'dockview';
import 'dockview/dist/styles/dockview.css';
import '../../styles/dockview-catppuccin.css';
import { PictureInPicture2, Minus, Maximize2, ArrowDownToLine } from 'lucide-react';
import { theme } from '../../styles/theme';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { usePermission } from '../../hooks/usePermission';
import { panelComponents } from './dock-panels/sharedComponents';
import { BgmEngine } from './BgmEngine';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { ZoomBar } from './ZoomBar';

/* ── レイアウト保存/復元 ── */

const catppuccinTheme: DockviewTheme = {
  name: 'catppuccin',
  className: 'dockview-theme-catppuccin',
};

const LAYOUT_VERSION = 3;

function layoutKey(role: string): string {
  return `adrastea-dock-layout-${role}`;
}

/* ── Board 専用タブ（閉じるボタンなし） ── */

const BoardTab: React.FunctionComponent<IDockviewPanelHeaderProps> = (props) => {
  return <DockviewDefaultTab {...props} hideClose />;
};

function saveLayout(api: DockviewApi, role: string) {
  try {
    localStorage.setItem(
      layoutKey(role),
      JSON.stringify({
        _version: LAYOUT_VERSION,
        layout: api.toJSON(),
      }),
    );
  } catch { /* ignore */ }
}

function loadLayout(role: string): object | null {
  const saved = localStorage.getItem(layoutKey(role));
  if (!saved) return null;
  try {
    const wrapper = JSON.parse(saved);
    if (wrapper._version === LAYOUT_VERSION) {
      return wrapper.layout;
    }
  } catch { /* ignore */ }
  return null;
}

/* ── タブヘッダー右側アクション ── */

const iconBtnStyle: React.CSSProperties = {
  width: 20, height: 20,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none',
  color: theme.textSecondary, cursor: 'pointer', padding: 0,
};

// 最小化状態の管理（グループID → 元の高さ）
const minimizedGroups = new Map<string, number>();
const TAB_BAR_HEIGHT = 35;

function RightHeaderActions({ containerApi, group }: IDockviewHeaderActionsProps) {
  const { boardRef } = useAdrasteaContext();
  const [isMinimized, setIsMinimized] = React.useState(() => minimizedGroups.has(group.id));

  const activePanel = group.activePanel;
  if (!activePanel) return null;

  const hasBoardPanel = group.panels.some((p) => p.id === 'board');
  const isFloating = group.api.location.type === 'floating';

  // フローティング時に親コンテナに半透明クラスを付与
  useEffect(() => {
    const el = (group.header as any)?.element?.closest('.dv-resize-container') as HTMLElement | null;
    if (!el) return;
    if (isFloating) {
      el.classList.add('dv-floating-translucent');
    } else {
      el.classList.remove('dv-floating-translucent');
    }
  }, [isFloating, (group.header as any)?.element]);

  const handleMinimize = useCallback(() => {
    const container = (group.header as any)?.element?.closest('.dv-resize-container') as HTMLElement | null;
    if (!container) return;
    minimizedGroups.set(group.id, container.offsetHeight);
    container.style.height = `${TAB_BAR_HEIGHT}px`;
    container.style.minHeight = `${TAB_BAR_HEIGHT}px`;
    container.style.overflow = 'hidden';
    setIsMinimized(true);
  }, [group]);

  const handleRestore = useCallback(() => {
    const savedHeight = minimizedGroups.get(group.id);
    const container = (group.header as any)?.element?.closest('.dv-resize-container') as HTMLElement | null;
    minimizedGroups.delete(group.id);
    if (container && savedHeight) {
      container.style.height = `${savedHeight}px`;
      container.style.minHeight = '';
      container.style.overflow = '';
    }
    setIsMinimized(false);
  }, [group]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: '100%', paddingRight: 4 }}>
      {/* board がアクティブなら ZoomBar */}
      {hasBoardPanel && activePanel.id === 'board' && (
        <ZoomBar boardRef={boardRef} />
      )}

      {/* フローティング時: ドックに戻す / 最小化/復元 */}
      {isFloating && (
        <>
          <button title="ドックに戻す" onClick={() => {
            // 最小化状態をリセットしてからドックに移動
            if (minimizedGroups.has(group.id)) {
              const container = (group.header as any)?.element?.closest('.dv-resize-container') as HTMLElement | null;
              if (container) {
                container.style.height = '';
                container.style.minHeight = '';
                container.style.overflow = '';
              }
              minimizedGroups.delete(group.id);
            }
            group.api.moveTo({});
          }} style={iconBtnStyle}>
            <ArrowDownToLine size={11} />
          </button>
          {isMinimized ? (
            <button title="復元" onClick={handleRestore} style={iconBtnStyle}>
              <Maximize2 size={11} />
            </button>
          ) : (
            <button title="最小化" onClick={handleMinimize} style={iconBtnStyle}>
              <Minus size={11} />
            </button>
          )}
        </>
      )}

      {/* フロート（既にフロート中なら非表示） */}
      {!isFloating && (
        <button title="フロートにする" onClick={() => containerApi.addFloatingGroup(activePanel)} style={iconBtnStyle}>
          <PictureInPicture2 size={11} />
        </button>
      )}
    </div>
  );
}

/* ── DockviewInner（memo で Context 変更による再レンダリングを防止） ── */

const DockviewInner = memo(function DockviewInner({
  onApiReady,
  role,
}: {
  onApiReady: (api: DockviewApi) => void;
  role: string;
}) {
  const dockviewComponents = useMemo(() => {
    const comps: Record<string, React.FunctionComponent<IDockviewPanelProps>> = {};
    for (const [key, Comp] of Object.entries(panelComponents)) {
      comps[key] = () => (
        <ErrorBoundary>
          <Comp />
        </ErrorBoundary>
      );
    }
    return comps;
  }, []);

  const apiRef = useRef<DockviewApi | null>(null);

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      const api = event.api;
      apiRef.current = api;
      onApiReady(api);

      // 保存済みレイアウトの復元を試みる
      const saved = loadLayout(role);
      if (saved) {
        try {
          api.fromJSON(saved as Parameters<DockviewApi['fromJSON']>[0]);
          return;
        } catch { /* フォールスルー: デフォルトレイアウトを構築 */ }
      }

      // ロール別デフォルトレイアウト構築
      if (role === 'owner' || role === 'sub_owner') {
        // owner / sub_owner: 全パネル構成（Board | Chat, Scene | BGM | Board, Property, Layer）
        api.addPanel({ id: 'board', component: 'board', title: 'Board', tabComponent: 'boardTab' });
        api.addPanel({
          id: 'chat', component: 'chat', title: 'チャット',
          position: { referencePanel: 'board', direction: 'right' },
        });
        api.addPanel({
          id: 'chatPalette', component: 'chatPalette', title: 'チャットパレット',
          position: { referencePanel: 'chat', direction: 'below' },
        });
        const scenePanel = api.addPanel({
          id: 'scene', component: 'scene', title: 'シーン',
          position: { referencePanel: 'board', direction: 'left' },
        });

        const bgmPanel = api.addPanel({
          id: 'bgm', component: 'bgm', title: 'BGM',
          position: { referencePanel: 'scene', direction: 'right' },
        });
        api.addPanel({
          id: 'property', component: 'property', title: 'プロパティ',
          position: { referencePanel: bgmPanel.id, direction: 'below' },
        });
        api.addPanel({
          id: 'layer', component: 'layer', title: 'レイヤー',
          position: { referencePanel: 'property', direction: 'below' },
        });

        scenePanel.api.setSize({ width: window.innerWidth * 0.1 });
        bgmPanel.api.setSize({ width: window.innerWidth * 0.13 });
        api.getPanel('board')?.api.setSize({ width: window.innerWidth * 0.52 });
      } else if (role === 'user') {
        // user: シーン・キャラクター・チャット・ボード
        api.addPanel({ id: 'board', component: 'board', title: 'Board', tabComponent: 'boardTab' });
        api.addPanel({
          id: 'chat', component: 'chat', title: 'チャット',
          position: { referencePanel: 'board', direction: 'right' },
        });
        api.addPanel({
          id: 'chatPalette', component: 'chatPalette', title: 'チャットパレット',
          position: { referencePanel: 'chat', direction: 'below' },
        });
        const scenePanel = api.addPanel({
          id: 'scene', component: 'scene', title: 'シーン',
          position: { referencePanel: 'board', direction: 'left' },
        });
        api.addPanel({
          id: 'character', component: 'character', title: 'キャラクター',
          position: { referencePanel: 'scene', direction: 'below' },
        });

        scenePanel.api.setSize({ width: window.innerWidth * 0.12 });
        api.getPanel('board')?.api.setSize({ width: window.innerWidth * 0.6 });
      } else if (role === 'guest') {
        // guest: ボード・チャットのみ
        api.addPanel({ id: 'board', component: 'board', title: 'Board', tabComponent: 'boardTab' });
        api.addPanel({
          id: 'chat', component: 'chat', title: 'チャット',
          position: { referencePanel: 'board', direction: 'right' },
        });

        api.getPanel('board')?.api.setSize({ width: window.innerWidth * 0.75 });
      }
    },
    [onApiReady, role],
  );

  // レイアウト変更時に自動保存（debounce で連続変更をまとめる）
  const roleRef = useRef(role);
  roleRef.current = role;
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    let timer: ReturnType<typeof setTimeout>;
    const disposable = api.onDidLayoutChange(() => {
      clearTimeout(timer);
      timer = setTimeout(() => saveLayout(api, roleRef.current), 300);
    });
    return () => { clearTimeout(timer); disposable.dispose(); };
  }, []);

  return (
    <DockviewReact
      components={dockviewComponents}
      tabComponents={{ boardTab: BoardTab }}
      onReady={onReady}
      theme={catppuccinTheme}
      rightHeaderActionsComponent={RightHeaderActions}
    />
  );
});

/* ── DockLayout ── */

export function DockLayout() {
  const { setDockviewApi } = useAdrasteaContext();
  const { roomRole } = usePermission();

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <BgmEngine />
      <DockviewInner onApiReady={setDockviewApi} role={roomRole} />
    </div>
  );
}
