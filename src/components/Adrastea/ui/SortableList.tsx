import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { theme } from '../../../styles/theme';

// --- SortableListPanel ---
interface SortableListPanelProps {
  title: string;
  titleIcon?: React.ReactNode;
  headerActions?: React.ReactNode;
  footerActions?: React.ReactNode;
  items: { id: string }[];
  onDragEnd?: (event: DragEndEvent) => void;
  onDragStart?: (event: DragStartEvent) => void;
  emptyMessage?: string;
  children: React.ReactNode;
}

export function SortableListPanel({
  title,
  titleIcon,
  headerActions,
  footerActions,
  items,
  onDragEnd,
  onDragStart,
  emptyMessage,
  children,
}: SortableListPanelProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [grabOffset, setGrabOffset] = useState<{ x: number; y: number }>({ x: 16, y: 14 });
  const [draggedHtml, setDraggedHtml] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const hasItems = items.length > 0;

  // ポインター追跡
  useEffect(() => {
    if (!activeId) {
      setCursorPos(null);
      return;
    }
    const handleMove = (e: PointerEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('pointermove', handleMove, { passive: true });
    return () => window.removeEventListener('pointermove', handleMove);
  }, [activeId]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: theme.bgBase,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      color: theme.textPrimary,
    }}>
      {/* Header */}
      <div style={{
        padding: '6px 8px',
        borderBottom: `1px solid ${theme.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{
          color: theme.textPrimary,
          fontWeight: 600,
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          minWidth: 0,
          flexShrink: 1,
        }}>
          {titleIcon}
          {title}
        </span>
        {headerActions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
            {headerActions}
          </div>
        )}
      </div>

      {/* List */}
      <div ref={containerRef} style={{ flex: 1, overflowY: 'auto' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => {
            const id = String(event.active.id);
            setActiveId(id);
            // DOM クローンをキャプチャ（activatorEvent.target から sortable 要素を探す）
            const target = (event.activatorEvent as Event)?.target as HTMLElement | null;
            const sortableEl = target?.closest?.('[aria-roledescription="sortable"]') as HTMLElement | null;
            if (sortableEl) {
              setDraggedHtml(sortableEl.outerHTML);
            }
            // 掴んだ位置を計算
            const activatorEvent = event.activatorEvent as PointerEvent | null;
            const initialRect = event.active.rect.current?.initial;
            if (activatorEvent && initialRect) {
              setGrabOffset({
                x: activatorEvent.clientX - initialRect.left,
                y: activatorEvent.clientY - initialRect.top,
              });
              // 初期カーソル位置をセット（pointermove を待たずに overlay 表示）
              setCursorPos({ x: activatorEvent.clientX, y: activatorEvent.clientY });
            } else {
              setGrabOffset({ x: 16, y: 14 });
            }
            onDragStart?.(event);
          }}
          onDragEnd={(event) => {
            setActiveId(null);
            setDraggedHtml('');
            onDragEnd?.(event);
          }}
        >
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {children}
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            <div style={{ visibility: 'hidden', position: 'fixed', pointerEvents: 'none' }} />
          </DragOverlay>
        </DndContext>
        {!hasItems && emptyMessage && (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: theme.textMuted,
            fontSize: '12px',
          }}>
            {emptyMessage}
          </div>
        )}
      </div>

      {/* Portal overlay for cursor tracking */}
      {activeId && cursorPos && draggedHtml && createPortal(
        <div style={{
          position: 'fixed',
          top: cursorPos.y - grabOffset.y,
          left: cursorPos.x - grabOffset.x,
          width: containerRef.current?.offsetWidth ?? 240,
          zIndex: 9999,
          pointerEvents: 'none',
          opacity: 0.85,
        }}>
          <div dangerouslySetInnerHTML={{ __html: draggedHtml }} />
        </div>,
        document.body
      )}

      {/* Footer */}
      {footerActions && (
        <div style={{
          padding: '8px 12px',
          borderTop: `1px solid ${theme.border}`,
          flexShrink: 0,
        }}>
          {footerActions}
        </div>
      )}
    </div>
  );
}

// --- SortableListItem ---
interface SortableListItemProps {
  id: string;
  disabled?: boolean;
  hideHandle?: boolean;
  isSelected?: boolean;
  isGroupDrag?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  handleExtra?: React.ReactNode;
  children: React.ReactNode;
}

export function SortableListItem({
  id,
  disabled,
  hideHandle,
  isSelected,
  isGroupDrag,
  onClick,
  onDoubleClick,
  handleExtra,
  children,
}: SortableListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    fontSize: '12px',
    color: theme.textPrimary,
    borderBottom: `1px solid ${theme.border}`,
    background: isSelected ? theme.accentBgSubtle : 'transparent',
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : isGroupDrag ? 0.4 : 1,
    boxShadow: isDragging ? theme.shadowSm : undefined,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
    touchAction: 'none',
  };

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        setActivatorNodeRef(el);
      }}
      style={style}
      {...(!disabled ? listeners : {})}
      {...attributes}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {!disabled && !hideHandle && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <span
            style={{ cursor: 'grab', display: 'flex', touchAction: 'none' }}
          >
            <GripVertical size={12} color={theme.textMuted} />
          </span>
          {handleExtra}
        </div>
      )}
      {children}
    </div>
  );
}
