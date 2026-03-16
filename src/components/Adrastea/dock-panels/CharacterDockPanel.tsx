import { useState, useEffect, useRef, useCallback } from 'react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { useAuth } from '../../../contexts/AuthContext';
import { handleClipboardImport } from '../../../hooks/usePasteHandler';
import { CharacterPanel } from '../CharacterPanel';
import { CharacterEditor, type CharacterEditorHandle } from '../CharacterEditor';
import { AdModal } from '../ui';
import type { Character } from '../../../types/adrastea.types';
export function CharacterDockPanel() {
  const ctx = useAdrasteaContext();
  const { user } = useAuth();
  const [modalChar, setModalChar] = useState<Character | null | undefined>(undefined);
  const selectedCharIds = ctx.panelSelection?.panel === 'character' ? ctx.panelSelection.ids : [];
  const setSelectedCharIds = useCallback((ids: string[]) => {
    ctx.setPanelSelection(ids.length > 0 ? { panel: 'character', ids } : null);
  }, [ctx.setPanelSelection]);
  const editorRef = useRef<CharacterEditorHandle>(null);

  useEffect(() => {
    if (ctx.characterToOpenModal) {
      setModalChar(ctx.characterToOpenModal);
      ctx.setCharacterToOpenModal(null);
    }
  }, [ctx.characterToOpenModal, ctx]);

  const handleAddCharacter = () => {
    ctx.clearAllEditing();
    const center = ctx.getBoardCenter();
    ctx.setEditingCharacter(null);
    setModalChar({ _initBoardPos: center } as any);
  };

  const handleSelectCharacter = (char: Character) => {
    ctx.clearAllEditing();
    ctx.setEditingCharacter(char);
    setSelectedCharIds([char.id]);
  };

  const handleModalClose = () => {
    setModalChar(undefined);
    // editingCharacter はクリアしない（プロパティパネルに表示を維持）
  };

  const handleModalCloseWithSave = () => {
    editorRef.current?.save();
    // handleSave が handleModalClose() を呼ぶので追加の close は不要
  };

  const handleSave = (data: Partial<Character>) => {
    if (modalChar && modalChar.id) {
      ctx.updateCharacter(modalChar.id, data);
    } else {
      const initPos = (modalChar as any)?._initBoardPos;
      ctx.addCharacter({
        ...data,
        board_visible: true,
        board_x: initPos?.x ?? 0,
        board_y: initPos?.y ?? 0,
      });
    }
    handleModalClose();
  };

  const handleDelete = () => {
    if (modalChar) {
      ctx.removeCharacter(modalChar.id);
      // editingCharacter もクリア
      if (ctx.editingCharacter?.id === modalChar.id) {
        ctx.setEditingCharacter(undefined);
      }
      handleModalClose();
    }
  };

  const handleRemoveCharacters = (ids: string[]) => {
    ids.forEach(id => ctx.removeCharacter(id));
    setSelectedCharIds([]);
    // 削除対象に editingCharacter が含まれていたらクリア
    if (ctx.editingCharacter && ids.includes(ctx.editingCharacter.id)) {
      ctx.setEditingCharacter(undefined);
    }
  };

  const handleDuplicateCharacters = (ids: string[]) => {
    const chars = ctx.characters.filter(c => ids.includes(c.id));
    chars.forEach(char => {
      const { id, _id, _creationTime, ...rest } = char as any;
      ctx.addCharacter({
        ...rest,
        name: `${char.name} (コピー)`,
      });
    });
  };

  const handleToggleBoardVisible = (charId: string) => {
    const char = ctx.characters.find(c => c.id === charId);
    if (!char) return;
    ctx.updateCharacter(charId, { board_visible: char.board_visible !== false ? false : true });
  };

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      await handleClipboardImport(text, ctx.addCharacter, ctx.showToast);
    } catch {
      ctx.showToast('クリップボードの読み取りに失敗しました', 'error');
    }
  }, [ctx.addCharacter, ctx.showToast]);

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
        onDuplicateCharacters={handleDuplicateCharacters}
        onReorderCharacters={ctx.reorderCharacters}
        onToggleBoardVisible={handleToggleBoardVisible}
        onPaste={handlePaste}
      />
      {modalChar !== undefined && ctx.roomId && (
        <AdModal
          title={modalChar?.id ? 'キャラクター編集' : 'キャラクター追加'}
          width="500px"
          onClose={handleModalCloseWithSave}
        >
          <CharacterEditor
            ref={editorRef}
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
