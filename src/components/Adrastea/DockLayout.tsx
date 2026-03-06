import { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import {
  Layout,
  Model,
  Actions,
  TabNode,
  TabSetNode,
  BorderNode,
  DockLocation,
  type IJsonModel,
  type Action,
  type ITabSetRenderValues,
} from 'flexlayout-react';
import { X, Maximize2, Minimize2, PictureInPicture2, Maximize, Minimize } from 'lucide-react';
import { theme } from '../../styles/theme';
import 'flexlayout-react/style/dark.css';
import '../../styles/flexlayout-catppuccin.css';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { panelComponents } from './dock-panels/sharedComponents';
import { BgmEngine } from './BgmEngine';

/* ── レイアウト保存/復元 ── */

const LAYOUT_STORAGE_KEY = 'adrastea-flex-layout';
const LAYOUT_VERSION = 12;

const defaultJson: IJsonModel = {
  global: {
    tabEnableClose: false,
    tabSetEnableMaximize: false,
    tabSetEnableDrop: true,
    tabSetEnableDrag: true,
    tabSetEnableDivide: true,
    splitterSize: 4,
    tabSetMinWidth: 100,
    tabSetMinHeight: 100,
  },
  layout: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'tabset',
        weight: 70,
        enableDrop: false,
        enableClose: false,
        children: [
          {
            type: 'tab',
            id: 'board',
            name: 'Board',
            component: 'board',
            enableClose: false,
          },
        ],
      },
      {
        type: 'tabset',
        weight: 30,
        children: [
          { type: 'tab', id: 'chat', name: 'チャット', component: 'chat' },
          { type: 'tab', id: 'scene', name: 'シーン', component: 'scene' },
          { type: 'tab', id: 'character', name: 'キャラクター', component: 'character' },
          { type: 'tab', id: 'scenarioText', name: 'テキスト', component: 'scenarioText' },
          { type: 'tab', id: 'cutin', name: 'カットイン', component: 'cutin' },
          { type: 'tab', id: 'layer', name: 'レイヤー', component: 'layer' },
          { type: 'tab', id: 'property', name: 'プロパティ', component: 'property' },
        ],
      },
    ],
  },
};

function loadLayout(): Model {
  const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
  if (saved) {
    try {
      const wrapper = JSON.parse(saved);
      if (wrapper._version === LAYOUT_VERSION) {
        return Model.fromJson(wrapper.layout);
      }
    } catch { /* ignore */ }
  }
  return Model.fromJson(defaultJson);
}

function saveLayout(model: Model) {
  try {
    localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({
        _version: LAYOUT_VERSION,
        layout: model.toJson(),
      }),
    );
  } catch { /* ignore */ }
}

/* ── factory ── */

function factory(node: TabNode) {
  const component = node.getComponent();
  if (!component) return null;

  const Component = panelComponents[component];
  return Component ? <Component /> : <div>Unknown: {component}</div>;
}

/* ── フローティングパネル ── */

interface FloatingPanel {
  id: string;
  component: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
}

const MIN_WIDTH = 200;
const MIN_HEIGHT = 120;

function FloatingPanelWindow({
  panel,
  onUpdate,
  onDock,
  onClose,
  onFocus,
  zIndex,
}: {
  panel: FloatingPanel;
  onUpdate: (id: string, patch: Partial<FloatingPanel>) => void;
  onDock: (id: string) => void;
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  zIndex: number;
}) {
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const Component = panelComponents[panel.component];

  // ドラッグ
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onFocus(panel.id);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: panel.x, origY: panel.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      onUpdate(panel.id, { x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panel.id, panel.x, panel.y, onUpdate, onFocus]);

  // リサイズ
  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus(panel.id);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origW: panel.width, origH: panel.height };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dw = ev.clientX - resizeRef.current.startX;
      const dh = ev.clientY - resizeRef.current.startY;
      onUpdate(panel.id, {
        width: Math.max(MIN_WIDTH, resizeRef.current.origW + dw),
        height: Math.max(MIN_HEIGHT, resizeRef.current.origH + dh),
      });
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [panel.id, panel.width, panel.height, onUpdate, onFocus]);

  return (
    <div
      style={{
        position: 'absolute',
        left: panel.x,
        top: panel.y,
        width: panel.width,
        height: panel.minimized ? 28 : panel.height,
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        background: theme.bgBase,
        border: `1px solid ${theme.border}`,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
      onMouseDown={() => onFocus(panel.id)}
    >
      {/* タイトルバー */}
      <div
        onMouseDown={onDragStart}
        style={{
          height: 28,
          minHeight: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 4px 0 8px',
          background: theme.bgToolbar,
          borderBottom: panel.minimized ? 'none' : `1px solid ${theme.border}`,
          cursor: 'move',
          userSelect: 'none',
        }}
      >
        <span style={{ flex: 1, fontSize: '11px', color: theme.textPrimary, fontWeight: 600 }}>
          {panel.title}
        </span>
        {/* 最小化 */}
        <button
          onClick={(e) => { e.stopPropagation(); onUpdate(panel.id, { minimized: !panel.minimized }); }}
          title={panel.minimized ? '復元' : '最小化'}
          style={{
            width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', color: theme.textSecondary, cursor: 'pointer', padding: 0,
          }}
        >
          {panel.minimized ? <Maximize2 size={10} /> : <Minimize2 size={10} />}
        </button>
        {/* ドッキング */}
        <button
          onClick={(e) => { e.stopPropagation(); onDock(panel.id); }}
          title="ドッキング"
          style={{
            width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', color: theme.accent, cursor: 'pointer',
            padding: 0, fontSize: '10px', fontWeight: 700,
          }}
        >
          ⊞
        </button>
        {/* 閉じる */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(panel.id); }}
          title="閉じる"
          style={{
            width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', color: theme.danger, cursor: 'pointer', padding: 0,
          }}
        >
          <X size={12} />
        </button>
      </div>
      {/* コンテンツ */}
      {!panel.minimized && (
        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {Component ? <Component /> : <div>Unknown: {panel.component}</div>}
        </div>
      )}
      {/* リサイズハンドル */}
      {!panel.minimized && (
        <div
          onMouseDown={onResizeStart}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 12,
            height: 12,
            cursor: 'nwse-resize',
          }}
        />
      )}
    </div>
  );
}

/* ── DockLayout ── */

export function DockLayout() {
  const { setFlexModel, setFlexLayoutRef, nestedDockModel } = useAdrasteaContext();
  const layoutRef = useRef<Layout>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tabId: string; tabName: string; component: string } | null>(null);
  const [floatingPanels, setFloatingPanels] = useState<FloatingPanel[]>([]);
  const [focusOrder, setFocusOrder] = useState<string[]>([]);

  const model = useMemo(() => loadLayout(), []);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setFlexModel(model);
    setFlexLayoutRef(layoutRef);
  }, [model]);

  // マウス位置を常時追跡（onAction時にネストDock判定に使う）
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMove, true);
    return () => window.removeEventListener('mousemove', onMove, true);
  }, []);

  // boardの親tabsetに常にenableDrop:falseを維持する（ドラッグ移動で新tabsetが生成された場合のフォロー）
  const ensureBoardTabsetNoDrop = useCallback(() => {
    const boardNode = model.getNodeById('board');
    if (!boardNode) return;
    const parent = boardNode.getParent();
    if (parent && parent.getType() === 'tabset') {
      const tabset = parent as TabSetNode;
      if (tabset.isEnableDrop() !== false) {
        model.doAction(Actions.updateNodeAttributes(tabset.getId(), { enableDrop: false }));
      }
    }
  }, [model]);

  // 初回 + モデル変更時にboardのtabsetを保護
  useEffect(() => {
    ensureBoardTabsetNoDrop();
  }, [ensureBoardTabsetNoDrop]);

  const onAction = useCallback((action: Action): Action | undefined => {
    if (action.type === Actions.MOVE_NODE) {
      // boardタブセットへのタブ合流（center）はブロック、分割ドッキング（left/right/top/bottom）は許可
      const fromNodeId = action.data.fromNode;
      const toNode = action.data.toNode;
      const location = action.data.location;
      const boardTabsetId = model.getNodeById('board')?.getParent()?.getId();

      // boardタブセットに他タブがcenterで合流するのをブロック
      if (toNode === boardTabsetId && location === 'center' && fromNodeId !== 'board') {
        return undefined;
      }
      // boardが他タブセットにcenterで合流するのをブロック（split移動は許可）
      if (fromNodeId === 'board' && location === 'center' && toNode !== boardTabsetId) {
        return undefined;
      }

      // ネストDockへのD&D転送
      if (nestedDockModel) {
        const nestedEl = document.querySelector('[data-nested-dock]');
        if (nestedEl) {
          const rect = nestedEl.getBoundingClientRect();
          const { x, y } = lastMousePos.current;
          if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            const fromNodeId = action.data.fromNode;
            const node = model.getNodeById(fromNodeId);
            if (node instanceof TabNode && fromNodeId !== 'board' && node.getComponent() !== 'nestedDock') {
              const tabName = node.getName();
              const component = node.getComponent() ?? '';
              model.doAction(Actions.deleteTab(fromNodeId));
              let targetId: string | undefined;
              nestedDockModel.visitNodes((n) => {
                if (!targetId && n.getType() === 'tabset') {
                  targetId = n.getId();
                }
              });
              if (targetId) {
                nestedDockModel.doAction(
                  Actions.addNode(
                    { type: 'tab', id: fromNodeId, name: tabName, component },
                    targetId,
                    DockLocation.CENTER,
                    -1,
                  ),
                );
              }
              return undefined;
            }
          }
        }
      }
    }
    return action;
  }, [model, nestedDockModel]);

  const onModelChange = useCallback((_model: Model, _action: Action) => {
    saveLayout(_model);
    // boardが別tabsetに移動した場合、新tabsetにもenableDrop:falseを適用
    ensureBoardTabsetNoDrop();
  }, [ensureBoardTabsetNoDrop]);

  const onContextMenu = useCallback(
    (node: TabNode | TabSetNode | BorderNode, event: React.MouseEvent) => {
      if (node instanceof TabNode) {
        event.preventDefault();
        event.stopPropagation();
        const tab = node as TabNode;
        if (tab.getId() === 'board') return;
        setCtxMenu({
          x: event.clientX,
          y: event.clientY,
          tabId: tab.getId(),
          tabName: tab.getName(),
          component: tab.getComponent() ?? '',
        });
      }
    },
    [],
  );

  const doFloat = useCallback((tab: TabNode) => {
    const tabId = tab.getId();
    const tabName = tab.getName();
    const component = tab.getComponent() ?? '';
    const rect = tab.getRect();
    model.doAction(Actions.deleteTab(tabId));
    setFloatingPanels((prev) => [...prev, {
      id: tabId, component, title: tabName,
      x: rect.x + 40, y: rect.y + 40,
      width: Math.max(MIN_WIDTH, rect.width * 0.6),
      height: Math.max(MIN_HEIGHT, rect.height * 0.6),
      minimized: false,
    }]);
    setFocusOrder((prev) => [...prev, tabId]);
  }, [model]);

  const onRenderTabSet = useCallback(
    (tabSetNode: TabSetNode | BorderNode, renderValues: ITabSetRenderValues) => {
      if (tabSetNode instanceof TabSetNode) {
        const selectedNode = tabSetNode.getSelectedNode();
        if (selectedNode instanceof TabNode && selectedNode.getId() !== 'board') {
          const isMaximized = tabSetNode.isMaximized();
          // [フロート] [最大化] [閉じる] の順
          renderValues.buttons.push(
            <button
              key="float-tab"
              title="フロートにする"
              onClick={() => doFloat(selectedNode)}
              className="flexlayout__tab_toolbar_button"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: theme.textSecondary, cursor: 'pointer',
              }}
            >
              <PictureInPicture2 size={11} />
            </button>,
            <button
              key="maximize-tab"
              title={isMaximized ? '元に戻す' : '最大化'}
              onClick={() => model.doAction(Actions.maximizeToggle(tabSetNode.getId()))}
              className="flexlayout__tab_toolbar_button"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: theme.textSecondary, cursor: 'pointer',
              }}
            >
              {isMaximized ? <Minimize size={11} /> : <Maximize size={11} />}
            </button>,
            <button
              key="close-tab"
              title="パネルを閉じる"
              onClick={() => model.doAction(Actions.deleteTab(selectedNode.getId()))}
              className="flexlayout__tab_toolbar_button"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: theme.textSecondary, cursor: 'pointer',
              }}
            >
              <X size={11} />
            </button>,
          );
        }
      }
    },
    [model, doFloat],
  );

  const handleFloatFromCtx = useCallback(() => {
    if (!ctxMenu) return;
    const node = model.getNodeById(ctxMenu.tabId);
    if (node instanceof TabNode) doFloat(node);
    setCtxMenu(null);
  }, [model, ctxMenu, doFloat]);

  const handleCloseFromCtx = useCallback(() => {
    if (!ctxMenu) return;
    model.doAction(Actions.deleteTab(ctxMenu.tabId));
    setCtxMenu(null);
  }, [model, ctxMenu]);

  const handleMoveToNested = useCallback(() => {
    if (!ctxMenu || !nestedDockModel) return;
    const { tabId, tabName, component } = ctxMenu;
    // 外側から削除
    model.doAction(Actions.deleteTab(tabId));
    // ネストDockに追加
    let targetId: string | undefined;
    nestedDockModel.visitNodes((node) => {
      if (!targetId && node.getType() === 'tabset') {
        targetId = node.getId();
      }
    });
    if (targetId) {
      nestedDockModel.doAction(
        Actions.addNode(
          { type: 'tab', id: tabId, name: tabName, component },
          targetId,
          DockLocation.CENTER,
          -1,
        ),
      );
    }
    setCtxMenu(null);
  }, [model, nestedDockModel, ctxMenu]);

  const handleDock = useCallback((id: string) => {
    const panel = floatingPanels.find((p) => p.id === id);
    if (!panel) return;
    // フローティングから削除
    setFloatingPanels((prev) => prev.filter((p) => p.id !== id));
    setFocusOrder((prev) => prev.filter((pid) => pid !== id));
    // flexlayoutに戻す（boardタブセットは除外）
    const boardTabsetId = model.getNodeById('board')?.getParent()?.getId();
    const activeId = model.getActiveTabset()?.getId();
    let targetId = activeId !== boardTabsetId ? activeId : undefined;
    if (!targetId) {
      model.visitNodes((node) => {
        if (!targetId && node.getType() === 'tabset' && node.getId() !== boardTabsetId) {
          targetId = node.getId();
        }
      });
    }
    if (targetId) {
      model.doAction(
        Actions.addNode(
          { type: 'tab', id: panel.id, name: panel.title, component: panel.component },
          targetId,
          DockLocation.CENTER,
          -1,
        ),
      );
    }
  }, [model, floatingPanels]);

  const handleCloseFloating = useCallback((id: string) => {
    setFloatingPanels((prev) => prev.filter((p) => p.id !== id));
    setFocusOrder((prev) => prev.filter((pid) => pid !== id));
  }, []);

  const handleUpdateFloating = useCallback((id: string, patch: Partial<FloatingPanel>) => {
    setFloatingPanels((prev) => prev.map((p) => p.id === id ? { ...p, ...patch } : p));
  }, []);

  const handleFocusFloating = useCallback((id: string) => {
    setFocusOrder((prev) => {
      const filtered = prev.filter((pid) => pid !== id);
      return [...filtered, id];
    });
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <BgmEngine />
      <Layout
        model={model}
        factory={factory}
        ref={layoutRef}
        onAction={onAction}
        onModelChange={onModelChange}
        onContextMenu={onContextMenu}
        onRenderTabSet={onRenderTabSet}
        supportsPopout={false}
      />

      {/* フローティングパネル */}
      {floatingPanels.map((panel) => (
        <FloatingPanelWindow
          key={panel.id}
          panel={panel}
          onUpdate={handleUpdateFloating}
          onDock={handleDock}
          onClose={handleCloseFloating}
          onFocus={handleFocusFloating}
          zIndex={100 + focusOrder.indexOf(panel.id)}
        />
      ))}

      {/* 右クリックメニュー */}
      {ctxMenu && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setCtxMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }}
          />
          <div
            style={{
              position: 'fixed',
              left: ctxMenu.x,
              top: ctxMenu.y,
              zIndex: 1000,
              background: theme.bgBase,
              border: `1px solid ${theme.border}`,
              padding: '4px 0',
              minWidth: 140,
            }}
          >
            <CtxMenuItem label="フロートにする" color={theme.textPrimary} onClick={handleFloatFromCtx} />
            {nestedDockModel && ctxMenu.component !== 'nestedDock' && (
              <CtxMenuItem label="ネストDockに移動" color={theme.textPrimary} onClick={handleMoveToNested} />
            )}
            <CtxMenuItem label="パネルを閉じる" color={theme.danger} onClick={handleCloseFromCtx} />
          </div>
        </>
      )}
    </div>
  );
}

function CtxMenuItem({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        padding: '4px 12px',
        background: 'transparent',
        color,
        border: 'none',
        textAlign: 'left',
        fontSize: '11px',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgSurface; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {label}
    </button>
  );
}
