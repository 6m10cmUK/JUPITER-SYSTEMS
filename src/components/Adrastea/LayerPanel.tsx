import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import type { BoardObject, BoardObjectType, BoardObjectScope } from '../../types/adrastea.types';
import { theme } from '../../styles/theme';
import {
  Image, Type, Layers, Mountain,
  Eye, EyeOff, Lock, Unlock,
  ChevronUp, ChevronDown, Plus,
  SquareKanban,
} from 'lucide-react';

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
    editingObjectId,
    setEditingObjectId,
    setEditingObjectScope,
    clearAllEditing,
    getBoardCenter,
  } = useAdrasteaContext();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // 背景を末尾に固定。それ以外はsort_order降順
  const sortedObjects = useMemo(() => {
    const bg = mergedObjects.filter(o => o.type === 'background');
    const rest = mergedObjects.filter(o => o.type !== 'background');
    return [...rest.sort((a, b) => b.sort_order - a.sort_order), ...bg];
  }, [mergedObjects]);

  // --- ドラッグ&ドロップ ---
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, obj: BoardObject) => {
    if (obj.type === 'background') {
      e.preventDefault();
      return;
    }
    setDragId(obj.id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, obj: BoardObject) => {
    e.preventDefault();
    if (obj.type === 'background') return;
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(obj.id);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetObj: BoardObject) => {
    e.preventDefault();
    setDragOverId(null);
    if (!dragId || dragId === targetObj.id || targetObj.type === 'background') {
      setDragId(null);
      return;
    }

    const dragIdx = sortedObjects.findIndex(o => o.id === dragId);
    const targetIdx = sortedObjects.findIndex(o => o.id === targetObj.id);
    if (dragIdx < 0 || targetIdx < 0) { setDragId(null); return; }

    const dragObj = sortedObjects[dragIdx];
    const dragScope = getScope(dragObj.id);
    const targetScope = getScope(targetObj.id);
    if (dragScope !== targetScope) { setDragId(null); return; }

    // 並べ替え: ドラッグ元を除いて、ターゲット位置に挿入し、sort_orderを振り直す
    const sameScopeObjects = sortedObjects.filter(o => getScope(o.id) === dragScope && o.type !== 'background');
    const withoutDrag = sameScopeObjects.filter(o => o.id !== dragId);
    const insertIdx = withoutDrag.findIndex(o => o.id === targetObj.id);
    withoutDrag.splice(insertIdx, 0, dragObj);

    // sort_orderを降順で振り直す（リスト上が大きい値）
    const maxOrder = withoutDrag.length - 1;
    withoutDrag.forEach((o, i) => {
      const newOrder = maxOrder - i;
      if (o.sort_order !== newOrder) {
        updateObject(dragScope, o.id, { sort_order: newOrder });
      }
    });

    setDragId(null);
  }, [dragId, sortedObjects, getScope, updateObject]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverId(null);
  }, []);

  const handleAdd = (scope: BoardObjectScope, type: BoardObjectType) => {
    setMenuOpen(false);
    const center = getBoardCenter();
    addObject(scope, { type, name: `新規${type}`, x: center.x, y: center.y });
  };

  const handleToggleVisible = (obj: BoardObject) => {
    const scope = getScope(obj.id);
    updateObject(scope, obj.id, { visible: !obj.visible });
  };

  const handleToggleLocked = (obj: BoardObject) => {
    if (obj.type === 'background') return;
    const scope = getScope(obj.id);
    updateObject(scope, obj.id, { locked: !obj.locked });
  };

  const handleMoveUp = () => {
    if (!editingObjectId) return;
    const idx = sortedObjects.findIndex((o) => o.id === editingObjectId);
    if (idx <= 0) return;
    const target = sortedObjects[idx];
    const above = sortedObjects[idx - 1];
    // 背景は移動不可
    if (target.type === 'background') return;
    if (above.type === 'background') return;
    const scope = getScope(target.id);
    const aboveScope = getScope(above.id);
    // 同じスコープ内でのみ並べ替え
    if (scope !== aboveScope) return;
    updateObject(scope, target.id, { sort_order: above.sort_order });
    updateObject(scope, above.id, { sort_order: target.sort_order });
  };

  const handleMoveDown = () => {
    if (!editingObjectId) return;
    const idx = sortedObjects.findIndex((o) => o.id === editingObjectId);
    if (idx < 0 || idx >= sortedObjects.length - 1) return;
    const target = sortedObjects[idx];
    const below = sortedObjects[idx + 1];
    // 背景は移動不可
    if (target.type === 'background') return;
    if (below.type === 'background') return;
    const scope = getScope(target.id);
    const belowScope = getScope(below.id);
    if (scope !== belowScope) return;
    updateObject(scope, target.id, { sort_order: below.sort_order });
    updateObject(scope, below.id, { sort_order: target.sort_order });
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    borderBottom: `1px solid ${theme.border}`,
  };

  const rowStyle = (isSelected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    cursor: 'pointer',
    background: isSelected ? 'rgba(137,180,250,0.15)' : 'transparent',
    borderBottom: `1px solid ${theme.border}`,
    fontSize: '12px',
    color: theme.textPrimary,
  });

  const iconBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: theme.textSecondary,
    cursor: 'pointer',
    fontSize: '0.85rem',
    padding: '2px 4px',
    lineHeight: 1,
  };

  const badgeStyle = (scope: BoardObjectScope): React.CSSProperties => ({
    fontSize: '0.65rem',
    padding: '1px 4px',
    borderRadius: '2px',
    background: scope === 'scene' ? 'rgba(137,180,250,0.2)' : 'rgba(166,227,161,0.2)',
    color: scope === 'scene' ? theme.statusBlue : theme.statusGreen,
    fontWeight: 600,
    flexShrink: 0,
  });

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
      <div style={headerStyle}>
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
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sortedObjects.map((obj) => {
          const isSelected = editingObjectId === obj.id;
          const scope = getScope(obj.id);
          return (
            <div
              key={obj.id}
              draggable={obj.type !== 'background'}
              onDragStart={(e) => handleDragStart(e, obj)}
              onDragOver={(e) => handleDragOver(e, obj)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, obj)}
              onDragEnd={handleDragEnd}
              style={{
                ...rowStyle(isSelected),
                opacity: dragId === obj.id ? 0.4 : undefined,
                borderTop: dragOverId === obj.id ? `2px solid ${theme.accent}` : undefined,
                cursor: obj.type !== 'background' ? 'grab' : 'default',
              }}
              onClick={() => {
                clearAllEditing();
                setEditingObjectScope(scope);
                setEditingObjectId(obj.id);
              }}
            >
              <span style={{ flexShrink: 0, width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <span style={badgeStyle(scope)}>
                {scope === 'scene' ? 'S' : 'R'}
              </span>
              <button
                style={{ ...iconBtnStyle, opacity: obj.visible ? 1 : 0.4, display: 'flex', alignItems: 'center' }}
                onClick={(e) => { e.stopPropagation(); handleToggleVisible(obj); }}
                title={obj.visible ? '非表示にする' : '表示する'}
              >
                {obj.visible ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
              <button
                style={{
                  ...iconBtnStyle,
                  opacity: obj.locked ? 1 : 0.3,
                  cursor: obj.type === 'background' ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onClick={(e) => { e.stopPropagation(); handleToggleLocked(obj); }}
                title={obj.locked ? 'ロック解除' : 'ロック'}
              >
                {obj.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
            </div>
          );
        })}
        {sortedObjects.length === 0 && (
          <div style={{ padding: '16px', textAlign: 'center', color: theme.textMuted, fontSize: '0.8rem' }}>
            オブジェクトがありません
          </div>
        )}
      </div>

      {/* フッター: 上下移動ボタン */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '4px 8px',
        borderTop: `1px solid ${theme.border}`,
        justifyContent: 'flex-end',
      }}>
        <button
          style={{ ...iconBtnStyle, display: 'flex', alignItems: 'center' }}
          onClick={handleMoveUp}
          disabled={!editingObjectId}
          title="前面に移動"
        >
          <ChevronUp size={16} />
        </button>
        <button
          style={{ ...iconBtnStyle, display: 'flex', alignItems: 'center' }}
          onClick={handleMoveDown}
          disabled={!editingObjectId}
          title="背面に移動"
        >
          <ChevronDown size={16} />
        </button>
      </div>
    </div>
  );
}
