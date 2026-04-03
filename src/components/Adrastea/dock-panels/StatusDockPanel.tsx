import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useAdrasteaContext } from '../../../contexts/AdrasteaContext';
import { useAuth } from '../../../contexts/AuthContext';
import { hasRole } from '../../../config/permissions';
import { handleClipboardImport } from '../../../hooks/usePasteHandler';
import { DropdownMenu, shortcutLabel } from '../ui/DropdownMenu';
import { Tooltip } from '../ui';
import { resolveAssetId } from '../../../hooks/useAssets';
import { theme } from '../../../styles/theme';
import { EditableStatusBar } from '../status/EditableStatusBar';

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

const STATUS_COL_MIN_WIDTH = 120;

export function StatusDockPanel() {
  const ctx = useAdrasteaContext();
  const { user } = useAuth();
  const currentUserId = user?.uid ?? '';
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [statusCols, setStatusCols] = useState(2);
  const { statusOverlayVisibility, setStatusOverlayVisibility } = ctx;

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setStatusCols(Math.max(1, Math.floor(w / STATUS_COL_MIN_WIDTH)));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const visible = [...ctx.characters]
    .filter(c => !c.is_hidden_on_board && c.board_visible !== false)
    .sort((a, b) => {
      const byInitiative = (b.initiative ?? 0) - (a.initiative ?? 0);
      if (byInitiative !== 0) return byInitiative;
      return a.id.localeCompare(b.id);
    });

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
      i === statusIndex ? { ...s, value: newValue } : s
    );
    ctx.updateCharacter(charId, { statuses: newStatuses });
  }, [ctx]);

  const toggleShowOnBoard = useCallback((charId: string, statusIndex: number) => {
    const key = `${charId}:${statusIndex}`;
    setStatusOverlayVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  }, [setStatusOverlayVisibility]);


  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      await handleClipboardImport(
        text,
        (data) => ctx.addCharacter({ ...data, owner_id: ctx.user?.uid ?? '' }),
        ctx.showToast,
        async (data) => {
          const targetSort = data.sort_order ?? ctx.activeObjects.length;
          const shifts = ctx.activeObjects
            .filter(o => o.sort_order >= targetSort)
            .map(o => ({ id: o.id, sort: o.sort_order + 1 }));
          if (shifts.length > 0) await ctx.batchUpdateSort(shifts);
          return ctx.addObject({ ...data, sort_order: targetSort, scene_ids: ctx.activeScene ? [ctx.activeScene.id] : [] });
        },
        undefined,
        undefined,
        ctx.updateObject,
        ctx.activeObjects,
        ctx.activeScene?.id ?? null,
        undefined,
        ctx.characters?.map(c => c.name),
        ctx.scenarioTexts?.map(t => t.title),
      );
    } catch {
      ctx.showToast('クリップボードの読み取りに失敗しました', 'error');
    }
  }, [ctx]);

  return (
    <>
      <div
        ref={panelRef}
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
          const imgUrl = resolveAssetId(char.images[char.active_image_index]?.asset_id) ?? null;
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
                {/* イニシアチブバッジ + ボタン */}
                <div style={{
                  position: 'absolute',
                  top: -2,
                  left: -2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}>
                  <div style={{
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
                  <Tooltip label={hasSheetUrl ? char.sheet_url! : '外部URLが未設定'}>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasSheetUrl) window.open(char.sheet_url!, '_blank', 'noopener');
                      }}
                      disabled={!hasSheetUrl}
                    >
                      <ExternalLink size={11} />
                    </button>
                  </Tooltip>
                </div>
                {/* ステータスバー 2列グリッド */}
                {showStatuses && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${statusCols}, 1fr)`,
                    gap: 2,
                  }}>
                    {char.statuses.map((s, i) => (
                      <EditableStatusBar
                        key={i}
                        charId={char.id}
                        statusIndex={i}
                        status={s}
                        canEdit={isOwner || isSubOwnerPlus}
                        showOnBoard={!!statusOverlayVisibility[`${char.id}:${i}`]}
                        updateStatusValue={updateStatusValue}
                        toggleShowOnBoard={toggleShowOnBoard}
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
