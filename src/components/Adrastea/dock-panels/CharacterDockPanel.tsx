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

  const handleAddCharacter = () => {
    ctx.clearAllEditing();
    ctx.setEditingCharacter(null);
    setModalChar(null);
  };

  const handleEditCharacter = (char: Character) => {
    ctx.clearAllEditing();
    ctx.setEditingCharacter(char);
    setModalChar(char);
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

  return (
    <>
      <CharacterPanel
        characters={ctx.characters}
        onAddCharacter={handleAddCharacter}
        onEditCharacter={handleEditCharacter}
        onRemoveCharacter={ctx.removeCharacter}
        onReorderCharacters={ctx.reorderCharacters}
        onClose={() => {}}
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
