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
          onClick={() => onSelectCharacter(char)}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              background: char.id === selectedCharId ? `${theme.accent}33` : 'transparent',
              padding: '0 4px',
              borderRadius: '4px',
            }}
          >
            {/* アバター */}
            {char.images[char.active_image_index]?.url ? (
              <img
                src={char.images[char.active_image_index].url}
                alt={char.name}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
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

            {/* 情報 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: theme.textPrimary,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {char.name}
              </div>
              {char.statuses.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
                  {char.statuses.map((s, i) => (
                    <span key={i} style={{ color: theme.textSecondary, fontSize: '0.7rem' }}>
                      {s.label}: {s.value}/{s.max}
                    </span>
                  ))}
                </div>
              )}
            </div>

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
          </div>
        </SortableListItem>
      ))}
    </SortableListPanel>
  );
}
