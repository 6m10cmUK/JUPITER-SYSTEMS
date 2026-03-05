import React, { useCallback, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
  type IDockviewPanelHeaderProps,
} from 'dockview-react';
import '../../styles/dockview-catppuccin.css';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { theme } from '../../styles/theme';

import { BoardDockPanel } from './dock-panels/BoardDockPanel';
import { ChatDockPanel } from './dock-panels/ChatDockPanel';
import { SceneDockPanel } from './dock-panels/SceneDockPanel';
import { CharacterDockPanel } from './dock-panels/CharacterDockPanel';
import { ScenarioTextDockPanel } from './dock-panels/ScenarioTextDockPanel';
import { CutinDockPanel } from './dock-panels/CutinDockPanel';
import { LayerDockPanel } from './dock-panels/LayerDockPanel';
import { PropertyDockPanel } from './dock-panels/PropertyDockPanel';

/* ── カスタムタブ: 右クリックメニュー付き ── */
function CustomTab(props: IDockviewPanelHeaderProps) {
  const [title, setTitle] = useState(props.api.title);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const tabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = props.api.onDidTitleChange((e) => setTitle(e.title));
    return () => d.dispose();
  }, [props.api]);

  // DOM直接でcontextmenuを拾う（dockviewのイベント処理を確実にバイパス）
  useEffect(() => {
    const el = tabRef.current;
    if (!el) return;
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setMenu({ x: e.clientX, y: e.clientY });
    };
    el.addEventListener('contextmenu', handler, true);
    return () => el.removeEventListener('contextmenu', handler, true);
  }, []);

  // .adrastea-root をportal先として取得
  const portalTarget = document.querySelector('.adrastea-root') ?? document.body;

  const closeMenu = useCallback(() => setMenu(null), []);

  const handleFloat = useCallback(() => {
    setMenu(null);
    const panel = props.containerApi.getPanel(props.api.id);
    if (panel && panel.api.location.type !== 'floating') {
      props.containerApi.addFloatingGroup(panel);
    }
  }, [props.api.id, props.containerApi]);

  const handleClose = useCallback(() => {
    setMenu(null);
    props.api.close();
  }, [props.api]);

  const isFloating = props.api.location.type === 'floating';

  const menuItemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '4px 12px',
    background: 'transparent',
    color: theme.textPrimary,
    border: 'none',
    textAlign: 'left',
    fontSize: '11px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  return (
    <>
      <div
        ref={tabRef}
        className="dv-default-tab"
        onPointerDown={props.onPointerDown}
        onPointerUp={props.onPointerUp}
        onPointerLeave={props.onPointerLeave}
      >
        <span className="dv-default-tab-content">{title}</span>
        <div
          className="dv-default-tab-action"
          onPointerDown={(e) => e.preventDefault()}
          onClick={(e) => { e.preventDefault(); props.api.close(); }}
        >
          <svg width="11" height="11" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M2.24 0L0 2.24 11.76 14 0 25.76 2.24 28 14 16.24 25.76 28 28 25.76 16.24 14 28 2.24 25.76 0 14 11.76 2.24 0z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
      {menu && createPortal(
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
            onClick={closeMenu}
            onContextMenu={(e) => { e.preventDefault(); closeMenu(); }}
          />
          <div
            style={{
              position: 'fixed',
              left: menu.x,
              top: menu.y,
              zIndex: 9999,
              background: theme.bgBase,
              border: `1px solid ${theme.border}`,
              padding: '4px 0',
              minWidth: 140,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <button
              style={{
                ...menuItemStyle,
                ...(isFloating ? { color: theme.textMuted, cursor: 'default' } : {}),
              }}
              onClick={handleFloat}
              disabled={isFloating}
              onMouseEnter={(e) => { if (!isFloating) e.currentTarget.style.background = theme.bgInput; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              フローティングにする
            </button>
            <button
              style={{ ...menuItemStyle, color: theme.danger }}
              onClick={handleClose}
              onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgInput; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              閉じる
            </button>
          </div>
        </>,
        portalTarget,
      )}
    </>
  );
}

const LAYOUT_STORAGE_KEY = 'adrastea-dock-layout';
const LAYOUT_VERSION = 7;

const components: Record<string, React.FC<IDockviewPanelProps>> = {
  board: BoardDockPanel,
  chat: ChatDockPanel,
  scene: SceneDockPanel,
  character: CharacterDockPanel,
  scenarioText: ScenarioTextDockPanel,
  cutin: CutinDockPanel,
  layer: LayerDockPanel,
  property: PropertyDockPanel,
};

function applyDefaultLayout(api: DockviewApi) {
  // グリッド: Board（メイン） + Chat（右サイド）
  const boardPanel = api.addPanel({
    id: 'board',
    component: 'board',
    title: 'Board',
  });

  api.addPanel({
    id: 'chat',
    component: 'chat',
    title: 'チャット',
    position: { referencePanel: boardPanel, direction: 'right' },
  });

  // Chatグループの幅設定
  const chatPanel = api.getPanel('chat');
  if (chatPanel?.group) {
    api.getGroup(chatPanel.group.id)?.api.setSize({ width: 280 });
  }

  // フローティング: シーン・キャラクター・テキスト・カットイン（タブグループ）
  const scenePanel = api.addPanel({
    id: 'scene',
    component: 'scene',
    title: 'シーン',
    floating: { width: 200, height: 300, x: 10, y: 10 },
  });

  api.addPanel({
    id: 'character',
    component: 'character',
    title: 'キャラクター',
    position: { referencePanel: scenePanel },
  });

  api.addPanel({
    id: 'scenarioText',
    component: 'scenarioText',
    title: 'テキスト',
    position: { referencePanel: scenePanel },
  });

  api.addPanel({
    id: 'cutin',
    component: 'cutin',
    title: 'カットイン',
    position: { referencePanel: scenePanel },
  });

  // フローティング: レイヤー
  api.addPanel({
    id: 'layer',
    component: 'layer',
    title: 'レイヤー',
    floating: { width: 200, height: 250, x: 10, y: 320 },
  });

  // フローティング: プロパティ（右側、Chatの左に配置）
  const container = api.element;
  const containerWidth = container?.getBoundingClientRect().width ?? 1200;
  api.addPanel({
    id: 'property',
    component: 'property',
    title: 'プロパティ',
    floating: {
      width: 260,
      height: 400,
      x: containerWidth - 280 - 260 - 10,
      y: 10,
    },
  });
}

function isLayoutValid(layout: unknown): boolean {
  if (!layout || typeof layout !== 'object') return false;
  const l = layout as Record<string, unknown>;
  if (l._version !== LAYOUT_VERSION) return false;
  return true;
}

export function DockLayout() {
  const { setDockviewApi } = useAdrasteaContext();
  const disposableRef = useRef<{ dispose: () => void } | null>(null);

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      setDockviewApi(event.api);

      // レイアウト復元を試みる
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (saved) {
        try {
          const wrapper = JSON.parse(saved);
          if (isLayoutValid(wrapper)) {
            event.api.fromJSON(wrapper.layout);

            // auto-saveリスナー登録
            disposableRef.current?.dispose();
            disposableRef.current = event.api.onDidLayoutChange(() => {
              saveLayout(event.api);
            });
            return;
          }
          localStorage.removeItem(LAYOUT_STORAGE_KEY);
        } catch {
          localStorage.removeItem(LAYOUT_STORAGE_KEY);
        }
      }

      // デフォルトレイアウトを適用
      applyDefaultLayout(event.api);

      // auto-saveリスナー登録
      disposableRef.current?.dispose();
      disposableRef.current = event.api.onDidLayoutChange(() => {
        saveLayout(event.api);
      });
    },
    [setDockviewApi],
  );

  return (
    <DockviewReact
      components={components}
      defaultTabComponent={CustomTab}
      onReady={onReady}
      className="dockview-theme-catppuccin"
    />
  );
}

function saveLayout(api: DockviewApi) {
  try {
    const layout = api.toJSON();
    const wrapper = { _version: LAYOUT_VERSION, layout };
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(wrapper));
  } catch {
    // ignore serialization errors
  }
}
