import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { SceneEditor } from '../SceneEditor';
import { CharacterEditor } from '../CharacterEditor';
import { ObjectEditor } from '../ObjectEditor';
import { CutinEditor } from '../CutinEditor';
import { PieceEditor } from '../PieceEditor';
import { theme } from '../../../styles/theme';

export function PropertyDockPanel() {
  const ctx = useAdrasteaContext();

  // PieceEditor
  if (ctx.editingPieceId) {
    const piece = ctx.pieces.find((p) => p.id === ctx.editingPieceId);
    if (piece) {
      return (
        <PieceEditor
          key={piece.id}
          piece={piece}
          characters={ctx.characters}
          roomId={ctx.roomId}
          onSave={ctx.updatePiece}
          onClose={() => ctx.setEditingPieceId(null)}
        />
      );
    }
  }

  // ObjectEditor
  if (ctx.editingObjectId !== undefined && ctx.roomId) {
    return (
      <ObjectEditor
        key={ctx.editingObjectId ?? 'new-object'}
        object={ctx.editingObjectId ? ctx.mergedObjects.find((o) => o.id === ctx.editingObjectId) ?? null : null}
        scope={ctx.editingObjectScope}
        roomId={ctx.roomId}
        onSave={async (data) => {
          if (ctx.editingObjectId) {
            await ctx.updateObject(ctx.editingObjectScope, ctx.editingObjectId, data);
          } else {
            await ctx.addObject(ctx.editingObjectScope, data);
          }
        }}
        onDelete={ctx.editingObjectId ? () => ctx.removeObject(ctx.editingObjectScope, ctx.editingObjectId!) : undefined}
        onClose={() => ctx.setEditingObjectId(undefined)}
      />
    );
  }

  // SceneEditor
  if (ctx.editingScene !== undefined && ctx.roomId) {
    return (
      <SceneEditor
        key={ctx.editingScene?.id ?? 'new-scene'}
        scene={ctx.editingScene}
        roomId={ctx.roomId}
        onSave={async (data) => {
          if (ctx.editingScene) {
            await ctx.updateScene(ctx.editingScene.id, data);
          } else {
            await ctx.addScene(data);
          }
        }}
        onClose={() => ctx.setEditingScene(undefined)}
      />
    );
  }

  // CharacterEditor
  if (ctx.editingCharacter !== undefined && ctx.roomId) {
    return (
      <CharacterEditor
        key={ctx.editingCharacter?.id ?? 'new-character'}
        character={ctx.editingCharacter}
        roomId={ctx.roomId}
        onSave={async (data) => {
          if (ctx.editingCharacter) {
            await ctx.updateCharacter(ctx.editingCharacter.id, data);
          } else {
            await ctx.addCharacter(data);
          }
        }}
        onClose={() => ctx.setEditingCharacter(undefined)}
      />
    );
  }

  // CutinEditor
  if (ctx.editingCutin !== undefined && ctx.roomId) {
    return (
      <CutinEditor
        key={ctx.editingCutin?.id ?? 'new-cutin'}
        cutin={ctx.editingCutin}
        roomId={ctx.roomId}
        onSave={async (data) => {
          if (ctx.editingCutin) {
            await ctx.updateCutin(ctx.editingCutin.id, data);
          } else {
            await ctx.addCutin(data);
          }
        }}
        onDelete={ctx.editingCutin ? () => ctx.removeCutin(ctx.editingCutin!.id) : undefined}
        onClose={() => ctx.setEditingCutin(undefined)}
      />
    );
  }

  // 何も選択されていない
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.textMuted,
      fontSize: '12px',
    }}>
      対象を選択してください
    </div>
  );
}
