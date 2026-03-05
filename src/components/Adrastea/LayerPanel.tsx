import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import type { BoardObject, BoardObjectType, BoardObjectScope } from '../../types/adrastea.types';
import { theme } from '../../styles/theme';
import {
  Image, Type, Layers, Mountain,
  Eye, EyeOff,
  Plus, Trash2,
} from 'lucide-react';

const TYPE_ICON_COMPONENTS: Record<BoardObjectType, React.FC<{ size?: number }>> = {
  panel: ({ size = 14 }) => <Image size={size} />,
  text: ({ size = 14 }) => <Type size={size} />,
  foreground: ({ size = 14 }) => <Layers size={size} />,
  background: ({ size = 14 }) => <Mountain size={size} />,
};

// --- Sortable行コンポーネント ---
interface SortableRowProps {
  obj: BoardObject;
  isSelected: boolean;
  isDragGroupMember: boolean;
  scope: BoardObjectScope;
  iconBtnStyle: React.CSSProperties;
  onToggleVisible: (obj: BoardObject) => void;
  onRemove: (obj: BoardObject) => void;
  onClick: (e: React.MouseEvent, obj: BoardObject) => void;
}

function SortableRow({ obj, isSelected, isDragGroupMember, scope, iconBtnStyle, onToggleVisible, onRemove, onClick }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: obj.id,
    disabled: obj.type === 'background',
  });

  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    cursor: obj.type !== 'background' ? 'grab' : 'default',
    background: isSelected ? 'rgba(137,180,250,0.15)' : 'transparent',
    borderBottom: `1px solid ${theme.border}`,
    fontSize: '12px',
    color: theme.textPrimary,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : isDragGroupMember ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
    boxShadow: isDragging ? '0 2px 8px rgba(0,0,0,0.3)' : undefined,
  };

  const iconBgColor = scope === 'scene' ? 'rgba(137,180,250,0.2)' : 'rgba(166,227,161,0.2)';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => onClick(e, obj)}
    >
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
      <span style={{
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        opacity: obj.visible ? 1 : 0.4,
      }}>
        {obj.name}
      </span>
      <button
        style={{ ...iconBtnStyle, opacity: obj.visible ? 1 : 0.4, display: 'flex', alignItems: 'center' }}
        onClick={(e) => { e.stopPropagation(); onToggleVisible(obj); }}
        title={obj.visible ? '非表示にする' : '表示する'}
      >
        {obj.visible ? <Eye size={12} /> : <EyeOff size={12} />}
      </button>
      {obj.type !== 'background' && obj.type !== 'foreground' ? (
        <button
          style={{ ...iconBtnStyle, color: theme.danger, display: 'flex', alignItems: 'center' }}
          onClick={(e) => { e.stopPropagation(); onRemove(obj); }}
          title="削除"
        >
          <Trash2 size={12} />
        </button>
      ) : (
        <span style={{ width: '20px', flexShrink: 0 }} />
      )}
    </div>
  );
}

// --- メインコンポーネント ---
export function LayerPanel() {
  const {
    mergedObjects,
    roomObjects,
    addObject,
    updateObject,
    removeObject,
    reorderObjects,
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
  // ドラッグ完了後の並び順をローカルで即反映（Firestore反映待ちのガクつき防止）
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

  const sortableIds = useMemo(() => sortedObjects.map(o => o.id), [sortedObjects]);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveDragId(id);
    // ドラッグ開始したアイテムが選択されてなければ単一選択にする
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

    // 移動対象: 選択グループに含まれてればグループ全体、そうでなければ単体
    const dragIds = selectedObjectIds.includes(activeId) && selectedObjectIds.length > 1
      ? selectedObjectIds
      : [activeId];
    const dragSet = new Set(dragIds);

    if (dragSet.has(overId)) return;

    const nonBg = sortedObjects.filter(o => o.type !== 'background');
    const draggedItems = nonBg.filter(o => dragSet.has(o.id));
    const rest = nonBg.filter(o => !dragSet.has(o.id));

    // over位置に挿入
    const overIdx = rest.findIndex(o => o.id === overId);
    if (overIdx < 0) return;

    const activeOrigIdx = nonBg.findIndex(o => o.id === activeId);
    const overOrigIdx = nonBg.findIndex(o => o.id === overId);
    const insertIdx = activeOrigIdx < overOrigIdx ? overIdx + 1 : overIdx;

    rest.splice(insertIdx, 0, ...draggedItems);

    // sort_orderを振り直す + ローカルオーバーライドで即反映
    // reorderObjectsはindex昇順でsort_orderを振る（末尾ほど大=前面）
    // restはリスト表示順（降順）なので逆順にしてから渡す
    const reversed = [...rest].reverse();
    const maxOrder = rest.length - 1;
    const overrideMap = new Map<string, number>();
    rest.forEach((o, i) => overrideMap.set(o.id, maxOrder - i));
    setLocalOrderOverride(overrideMap);

    // スコープごとにバッチ書き込み
    const roomIds = reversed.filter(o => getScope(o.id) === 'room').map(o => o.id);
    const sceneIds = reversed.filter(o => getScope(o.id) === 'scene').map(o => o.id);
    if (roomIds.length > 0) reorderObjects('room', roomIds);
    if (sceneIds.length > 0) reorderObjects('scene', sceneIds);
  }, [selectedObjectIds, sortedObjects, getScope, reorderObjects]);

  // クリックハンドラ
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
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: theme.bgBase, color: theme.textPrimary }}>
      {/* ヘッダー */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 8px',
        borderBottom: `1px solid ${theme.border}`,
      }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>レイヤー</span>
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
      </div>

      {/* リスト */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            {sortedObjects.map((obj) => {
              const isSelected = selectedObjectIds.includes(obj.id);
              const isDragGroupMember = activeDragId != null
                && selectedObjectIds.includes(activeDragId)
                && isSelected
                && obj.id !== activeDragId;
              return (
                <SortableRow
                  key={obj.id}
                  obj={obj}
                  isSelected={isSelected}
                  isDragGroupMember={isDragGroupMember}
                  scope={getScope(obj.id)}
                  iconBtnStyle={iconBtnStyle}
                  onToggleVisible={handleToggleVisible}
                  onRemove={handleRemoveObject}
                  onClick={handleRowClick}
                />
              );
            })}
          </SortableContext>
          {sortedObjects.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: theme.textMuted, fontSize: '0.8rem' }}>
              オブジェクトがありません
            </div>
          )}
        </div>
      </DndContext>
    </div>
  );
}
