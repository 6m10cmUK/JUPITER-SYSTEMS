import { useCallback, useState } from 'react';
import { Trash2, Plus, Eye, EyeOff, Copy } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { theme } from '../../styles/theme';
import type { Character } from '../../types/adrastea.types';
import { resolveAssetId } from '../../hooks/useAssets';
import { SortableListPanel, SortableListItem, Tooltip, ConfirmModal, DropdownMenu } from './ui';
import { shortcutLabel } from './ui/DropdownMenu';
import { useThrottledCallback } from '../../hooks/useThrottledUpdate';
import { usePermission } from '../../hooks/usePermission';
import { hasRole } from '../../config/permissions';

interface CharacterPanelProps {
  characters: Character[];
  currentUserId: string;
  selectedCharIds: string[];
  onAddCharacter: () => void;
  onSelectCharacter: (char: Character) => void;
  onDoubleClickCharacter?: (char: Character) => void;
  onSelectedCharIdsChange: (ids: string[]) => void;
  onRemoveCharacters: (ids: string[]) => void;
  onReorderCharacters?: (orderedIds: string[]) => void;
  onToggleBoardVisible: (charId: string) => void;
  onDuplicateCharacters?: (ids: string[]) => void;
  onCopy?: (ids: string[]) => void;
  onPaste?: () => void;
}

export function CharacterPanel({
  characters,
  currentUserId,
  selectedCharIds,
  onAddCharacter,
  onSelectCharacter,
  onDoubleClickCharacter,
  onSelectedCharIdsChange,
  onRemoveCharacters,
  onReorderCharacters,
  onToggleBoardVisible,
  onDuplicateCharacters,
  onCopy,
  onPaste,
}: CharacterPanelProps) {
  const [pendingRemove, setPendingRemove] = useState<{ ids: string[]; msg: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; charId?: string } | null>(null);
  const { can, roomRole } = usePermission();
  const canEditChar = can('character_edit');
  const filteredCharacters = characters.filter(c => c.owner_id === currentUserId);
  const canDelete = selectedCharIds.length > 0;

  const throttledToggleBoardVisible = useThrottledCallback(onToggleBoardVisible);

  const iconBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: theme.textSecondary,
    cursor: 'pointer',
    fontSize: '0.85rem',
    padding: '2px 4px',
    lineHeight: 1,
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorderCharacters) return;
    const oldIndex = filteredCharacters.findIndex(c => c.id === active.id);
    const newIndex = filteredCharacters.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(filteredCharacters, oldIndex, newIndex);
    onReorderCharacters(reordered.map(c => c.id));
  }, [filteredCharacters, onReorderCharacters]);

  const handleRowClick = useCallback((e: React.MouseEvent, char: Character) => {
    if (e.shiftKey && selectedCharIds.length > 0) {
      const lastSelected = selectedCharIds[selectedCharIds.length - 1];
      const anchorIdx = filteredCharacters.findIndex(c => c.id === lastSelected);
      const targetIdx = filteredCharacters.findIndex(c => c.id === char.id);
      if (anchorIdx >= 0 && targetIdx >= 0) {
        const start = Math.min(anchorIdx, targetIdx);
        const end = Math.max(anchorIdx, targetIdx);
        onSelectedCharIdsChange(filteredCharacters.slice(start, end + 1).map(c => c.id));
      }
    } else if (e.metaKey || e.ctrlKey) {
      onSelectedCharIdsChange(
        selectedCharIds.includes(char.id)
          ? selectedCharIds.filter(id => id !== char.id)
          : [...selectedCharIds, char.id]
      );
    } else {
      onSelectCharacter(char);
    }
  }, [filteredCharacters, selectedCharIds, onSelectedCharIdsChange, onSelectCharacter]);

  return (
    <>
    <div
      data-selection-panel
      onContextMenu={(e) => {
        e.preventDefault();
        const charEl = (e.target as HTMLElement).closest('[data-char-id]');
        const charId = charEl?.getAttribute('data-char-id') ?? undefined;
        if (charId && !selectedCharIds.includes(charId)) {
          onSelectedCharIdsChange([charId]);
          onSelectCharacter(filteredCharacters.find(c => c.id === charId)!);
        }
        setContextMenu({ x: e.clientX, y: e.clientY, charId });
      }}
      style={{ height: '100%' }}
    >
      <SortableListPanel
      title="キャラクター"
      onBackgroundClick={() => onSelectedCharIdsChange([])}
      headerActions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
          <Tooltip label={selectedCharIds.length > 1 ? `${selectedCharIds.length}件複製` : '複製'}>
            <button
              onClick={() => canDelete && canEditChar && onDuplicateCharacters?.(selectedCharIds)}
              style={{ ...iconBtnStyle, color: theme.textSecondary, opacity: (canDelete && canEditChar) ? 1 : 0.3, pointerEvents: (canDelete && canEditChar) ? 'auto' : 'none' }}
            >
              <Copy size={15} />
            </button>
          </Tooltip>
          <Tooltip label={selectedCharIds.length > 1 ? `${selectedCharIds.length}件削除` : '削除'}>
            <button
              onClick={() => canDelete && canEditChar && setPendingRemove({
                ids: selectedCharIds,
                msg: selectedCharIds.length > 1 ? `${selectedCharIds.length}件のキャラクターを削除しますか？` : 'このキャラクターを削除しますか？',
              })}
              style={{ ...iconBtnStyle, color: theme.danger, opacity: (canDelete && canEditChar) ? 1 : 0.3, pointerEvents: (canDelete && canEditChar) ? 'auto' : 'none' }}
            >
              <Trash2 size={15} />
            </button>
          </Tooltip>
          <Tooltip label="キャラクター追加">
            <button
              onClick={onAddCharacter}
              style={{ ...iconBtnStyle, color: theme.accent }}
            >
              <Plus size={16} />
            </button>
          </Tooltip>
        </div>
      }
      items={filteredCharacters}
      onDragEnd={handleDragEnd}
      emptyMessage="キャラクターがありません"
    >
      {filteredCharacters.map((char) => (
        <div key={char.id} data-char-id={char.id} style={{ display: 'contents' }}>
          <SortableListItem
            id={char.id}
            onClick={(e: React.MouseEvent) => handleRowClick(e, char)}
            onDoubleClick={() => onDoubleClickCharacter?.(char)}
            isSelected={selectedCharIds.includes(char.id)}
            leadingSlot={
              <div style={{
                width: '3px',
                alignSelf: 'stretch',
                background: char.color || '#555555',
                borderRadius: '1px',
                flexShrink: 0,
              }} />
            }
            handleExtra={
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  const isSelected = selectedCharIds.includes(char.id);
                  onSelectedCharIdsChange(
                    isSelected
                      ? selectedCharIds.filter(id => id !== char.id)
                      : [...selectedCharIds, char.id]
                  );
                }}
                style={{
                  width: '12px',
                  height: '12px',
                  border: `1px solid ${theme.textMuted}`,
                  borderRadius: '2px',
                  background: selectedCharIds.includes(char.id) ? theme.textMuted : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: theme.bgBase,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                {selectedCharIds.includes(char.id) && '✓'}
              </div>
            }
          >
            {/* アバター */}
            {char.images[char.active_image_index]?.asset_id && resolveAssetId(char.images[char.active_image_index].asset_id) ? (
              <img
                src={resolveAssetId(char.images[char.active_image_index].asset_id) ?? ''}
                alt={char.name}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 0,
                  objectFit: 'cover',
                  objectPosition: 'top',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 0,
                  background: char.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '1rem',
                  flexShrink: 0,
                }}
              >
                {char.name.charAt(0)}
              </div>
            )}

            {/* コンテンツ */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '12px',
                  color: theme.textPrimary,
                  display: 'block',
                }}
              >
                {char.name}
              </span>
            </div>

            {/* 表示/非表示ボタン */}
            <Tooltip label={char.board_visible !== false ? '非表示' : '表示'}>
              <button
                onClick={(e) => { e.stopPropagation(); throttledToggleBoardVisible(char.id); }}
                style={{
                  ...iconBtnStyle,
                  color: char.board_visible !== false ? theme.textSecondary : theme.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  opacity: char.board_visible !== false ? 1 : 0.4,
                }}
              >
                {char.board_visible !== false ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </Tooltip>
          </SortableListItem>
        </div>
      ))}
      </SortableListPanel>
    </div>

    <DropdownMenu
      mode="context"
      open={contextMenu !== null}
      onOpenChange={(open) => { if (!open) setContextMenu(null); }}
      position={contextMenu ?? { x: 0, y: 0 }}
      items={[
        {
          label: '新規作成',
          onClick: () => {
            onAddCharacter();
            setContextMenu(null);
          },
        },
        'separator',
        {
          label: (() => {
            const ids = contextMenu?.charId && !selectedCharIds.includes(contextMenu.charId)
              ? [contextMenu.charId]
              : selectedCharIds;
            return ids.length > 1 ? `${ids.length}件コピー` : 'コピー';
          })(),
          shortcut: shortcutLabel('C'),
          disabled: !contextMenu?.charId && selectedCharIds.length === 0,
          onClick: () => {
            const ids = contextMenu?.charId && !selectedCharIds.includes(contextMenu.charId)
              ? [contextMenu.charId]
              : selectedCharIds;
            if (ids.length > 0) {
              onCopy?.(ids);
            }
            setContextMenu(null);
          },
        },
        {
          label: (() => {
            const ids = contextMenu?.charId && !selectedCharIds.includes(contextMenu.charId)
              ? [contextMenu.charId]
              : selectedCharIds;
            return ids.length > 1 ? `${ids.length}件複製` : '複製';
          })(),
          shortcut: shortcutLabel('D'),
          disabled: (() => {
            const ids = contextMenu?.charId && !selectedCharIds.includes(contextMenu.charId)
              ? [contextMenu.charId]
              : selectedCharIds;
            if (ids.length === 0) return true;
            if (!canEditChar) return true;
            // sub_owner 以上なら全キャラ操作可能
            if (hasRole(roomRole, 'sub_owner')) return false;
            // user は自分のキャラのみ
            return ids.some(id => {
              const c = characters.find(ch => ch.id === id);
              return c && c.owner_id !== currentUserId;
            });
          })(),
          onClick: () => {
            const ids = contextMenu?.charId && !selectedCharIds.includes(contextMenu.charId)
              ? [contextMenu.charId]
              : selectedCharIds;
            if (ids.length > 0) {
              onDuplicateCharacters?.(ids);
            }
            setContextMenu(null);
          },
        },
        {
          label: (() => {
            const ids = contextMenu?.charId && !selectedCharIds.includes(contextMenu.charId)
              ? [contextMenu.charId]
              : selectedCharIds;
            return ids.length > 1 ? `${ids.length}件削除` : '削除';
          })(),
          shortcut: 'Del',
          danger: true,
          disabled: (() => {
            const ids = contextMenu?.charId && !selectedCharIds.includes(contextMenu.charId)
              ? [contextMenu.charId]
              : selectedCharIds;
            if (ids.length === 0) return true;
            if (!canEditChar) return true;
            // sub_owner 以上なら全キャラ操作可能
            if (hasRole(roomRole, 'sub_owner')) return false;
            // user は自分のキャラのみ
            return ids.some(id => {
              const c = characters.find(ch => ch.id === id);
              return c && c.owner_id !== currentUserId;
            });
          })(),
          onClick: () => {
            const ids = contextMenu?.charId && !selectedCharIds.includes(contextMenu.charId)
              ? [contextMenu.charId]
              : selectedCharIds;
            if (ids.length > 0) {
              setPendingRemove({
                ids,
                msg: ids.length > 1 ? `${ids.length}件のキャラクターを削除しますか？` : 'このキャラクターを削除しますか？',
              });
            }
            setContextMenu(null);
          },
        },
        'separator',
        {
          label: '貼り付け',
          shortcut: shortcutLabel('V'),
          disabled: !onPaste || !canEditChar,
          onClick: () => {
            onPaste?.();
            setContextMenu(null);
          },
        },
      ]}
    />

    {pendingRemove && (
      <ConfirmModal
        message={pendingRemove.msg}
        confirmLabel="削除"
        danger
        onConfirm={() => { onRemoveCharacters(pendingRemove.ids); setPendingRemove(null); }}
        onCancel={() => setPendingRemove(null)}
      />
    )}
    </>
  );
}
