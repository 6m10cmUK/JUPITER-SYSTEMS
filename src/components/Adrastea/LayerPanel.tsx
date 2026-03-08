import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import type { BoardObject, BoardObjectType } from '../../types/adrastea.types';
import { theme } from '../../styles/theme';
import {
  Image, Type, Layers, Mountain,
  Eye, EyeOff,
  Trash2, Copy,
} from 'lucide-react';
import { SortableListPanel, SortableListItem, ConfirmModal, Tooltip } from './ui';

const TYPE_ICON_COMPONENTS: Record<BoardObjectType, React.FC<{ size?: number }>> = {
  panel: ({ size = 14 }) => <Image size={size} />,
  text: ({ size = 14 }) => <Type size={size} />,
  foreground: ({ size = 14 }) => <Layers size={size} />,
  background: ({ size = 14 }) => <Mountain size={size} />,
};

export function LayerPanel() {
  const {
    activeObjects,
    addObject,
    updateObject,
    removeObject,
    batchUpdateSort,
    editingObjectId,
    setEditingObjectId,
    selectedObjectIds,
    setSelectedObjectIds,
    clearAllEditing,
    getBoardCenter,
    activeScene,
  } = useAdrasteaContext();

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [localOrderOverride, setLocalOrderOverride] = useState<Map<string, number> | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{ msg: string; action: () => void } | null>(null);


  // Firestoreからデータが更新されたらローカルオーバーライドをクリア
  const activeObjectsRef = useRef(activeObjects);
  useEffect(() => {
    if (activeObjects !== activeObjectsRef.current) {
      activeObjectsRef.current = activeObjects;
      setLocalOrderOverride(null);
    }
  }, [activeObjects]);

  // 背景を末尾に固定。それ以外はsort_order降順
  const sortedObjects = useMemo(() => {
    const bg = activeObjects.filter(o => o.type === 'background');
    const rest = activeObjects.filter(o => o.type !== 'background').map(o => {
      if (localOrderOverride?.has(o.id)) {
        return { ...o, sort_order: localOrderOverride.get(o.id)! };
      }
      return o;
    });
    return [...rest.sort((a, b) => b.sort_order - a.sort_order), ...bg];
  }, [activeObjects, localOrderOverride]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveDragId(id);
    if (!selectedObjectIds.includes(id)) {
      setSelectedObjectIds([id]);
      setEditingObjectId(id);
    }
  }, [selectedObjectIds, setSelectedObjectIds, setEditingObjectId]);

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

    // 一括バッチ更新（パスは全て rooms/{roomId}/objects）
    const updates: { id: string; sort: number }[] = [];
    rest.forEach((o, i) => {
      const newOrder = maxOrder - i;
      if (o.sort_order !== newOrder) {
        updates.push({ id: o.id, sort: newOrder });
      }
    });
    if (updates.length > 0) batchUpdateSort(updates);
  }, [selectedObjectIds, sortedObjects, batchUpdateSort]);

  const handleRowClick = useCallback((e: React.MouseEvent, obj: BoardObject) => {
    if (e.shiftKey && selectedObjectIds.length > 0) {
      const lastSelected = selectedObjectIds[selectedObjectIds.length - 1];
      const anchorIdx = sortedObjects.findIndex(o => o.id === lastSelected);
      const targetIdx = sortedObjects.findIndex(o => o.id === obj.id);
      if (anchorIdx >= 0 && targetIdx >= 0) {
        const start = Math.min(anchorIdx, targetIdx);
        const end = Math.max(anchorIdx, targetIdx);
        const rangeIds = sortedObjects.slice(start, end + 1).map(o => o.id);
        setSelectedObjectIds(rangeIds);
        setEditingObjectId(obj.id);
      }
    } else if (e.metaKey || e.ctrlKey) {
      setSelectedObjectIds(prev => {
        const exists = prev.includes(obj.id);
        return exists ? prev.filter(id => id !== obj.id) : [...prev, obj.id];
      });
      setEditingObjectId(obj.id);
    } else {
      clearAllEditing();
      setSelectedObjectIds([obj.id]);
      setEditingObjectId(obj.id);
    }
  }, [selectedObjectIds, sortedObjects, setSelectedObjectIds, setEditingObjectId, clearAllEditing]);

  const handleAdd = async (global: boolean, type: BoardObjectType) => {
    const center = getBoardCenter();
    const nonBg = sortedObjects.filter(o => o.type !== 'background');
    let sortOrder: number;
    if (editingObjectId) {
      const selected = nonBg.find(o => o.id === editingObjectId);
      sortOrder = selected ? selected.sort_order + 1 : (nonBg.length > 0 ? nonBg[0].sort_order + 1 : 0);
    } else {
      sortOrder = nonBg.length > 0 ? nonBg[0].sort_order + 1 : 0;
    }
    const newId = await addObject({
      type,
      name: `新規${type}`,
      x: center.x,
      y: center.y,
      sort_order: sortOrder,
      global,
      scene_ids: global ? [] : (activeScene?.id ? [activeScene.id] : []),
    });
    if (newId) {
      setSelectedObjectIds([newId]);
      setEditingObjectId(newId);
    }
  };

  const handleToggleVisible = useCallback((obj: BoardObject) => {
    if (selectedObjectIds.length > 1 && selectedObjectIds.includes(obj.id)) {
      const newVisible = !obj.visible;
      for (const id of selectedObjectIds) {
        const o = activeObjects.find(o => o.id === id);
        if (o) updateObject(id, { visible: newVisible });
      }
    } else {
      updateObject(obj.id, { visible: !obj.visible });
    }
  }, [selectedObjectIds, activeObjects, updateObject]);

  const handleRemoveObject = useCallback((obj: BoardObject) => {
    if (obj.type === 'background') return;
    const count = selectedObjectIds.length > 1 && selectedObjectIds.includes(obj.id) ? selectedObjectIds.filter(id => { const o = activeObjects.find(o => o.id === id); return o && o.type !== 'background' && o.type !== 'foreground'; }).length : 1;
    const msg = count > 1 ? `${count}件のオブジェクトを削除しますか？` : 'このオブジェクトを削除しますか？';
    setPendingRemove({
      msg,
      action: () => {
        if (selectedObjectIds.length > 1 && selectedObjectIds.includes(obj.id)) {
          for (const id of selectedObjectIds) {
            const o = activeObjects.find(o => o.id === id);
            if (o && o.type !== 'background' && o.type !== 'foreground') {
              removeObject(id);
            }
          }
          clearAllEditing();
        } else {
          removeObject(obj.id);
          if (editingObjectId === obj.id) clearAllEditing();
        }
      },
    });
  }, [selectedObjectIds, activeObjects, removeObject, editingObjectId, clearAllEditing]);

  const canDuplicate = (id: string) => {
    const o = activeObjects.find(o => o.id === id);
    return o && o.type !== 'background' && o.type !== 'foreground';
  };

  const hasDuplicateTargets = selectedObjectIds.length > 0
    ? selectedObjectIds.length > 0 && selectedObjectIds.every(canDuplicate)
    : editingObjectId ? canDuplicate(editingObjectId) : false;

  const hasRemoveTargets = selectedObjectIds.length > 0
    ? selectedObjectIds.every(canDuplicate)
    : editingObjectId ? canDuplicate(editingObjectId) : false;

  const handleDuplicate = useCallback(async () => {
    const targets = selectedObjectIds.length > 0
      ? activeObjects.filter(o => selectedObjectIds.includes(o.id) && o.type !== 'background' && o.type !== 'foreground')
      : editingObjectId
        ? activeObjects.filter(o => o.id === editingObjectId && o.type !== 'background' && o.type !== 'foreground')
        : [];
    if (targets.length === 0) return;
    const newIds: string[] = [];
    for (const obj of targets) {
      const { id, created_at, updated_at, ...rest } = obj;
      const newId = await addObject({
        ...rest,
        name: `${obj.name} (複製)`,
        sort_order: obj.sort_order + 1,
      });
      if (newId) newIds.push(newId);
    }
    if (newIds.length > 0) {
      setSelectedObjectIds(newIds);
      setEditingObjectId(newIds[newIds.length - 1]);
    }
  }, [selectedObjectIds, editingObjectId, activeObjects, addObject, setSelectedObjectIds, setEditingObjectId]);

  const iconBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: theme.textSecondary,
    cursor: 'pointer',
    fontSize: '0.85rem',
    padding: '2px 4px',
    lineHeight: 1,
  };


  return (
    <>
    <SortableListPanel
      title="レイヤー"
      headerActions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
          <Tooltip label="シーン画像追加">
            <button onClick={() => handleAdd(false, 'panel')} style={{ ...iconBtnStyle, display: 'flex', alignItems: 'center', background: theme.accentHighlight, borderRadius: '2px' }}>
              <Image size={13} />
            </button>
          </Tooltip>
          <Tooltip label="シーンテキスト追加">
            <button onClick={() => handleAdd(false, 'text')} style={{ ...iconBtnStyle, display: 'flex', alignItems: 'center', background: theme.accentHighlight, borderRadius: '2px' }}>
              <Type size={13} />
            </button>
          </Tooltip>
          <span style={{ width: '1px', height: '12px', background: theme.border, flexShrink: 0, margin: '0 2px' }} />
          <Tooltip label="ルーム画像追加">
            <button onClick={() => handleAdd(true, 'panel')} style={{ ...iconBtnStyle, display: 'flex', alignItems: 'center', background: 'rgba(166,227,161,0.2)', borderRadius: '2px' }}>
              <Image size={13} />
            </button>
          </Tooltip>
          <Tooltip label="ルームテキスト追加">
            <button onClick={() => handleAdd(true, 'text')} style={{ ...iconBtnStyle, display: 'flex', alignItems: 'center', background: 'rgba(166,227,161,0.2)', borderRadius: '2px' }}>
              <Type size={13} />
            </button>
          </Tooltip>
          <span style={{ width: '1px', height: '12px', background: theme.border, flexShrink: 0, margin: '0 2px' }} />
          <Tooltip label="複製">
            <button
              onClick={handleDuplicate}
              disabled={!hasDuplicateTargets}
              style={{
                ...iconBtnStyle,
                color: theme.accent,
                display: 'flex',
                alignItems: 'center',
                opacity: hasDuplicateTargets ? 1 : 0.3,
              }}
            >
              <Copy size={13} />
            </button>
          </Tooltip>
          <Tooltip label="削除">
            <button
              onClick={() => {
                const target = selectedObjectIds.length > 0
                  ? activeObjects.find(o => selectedObjectIds.includes(o.id) && o.type !== 'background' && o.type !== 'foreground')
                  : editingObjectId
                    ? activeObjects.find(o => o.id === editingObjectId && o.type !== 'background' && o.type !== 'foreground')
                    : null;
                if (target) handleRemoveObject(target);
              }}
              disabled={!hasRemoveTargets}
              style={{
                ...iconBtnStyle,
                color: theme.danger,
                display: 'flex',
                alignItems: 'center',
                opacity: hasRemoveTargets ? 1 : 0.3,
              }}
            >
              <Trash2 size={13} />
            </button>
          </Tooltip>
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
        const iconBgColor = obj.global ? 'rgba(166,227,161,0.2)' : theme.accentHighlight;

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
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSelected) {
                    setSelectedObjectIds(prev => prev.filter(id => id !== obj.id));
                  } else {
                    setSelectedObjectIds(prev => [...prev, obj.id]);
                    setEditingObjectId(obj.id);
                  }
                }}
                style={{
                  flexShrink: 0,
                  width: '12px',
                  height: '12px',
                  border: `1px solid ${theme.textMuted}`,
                  borderRadius: '2px',
                  background: isSelected ? theme.textMuted : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  color: theme.bgBase,
                  lineHeight: 1,
                }}
              >
                {isSelected && '✓'}
              </div>
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
                  if (renameValue.trim()) updateObject(obj.id, { name: renameValue.trim() });
                  setRenamingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (renameValue.trim()) updateObject(obj.id, { name: renameValue.trim() });
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
            {obj.type !== 'background' && (
              <button
                style={{ ...iconBtnStyle, opacity: obj.visible ? 1 : 0.4, display: 'flex', alignItems: 'center' }}
                onClick={(e) => { e.stopPropagation(); handleToggleVisible(obj); }}
                title={obj.visible ? '非表示にする' : '表示する'}
              >
                {obj.visible ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            )}
          </SortableListItem>
        );
      })}
    </SortableListPanel>

    {pendingRemove && (
      <ConfirmModal
        message={pendingRemove.msg}
        confirmLabel="削除"
        danger
        onConfirm={() => { pendingRemove.action(); setPendingRemove(null); }}
        onCancel={() => setPendingRemove(null)}
      />
    )}
    </>
  );
}
