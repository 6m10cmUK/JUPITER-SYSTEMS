import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import type { BoardObject, BoardObjectType, BoardObjectScope } from '../../types/adrastea.types';
import { theme } from '../../styles/theme';

const TYPE_ICONS: Record<BoardObjectType, string> = {
  panel: '🖼️',
  text: 'T',
  foreground: '🌄',
  background: '🏔️',
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

  const getScope = (id: string): BoardObjectScope => {
    return roomObjects.some((o) => o.id === id) ? 'room' : 'scene';
  };

  // 前景を先頭、背景を末尾に固定。それ以外はsort_order降順
  const sortedObjects = useMemo(() => {
    const fg = mergedObjects.filter(o => o.type === 'foreground');
    const bg = mergedObjects.filter(o => o.type === 'background');
    const rest = mergedObjects.filter(o => o.type !== 'foreground' && o.type !== 'background');
    return [...fg, ...rest.sort((a, b) => b.sort_order - a.sort_order), ...bg];
  }, [mergedObjects]);

  const handleAdd = (scope: BoardObjectScope, type: BoardObjectType) => {
    setMenuOpen(false);
    addObject(scope, { type, name: `新規${type}` });
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
    // 背景・前景は移動不可
    if (target.type === 'background' || target.type === 'foreground') return;
    if (above.type === 'background' || above.type === 'foreground') return;
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
    // 背景・前景は移動不可
    if (target.type === 'background' || target.type === 'foreground') return;
    if (below.type === 'background' || below.type === 'foreground') return;
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
    padding: '8px 12px',
    borderBottom: `1px solid ${theme.border}`,
  };

  const rowStyle = (isSelected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    cursor: 'pointer',
    background: isSelected ? 'rgba(137,180,250,0.15)' : 'transparent',
    borderBottom: `1px solid ${theme.border}`,
    fontSize: '0.8rem',
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
    fontSize: '0.7rem',
    color: theme.textMuted,
    borderBottom: `1px solid ${theme.border}`,
  };

  const menuItemStyle: React.CSSProperties = {
    padding: '6px 14px',
    fontSize: '0.8rem',
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
              fontSize: '1.1rem',
              fontWeight: 700,
              color: theme.textPrimary,
            }}
          >
            +
          </button>
          {menuOpen && (
            <div style={menuStyle}>
              <div style={menuGroupStyle}>シーンオブジェクト</div>
              <button style={menuItemStyle} onClick={() => handleAdd('scene', 'panel')}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgInput; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >🖼️ パネル</button>
              <button style={menuItemStyle} onClick={() => handleAdd('scene', 'text')}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgInput; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >T テキスト</button>
              <button style={menuItemStyle} onClick={() => handleAdd('scene', 'foreground')}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgInput; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >🌄 前景</button>
              <div style={{ ...menuGroupStyle, borderTop: `1px solid ${theme.border}` }}>ルームオブジェクト</div>
              <button style={menuItemStyle} onClick={() => handleAdd('room', 'panel')}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgInput; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >🖼️ パネル</button>
              <button style={menuItemStyle} onClick={() => handleAdd('room', 'text')}
                onMouseEnter={(e) => { e.currentTarget.style.background = theme.bgInput; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >T テキスト</button>
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
              style={rowStyle(isSelected)}
              onClick={() => {
                setEditingObjectScope(scope);
                setEditingObjectId(obj.id);
              }}
            >
              <span style={{ flexShrink: 0, width: '20px', textAlign: 'center' }}>
                {TYPE_ICONS[obj.type]}
              </span>
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
                style={{ ...iconBtnStyle, opacity: obj.visible ? 1 : 0.4 }}
                onClick={(e) => { e.stopPropagation(); handleToggleVisible(obj); }}
                title={obj.visible ? '非表示にする' : '表示する'}
              >
                👁
              </button>
              <button
                style={{
                  ...iconBtnStyle,
                  opacity: obj.locked ? 1 : 0.3,
                  cursor: obj.type === 'background' ? 'not-allowed' : 'pointer',
                }}
                onClick={(e) => { e.stopPropagation(); handleToggleLocked(obj); }}
                title={obj.locked ? 'ロック解除' : 'ロック'}
              >
                🔒
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
        padding: '6px 12px',
        borderTop: `1px solid ${theme.border}`,
        justifyContent: 'flex-end',
      }}>
        <button
          style={{ ...iconBtnStyle, fontSize: '0.9rem' }}
          onClick={handleMoveUp}
          disabled={!editingObjectId}
          title="前面に移動"
        >
          ▲
        </button>
        <button
          style={{ ...iconBtnStyle, fontSize: '0.9rem' }}
          onClick={handleMoveDown}
          disabled={!editingObjectId}
          title="背面に移動"
        >
          ▼
        </button>
      </div>
    </div>
  );
}
