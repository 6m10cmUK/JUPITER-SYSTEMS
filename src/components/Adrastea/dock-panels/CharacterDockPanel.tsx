import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { CharacterPanel } from '../CharacterPanel';

export function CharacterDockPanel() {
  const ctx = useAdrasteaContext();
  return (
    <CharacterPanel
      characters={ctx.characters}
      onAddCharacter={() => { ctx.clearAllEditing(); ctx.setEditingCharacter(null); }}
      onEditCharacter={(char) => { ctx.clearAllEditing(); ctx.setEditingCharacter(char); }}
      onRemoveCharacter={ctx.removeCharacter}
      onReorderCharacters={ctx.reorderCharacters}
      onClose={() => {}}
    />
  );
}
