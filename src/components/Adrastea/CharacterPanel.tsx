import { useCallback, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { theme } from '../../styles/theme';
import type { Character } from '../../types/adrastea.types';
import { SortableListPanel, SortableListItem, Tooltip, ConfirmModal } from './ui';

interface CharacterPanelProps {
  characters: Character[];
  currentUserId: string;
  selectedCharId?: string | null;
  selectedCharIds: string[];
  onAddCharacter: () => void;
  onSelectCharacter: (char: Character) => void;
  onDoubleClickCharacter?: (char: Character) => void;
  onSelectedCharIdsChange: (ids: string[]) => void;
  onRemoveCharacters: (ids: string[]) => void;
  onReorderCharacters?: (orderedIds: string[]) => void;
}

export function CharacterPanel({
  characters,
  currentUserId,
  selectedCharId,
  selectedCharIds,
  onAddCharacter,
  onSelectCharacter,
  onDoubleClickCharacter,
  onSelectedCharIdsChange,
  onRemoveCharacters,
  onReorderCharacters,
}: CharacterPanelProps) {
  const [pendingRemove, setPendingRemove] = useState<{ ids: string[]; msg: string } | null>(null);
  const filteredCharacters = characters.filter(c => c.owner_id === currentUserId);
  const canDelete = selectedCharIds.length > 0;

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

  return (
    <>
    <SortableListPanel
      title="キャラクター"
      headerActions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
          {canDelete && (
            <Tooltip label={selectedCharIds.length > 1 ? `${selectedCharIds.length}件削除` : '削除'}>
              <button
                onClick={() => setPendingRemove({
                  ids: selectedCharIds,
                  msg: selectedCharIds.length > 1 ? `${selectedCharIds.length}件のキャラクターを削除しますか？` : 'このキャラクターを削除しますか？',
                })}
                style={{ ...iconBtnStyle, color: theme.danger }}
              >
                <Trash2 size={13} />
              </button>
            </Tooltip>
          )}
          <Tooltip label="キャラクター追加">
            <button
              onClick={onAddCharacter}
              style={{ ...iconBtnStyle, color: theme.accent }}
            >
              <Plus size={14} />
            </button>
          </Tooltip>
        </div>
      }
      items={filteredCharacters}
      onDragEnd={handleDragEnd}
      emptyMessage="キャラクターがありません"
    >
      {filteredCharacters.map((char) => (
        <SortableListItem
          key={char.id}
          id={char.id}
          onClick={() => onSelectCharacter(char)}
          onDoubleClick={() => onDoubleClickCharacter?.(char)}
          isSelected={char.id === selectedCharId || selectedCharIds.includes(char.id)}
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
                fontSize: '9px',
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
          {char.images[char.active_image_index]?.url ? (
            <img
              src={char.images[char.active_image_index].url}
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
            {char.statuses.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                {char.statuses.slice(0, 3).map((s, i) => (
                  <span key={i} style={{ color: theme.textSecondary, fontSize: '0.7rem' }}>
                    {s.label}: {s.value}/{s.max}
                  </span>
                ))}
              </div>
            )}
          </div>
        </SortableListItem>
      ))}
    </SortableListPanel>

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
