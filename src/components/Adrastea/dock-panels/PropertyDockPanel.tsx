import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { SceneEditor } from '../SceneEditor';
import { CharacterEditor } from '../CharacterEditor';
import { ObjectEditor } from '../ObjectEditor';
import { CutinEditor } from '../CutinEditor';
import { PieceEditor } from '../PieceEditor';
import { BgmEditor } from '../BgmEditor';

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
    // Firestoreの最新データを参照（レイヤーパネル等でのリネームを反映するため）
    const liveScene = ctx.editingScene
      ? ctx.scenes.find(s => s.id === ctx.editingScene!.id) ?? ctx.editingScene
      : null;
    return (
      <SceneEditor
        key={liveScene?.id ?? 'new-scene'}
        scene={liveScene}
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

  // BgmEditor
  if (ctx.editingBgmId) {
    const track = ctx.bgms.find((b) => b.id === ctx.editingBgmId);
    if (track) {
      return (
        <BgmEditor
          key={track.id}
          track={track}
          activeSceneId={ctx.activeScene?.id ?? null}
          onUpdate={ctx.updateBgm}
          onClose={() => ctx.setEditingBgmId(null)}
        />
      );
    }
  }

  return null;
}
