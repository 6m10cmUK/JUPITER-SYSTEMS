import { useState, useCallback, useRef } from 'react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Board } from '../Board';
import { AssetLibraryModal } from '../AssetLibraryModal';
import type { Character } from '../../../types/adrastea.types';

function CharacterStatusPanel({ characters, currentUserId }: { characters: Character[]; currentUserId: string }) {
  // is_hidden_on_board=false のキャラのみ、initiative 降順でソート
  const visible = [...characters]
    .filter(c => !c.is_hidden_on_board)
    .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));

  if (visible.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 8,
      left: 8,
      zIndex: 10,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      maxHeight: 'calc(100% - 16px)',
      overflowY: 'auto',
    }}>
      {visible.map(char => {
        const isOwner = char.owner_id === currentUserId;
        const imgUrl = char.images[char.active_image_index]?.url ?? null;
        return (
          <div
            key={char.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(0,0,0,0.65)',
              padding: '3px 6px',
              borderLeft: `3px solid ${char.color}`,
              minWidth: 140,
              maxWidth: 200,
            }}
          >
            {/* アイコン */}
            {imgUrl ? (
              <img
                src={imgUrl}
                style={{ width: 24, height: 24, objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }}
                draggable={false}
              />
            ) : (
              <div style={{
                width: 24, height: 24, background: char.color, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 11, fontWeight: 700,
              }}>
                {char.name.charAt(0)}
              </div>
            )}
            {/* 名前・ステータス */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: '#fff', fontSize: 11, fontWeight: 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {char.name}
                {!isOwner && char.is_status_private && (
                  <span style={{ marginLeft: 4, color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>🔒</span>
                )}
              </div>
              {(!char.is_status_private || isOwner) && char.statuses.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 1 }}>
                  {char.statuses.slice(0, 3).map((s, i) => (
                    <span key={i} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>
                      {s.label}: {s.value}/{s.max}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function BoardDockPanel() {
  const ctx = useAdrasteaContext();
  const { user } = useAuth();
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
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Board
          ref={ctx.boardRef}
          pieces={ctx.pieces}
          objects={ctx.activeObjects}
          activeScene={ctx.activeScene}
          gridVisible={ctx.gridVisible}
          characters={ctx.characters}
          currentUserId={user?.uid ?? ''}
          onUpdateCharacterBoardPosition={(charId, x, y) => ctx.updateCharacter(charId, { board_x: x, board_y: y })}
          onSelectCharacter={(charId) => {
            const char = ctx.characters.find(c => c.id === charId);
            if (char && char.owner_id === user?.uid) {
              ctx.clearAllEditing();
              ctx.setEditingCharacter(char);
            }
          }}
          onDoubleClickCharacter={(charId) => {
            const char = ctx.characters.find(c => c.id === charId);
            if (char && char.owner_id === user?.uid) {
              ctx.setEditingCharacter(char);
            }
          }}
          onContextMenuCharacter={(charId, _e) => {
            const char = ctx.characters.find(c => c.id === charId);
            if (char) {
              ctx.updateCharacter(charId, { board_visible: char.board_visible !== false ? false : true });
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
        />
        <CharacterStatusPanel
          characters={ctx.characters}
          currentUserId={user?.uid ?? ''}
        />
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
