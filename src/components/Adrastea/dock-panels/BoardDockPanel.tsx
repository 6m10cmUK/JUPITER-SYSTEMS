import { useState } from 'react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { Board } from '../Board';
import { AssetPickerModal } from '../AssetPicker';
import type { BoardObjectScope } from '../../../types/adrastea.types';

export function BoardDockPanel() {
  const ctx = useAdrasteaContext();
  const [imagePickerTarget, setImagePickerTarget] = useState<{ id: string; scope: BoardObjectScope } | null>(null);

  const getScope = (id: string): BoardObjectScope =>
    ctx.roomObjects.some(o => o.id === id) ? 'room' : 'scene';

  const handleMoveObject = (id: string, x: number, y: number) => {
    ctx.updateObject(getScope(id), id, { x, y });
  };

  // シングルクリック → プロパティ表示
  const handleSelectObject = (id: string) => {
    ctx.clearAllEditing();
    const scope = getScope(id);
    ctx.setEditingObjectScope(scope);
    ctx.setEditingObjectId(id);
  };

  // ダブルクリック → 画像選択モーダル直表示
  const handleEditObject = (id: string) => {
    const scope = getScope(id);
    setImagePickerTarget({ id, scope });
  };

  return (
    <>
      <Board
        ref={ctx.boardRef}
        pieces={ctx.pieces}
        objects={ctx.mergedObjects}
        gridVisible={ctx.gridVisible}
        onMovePiece={ctx.movePiece}
        onRemovePiece={ctx.removePiece}
        onEditPiece={(id) => { ctx.clearAllEditing(); ctx.setEditingPieceId(id); }}
        onMoveObject={handleMoveObject}
        onSelectObject={handleSelectObject}
        onEditObject={handleEditObject}
      />
      {imagePickerTarget && (
        <AssetPickerModal
          onSelect={(url) => {
            ctx.updateObject(imagePickerTarget.scope, imagePickerTarget.id, { image_url: url || null });
            setImagePickerTarget(null);
          }}
          onClose={() => setImagePickerTarget(null)}
        />
      )}
    </>
  );
}
