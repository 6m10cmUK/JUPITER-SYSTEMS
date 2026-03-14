import React, { memo, useCallback, useEffect, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { DockviewApi, DockviewGroupPanel } from 'dockview';
import { COLLAPSED_WIDTH, collapsedColumns } from './dock-panels/dockColumnState';

const HEADER_HEIGHT = 20;

interface ColumnInfo {
  leftKey: number;
  left: number;
  width: number;
  groupIds: string[];
  name: string;
}

function detectColumns(api: DockviewApi, containerRect: DOMRect): ColumnInfo[] {
  const map = new Map<number, { groups: DockviewGroupPanel[]; rect: DOMRect }>();

  api.groups.forEach((g) => {
    if (g.api.location.type === 'floating') return;
    if (g.panels.some((p) => p.id === 'board')) return;
    const rect = g.element.getBoundingClientRect();
    if (rect.width === 0) return;
    const key = Math.round(rect.left - containerRect.left);
    if (!map.has(key)) map.set(key, { groups: [], rect });
    map.get(key)!.groups.push(g);
  });

  return Array.from(map.entries()).map(([leftKey, { groups, rect }]) => {
    const sorted = [...groups].sort((a, b) =>
      a.element.getBoundingClientRect().top - b.element.getBoundingClientRect().top
    );
    return {
      leftKey,
      left: leftKey,
      width: rect.width,
      groupIds: groups.map((g) => g.id),
      name: sorted[0].panels[0]?.title ?? '',
    };
  });
}

interface ColumnHeaderBarProps {
  api: DockviewApi | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const ColumnHeaderBar = memo(function ColumnHeaderBar({ api, containerRef }: ColumnHeaderBarProps) {
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set());

  const recalculate = useCallback(() => {
    if (!api || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    setColumns(detectColumns(api, containerRect));
  }, [api, containerRef]);

  useEffect(() => {
    if (!api) return;
    const disposable = api.onDidLayoutChange(() => {
      requestAnimationFrame(() => recalculate());
    });
    // 初回
    requestAnimationFrame(() => requestAnimationFrame(() => recalculate()));
    return () => disposable.dispose();
  }, [api, recalculate]);

  const handleCollapse = useCallback((col: ColumnInfo) => {
    if (!api) return;
    col.groupIds.forEach((id) => {
      const g = api.groups.find((g) => g.id === id);
      if (!g) return;
      collapsedColumns.set(id, g.width);
      (g.api as any).setConstraints({ minimumWidth: COLLAPSED_WIDTH, maximumWidth: COLLAPSED_WIDTH });
      g.api.setSize({ width: COLLAPSED_WIDTH });
    });
    setCollapsedGroupIds((prev) => new Set([...prev, ...col.groupIds]));
  }, [api]);

  const handleExpand = useCallback((col: ColumnInfo) => {
    if (!api) return;
    col.groupIds.forEach((id) => {
      const g = api.groups.find((g) => g.id === id);
      const savedWidth = collapsedColumns.get(id);
      if (!g || !savedWidth) return;
      collapsedColumns.delete(id);
      (g.api as any).setConstraints({ maximumWidth: savedWidth });
      g.api.setSize({ width: savedWidth });
    });
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      col.groupIds.forEach((id) => next.delete(id));
      return next;
    });
  }, [api]);

  if (!api || columns.length === 0) return null;

  return (
    <div
      className="ad-column-header-bar"
      style={{ position: 'relative', height: HEADER_HEIGHT, flexShrink: 0 }}
    >
      {columns.map((col) => {
        const isCollapsed = col.groupIds.every((id) => collapsedGroupIds.has(id));
        return (
          <div
            key={col.leftKey}
            className="ad-column-header-item"
            style={{ position: 'absolute', left: col.left, width: col.width, height: '100%' }}
          >
            <span style={{
              fontSize: 10,
              color: 'var(--ad-text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              paddingLeft: 6,
            }}>
              {col.name}
            </span>
            <button
              className="ad-btn ad-btn--ghost"
              type="button"
              onClick={() => isCollapsed ? handleExpand(col) : handleCollapse(col)}
              style={{ width: 20, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {isCollapsed ? <PanelLeftOpen size={11} /> : <PanelLeftClose size={11} />}
            </button>
          </div>
        );
      })}
    </div>
  );
});
