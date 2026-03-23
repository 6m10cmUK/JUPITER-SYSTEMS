import { useCallback, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { useAuth } from '../../../contexts/AuthContext';
import { hasRole } from '../../../config/permissions';
import { handleClipboardImport } from '../../../hooks/usePasteHandler';
import { DropdownMenu, shortcutLabel } from '../ui/DropdownMenu';
import { theme } from '../../../styles/theme';

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function formatInitiative(val: number): string {
  if (val === 0) return '0';
  const rounded = Math.round(val * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function StatusBar({
  charId,
  statusIndex,
  status,
  canEdit,
  updateStatusValue,
}: {
  charId: string;
  statusIndex: number;
  status: { label: string; value: number; max: number; color?: string };
  canEdit: boolean;
  updateStatusValue: (charId: string, statusIndex: number, newValue: number) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const ratio = status.max > 0 ? status.value / status.max : 0;
  const barColor = status.max > 0 && ratio <= 4 / 5 ? '#d9534f' : 'rgba(255,255,255,0.7)';

  const handleBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 2) return; // 右クリックのみ
    e.preventDefault();
    e.stopPropagation();
    if (!canEdit) return;

    setIsDragging(true);
    const barEl = e.currentTarget;
    const rect = barEl.getBoundingClientRect();

    const calcValue = (clientX: number) => {
      const clampedX = Math.max(rect.left, Math.min(clientX, rect.right));
      const r = (clampedX - rect.left) / rect.width;
      return Math.round(r * status.max);
    };

    const onMouseMove = (moveE: MouseEvent) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const newValue = calcValue(moveE.clientX);
        dragRef.current = newValue;
        updateStatusValue(charId, statusIndex, newValue);
      });
    };

    const onMouseUp = () => {
      setIsDragging(false);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // 初回クリック位置も反映
    const initVal = calcValue(e.clientX);
    dragRef.current = initVal;
    updateStatusValue(charId, statusIndex, initVal);
  };

  return (
    <div
      style={{
        position: 'relative',
        height: 16,
        background: 'rgba(255,255,255,0.1)',
        cursor: canEdit ? 'ew-resize' : 'default',
      }}
      onMouseDown={handleBarMouseDown}
      onContextMenu={(e) => { e.preventDefault(); }}
    >
      <div style={{
        height: '100%',
        width: `${status.max > 0 ? Math.min(100, ratio * 100) : 0}%`,
        background: barColor,
        transition: isDragging ? 'none' : 'width 0.2s ease',
      }} />
      <span style={{
        position: 'absolute',
        left: 4,
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 12,
        color: '#000',
        fontWeight: 700,
        pointerEvents: 'none',
        textShadow: '0 0 4px #fff, 0 0 4px #fff',
      }}>
        {status.label}
      </span>
      <span style={{
        position: 'absolute',
        right: canEdit ? 14 : 4,
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 12,
        color: '#000',
        fontWeight: 600,
        pointerEvents: 'none',
        textShadow: '0 0 4px #fff, 0 0 4px #fff',
      }}>
        {status.value}/{status.max}
      </span>
      {canEdit && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0 3px',
              fontSize: 9,
              lineHeight: 1,
              color: '#000',
              textShadow: '0 0 4px #fff, 0 0 4px #fff',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={(e) => {
              e.stopPropagation();
              updateStatusValue(charId, statusIndex, status.value + 1);
            }}
          >
            ▲
          </button>
          <button
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0 3px',
              fontSize: 9,
              lineHeight: 1,
              color: '#000',
              textShadow: '0 0 4px #fff, 0 0 4px #fff',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={(e) => {
              e.stopPropagation();
              updateStatusValue(charId, statusIndex, status.value - 1);
            }}
          >
            ▼
          </button>
        </div>
      )}
    </div>
  );
}

export function StatusDockPanel() {
  const ctx = useAdrasteaContext();
  const { user } = useAuth();
  const currentUserId = user?.uid ?? '';
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const visible = [...ctx.characters]
    .filter(c => !c.is_hidden_on_board)
    .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));

  const isSubOwnerPlus = hasRole(ctx.roomRole, 'sub_owner');

  const handleClick = useCallback((charId: string) => {
    const char = ctx.characters.find(c => c.id === charId);
    if (char && (char.owner_id === user?.uid || isSubOwnerPlus)) {
      ctx.clearAllEditing();
      ctx.setEditingCharacter(char);
    }
  }, [ctx, user?.uid, isSubOwnerPlus]);

  const handleDoubleClick = useCallback((charId: string) => {
    const char = ctx.characters.find(c => c.id === charId);
    if (char && (char.owner_id === user?.uid || isSubOwnerPlus)) {
      ctx.setCharacterToOpenModal(char);
    }
  }, [ctx, user?.uid, isSubOwnerPlus]);

  const updateStatusValue = useCallback((charId: string, statusIndex: number, newValue: number) => {
    const char = ctx.characters.find(c => c.id === charId);
    if (!char) return;
    const newStatuses = char.statuses.map((s, i) =>
      i === statusIndex ? { ...s, value: Math.max(0, Math.min(s.max, newValue)) } : s
    );
    ctx.updateCharacter(charId, { statuses: newStatuses });
  }, [ctx]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      await handleClipboardImport(text, (data) => ctx.addCharacter({ ...data, owner_id: ctx.user?.uid ?? '' }), ctx.showToast, async (data) => {
        const targetSort = data.sort_order ?? ctx.activeObjects.length;
        const shifts = ctx.activeObjects
          .filter(o => o.sort_order >= targetSort)
          .map(o => ({ id: o.id, sort: o.sort_order + 1 }));
        if (shifts.length > 0) await ctx.batchUpdateSort(shifts);
        return ctx.addObject({ ...data, sort_order: targetSort, scene_ids: ctx.activeScene ? [ctx.activeScene.id] : [] });
      });
    } catch {
      ctx.showToast('クリップボードの読み取りに失敗しました', 'error');
    }
  }, [ctx.addCharacter, ctx.addObject, ctx.showToast]);

  return (
    <>
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenuPos({ x: e.clientX, y: e.clientY });
        }}
        style={{
          height: '100%',
          overflow: 'auto',
          background: theme.bgSurface,
          color: theme.textPrimary,
          padding: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {visible.length === 0 ? (
          <div style={{ padding: 16, color: theme.textMuted, textAlign: 'center', fontSize: 12 }}>
            表示するキャラクターがいません
          </div>
        ) : visible.map(char => {
          const isOwner = char.owner_id === currentUserId;
          const imgUrl = char.images[char.active_image_index]?.url ?? null;
          const isPrivate = char.is_status_private && !isOwner && !isSubOwnerPlus;
          const initiative = char.initiative ?? 0;
          const textColor = isLightColor(char.color) ? '#000' : '#fff';
          const showStatuses = !isPrivate && char.statuses.length > 0;
          const hasSheetUrl = !!char.sheet_url;

          return (
            <div
              key={char.id}
              style={{
                display: 'flex',
                gap: 6,
                padding: 4,
                borderLeft: `3px solid ${char.color}`,
                borderBottom: `1px solid ${theme.borderSubtle}`,
              }}
            >
              {/* アイコン + イニシアチブバッジ */}
              <div
                style={{ position: 'relative', flexShrink: 0, cursor: (isOwner || isSubOwnerPlus) ? 'pointer' : 'default' }}
                onClick={() => handleClick(char.id)}
                onDoubleClick={() => handleDoubleClick(char.id)}
              >
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    style={{ width: 48, height: 48, objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                    draggable={false}
                  />
                ) : (
                  <div style={{
                    width: 48, height: 48, background: char.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 18, fontWeight: 700,
                  }}>
                    {char.name.charAt(0)}
                  </div>
                )}
                {/* イニシアチブバッジ */}
                <div style={{
                  position: 'absolute',
                  top: -2,
                  left: -2,
                  background: char.color,
                  color: textColor,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '0 3px',
                  lineHeight: '16px',
                  minWidth: 16,
                  textAlign: 'center',
                }}>
                  {isPrivate ? '?' : formatInitiative(initiative)}
                </div>
              </div>
              {/* 右側: 名前 + ステータスバー */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* 名前行: 名前 + 右端にボタン群 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 2,
                }}>
                  {/* 名前 */}
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: theme.textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}>
                    {char.name}
                  </span>
                  {/* 外部URL */}
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: hasSheetUrl ? 'pointer' : 'default',
                      opacity: hasSheetUrl ? 0.8 : 0.25,
                      color: theme.textPrimary,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title={hasSheetUrl ? char.sheet_url! : '外部URLが未設定'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasSheetUrl) window.open(char.sheet_url!, '_blank', 'noopener');
                    }}
                    disabled={!hasSheetUrl}
                  >
                    <ExternalLink size={11} />
                  </button>
                </div>
                {/* ステータスバー 2列グリッド */}
                {showStatuses && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 2,
                  }}>
                    {char.statuses.map((s, i) => (
                      <StatusBar
                        key={i}
                        charId={char.id}
                        statusIndex={i}
                        status={s}
                        canEdit={isOwner || isSubOwnerPlus}
                        updateStatusValue={updateStatusValue}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <DropdownMenu
        mode="context"
        open={contextMenuPos !== null}
        onOpenChange={(open) => { if (!open) setContextMenuPos(null); }}
        position={contextMenuPos ?? { x: 0, y: 0 }}
        items={[
          {
            label: '貼り付け',
            shortcut: shortcutLabel('V'),
            onClick: () => {
              handlePaste();
              setContextMenuPos(null);
            },
          },
        ]}
      />
    </>
  );
}
