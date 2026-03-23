import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { theme } from '../../../styles/theme';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
const MOD = isMac ? '⌘' : 'Ctrl+';

/** ショートカット文字列を生成（例: shortcutLabel('C') → '⌘C' or 'Ctrl+C'） */
export const shortcutLabel = (key: string) => `${MOD}${key}`;

export interface DropdownMenuItem {
  id?: string;
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

export type DropdownMenuEntry = DropdownMenuItem | 'separator';

export interface DropdownMenuProps {
  // トリガー（mode='trigger' 時のみ使用）
  trigger?: React.ReactNode;

  // 外部制御（mode='context' 時に必要）
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  // メニュー項目
  items: DropdownMenuEntry[];

  // 選択状態
  selectedId?: string;

  // 表示制御
  align?: 'left' | 'right';          // デフォルト 'right'
  direction?: 'down' | 'up';          // デフォルト 'down'

  // コンテキストメニューモード
  mode?: 'trigger' | 'context';       // デフォルト 'trigger'
  position?: { x: number; y: number }; // mode='context' 時の表示座標

  // カスタム描画
  renderItem?: (item: DropdownMenuItem, isSelected: boolean) => React.ReactNode;
}

export function DropdownMenu({
  trigger,
  open: externalOpen,
  onOpenChange,
  items,
  selectedId,
  align = 'right',
  direction = 'down',
  mode = 'trigger',
  position,
  renderItem,
}: DropdownMenuProps) {
  // --- Internal state management ---
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [menuInitialized, setMenuInitialized] = useState(false);

  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // mode='trigger' 時は内部状態、mode='context' 時は外部状態を使用
  const isOpen = mode === 'context' ? (externalOpen ?? false) : isOpenInternal;

  // --- Handle trigger click (mode='trigger' only) ---
  const handleTriggerClick = () => {
    if (mode === 'trigger') {
      const newOpen = !isOpenInternal;
      setIsOpenInternal(newOpen);
      if (newOpen) {
        calculateMenuPosition();
      } else {
        setMenuPos(null);
        setHoveredIndex(null);
      }
    }
  };

  // --- Calculate menu position ---
  const calculateMenuPosition = () => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();

    if (mode === 'context' && position) {
      // Context menu: use provided position
      setMenuPos({ top: position.y, left: position.x });
      setMenuInitialized(false); // Will adjust after measurement
      return;
    }

    // Trigger mode: position relative to trigger
    const marginGap = 4;
    const top = direction === 'down' ? triggerRect.bottom + marginGap : triggerRect.top - marginGap;

    let left: number;
    if (align === 'right') {
      left = triggerRect.right;
    } else {
      left = triggerRect.left;
    }

    setMenuPos({ top, left });
    setMenuInitialized(false);
  };

  // --- Adjust menu position after measurement (trigger mode, align='right' or direction='up') ---
  useEffect(() => {
    if (!isOpen || !menuPos || !menuRef.current) {
      return;
    }

    const menuWidth = menuRef.current.offsetWidth;
    const menuHeight = menuRef.current.offsetHeight;
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    let { top, left } = menuPos;

    if (mode === 'trigger' && triggerRect) {
      // 水平位置: align='right' なら右揃え
      if (align === 'right') {
        left = triggerRect.right - menuWidth;
      }

      // 垂直位置: direction='up' ならトリガーの上
      if (direction === 'up') {
        const marginGap = 4;
        top = triggerRect.top - menuHeight - marginGap;
      }

      // ビューポートはみ出し補正
      if (top + menuHeight > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - menuHeight - 8);
      }
      if (top < 8) top = 8;
      if (left + menuWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - menuWidth - 8);
      }
      if (left < 8) left = 8;
    } else if (mode === 'context') {
      // Adjust context menu to keep within viewport
      if (top + menuHeight > window.innerHeight - 8) top = Math.max(8, top - menuHeight);
      if (left + menuWidth > window.innerWidth - 8) left = Math.max(8, left - menuWidth);
    }

    if (top !== menuPos.top || left !== menuPos.left) {
      setMenuPos({ top, left });
    }

    setMenuInitialized(true);
  }, [isOpen, align, direction, mode, menuPos?.top, menuPos?.left]);

  // --- Sync position to menuPos in context mode ---
  useEffect(() => {
    if (mode === 'context' && isOpen && position) {
      setMenuPos({ top: position.y, left: position.x });
      setMenuInitialized(false);
    } else if (mode === 'context' && !isOpen) {
      setMenuPos(null);
      setHoveredIndex(null);
    }
  }, [mode, isOpen, position?.x, position?.y]);

  // --- Handle click-outside (mode-dependent) ---
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (mode === 'trigger') {
        // Trigger mode: check both trigger and menu
        if (triggerRef.current?.contains(target)) {
          return; // Toggle handled by onClick
        }
        if (menuRef.current?.contains(target)) {
          return; // Item click handled by button onClick
        }
        // Outside both: close
        setIsOpenInternal(false);
        setMenuPos(null);
        setHoveredIndex(null);
      } else if (mode === 'context') {
        // Context mode: only check menu
        if (!menuRef.current?.contains(target)) {
          onOpenChange?.(false);
          setHoveredIndex(null);
        }
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, mode, onOpenChange]);

  // --- Handle item click ---
  const handleItemClick = (item: DropdownMenuItem) => {
    if (!item.disabled) {
      item.onClick();

      if (mode === 'trigger') {
        setIsOpenInternal(false);
        setMenuPos(null);
        setHoveredIndex(null);
      } else if (mode === 'context') {
        onOpenChange?.(false);
        setHoveredIndex(null);
      }
    }
  };

  // --- Render menu items ---
  const renderMenuItems = () => {
    return items.map((entry, index) => {
      if (entry === 'separator') {
        return (
          <div
            key={`separator-${index}`}
            style={{
              height: '1px',
              background: theme.border,
              margin: '4px 0',
            }}
          />
        );
      }

      const isDisabled = entry.disabled ?? false;
      const isHovered = hoveredIndex === index;
      const isSelected = selectedId !== undefined && entry.id === selectedId;

      // Custom render or default
      let itemContent: React.ReactNode;
      if (renderItem) {
        itemContent = renderItem(entry, isSelected);
      } else {
        itemContent = (
          <>
            {entry.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{entry.icon}</span>}
            <span style={{ flex: 1, textAlign: 'left' }}>{entry.label}</span>
            {entry.shortcut && <span style={{ fontSize: '10px', color: theme.textMuted, marginLeft: '16px', flexShrink: 0 }}>{entry.shortcut}</span>}
          </>
        );
      }

      return (
        <button
          key={entry.id ? `item-${entry.id}` : `item-${index}`}
          onClick={() => handleItemClick(entry)}
          onMouseEnter={() => !isDisabled && setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            color: entry.danger ? theme.danger : theme.textPrimary,
            cursor: isDisabled ? 'default' : 'pointer',
            background:
              isSelected || (isHovered && !isDisabled) ? theme.bgHover : 'transparent',
            border: 'none',
            width: '100%',
            opacity: isDisabled ? 0.4 : 1,
            pointerEvents: isDisabled ? 'none' : 'auto',
            transition: 'background-color 0.15s ease-in-out',
          }}
          disabled={isDisabled}
        >
          {itemContent}
        </button>
      );
    });
  };

  // --- Menu portal ---
  const menuElement =
    isOpen && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
              background: theme.bgElevated,
              border: `1px solid ${theme.border}`,
              boxShadow: theme.shadowMd,
              borderRadius: '4px',
              zIndex: 10010,
              padding: '4px 0',
              minWidth: '160px',
              width: 'max-content',
              maxHeight: 'calc(100vh - 16px)',
              overflowY: 'auto',
              visibility: menuInitialized ? 'visible' : 'hidden',
            }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {renderMenuItems()}
          </div>,
          document.body
        )
      : null;

  // --- Render based on mode ---
  if (mode === 'context') {
    // Context mode: menu only
    return menuElement;
  }

  // Trigger mode: trigger + menu
  return (
    <>
      <div
        ref={triggerRef}
        onClick={handleTriggerClick}
        style={{ cursor: 'pointer', display: 'inline-flex' }}
      >
        {trigger}
      </div>
      {menuElement}
    </>
  );
}
