import { useState, useRef } from 'react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { useAuth } from '../../../contexts/AuthContext';
import { theme } from '../../../styles/theme';
import { CharacterEditor, type CharacterEditorHandle } from '../CharacterEditor';
import { ObjectEditor } from '../ObjectEditor';
import { CutinEditor } from '../CutinEditor';
import { PieceEditor } from '../PieceEditor';
import { BgmEditor } from '../BgmEditor';
import { ScenarioTextEditor } from '../ScenarioTextEditor';
import { ConfirmModal, Tooltip } from '../ui';
import { Trash2, Clipboard, CopyPlus, Save } from 'lucide-react';
import { objectToClipboardJson, bgmToClipboardJson } from '../../../utils/clipboardImport';
import type React from 'react';

const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' } as const;

export function PropertyDockPanel() {
  const ctx = useAdrasteaContext();
  const { user } = useAuth();
  const [pendingDelete, setPendingDelete] = useState<{ msg: string; action: () => void } | null>(null);
  const charEditorRef = useRef<CharacterEditorHandle>(null);
  const [charDirty, setCharDirty] = useState(false);

  let content: React.ReactNode = null;
  let footer: React.ReactNode = null;
  let onDelete: (() => void) | undefined;

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
    const obj = ctx.editingObjectId ? ctx.activeObjects.find((o) => o.id === ctx.editingObjectId) ?? null : null;
    const canDelete = ctx.editingObjectId && obj && obj.type !== 'foreground' && obj.type !== 'background' && obj.type !== 'characters_layer';
    content = (
      <ObjectEditor
        key={ctx.editingObjectId ?? 'new-object'}
        object={obj}
        roomId={ctx.roomId}
        onSave={async (data) => {
          if (ctx.editingObjectId) {
            await ctx.updateObject(ctx.editingObjectId, data);
          } else {
            await ctx.addObject(data);
          }
        }}
        onClose={() => ctx.setEditingObjectId(undefined)}
      />
    );
    if (canDelete) {
      onDelete = () => { ctx.removeObject(ctx.editingObjectId!); ctx.setEditingObjectId(undefined); };
    }
    if (obj && canDelete) {
      footer = (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Tooltip label="コピー">
            <button onClick={() => { navigator.clipboard.writeText(objectToClipboardJson(obj)); ctx.showToast(`${obj.name} をコピーしました`, 'success'); }} style={{ ...iconBtn, color: theme.textSecondary }}><Clipboard size={16} /></button>
          </Tooltip>
          <Tooltip label="複製">
            <button onClick={async () => {
              const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = obj as any;
              await ctx.addObject({ ...rest, name: `${obj.name} (複製)`, sort_order: obj.sort_order + 1 });
            }} style={{ ...iconBtn, color: theme.textSecondary }}><CopyPlus size={16} /></button>
          </Tooltip>
        </div>
      );
    }
  }


  // CharacterEditor
  const liveEditingCharacter = ctx.editingCharacter?.id
    ? ctx.characters.find(c => c.id === ctx.editingCharacter!.id) ?? ctx.editingCharacter
    : ctx.editingCharacter;
  if (!content && ctx.editingCharacter !== undefined && ctx.roomId) {
    content = (
      <CharacterEditor
        ref={charEditorRef}
        key={liveEditingCharacter?.id ?? 'new-character'}
        character={liveEditingCharacter}
        roomId={ctx.roomId}
        currentUserId={user?.uid ?? ''}
        hideFooter
        onDirtyChange={setCharDirty}
        onSave={async (data) => {
          if (ctx.editingCharacter) {
            await ctx.updateCharacter(ctx.editingCharacter.id, data);
          } else {
            await ctx.addCharacter(data);
          }
        }}
        onDuplicate={(data) => ctx.addCharacter(data)}
        onClose={() => ctx.setEditingCharacter(undefined)}
      />
    );
    footer = (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {liveEditingCharacter && (
          <Tooltip label="コピー">
            <button onClick={() => charEditorRef.current?.copyToClipboard()} style={{ ...iconBtn, color: theme.textSecondary }}><Clipboard size={16} /></button>
          </Tooltip>
        )}
        {liveEditingCharacter && (
          <Tooltip label="複製">
            <button onClick={() => charEditorRef.current?.duplicate()} style={{ ...iconBtn, color: theme.textSecondary }}><CopyPlus size={16} /></button>
          </Tooltip>
        )}
        <Tooltip label="保存">
          <button onClick={() => charEditorRef.current?.save()} style={{
            ...iconBtn,
            color: charDirty ? '#fff' : theme.textMuted,
            background: charDirty ? theme.accent : 'none',
            borderRadius: '4px',
          }}><Save size={16} /></button>
        </Tooltip>
      </div>
    );
    if (ctx.editingCharacter) {
      onDelete = () => { ctx.removeCharacter(ctx.editingCharacter!.id); ctx.setEditingCharacter(undefined); };
    }
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
        onClose={() => ctx.setEditingCutin(undefined)}
      />
    );
    if (ctx.editingCutin) {
      onDelete = () => { ctx.removeCutin(ctx.editingCutin!.id); ctx.setEditingCutin(undefined); };
    }
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
          onClose={() => ctx.setEditingBgmId(null)}
        />
      );
      onDelete = () => { ctx.removeBgm(track.id); ctx.setEditingBgmId(null); };
      footer = (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Tooltip label="コピー">
            <button onClick={() => { navigator.clipboard.writeText(bgmToClipboardJson(track)); ctx.showToast(`${track.name} をコピーしました`, 'success'); }} style={{ ...iconBtn, color: theme.textSecondary }}><Clipboard size={16} /></button>
          </Tooltip>
          <Tooltip label="複製">
            <button onClick={async () => {
              const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = track as any;
              await ctx.addBgm({ ...rest, name: `${track.name} (複製)` });
            }} style={{ ...iconBtn, color: theme.textSecondary }}><CopyPlus size={16} /></button>
          </Tooltip>
        </div>
      );
    }
  }

  // ScenarioTextEditor
  if (!content && ctx.editingScenarioTextId) {
    const scenarioText = ctx.scenarioTexts.find((t) => t.id === ctx.editingScenarioTextId);
    if (scenarioText) {
      content = (
        <ScenarioTextEditor
          key={scenarioText.id}
          text={scenarioText}
          onUpdate={ctx.updateScenarioText}
          onClose={() => ctx.setEditingScenarioTextId(null)}
        />
      );
      onDelete = () => {
        ctx.removeScenarioText(scenarioText.id);
        ctx.setEditingScenarioTextId(null);
      };
      footer = (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Tooltip label="コピー">
            <button onClick={() => {
              navigator.clipboard.writeText(JSON.stringify({ kind: 'scenario_text', data: { title: scenarioText.title, content: scenarioText.content, speaker_character_id: scenarioText.speaker_character_id, speaker_name: scenarioText.speaker_name, channel_id: scenarioText.channel_id } }));
              ctx.showToast(`${scenarioText.title || 'テキストメモ'} をコピーしました`, 'success');
            }} style={{ ...iconBtn, color: theme.textSecondary }}><Clipboard size={16} /></button>
          </Tooltip>
          <Tooltip label="複製">
            <button onClick={async () => {
              await ctx.addScenarioText({
                title: `${scenarioText.title} (複製)`,
                content: scenarioText.content,
                speaker_character_id: scenarioText.speaker_character_id,
                speaker_name: scenarioText.speaker_name,
                channel_id: scenarioText.channel_id,
              });
            }} style={{ ...iconBtn, color: theme.textSecondary }}><CopyPlus size={16} /></button>
          </Tooltip>
        </div>
      );
    }
  }

  if (!content) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {content}
      </div>
      {(footer || onDelete) && (
        <div style={{ padding: '8px', borderTop: `1px solid ${theme.borderSubtle}`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {onDelete ? (
            <Tooltip label="削除">
              <button
                onClick={() => setPendingDelete({ msg: '削除しますか？', action: onDelete! })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.danger, padding: '4px', display: 'flex' }}
              >
                <Trash2 size={16} />
              </button>
            </Tooltip>
          ) : <div />}
          {footer}
        </div>
      )}
      {pendingDelete && (
        <ConfirmModal
          message={pendingDelete.msg}
          confirmLabel="削除"
          danger
          onConfirm={() => { pendingDelete.action(); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
