import { useState, useCallback, useRef, useMemo } from 'react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { useAuth } from '../../../contexts/AuthContext';
import { hasRole, checkPermission } from '../../../config/permissions';
import { handleClipboardImport } from '../../../hooks/usePasteHandler';
import { Board } from '../Board';
import { AssetLibraryModal } from '../AssetLibraryModal';
import { MessagePopup } from '../ui/MessagePopup';

export function BoardDockPanel() {
  const ctx = useAdrasteaContext();
  const { user } = useAuth();
  const [imagePickerTarget, setImagePickerTarget] = useState<{ id: string } | null>(null);

  const handleMoveObject = useCallback((id: string, x: number, y: number) => {
    ctx.moveObject(id, { x, y });
  }, [ctx.moveObject]);

  const handleResizeObject = useCallback((id: string, width: number, height: number) => {
    const obj = ctx.activeObjects.find(o => o.id === id);
    if (obj?.type === 'text' && obj.auto_size && obj.width > 0 && obj.height > 0) {
      // auto_size テキスト: 横・縦の変化が大きい方の比率でフォントサイズを算出
      const ratioW = width / obj.width;
      const ratioH = height / obj.height;
      const ratio = Math.abs(ratioW - 1) > Math.abs(ratioH - 1) ? ratioW : ratioH;
      const newFontSize = Math.max(1, Math.round(obj.font_size * ratio));
      ctx.moveObject(id, { font_size: newFontSize });
      return;
    }
    ctx.moveObject(id, { width, height });
  }, [ctx.moveObject, ctx.activeObjects]);

  // auto_size テキストの描画サイズを width/height に同期（500msデバウンス）
  const syncTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const handleSyncObjectSize = useCallback((id: string, width: number, height: number) => {
    clearTimeout(syncTimerRef.current[id]);
    syncTimerRef.current[id] = setTimeout(() => {
      ctx.moveObject(id, { width, height });
      delete syncTimerRef.current[id];
    }, 500);
  }, [ctx.moveObject]);

  // シングルクリック → プロパティ表示（単一選択）
  const handleSelectObject = useCallback((id: string) => {
    if (!checkPermission(ctx.roomRole, 'object_edit')) return;
    ctx.clearAllEditing();
    ctx.setSelectedObjectIds([id]);
    ctx.setEditingObjectId(id);
  }, [ctx.clearAllEditing, ctx.setSelectedObjectIds, ctx.setEditingObjectId, ctx.roomRole]);

  // ダブルクリック → 画像選択モーダル直表示（テキストオブジェクトは除外）
  const handleEditObject = useCallback((id: string) => {
    if (!checkPermission(ctx.roomRole, 'object_edit')) return;
    const obj = ctx.activeObjects.find(o => o.id === id);
    if (obj?.type === 'text') return;
    setImagePickerTarget({ id });
  }, [ctx.activeObjects, ctx.roomRole]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      await handleClipboardImport(text, (data) => ctx.addCharacter({ ...data, owner_id: ctx.user?.uid ?? '' }), ctx.showToast, async (data) => {
        const targetSort = data.sort_order ?? ctx.activeObjects.length;
        const shifts = ctx.activeObjects
          .filter(o => o.sort_order >= targetSort)
          .map(o => ({ id: o.id, sort: o.sort_order + 1 }));
        if (shifts.length > 0) await ctx.batchUpdateSort(shifts);
        return ctx.addObject({ ...data, sort_order: targetSort, scene_ids: ctx.activeScene ? [ctx.activeScene.id] : [] });
      });
    } catch {
      ctx.showToast('クリップボードの読み取りに失敗しました', 'error');
    }
  }, [ctx.addCharacter, ctx.addObject, ctx.showToast]);

  const latestMessage = useMemo(() => {
    if (!ctx.messages || ctx.messages.length === 0) return null;
    return ctx.messages[ctx.messages.length - 1];
  }, [ctx.messages]);

  const latestCharColor = useMemo(() => {
    if (!latestMessage) return null;
    const char = ctx.characters.find((c) => c.name === latestMessage.sender_name);
    return char?.color ?? null;
  }, [latestMessage, ctx.characters]);

  return (
    <>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Board
          ref={ctx.boardRef}
          pieces={ctx.pieces}
          objects={ctx.activeObjects}
          activeScene={ctx.activeScene}
          gridVisible={ctx.gridVisible}
          onToggleGrid={() => {
            const next = !ctx.gridVisible;
            ctx.setGridVisible(next);
            if (ctx.activeScene) ctx.updateScene(ctx.activeScene.id, { grid_visible: next });
          }}
          characters={ctx.layerOrderedCharacters}
          currentUserId={user?.uid ?? ''}
          onUpdateCharacterBoardPosition={(charId, x, y) => ctx.moveCharacter(charId, { board_x: x, board_y: y })}
          onSelectCharacter={(charId) => {
            const char = ctx.characters.find(c => c.id === charId);
            const isSubOwnerPlus = hasRole(ctx.roomRole, 'sub_owner');
            if (char && (char.owner_id === user?.uid || isSubOwnerPlus)) {
              ctx.clearAllEditing();
              ctx.setEditingCharacter(char);
              ctx.setPanelSelection({ panel: 'character', ids: [charId] });
            }
          }}
          onDoubleClickCharacter={(charId) => {
            const char = ctx.characters.find(c => c.id === charId);
            const isSubOwnerPlus = hasRole(ctx.roomRole, 'sub_owner');
            if (char && (char.owner_id === user?.uid || isSubOwnerPlus)) {
              ctx.setCharacterToOpenModal(char);
            }
          }}
          onMovePiece={ctx.movePiece}
          onRemovePiece={ctx.removePiece}
          onEditPiece={(id) => { ctx.clearAllEditing(); ctx.setEditingPieceId(id); }}
          onMoveObject={handleMoveObject}
          onSelectObject={handleSelectObject}
          onEditObject={handleEditObject}
          onResizeObject={handleResizeObject}
          onSyncObjectSize={handleSyncObjectSize}
          selectedObjectId={ctx.editingObjectId}
          selectedObjectIds={ctx.selectedObjectIds}
          selectedCharacterId={ctx.editingCharacter?.id ?? null}
          onPaste={handlePaste}
        >
          <MessagePopup message={latestMessage} charColor={latestCharColor} />
        </Board>
      </div>
      {imagePickerTarget && (
        <AssetLibraryModal
          onSelect={(url, assetId) => {
            ctx.updateObject(imagePickerTarget.id, { image_url: url || null, image_asset_id: assetId ?? null });
            setImagePickerTarget(null);
          }}
          onClose={() => setImagePickerTarget(null)}
        />
      )}
    </>
  );
}
