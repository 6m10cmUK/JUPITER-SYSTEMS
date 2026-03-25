import React, { useState, useEffect, useCallback } from 'react';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import type { BoardObjectType } from '../../types/adrastea.types';
import { ConfirmModal } from './ui';
import { AssetLibraryModal } from './AssetLibraryModal';
import { useCharacterContextMenu } from './useCharacterContextMenu';
import { objectToClipboardJson } from '../../utils/clipboardImport';
import { ObjectLayerList } from './ObjectLayerList';
import { CharacterLayerSection } from './CharacterLayerSection';

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
  } = useAdrasteaContext();

  const [pendingRemove, setPendingRemove] = useState<{ msg: string; action: () => void } | null>(null);
  const [pendingImageAdd, setPendingImageAdd] = useState<{ global: boolean } | null>(null);
  const [contextCharId, setContextCharId] = useState<string | null>(null);

  const selectedCharIds = panelSelection?.panel === 'character' ? panelSelection.ids : [];

  // キャラクター右クリックメニュー
  const contextChar = contextCharId
    ? layerOrderedCharacters.find(c => c.id === contextCharId) ?? null
    : null;
  const { confirmModal: charCtxConfirmModal } = useCharacterContextMenu(contextChar, {
    currentUserId: '',
    onClose: () => setContextCharId(null),
    onDuplicate: async (c) => {
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = c as any;
      await addCharacter({ ...rest, name: `${c.name} (複製)` });
    },
    onRemove: (charId) => {
      removeCharacter(charId);
      setEditingCharacter(undefined);
    },
    onPaste,
  });

  // Ctrl+C / Ctrl+D / Backspace / Delete でオブジェクト操作
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.contentEditable === 'true')) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (window.getSelection()?.toString()) return;
        if (selectedObjectIds.length > 0) {
          const objs = activeObjects.filter(o =>
            selectedObjectIds.includes(o.id) && o.type !== 'characters_layer'
          );
          if (objs.length > 0) {
            e.preventDefault();
            navigator.clipboard.writeText(objectToClipboardJson(objs));
            showToast(objs.length > 1 ? `${objs.length}件のオブジェクトをコピーしました` : `${objs[0].name} をコピーしました`, 'success');
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        const targets = activeObjects.filter(o =>
          selectedObjectIds.includes(o.id) && o.type !== 'background' && o.type !== 'foreground' && o.type !== 'characters_layer'
        );
        if (targets.length > 0) {
          e.preventDefault();
          Promise.all(targets.map(obj => {
            const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = obj as any;
            return addObject({
              ...rest,
              name: `${obj.name} (複製)`,
              sort_order: obj.sort_order + 1,
            });
          }));
        }
      } else if (e.key === 'Delete') {
        const targets = activeObjects.filter(o =>
          selectedObjectIds.includes(o.id) && o.type !== 'background' && o.type !== 'foreground' && o.type !== 'characters_layer'
        );
        if (targets.length > 0) {
          e.preventDefault();
          const msg = targets.length > 1 ? `${targets.length}件のオブジェクトを削除しますか？` : `「${targets[0].name}」を削除しますか？`;
          setPendingRemove({ msg, action: () => Promise.all(targets.map(o => removeObject(o.id))) });
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectedObjectIds, activeObjects, addObject, removeObject, showToast]);

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
      image_url: _url,
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
      setContextCharId(charId);
      return;
    }
  }, []);

  return (
    <>
    <div
      onContextMenu={handleContextMenu}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <ObjectLayerList
        onPaste={onPaste}
        onImageAdd={handleImageAdd}
        onRemoveRequest={handleRemoveRequest}
      />
      <div style={{ flex: '0 0 auto' }}>
        <CharacterLayerSection
          characters={layerOrderedCharacters}
          selectedCharIds={selectedCharIds}
          onSelectCharacter={() => {}}
          onCharacterContextMenu={(charId) => {
            setContextCharId(charId);
          }}
          onContextMenuClose={() => setContextCharId(null)}
          onDoubleClickCharacter={(charId) => {
            const char = layerOrderedCharacters.find(c => c.id === charId);
            if (char) setCharacterToOpenModal(char);
          }}
        />
      </div>
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
    {charCtxConfirmModal}
    {pendingImageAdd && (
      <AssetLibraryModal
        onClose={() => setPendingImageAdd(null)}
        onSelect={handleImageSelected}
      />
    )}
    </>
  );
}
