import { useState, useCallback, useRef } from 'react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Board } from '../Board';
import { AssetLibraryModal } from '../AssetLibraryModal';
import type { Character } from '../../../types/adrastea.types';

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function formatInitiative(val: number): string {
  if (val === 0) return '';
  // 小数点1桁まで丸め
  const rounded = Math.round(val * 10) / 10;
  // 整数なら整数表示、小数なら1桁
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

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
        const initiative = char.initiative ?? 0;
        const textColor = isLightColor(char.color) ? '#000' : '#fff';
        return (
          <div
            key={char.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              minWidth: 160,
              maxWidth: 220,
            }}
          >
            {/* ヘッダー行: カラー帯 + アイコン + 名前 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                background: 'rgba(0,0,0,0.65)',
              }}
            >
              {/* カラー帯（イニシアチブ表示） */}
              <div
                style={{
                  width: 22,
                  background: char.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: textColor,
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                  padding: '0 2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {formatInitiative(initiative)}
              </div>
              {/* アイコン + 名前 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 6px',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div style={{ flexShrink: 0 }}>
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      style={{ width: 24, height: 24, objectFit: 'cover', objectPosition: 'top' }}
                      draggable={false}
                    />
                  ) : (
                    <div style={{
                      width: 24, height: 24, background: char.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 12, fontWeight: 700,
                    }}>
                      {char.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div style={{
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1,
                }}>
                  {char.name}
                  {!isOwner && char.is_status_private && (
                    <span style={{ marginLeft: 4, color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>🔒</span>
                  )}
                </div>
              </div>
            </div>
            {/* ステータスバー群: カラー帯なし、黒背景なし */}
            {(!char.is_status_private || isOwner) && char.statuses.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {char.statuses.slice(0, 3).map((s, i) => {
                  const ratio = s.max > 0 ? s.value / s.max : 0;
                  const barColor = s.max > 0 && ratio <= 4 / 5 ? '#d9534f' : 'rgba(255,255,255,0.7)';
                  return (
                    <div key={i} style={{ position: 'relative', height: 14, background: 'rgba(255,255,255,0.15)', borderRadius: 2 }}>
                      <div style={{
                        height: '100%',
                        width: `${s.max > 0 ? Math.min(100, ratio * 100) : 0}%`,
                        background: barColor,
                        borderRadius: 2,
                        transition: 'width 0.2s ease',
                      }} />
                      <span style={{
                        position: 'absolute',
                        left: 3,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: 10,
                        color: '#000',
                        fontWeight: 600,
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                      }}>
                        {s.label}
                      </span>
                      <span style={{
                        position: 'absolute',
                        right: 3,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: 10,
                        color: '#000',
                        fontWeight: 600,
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                      }}>
                        {s.value}/{s.max}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
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
          characters={ctx.layerOrderedCharacters}
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
              ctx.setCharacterToOpenModal(char);
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
          selectedCharacterId={ctx.editingCharacter?.id ?? null}
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
