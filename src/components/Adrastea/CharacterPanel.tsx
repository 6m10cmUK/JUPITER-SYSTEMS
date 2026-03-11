import { useCallback } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { theme } from '../../styles/theme';
import type { Character } from '../../types/adrastea.types';
import { SortableListPanel, SortableListItem, Tooltip } from './ui';

interface CharacterPanelProps {
  characters: Character[];
  selectedCharId?: string;
  onAddCharacter: () => void;
  onSelectCharacter: (char: Character) => void;
  onRemoveCharacter: (charId: string) => void;
  onReorderCharacters?: (orderedIds: string[]) => void;
}

export function CharacterPanel({
  characters,
  selectedCharId,
  onAddCharacter,
  onSelectCharacter,
  onRemoveCharacter,
  onReorderCharacters,
}: CharacterPanelProps) {
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
    const oldIndex = characters.findIndex(c => c.id === active.id);
    const newIndex = characters.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(characters, oldIndex, newIndex);
    onReorderCharacters(reordered.map(c => c.id));
  }, [characters, onReorderCharacters]);

  return (
    <SortableListPanel
      title="キャラクター"
      headerActions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
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
      items={characters}
      onDragEnd={handleDragEnd}
      emptyMessage="キャラクターがありません"
    >
      {characters.map((char) => (
        <SortableListItem
          key={char.id}
          id={char.id}
          isSelected={char.id === selectedCharId}
          onClick={() => onSelectCharacter(char)}
        >
          {/* サムネイル */}
            {char.images[char.active_image_index]?.url ? (
              <img
                src={char.images[char.active_image_index].url}
                alt={char.name}
                style={{
                  flexShrink: 0,
                  width: '20px',
                  height: '20px',
                  objectFit: 'cover',
                  borderRadius: '2px',
                  border: `1px solid ${theme.border}`,
                }}
              />
            ) : (
              <div
                style={{
                  flexShrink: 0,
                  width: '20px',
                  height: '20px',
                  borderRadius: '2px',
                  background: char.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '10px',
                }}
              >
                {char.name.charAt(0)}
              </div>
            )}

            {/* 名前 */}
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '12px',
                color: theme.textPrimary,
              }}
            >
              {char.name}
            </span>

            {/* 操作 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveCharacter(char.id); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.danger,
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
        </SortableListItem>
      ))}
    </SortableListPanel>
  );
}
