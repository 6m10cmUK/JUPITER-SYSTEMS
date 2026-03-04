import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { Board } from '../Board';

export function BoardDockPanel() {
  const ctx = useAdrasteaContext();

  const handleMoveObject = (id: string, x: number, y: number) => {
    const scope = ctx.roomObjects.some(o => o.id === id) ? 'room' as const : 'scene' as const;
    ctx.updateObject(scope, id, { x, y });
  };

  const handleEditObject = (id: string) => {
    const scope = ctx.roomObjects.some(o => o.id === id) ? 'room' as const : 'scene' as const;
    ctx.setEditingObjectScope(scope);
    ctx.setEditingObjectId(id);
  };

  return (
    <Board
      pieces={ctx.pieces}
      backgroundUrl={ctx.boardBackgroundUrl}
      objects={ctx.mergedObjects}
      onMovePiece={ctx.movePiece}
      onRemovePiece={ctx.removePiece}
      onEditPiece={ctx.setEditingPieceId}
      onMoveObject={handleMoveObject}
      onEditObject={handleEditObject}
    />
  );
}
