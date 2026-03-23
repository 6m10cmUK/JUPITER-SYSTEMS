import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { useAuth } from '../../../contexts/AuthContext';
import { SceneEditor } from '../SceneEditor';
import { CharacterEditor } from '../CharacterEditor';
import { ObjectEditor } from '../ObjectEditor';
import { CutinEditor } from '../CutinEditor';
import { PieceEditor } from '../PieceEditor';
import { BgmEditor } from '../BgmEditor';
import type React from 'react';

const wrapperStyle: React.CSSProperties = {
  height: '100%',
  overflow: 'hidden',
  boxSizing: 'border-box',
};

export function PropertyDockPanel() {
  const ctx = useAdrasteaContext();
  const { user } = useAuth();

  let content: React.ReactNode = null;

  // PieceEditor
  if (ctx.editingPieceId) {
    const piece = ctx.pieces.find((p) => p.id === ctx.editingPieceId);
    if (piece) {
      content = (
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
  if (!content && ctx.editingObjectId !== undefined && ctx.roomId) {
    content = (
      <ObjectEditor
        key={ctx.editingObjectId ?? 'new-object'}
        object={ctx.editingObjectId ? ctx.activeObjects.find((o) => o.id === ctx.editingObjectId) ?? null : null}
        roomId={ctx.roomId}
        onSave={async (data) => {
          if (ctx.editingObjectId) {
            await ctx.updateObject(ctx.editingObjectId, data);
          } else {
            await ctx.addObject(data);
          }
        }}
        onDelete={ctx.editingObjectId ? () => ctx.removeObject(ctx.editingObjectId!) : undefined}
        onClose={() => ctx.setEditingObjectId(undefined)}
      />
    );
  }

  // SceneEditor
  if (!content && ctx.editingScene !== undefined && ctx.roomId) {
    // Firestoreの最新データを参照（レイヤーパネル等でのリネームを反映するため）
    const liveScene = ctx.editingScene
      ? ctx.scenes.find(s => s.id === ctx.editingScene!.id) ?? ctx.editingScene
      : null;
    content = (
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
        onDelete={ctx.editingScene ? () => ctx.removeScene(ctx.editingScene!.id) : undefined}
        onClose={() => ctx.setEditingScene(undefined)}
      />
    );
  }

  // CharacterEditor
  const liveEditingCharacter = ctx.editingCharacter?.id
    ? ctx.characters.find(c => c.id === ctx.editingCharacter!.id) ?? ctx.editingCharacter
    : ctx.editingCharacter;
  if (!content && ctx.editingCharacter !== undefined && ctx.roomId) {
    content = (
      <CharacterEditor
        key={liveEditingCharacter?.id ?? 'new-character'}
        character={liveEditingCharacter}
        roomId={ctx.roomId}
        currentUserId={user?.uid ?? ''}
        onSave={async (data) => {
          if (ctx.editingCharacter) {
            await ctx.updateCharacter(ctx.editingCharacter.id, data);
          } else {
            await ctx.addCharacter(data);
          }
        }}
        onDelete={ctx.editingCharacter ? () => { ctx.removeCharacter(ctx.editingCharacter!.id); ctx.setEditingCharacter(undefined); } : undefined}
        onClose={() => ctx.setEditingCharacter(undefined)}
      />
    );
  }

  // CutinEditor
  if (!content && ctx.editingCutin !== undefined && ctx.roomId) {
    content = (
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
  if (!content && ctx.editingBgmId) {
    const track = ctx.bgms.find((b) => b.id === ctx.editingBgmId);
    if (track) {
      content = (
        <BgmEditor
          key={track.id}
          track={track}
          activeSceneId={ctx.activeScene?.id ?? null}
          onUpdate={ctx.updateBgm}
          onDelete={() => { ctx.removeBgm(track.id); ctx.setEditingBgmId(null); }}
          onClose={() => ctx.setEditingBgmId(null)}
        />
      );
    }
  }

  if (!content) return null;

  return <div style={wrapperStyle}>{content}</div>;
}
