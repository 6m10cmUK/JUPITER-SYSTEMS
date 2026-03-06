import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import type { BoardObject, BoardObjectType, BoardObjectScope } from '../../types/adrastea.types';
import { theme } from '../../styles/theme';
import {
  Image, Type, Layers, Mountain,
  Eye, EyeOff,
  Plus, Trash2,
} from 'lucide-react';
import { SortableListPanel, SortableListItem } from './ui';

const TYPE_ICON_COMPONENTS: Record<BoardObjectType, React.FC<{ size?: number }>> = {
  panel: ({ size = 14 }) => <Image size={size} />,
  text: ({ size = 14 }) => <Type size={size} />,
  foreground: ({ size = 14 }) => <Layers size={size} />,
  background: ({ size = 14 }) => <Mountain size={size} />,
};

export function LayerPanel() {
  const {
    mergedObjects,
    roomObjects,
    addObject,
    updateObject,
    removeObject,
    batchUpdateSort,
    editingObjectId,
    setEditingObjectId,
    selectedObjectIds,
    setSelectedObjectIds,
    setEditingObjectScope,
    clearAllEditing,
    getBoardCenter,
  } = useAdrasteaContext();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [localOrderOverride, setLocalOrderOverride] = useState<Map<string, number> | null>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const getScope = useCallback((id: string): BoardObjectScope => {
    return roomObjects.some((o) => o.id === id) ? 'room' : 'scene';
  }, [roomObjects]);

  // Firestoreからデータが更新されたらローカルオーバーライドをクリア
  const mergedObjectsRef = useRef(mergedObjects);
  useEffect(() => {
    if (mergedObjects !== mergedObjectsRef.current) {
      mergedObjectsRef.current = mergedObjects;
      setLocalOrderOverride(null);
    }
  }, [mergedObjects]);

  // 背景を末尾に固定。それ以外はsort_order降順
  const sortedObjects = useMemo(() => {
    const bg = mergedObjects.filter(o => o.type === 'background');
    const rest = mergedObjects.filter(o => o.type !== 'background').map(o => {
      if (localOrderOverride?.has(o.id)) {
        return { ...o, sort_order: localOrderOverride.get(o.id)! };
      }
      return o;
    });
    return [...rest.sort((a, b) => b.sort_order - a.sort_order), ...bg];
  }, [mergedObjects, localOrderOverride]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveDragId(id);
    if (!selectedObjectIds.includes(id)) {
      setSelectedObjectIds([id]);
      setEditingObjectScope(getScope(id));
      setEditingObjectId(id);
    }
  }, [selectedObjectIds, setSelectedObjectIds, setEditingObjectScope, setEditingObjectId, getScope]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const dragIds = selectedObjectIds.includes(activeId) && selectedObjectIds.length > 1
      ? selectedObjectIds
      : [activeId];
    const dragSet = new Set(dragIds);

    if (dragSet.has(overId)) return;

    const nonBg = sortedObjects.filter(o => o.type !== 'background');
    const draggedItems = nonBg.filter(o => dragSet.has(o.id));
    const rest = nonBg.filter(o => !dragSet.has(o.id));

    const overIdx = rest.findIndex(o => o.id === overId);
    if (overIdx < 0) return;

    const activeOrigIdx = nonBg.findIndex(o => o.id === activeId);
    const overOrigIdx = nonBg.findIndex(o => o.id === overId);
    const insertIdx = activeOrigIdx < overOrigIdx ? overIdx + 1 : overIdx;

    rest.splice(insertIdx, 0, ...draggedItems);

    // グローバルなsort_orderを振り直す（リスト表示は降順なので末尾ほどsort_order大=前面）
    const maxOrder = rest.length - 1;
    const overrideMap = new Map<string, number>();
    rest.forEach((o, i) => overrideMap.set(o.id, maxOrder - i));
    setLocalOrderOverride(overrideMap);

    // スコープごとにバッチ更新
    const roomUpdates: { id: string; sort: number }[] = [];
    const sceneUpdates: { id: string; sort: number }[] = [];
    rest.forEach((o, i) => {
      const newOrder = maxOrder - i;
      if (o.sort_order !== newOrder) {
        const scope = getScope(o.id);
        if (scope === 'room') {
          roomUpdates.push({ id: o.id, sort: newOrder });
        } else {
          sceneUpdates.push({ id: o.id, sort: newOrder });
        }
      }
    });
    if (roomUpdates.length > 0) batchUpdateSort('room', roomUpdates);
    if (sceneUpdates.length > 0) batchUpdateSort('scene', sceneUpdates);
  }, [selectedObjectIds, sortedObjects, getScope, batchUpdateSort]);

  const handleRowClick = useCallback((e: React.MouseEvent, obj: BoardObject) => {
    const scope = getScope(obj.id);
    if (e.shiftKey && selectedObjectIds.length > 0) {
      const lastSelected = selectedObjectIds[selectedObjectIds.length - 1];
      const anchorIdx = sortedObjects.findIndex(o => o.id === lastSelected);
      const targetIdx = sortedObjects.findIndex(o => o.id === obj.id);
      if (anchorIdx >= 0 && targetIdx >= 0) {
        const start = Math.min(anchorIdx, targetIdx);
        const end = Math.max(anchorIdx, targetIdx);
        const rangeIds = sortedObjects.slice(start, end + 1).map(o => o.id);
        setSelectedObjectIds(rangeIds);
        setEditingObjectScope(scope);
        setEditingObjectId(obj.id);
      }
    } else if (e.metaKey || e.ctrlKey) {
      setSelectedObjectIds(prev => {
        const exists = prev.includes(obj.id);
        return exists ? prev.filter(id => id !== obj.id) : [...prev, obj.id];
      });
      setEditingObjectScope(scope);
      setEditingObjectId(obj.id);
    } else {
      clearAllEditing();
      setSelectedObjectIds([obj.id]);
      setEditingObjectScope(scope);
      setEditingObjectId(obj.id);
    }
  }, [getScope, selectedObjectIds, sortedObjects, setSelectedObjectIds, setEditingObjectScope, setEditingObjectId, clearAllEditing]);

  const handleAdd = (scope: BoardObjectScope, type: BoardObjectType) => {
    setMenuOpen(false);
    const center = getBoardCenter();
    const nonBg = sortedObjects.filter(o => o.type !== 'background');
    let sortOrder: number;
    if (editingObjectId) {
      const selected = nonBg.find(o => o.id === editingObjectId);
      sortOrder = selected ? selected.sort_order + 1 : (nonBg.length > 0 ? nonBg[0].sort_order + 1 : 0);
    } else {
      sortOrder = nonBg.length > 0 ? nonBg[0].sort_order + 1 : 0;
    }
    addObject(scope, { type, name: `新規${type}`, x: center.x, y: center.y, sort_order: sortOrder });
  };

  const handleToggleVisible = useCallback((obj: BoardObject) => {
    if (selectedObjectIds.length > 1 && selectedObjectIds.includes(obj.id)) {
      const newVisible = !obj.visible;
      for (const id of selectedObjectIds) {
        const o = mergedObjects.find(o => o.id === id);
        if (o) updateObject(getScope(id), id, { visible: newVisible });
      }
    } else {
      updateObject(getScope(obj.id), obj.id, { visible: !obj.visible });
    }
  }, [selectedObjectIds, mergedObjects, getScope, updateObject]);

  const handleRemoveObject = useCallback((obj: BoardObject) => {
    if (obj.type === 'background') return;
    const count = selectedObjectIds.length > 1 && selectedObjectIds.includes(obj.id) ? selectedObjectIds.filter(id => { const o = mergedObjects.find(o => o.id === id); return o && o.type !== 'background'; }).length : 1;
    const msg = count > 1 ? `${count}件のオブジェクトを削除しますか？` : 'このオブジェクトを削除しますか？';
    if (!window.confirm(msg)) return;
    if (selectedObjectIds.length > 1 && selectedObjectIds.includes(obj.id)) {
      for (const id of selectedObjectIds) {
        const o = mergedObjects.find(o => o.id === id);
        if (o && o.type !== 'background') {
          removeObject(getScope(id), id);
        }
      }
      clearAllEditing();
    } else {
      removeObject(getScope(obj.id), obj.id);
      if (editingObjectId === obj.id) clearAllEditing();
    }
  }, [selectedObjectIds, mergedObjects, getScope, removeObject, editingObjectId, clearAllEditing]);

  const iconBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: theme.textSecondary,
    cursor: 'pointer',
    fontSize: '0.85rem',
    padding: '2px 4px',
    lineHeight: 1,
  };

  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: 0,
    background: theme.bgSurface,
    border: `1px solid ${theme.border}`,
    zIndex: 100,
    minWidth: '180px',
    boxShadow: theme.shadowMd,
  };

  const menuGroupStyle: React.CSSProperties = {
    padding: '4px 10px',
    fontSize: '11px',
    color: theme.textMuted,
    borderBottom: `1px solid ${theme.border}`,
  };

  const menuItemStyle: React.CSSProperties = {
    padding: '6px 14px',
    fontSize: '12px',
    color: theme.textPrimary,
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    display: 'block',
  };

  return (
    <SortableListPanel
      title="レイヤー"
      headerActions={
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              ...iconBtnStyle,
              color: theme.textPrimary,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Plus size={18} />
          </button>
          {menuOpen && (
            <div style={menuStyle}>
              <div style={menuGroupStyle}>シーンオブジェクト</div>
              <button style={{ ...menuItemStyle, display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleAdd('scene', 'panel')}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgInput; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              ><Image size={14} /> パネル</button>
              <button style={{ ...menuItemStyle, display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleAdd('scene', 'text')}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgInput; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              ><Type size={14} /> テキスト</button>
              <div style={{ ...menuGroupStyle, borderTop: `1px solid ${theme.border}` }}>ルームオブジェクト</div>
              <button style={{ ...menuItemStyle, display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleAdd('room', 'panel')}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgInput; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              ><Image size={14} /> パネル</button>
              <button style={{ ...menuItemStyle, display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => handleAdd('room', 'text')}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgInput; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              ><Type size={14} /> テキスト</button>
            </div>
          )}
        </div>
      }
      items={sortedObjects}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      emptyMessage="オブジェクトがありません"
    >
      {sortedObjects.map((obj) => {
        const isSelected = selectedObjectIds.includes(obj.id);
        const isDragGroupMember = activeDragId != null
          && selectedObjectIds.includes(activeDragId)
          && isSelected
          && obj.id !== activeDragId;
        const scope = getScope(obj.id);
        const iconBgColor = scope === 'scene' ? theme.accentHighlight : 'rgba(166,227,161,0.2)';

        return (
          <SortableListItem
            key={obj.id}
            id={obj.id}
            disabled={obj.type === 'background'}
            isSelected={isSelected}
            isGroupDrag={isDragGroupMember}
            onClick={(e) => handleRowClick(e, obj)}
          >
            {obj.type !== 'background' && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  const scope = getScope(obj.id);
                  if (isSelected) {
                    setSelectedObjectIds(prev => prev.filter(id => id !== obj.id));
                  } else {
                    setSelectedObjectIds(prev => [...prev, obj.id]);
                    setEditingObjectScope(scope);
                    setEditingObjectId(obj.id);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  flexShrink: 0,
                  width: '12px',
                  height: '12px',
                  margin: 0,
                  cursor: 'pointer',
                  accentColor: theme.accent,
                }}
              />
            )}
            <span style={{
              flexShrink: 0, width: '20px', height: '20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '2px',
              background: iconBgColor,
            }}>
              {React.createElement(TYPE_ICON_COMPONENTS[obj.type], { size: 12 })}
            </span>
            {obj.image_url && (
              <img
                src={obj.image_url}
                alt=""
                style={{
                  flexShrink: 0,
                  width: '20px',
                  height: '20px',
                  objectFit: 'cover',
                  objectPosition: 'center center',
                  borderRadius: '2px',
                  border: `1px solid ${theme.border}`,
                }}
              />
            )}
            {renamingId === obj.id ? (
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => {
                  if (renameValue.trim()) updateObject(getScope(obj.id), obj.id, { name: renameValue.trim() });
                  setRenamingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (renameValue.trim()) updateObject(getScope(obj.id), obj.id, { name: renameValue.trim() });
                    setRenamingId(null);
                  }
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                style={{
                  flex: 1, minWidth: 0,
                  background: theme.bgInput, border: `1px solid ${theme.border}`,
                  color: theme.textPrimary, fontSize: '12px', padding: '1px 4px',
                  outline: 'none',
                }}
              />
            ) : (
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  opacity: obj.visible ? 1 : 0.4,
                }}
                onDoubleClick={(e) => {
                  if (obj.type === 'foreground' || obj.type === 'background') return;
                  e.stopPropagation();
                  setRenamingId(obj.id);
                  setRenameValue(obj.name);
                }}
              >
                {obj.name}
              </span>
            )}
            <button
              style={{ ...iconBtnStyle, opacity: obj.visible ? 1 : 0.4, display: 'flex', alignItems: 'center' }}
              onClick={(e) => { e.stopPropagation(); handleToggleVisible(obj); }}
              title={obj.visible ? '非表示にする' : '表示する'}
            >
              {obj.visible ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
            {obj.type !== 'background' && obj.type !== 'foreground' ? (
              <button
                style={{ ...iconBtnStyle, color: theme.danger, display: 'flex', alignItems: 'center' }}
                onClick={(e) => { e.stopPropagation(); handleRemoveObject(obj); }}
                title="削除"
              >
                <Trash2 size={12} />
              </button>
            ) : (
              <span style={{ width: '20px', flexShrink: 0 }} />
            )}
          </SortableListItem>
        );
      })}
    </SortableListPanel>
  );
}
