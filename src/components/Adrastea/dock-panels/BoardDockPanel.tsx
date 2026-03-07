import { useState, useCallback } from 'react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { Board } from '../Board';
import { AssetLibraryModal } from '../AssetLibraryModal';

export function BoardDockPanel() {
  const ctx = useAdrasteaContext();
  const [imagePickerTarget, setImagePickerTarget] = useState<{ id: string } | null>(null);

  const handleMoveObject = useCallback((id: string, x: number, y: number) => {
    ctx.updateObject(id, { x, y });
  }, [ctx.updateObject]);

  const handleResizeObject = useCallback((id: string, width: number, height: number) => {
    ctx.updateObject(id, { width, height });
  }, [ctx.updateObject]);

  // シングルクリック → プロパティ表示（単一選択）
  const handleSelectObject = useCallback((id: string) => {
    ctx.clearAllEditing();
    ctx.setSelectedObjectIds([id]);
    ctx.setEditingObjectId(id);
  }, [ctx.clearAllEditing, ctx.setSelectedObjectIds, ctx.setEditingObjectId]);

  // ダブルクリック → 画像選択モーダル直表示（テキストオブジェクトは除外）
  const handleEditObject = useCallback((id: string) => {
    const obj = ctx.activeObjects.find(o => o.id === id);
    if (obj?.type === 'text') return;
    setImagePickerTarget({ id });
  }, [ctx.activeObjects]);

  return (
    <>
      <Board
        ref={ctx.boardRef}
        pieces={ctx.pieces}
        objects={ctx.activeObjects}
        activeScene={ctx.activeScene}
        gridVisible={ctx.gridVisible}
        onMovePiece={ctx.movePiece}
        onRemovePiece={ctx.removePiece}
        onEditPiece={(id) => { ctx.clearAllEditing(); ctx.setEditingPieceId(id); }}
        onMoveObject={handleMoveObject}
        onSelectObject={handleSelectObject}
        onEditObject={handleEditObject}
        onResizeObject={handleResizeObject}
        selectedObjectId={ctx.editingObjectId}
        selectedObjectIds={ctx.selectedObjectIds}
      />
      {imagePickerTarget && (
        <AssetLibraryModal
          onSelect={(url) => {
            ctx.updateObject(imagePickerTarget.id, { image_url: url || null });
            setImagePickerTarget(null);
          }}
          onClose={() => setImagePickerTarget(null)}
        />
      )}
    </>
  );
}
