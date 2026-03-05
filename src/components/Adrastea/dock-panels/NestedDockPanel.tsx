import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from 'flexlayout-react';
import { theme } from '../../../styles/theme';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { panelComponents } from './sharedComponents';

/** マウスがこの要素上にあるかチェック */
function isMouseOverElement(el: Element, mouseX: number, mouseY: number) {
  const rect = el.getBoundingClientRect();
  return mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom;
}

const nestedDefaultJson: IJsonModel = {
  global: {
    tabEnableClose: true,
    tabSetEnableMaximize: true,
    tabSetEnableDrop: true,
    tabSetEnableDrag: true,
    tabSetEnableDivide: true,
    splitterSize: 4,
    tabSetMinWidth: 80,
    tabSetMinHeight: 80,
  },
  layout: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'tabset',
        weight: 100,
        children: [],
      },
    ],
  },
};

function nestedFactory(node: TabNode) {
  const component = node.getComponent();
  if (!component) return null;

  if (component === 'nestedDock') {
    return <div style={{ padding: 8, color: '#888' }}>ネストの再帰はできません</div>;
  }

  const Component = panelComponents[component];
  return Component ? <Component /> : <div>Unknown: {component}</div>;
}

export function NestedDockPanel() {
  const { setNestedDockModel, flexModel } = useAdrasteaContext();
  const layoutRef = useRef<Layout>(null);
  const model = useMemo(() => Model.fromJson(nestedDefaultJson), []);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tabId: string; tabName: string; component: string } | null>(null);
  const [outerDragging, setOuterDragging] = useState(false);
  const [dropHover, setDropHover] = useState(false);

  useEffect(() => {
    setNestedDockModel(model);
    return () => setNestedDockModel(null);
  }, [model, setNestedDockModel]);

  const rootRef = useRef<HTMLDivElement>(null);

  // 外側Layoutのドラッグ検知 + マウスがネストDock上にいるかでhover表示
  useEffect(() => {
    let dragging = false;
    const observer = new MutationObserver(() => {
      const nowDragging = document.querySelector('.flexlayout__outline_rect') !== null;
      if (nowDragging !== dragging) {
        dragging = nowDragging;
        setOuterDragging(dragging);
        if (!dragging) setDropHover(false);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // ドラッグ中にマウスがネストDock上にいるかをリアルタイムで追跡
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging || !rootRef.current) return;
      setDropHover(isMouseOverElement(rootRef.current, e.clientX, e.clientY));
    };
    window.addEventListener('mousemove', onMouseMove, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('mousemove', onMouseMove, true);
    };
  }, []);

  const onModelChange = useCallback((_model: Model, _action: Action) => {}, []);

  const onContextMenu = useCallback(
    (node: TabNode | TabSetNode | BorderNode, event: React.MouseEvent) => {
      if (node instanceof TabNode) {
        event.preventDefault();
        event.stopPropagation();
        setCtxMenu({
          x: event.clientX,
          y: event.clientY,
          tabId: node.getId(),
          tabName: node.getName(),
          component: node.getComponent() ?? '',
        });
      }
    },
    [],
  );

  const handleMoveToOuter = useCallback(() => {
    if (!ctxMenu || !flexModel) return;
    const { tabId, tabName, component } = ctxMenu;
    model.doAction(Actions.deleteTab(tabId));
    const boardTabsetId = flexModel.getNodeById('board')?.getParent()?.getId();
    const activeId = flexModel.getActiveTabset()?.getId();
    let targetId = activeId !== boardTabsetId ? activeId : undefined;
    if (!targetId) {
      flexModel.visitNodes((node) => {
        if (!targetId && node.getType() === 'tabset' && node.getId() !== boardTabsetId) {
          targetId = node.getId();
        }
      });
    }
    if (targetId) {
      flexModel.doAction(
        Actions.addNode(
          { type: 'tab', id: tabId, name: tabName, component },
          targetId,
          DockLocation.CENTER,
          -1,
        ),
      );
    }
    setCtxMenu(null);
  }, [model, flexModel, ctxMenu]);

  return (
    <div
      ref={rootRef}
      data-nested-dock
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <Layout
        model={model}
        factory={nestedFactory}
        ref={layoutRef}
        onModelChange={onModelChange}
        onContextMenu={onContextMenu}
        supportsPopout={false}
      />
      {/* ドラッグ中の視覚フィードバック（pointerEvents: noneでflexlayoutのドロップ処理を邪魔しない） */}
      {outerDragging && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: dropHover ? 'rgba(74, 144, 217, 0.25)' : 'rgba(74, 144, 217, 0.08)',
            border: `2px dashed ${dropHover ? theme.accent : theme.border}`,
            zIndex: 50,
            pointerEvents: 'none',
            transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          <span style={{
            color: dropHover ? theme.accent : theme.textSecondary,
            fontSize: '13px',
            fontWeight: 600,
          }}>
            ここにドロップして追加
          </span>
        </div>
      )}
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
            <button
              onClick={handleMoveToOuter}
              style={{
                display: 'block', width: '100%', padding: '4px 12px',
                background: 'transparent', color: theme.textPrimary,
                border: 'none', textAlign: 'left', fontSize: '11px', cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgSurface; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              外側に戻す
            </button>
          </div>
        </>
      )}
    </div>
  );
}
