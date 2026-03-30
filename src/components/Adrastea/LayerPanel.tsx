import React, { useState, useEffect, useCallback } from 'react';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import type { BoardObjectType } from '../../types/adrastea.types';
import { ConfirmModal, DropdownMenu } from './ui';
import { AssetLibraryModal } from './AssetLibraryModal';
import { useCharacterContextMenu } from './useCharacterContextMenu';
import { objectToClipboardJson } from '../../utils/clipboardImport';
import { ObjectLayerList } from './ObjectLayerList';
import { CharacterLayerSection } from './CharacterLayerSection';
import { generateDuplicateName } from '../../utils/nameUtils';

export function LayerPanel({ onPaste }: { onPaste?: () => void }) {
  const {
    activeObjects,
    addObject,
    activeScene,
    layerOrderedCharacters,
    panelSelection,
    showToast,
    selectedObjectIds,
    removeCharacter,
    setEditingCharacter,
    addCharacter,
    setCharacterToOpenModal,
    getBoardCenter,
    removeObject,
    keyboardActionsRef,
  } = useAdrasteaContext();

  const [pendingRemove, setPendingRemove] = useState<{ msg: string; action: () => void } | null>(null);
  const [pendingImageAdd, setPendingImageAdd] = useState<{ global: boolean } | null>(null);
  const [charContextMenu, setCharContextMenu] = useState<{ charId: string; x: number; y: number } | null>(null);

  const selectedCharIds = panelSelection?.panel === 'character' ? panelSelection.ids : [];

  // キャラクター右クリックメニュー
  const contextChar = charContextMenu
    ? layerOrderedCharacters.find(c => c.id === charContextMenu.charId) ?? null
    : null;
  const { items: charCtxMenuItems, confirmModal: charCtxConfirmModal } = useCharacterContextMenu(contextChar, {
    currentUserId: '',
    onClose: () => setCharContextMenu(null),
    onDuplicate: async (c) => {
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = c as any;
      await addCharacter({ ...rest, name: generateDuplicateName(c.name, layerOrderedCharacters.map(ch => ch.name)) });
    },
    onRemove: (charId) => {
      removeCharacter(charId);
      setEditingCharacter(undefined);
    },
    onPaste,
  });

  // グローバルキーボードショートカットにハンドラ登録
  useEffect(() => {
    if (selectedObjectIds.length > 0 && panelSelection?.panel === 'layer') {
      keyboardActionsRef.current = {
        copy: () => {
          const objs = activeObjects.filter(o =>
            selectedObjectIds.includes(o.id) && o.type !== 'characters_layer'
          );
          if (objs.length > 0) {
            navigator.clipboard.writeText(objectToClipboardJson(objs));
            showToast(objs.length > 1 ? `${objs.length}件のオブジェクトをコピーしました` : `${objs[0].name} をコピーしました`, 'success');
          }
        },
        duplicate: () => {
          const targets = activeObjects.filter(o =>
            selectedObjectIds.includes(o.id) && o.type !== 'background' && o.type !== 'foreground' && o.type !== 'characters_layer'
          );
          if (targets.length > 0) {
            Promise.all(targets.map(obj => {
              const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = obj as any;
              return addObject({
                ...rest,
                name: generateDuplicateName(obj.name, activeObjects.map(o => o.name)),
                sort_order: obj.sort_order + 1,
              });
            }));
          }
        },
        delete: () => {
          const targets = activeObjects.filter(o =>
            selectedObjectIds.includes(o.id) && o.type !== 'background' && o.type !== 'foreground' && o.type !== 'characters_layer'
          );
          if (targets.length > 0) {
            const msg = targets.length > 1 ? `${targets.length}件のオブジェクトを削除しますか？` : `「${targets[0].name}」を削除しますか？`;
            setPendingRemove({ msg, action: () => Promise.all(targets.map(o => removeObject(o.id))) });
          }
        },
      };
    }
    return () => {
      if (panelSelection?.panel === 'layer') {
        keyboardActionsRef.current = {};
      }
    };
  }, [selectedObjectIds, activeObjects, addObject, removeObject, showToast, panelSelection, keyboardActionsRef]);

  const handleImageAdd = useCallback((global: boolean) => {
    setPendingImageAdd({ global });
  }, []);

  const handleImageSelected = useCallback((_url: string, _assetId?: string, _title?: string, w?: number, h?: number) => {
    if (!pendingImageAdd) return;
    const center = getBoardCenter();
    const nonBg = activeObjects.filter(o => o.type !== 'background');
    const sortOrder = nonBg.length > 0 ? nonBg[0].sort_order + 1 : 0;

    // 画像の比率からグリッド単位のサイズを算出
    let width = 4;
    let height = 4;
    if (w && h) {
      const maxGridSize = 10;
      const aspect = w / h;
      if (aspect >= 1) {
        width = maxGridSize;
        height = Math.max(1, Math.round(maxGridSize / aspect));
      } else {
        height = maxGridSize;
        width = Math.max(1, Math.round(maxGridSize * aspect));
      }
    }

    addObject({
      type: 'panel' as BoardObjectType,
      name: '新規オブジェクト',
      x: center.x,
      y: center.y,
      width,
      height,
      sort_order: sortOrder,
      global: pendingImageAdd.global,
      scene_ids: pendingImageAdd.global ? [] : (activeScene?.id ? [activeScene.id] : []),
      image_asset_id: _assetId ?? null,
    });
    setPendingImageAdd(null);
  }, [pendingImageAdd, activeObjects, activeScene, addObject, getBoardCenter]);

  const handleRemoveRequest = useCallback((msg: string, action: () => void) => {
    setPendingRemove({ msg, action });
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const charEl = (e.target as HTMLElement).closest('[data-char-id]');
    const charId = charEl?.getAttribute('data-char-id') ?? null;
    if (charId) {
      e.preventDefault();
      e.stopPropagation();
      setCharContextMenu({ charId, x: e.clientX, y: e.clientY });
      return;
    }
  }, []);

  const characterSectionNode = (
    <CharacterLayerSection
      characters={layerOrderedCharacters}
      selectedCharIds={selectedCharIds}
      onSelectCharacter={() => {}}
      onCharacterContextMenu={(charId, x, y) => {
        setCharContextMenu({ charId, x, y });
      }}
      onContextMenuClose={() => setCharContextMenu(null)}
      onDoubleClickCharacter={(charId) => {
        const char = layerOrderedCharacters.find(c => c.id === charId);
        if (char) setCharacterToOpenModal(char);
      }}
    />
  );

  return (
    <>
    <div
      onContextMenu={handleContextMenu}
      style={{ height: '100%', overflow: 'auto' }}
    >
      <ObjectLayerList
        onPaste={onPaste}
        onImageAdd={handleImageAdd}
        onRemoveRequest={handleRemoveRequest}
        characterSection={characterSectionNode}
      />
    </div>

    {pendingRemove && (
      <ConfirmModal
        message={pendingRemove.msg}
        confirmLabel="削除"
        danger
        onConfirm={() => { pendingRemove.action(); setPendingRemove(null); }}
        onCancel={() => setPendingRemove(null)}
      />
    )}
    <DropdownMenu
      mode="context"
      open={charContextMenu !== null}
      onOpenChange={(open) => { if (!open) setCharContextMenu(null); }}
      position={charContextMenu ?? { x: 0, y: 0 }}
      items={charCtxMenuItems}
    />
    {charCtxConfirmModal}
    {pendingImageAdd && (
      <AssetLibraryModal
        autoTags={['オブジェクト']}
        onClose={() => setPendingImageAdd(null)}
        onSelect={handleImageSelected}
      />
    )}
    </>
  );
}
