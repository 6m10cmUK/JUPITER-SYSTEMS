import React from 'react';
import {
  DndContext,
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

const noop = () => {};

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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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
        }}>
          {titleIcon}
          {title}
        </span>
        {headerActions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {headerActions}
          </div>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd ?? noop}
        >
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {children}
          </SortableContext>
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
    opacity: isDragging ? 0.5 : isGroupDrag ? 0.4 : 1,
    boxShadow: isDragging ? theme.shadowSm : undefined,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {!disabled && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <span
            {...attributes}
            {...listeners}
            style={{ cursor: 'grab', display: 'flex' }}
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
