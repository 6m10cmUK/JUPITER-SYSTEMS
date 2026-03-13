import { useState } from 'react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { useAuth } from '../../../contexts/AuthContext';
import { CharacterPanel } from '../CharacterPanel';
import { CharacterEditor } from '../CharacterEditor';
import { AdModal } from '../ui';
import type { Character } from '../../../types/adrastea.types';

export function CharacterDockPanel() {
  const ctx = useAdrasteaContext();
  const { user } = useAuth();
  const [modalChar, setModalChar] = useState<Character | null | undefined>(undefined);
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);

  const handleAddCharacter = () => {
    ctx.clearAllEditing();
    ctx.setEditingCharacter(null);
    setModalChar(null);
  };

  const handleSelectCharacter = (char: Character) => {
    ctx.clearAllEditing();
    ctx.setEditingCharacter(char);
    // プロパティパネルに表示するのみで、モーダルは開かない
  };

  const handleModalClose = () => {
    setModalChar(undefined);
    ctx.setEditingCharacter(undefined);
  };

  const handleSave = (data: Partial<Character>) => {
    if (modalChar) {
      ctx.updateCharacter(modalChar.id, data);
    } else {
      ctx.addCharacter(data);
    }
    handleModalClose();
  };

  const handleDelete = () => {
    if (modalChar) {
      ctx.removeCharacter(modalChar.id);
      handleModalClose();
    }
  };

  const handleRemoveCharacters = (ids: string[]) => {
    ids.forEach(id => ctx.removeCharacter(id));
    setSelectedCharIds([]);
  };

  const handleToggleOnBoard = (charId: string) => {
    const char = ctx.characters.find(c => c.id === charId);
    if (!char) return;
    if (char.on_board) {
      ctx.updateCharacter(charId, { on_board: false });
    } else {
      ctx.updateCharacter(charId, {
        on_board: true,
        board_x: char.board_x ?? 0,
        board_y: char.board_y ?? 0,
        board_height: char.board_height ?? 10,
      });
    }
  };

  const handleToggleBoardVisible = (charId: string) => {
    const char = ctx.characters.find(c => c.id === charId);
    if (!char) return;
    ctx.updateCharacter(charId, { board_visible: char.board_visible !== false ? false : true });
  };

  return (
    <>
      <CharacterPanel
        characters={ctx.characters}
        currentUserId={user?.uid ?? ''}
        selectedCharId={ctx.editingCharacter?.id ?? null}
        selectedCharIds={selectedCharIds}
        onAddCharacter={handleAddCharacter}
        onSelectCharacter={handleSelectCharacter}
        onDoubleClickCharacter={(char) => setModalChar(char)}
        onSelectedCharIdsChange={setSelectedCharIds}
        onRemoveCharacters={handleRemoveCharacters}
        onReorderCharacters={ctx.reorderCharacters}
        onToggleOnBoard={handleToggleOnBoard}
        onToggleBoardVisible={handleToggleBoardVisible}
      />
      {modalChar !== undefined && ctx.roomId && (
        <AdModal
          title={modalChar ? 'キャラクター編集' : 'キャラクター追加'}
          width="500px"
          onClose={handleModalClose}
        >
          <CharacterEditor
            key={modalChar?.id ?? 'new'}
            character={modalChar}
            roomId={ctx.roomId}
            currentUserId={user?.uid ?? ''}
            onSave={handleSave}
            onDuplicate={(data) => {
              ctx.addCharacter(data);
              handleModalClose();
            }}
            onDelete={modalChar ? handleDelete : undefined}
            onClose={handleModalClose}
          />
        </AdModal>
      )}
    </>
  );
}
