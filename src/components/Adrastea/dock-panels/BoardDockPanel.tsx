import { useState, useCallback, useRef } from 'react';
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
    const obj = ctx.activeObjects.find(o => o.id === id);
    if (obj?.type === 'text' && obj.auto_size && obj.width > 0 && obj.height > 0) {
      // auto_size テキスト: 横・縦の変化が大きい方の比率でフォントサイズを算出
      const ratioW = width / obj.width;
      const ratioH = height / obj.height;
      const ratio = Math.abs(ratioW - 1) > Math.abs(ratioH - 1) ? ratioW : ratioH;
      const newFontSize = Math.max(1, Math.round(obj.font_size * ratio));
      ctx.updateObject(id, { font_size: newFontSize });
      return;
    }
    ctx.updateObject(id, { width, height });
  }, [ctx.updateObject, ctx.activeObjects]);

  // auto_size テキストの描画サイズを width/height に同期（500msデバウンス）
  const syncTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const handleSyncObjectSize = useCallback((id: string, width: number, height: number) => {
    clearTimeout(syncTimerRef.current[id]);
    syncTimerRef.current[id] = setTimeout(() => {
      ctx.updateObject(id, { width, height });
      delete syncTimerRef.current[id];
    }, 500);
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
        characters={ctx.characters}
        activeSceneId={ctx.activeScene?.id ?? null}
        onUpdateCharacterBoardPosition={(charId, x, y) => ctx.updateCharacter(charId, { board_x: x, board_y: y })}
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
      />
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
