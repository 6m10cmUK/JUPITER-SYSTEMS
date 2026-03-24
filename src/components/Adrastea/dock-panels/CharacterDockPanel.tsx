import { useState, useEffect, useRef, useCallback } from 'react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { handleClipboardImport } from '../../../hooks/usePasteHandler';
import { characterToClipboardJson } from '../../../utils/clipboardImport';
import { useThrottledCallback } from '../../../hooks/useThrottledUpdate';
import { CharacterPanel } from '../CharacterPanel';
import { CharacterEditor, type CharacterEditorHandle } from '../CharacterEditor';
import { AdModal, ConfirmModal } from '../ui';
import type { Character } from '../../../types/adrastea.types';
export function CharacterDockPanel() {
  const ctx = useAdrasteaContext();
  const [modalChar, setModalChar] = useState<Character | null | undefined>(undefined);
  const selectedCharIds = ctx.panelSelection?.panel === 'character' ? ctx.panelSelection.ids : [];
  const setSelectedCharIds = useCallback((ids: string[]) => {
    ctx.setPanelSelection(ids.length > 0 ? { panel: 'character', ids } : null);
  }, [ctx.setPanelSelection]);
  const editorRef = useRef<CharacterEditorHandle>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

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
        owner_id: ctx.user?.uid ?? '',
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
    Promise.all(ids.map(id => ctx.removeCharacter(id)));
    setSelectedCharIds([]);
    if (ctx.editingCharacter && ids.includes(ctx.editingCharacter.id)) {
      ctx.setEditingCharacter(undefined);
    }
  };

  const handleDuplicateCharacters = (ids: string[]) => {
    const chars = ctx.characters.filter(c => ids.includes(c.id));
    Promise.all(chars.map(char => {
      const { id, _id, _creationTime, ...rest } = char as any;
      return ctx.addCharacter({
        ...rest,
        owner_id: ctx.user?.uid ?? '',
        name: `${char.name} (コピー)`,
      });
    }));
  };

  const handleToggleBoardVisibleRaw = useCallback((charId: string) => {
    const char = ctx.characters.find(c => c.id === charId);
    if (!char) return;
    ctx.updateCharacter(charId, { board_visible: char.board_visible !== false ? false : true });
  }, [ctx]);

  const handleToggleBoardVisible = useThrottledCallback(handleToggleBoardVisibleRaw);

  const handleCopy = useCallback((ids: string[]) => {
    const chars = ctx.characters.filter(c => ids.includes(c.id));
    if (chars.length === 0) return;
    const json = characterToClipboardJson(chars);
    navigator.clipboard.writeText(json).then(() => {
      ctx.showToast(chars.length > 1 ? `${chars.length}件のキャラクターをコピーしました` : `${chars[0].name} をコピーしました`, 'success');
    }).catch(() => {
      ctx.showToast('コピーに失敗しました', 'error');
    });
  }, [ctx]);

  // Ctrl+C / Ctrl+D / Backspace / Delete
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.contentEditable === 'true')) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (window.getSelection()?.toString()) return;
        if (selectedCharIds.length > 0) {
          e.preventDefault();
          handleCopy(selectedCharIds);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (selectedCharIds.length > 0) {
          e.preventDefault();
          handleDuplicateCharacters(selectedCharIds);
        }
      } else if (e.key === 'Delete') {
        if (selectedCharIds.length > 0) {
          e.preventDefault();
          setPendingDeleteIds(selectedCharIds);
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedCharIds, handleCopy, handleDuplicateCharacters, handleRemoveCharacters]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      await handleClipboardImport(
        text,
        (data) => ctx.addCharacter({ ...data, owner_id: ctx.user?.uid ?? '' }),
        ctx.showToast,
        async (data) => {
          const targetSort = data.sort_order ?? ctx.activeObjects.length;
          const shifts = ctx.activeObjects
            .filter(o => o.sort_order >= targetSort)
            .map(o => ({ id: o.id, sort: o.sort_order + 1 }));
          if (shifts.length > 0) await ctx.batchUpdateSort(shifts);
          return ctx.addObject({ ...data, sort_order: targetSort, scene_ids: ctx.activeScene ? [ctx.activeScene.id] : [] });
        },
        undefined,
        undefined,
        ctx.updateObject,
        ctx.activeObjects,
        ctx.activeScene?.id ?? null,
      );
    } catch {
      ctx.showToast('クリップボードの読み取りに失敗しました', 'error');
    }
  }, [ctx]);

  return (
    <>
      <CharacterPanel
        characters={ctx.characters}
        currentUserId={ctx.user?.uid ?? ''}
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
        onCopy={handleCopy}
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
            currentUserId={ctx.user?.uid ?? ''}
            onSave={handleSave}
            onDuplicate={(data) => {
              ctx.addCharacter({ ...data, owner_id: ctx.user?.uid ?? '' });
              handleModalClose();
            }}
            onDelete={modalChar ? handleDelete : undefined}
            onClose={handleModalClose}
          />
        </AdModal>
      )}
      {pendingDeleteIds && (
        <ConfirmModal
          message={pendingDeleteIds.length > 1 ? `${pendingDeleteIds.length}件のキャラクターを削除しますか？` : 'このキャラクターを削除しますか？'}
          confirmLabel="削除"
          danger
          onConfirm={() => { handleRemoveCharacters(pendingDeleteIds); setPendingDeleteIds(null); }}
          onCancel={() => setPendingDeleteIds(null)}
        />
      )}
    </>
  );
}
