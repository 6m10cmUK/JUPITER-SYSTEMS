import React, { useState } from 'react';
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
  renderOverlay?: (activeId: string) => React.ReactNode;
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
  renderOverlay,
  children,
}: SortableListPanelProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const hasItems = items.length > 0;

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
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => {
            setActiveId(String(event.active.id));
            onDragStart?.(event);
          }}
          onDragEnd={(event) => {
            setActiveId(null);
            onDragEnd?.(event);
          }}
        >
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {children}
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeId ? (
              renderOverlay ? (
                renderOverlay(activeId)
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  color: theme.textPrimary,
                  background: theme.bgBase,
                  borderBottom: `1px solid ${theme.border}`,
                  opacity: 0.85,
                  boxShadow: theme.shadowSm,
                }} />
              )
            ) : null}
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
      ref={setNodeRef}
      style={style}
      {...(!disabled ? listeners : {})}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {!disabled && !hideHandle && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <span
            ref={setActivatorNodeRef}
            {...attributes}
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
