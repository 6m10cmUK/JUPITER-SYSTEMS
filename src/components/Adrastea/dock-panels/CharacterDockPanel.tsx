import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { CharacterPanel } from '../CharacterPanel';

export function CharacterDockPanel() {
  const ctx = useAdrasteaContext();
  return (
    <CharacterPanel
      characters={ctx.characters}
      onAddCharacter={() => ctx.setEditingCharacter(null)}
      onEditCharacter={(char) => ctx.setEditingCharacter(char)}
      onRemoveCharacter={ctx.removeCharacter}
      onClose={() => {}}
    />
  );
}
