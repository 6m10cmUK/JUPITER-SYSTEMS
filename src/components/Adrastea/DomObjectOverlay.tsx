import { forwardRef, memo, useCallback, useRef, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { BoardObject, Scene, Character, Asset } from '../../types/adrastea.types';
import { GRID_SIZE } from './Board';
import { DropdownMenu } from './ui';
import { useAdrasteaContext } from '../../contexts/AdrasteaContext';
import { useObjectContextMenu } from './useObjectContextMenu';
import { useCharacterContextMenu } from './useCharacterContextMenu';
import { handleClipboardImport } from '../../hooks/usePasteHandler';
import { generateDuplicateName } from '../../utils/nameUtils';
import { resolveAssetId, useAssets } from '../../hooks/useAssets';

// --- フラグ・定数 ---
/** キャラ駒ホバー中のメモスクロール時にBoardのズームを抑止するカウンタ（参照カウント方式） */
export let __blockBoardWheelCount = 0;

const MIN_SIZE_PX = 50;
const EDGE_RATIO = 0.15;        // 要素サイズの 15% をエッジ判定に使う
const EDGE_MIN_PX = 6;          // スクリーン上の最小エッジ幅
const EDGE_MAX_PX = 28;         // スクリーン上の最大エッジ幅

// --- Props ---
interface DomObjectOverlayProps {
  objects: BoardObject[];
  selectedObjectId?: string | null;
  selectedObjectIds?: string[];
  activeScene?: Scene | null;
  stageRef: React.RefObject<any>;
  onMoveObject: (id: string, x: number, y: number) => void;
  onSelectObject: (id: string) => void;
  onEditObject: (id: string) => void;
  onResizeObject?: (id: string, width: number, height: number) => void;
  onSyncObjectSize?: (id: string, width: number, height: number) => void;
  characters?: Character[];
  onUpdateCharacterBoardPosition?: (charId: string, x: number, y: number) => void;
  currentUserId?: string;
  onSelectCharacter?: (charId: string) => void;
  onDoubleClickCharacter?: (charId: string) => void;
  selectedCharacterId?: string | null;
}

// --- ユーティリティ ---
export function colorToDataUrl(color: string): string {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${color}"/></svg>`)}`;
}

function snapToGrid(val: number): number {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

interface Edge { top: boolean; bottom: boolean; left: boolean; right: boolean }

function getEdge(localX: number, localY: number, w: number, h: number): Edge | null {
  const tx = Math.min(EDGE_MAX_PX, Math.max(EDGE_MIN_PX, w * EDGE_RATIO));
  const ty = Math.min(EDGE_MAX_PX, Math.max(EDGE_MIN_PX, h * EDGE_RATIO));
  const top = localY < ty;
  const bottom = localY > h - ty;
  const left = localX < tx;
  const right = localX > w - tx;
  if (!top && !bottom && !left && !right) return null;
  return { top, bottom, left, right };
}

function edgeToCursor(edge: Edge | null): string {
  if (!edge) return 'move';
  const { top, bottom, left, right } = edge;
  if ((top && left) || (bottom && right)) return 'nwse-resize';
  if ((top && right) || (bottom && left)) return 'nesw-resize';
  if (top || bottom) return 'ns-resize';
  if (left || right) return 'ew-resize';
  return 'move';
}

// --- リサイズ状態 ---
interface ResizeState {
  edge: Edge;
  startPointerX: number;
  startPointerY: number;
  origPxX: number;
  origPxY: number;
  origPxW: number;
  origPxH: number;
}

// --- ドラッグ状態 ---
interface DragState {
  startPointerX: number;
  startPointerY: number;
  origPxX: number;
  origPxY: number;
}

// --- MemoPopupコンポーネント ---
interface MemoPopupProps {
  anchorRef: React.RefObject<Element | null>;
  memo: string;
  secretMemo?: string;
  showSecret?: boolean;
  popupRef: React.RefObject<HTMLDivElement | null>;
  onScrollableChange?: (canScroll: boolean) => void;
}

const MemoPopup: React.FC<MemoPopupProps> = ({ anchorRef, memo, secretMemo, showSecret, popupRef, onScrollableChange }) => {
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [posStyle, setPosStyle] = useState<React.CSSProperties | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const popup = popupRef.current;
    if (!anchor || !popup) return;

    const rect = anchor.getBoundingClientRect();
    const popupH = popup.offsetHeight;

    // 水平: 右側に十分スペースがあれば右、なければ CSS right プロパティで左に出す
    // 閾値を POPUP_WIDTH に揃える（ズレると幅が狭くなるバグが出る）
    const POPUP_WIDTH = 380;
    const rightAvail = window.innerWidth - rect.right - 16;
    const leftAvail = rect.left - 16;
    const goRight = rightAvail >= POPUP_WIDTH || (rightAvail >= leftAvail && rightAvail >= 100);
    const maxW = Math.min(POPUP_WIDTH, goRight ? rightAvail : leftAvail);

    // 垂直: 要素上端に合わせる。はみ出るなら上に詰める
    let top = rect.top;
    if (top + popupH > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - popupH - 8);
    }

    const hStyle: React.CSSProperties = goRight
      ? { left: rect.right + 8 }
      : { right: window.innerWidth - rect.left + 8 };

    setPosStyle({ top, maxWidth: maxW, ...hStyle });
  }, []); // マウント時1回のみ実行

  // posStyle 確定後（maxWidth 適用済み）にスクロール可否を通知
  useLayoutEffect(() => {
    const popup = popupRef.current;
    if (!popup || !posStyle) return;
    const canScroll = popup.scrollHeight > popup.clientHeight;
    onScrollableChange?.(canScroll);

    const checkScroll = () => {
      setCanScrollDown(popup.scrollTop + popup.clientHeight < popup.scrollHeight - 2);
      setCanScrollUp(popup.scrollTop > 2);
    };
    checkScroll();
    popup.addEventListener('scroll', checkScroll);
    return () => popup.removeEventListener('scroll', checkScroll);
  }, [posStyle, onScrollableChange]);

  return createPortal(
    <div style={{
      position: 'fixed',
      ...posStyle,
      zIndex: 10000,
      pointerEvents: 'none',
      borderRadius: 4,
      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      overflow: 'hidden',
      visibility: posStyle ? 'visible' : 'hidden',
    }}>
      <div ref={popupRef} style={{
        background: 'rgba(0, 0, 0, 0.72)',
        color: '#fff',
        padding: '8px 10px',
        fontSize: 10,
        lineHeight: 1.5,
        maxHeight: '50vh',
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        borderRadius: 4,
      }}>
        {memo && <div>{memo}</div>}
        {showSecret && secretMemo && (
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.2)',
            marginTop: memo ? 8 : 0,
            paddingTop: memo ? 8 : 0,
            color: 'rgba(255,200,100,0.9)',
          }}>
            {secretMemo}
          </div>
        )}
      </div>
      {canScrollUp && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 36,
          background: 'linear-gradient(to top, transparent, rgba(0,0,0,0.72))',
          borderRadius: '4px 4px 0 0',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 4,
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', lineHeight: 1 }}>▲</span>
        </div>
      )}
      {canScrollDown && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 36,
          background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.72))',
          borderRadius: '0 0 4px 4px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 4,
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', lineHeight: 1 }}>▼</span>
        </div>
      )}
    </div>,
    document.body
  );
};

// --- 共通オブジェクトWrapper ---
const DomObjectWrapper = memo(function DomObjectWrapper({
  obj,
  isSelected,
  isDraggable,
  isResizable,
  stageRef,
  onMove,
  onSelect,
  onEdit,
  onResize,
  children,
  style: extraStyle,
}: {
  obj: BoardObject;
  isSelected: boolean;
  isDraggable: boolean;
  isResizable: boolean;
  stageRef: React.RefObject<any>;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onResize?: (id: string, width: number, height: number, oldWidth?: number, oldHeight?: number) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const pxX = obj.x * GRID_SIZE;
  const pxY = obj.y * GRID_SIZE;
  const pxW = obj.width * GRID_SIZE;
  const pxH = obj.height * GRID_SIZE;

  const elRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const [hovered, setHovered] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const blockingRef = useRef(false);
  const hasMemo = !!(obj.memo && (obj.type === 'panel' || obj.type === 'text'));

  const ctx = useAdrasteaContext();
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
      );
    } catch {
      ctx.showToast('クリップボードの読み取りに失敗しました', 'error');
    }
  }, [ctx]);
  const { items: ctxMenuItems, confirmModal } = useObjectContextMenu([obj], {
    onClose: () => setContextMenuPos(null),
    onPaste: handlePaste,
    showUndoRedo: true,
  });

  // ホバー終了・アンマウント時にカウンタをクリーンアップ
  useEffect(() => {
    if (!hovered || !hasMemo) {
      if (blockingRef.current) {
        __blockBoardWheelCount = Math.max(0, __blockBoardWheelCount - 1);
        blockingRef.current = false;
      }
    }
    return () => {
      if (blockingRef.current) {
        __blockBoardWheelCount = Math.max(0, __blockBoardWheelCount - 1);
        blockingRef.current = false;
      }
    };
  }, [hovered, hasMemo]);

  const handleScrollableChange = useCallback((canScroll: boolean) => {
    if (canScroll && !blockingRef.current) {
      __blockBoardWheelCount++;
      blockingRef.current = true;
    } else if (!canScroll && blockingRef.current) {
      __blockBoardWheelCount = Math.max(0, __blockBoardWheelCount - 1);
      blockingRef.current = false;
    }
  }, []);

  // ドラッグもリサイズもできないオブジェクトかどうか
  const canDrag = isDraggable && !obj.position_locked;
  const canResize = isResizable && !!onResize && !obj.size_locked;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const el = elRef.current;
    if (!el) return;

    const stage = stageRef.current;
    const scale = stage?.scaleX?.() ?? 1;

    const rect = el.getBoundingClientRect();
    const localX = (e.clientX - rect.left);
    const localY = (e.clientY - rect.top);
    // scale を考慮してエッジ判定用のローカル座標を算出
    const elW = rect.width;
    const elH = rect.height;
    const edge = canResize ? getEdge(localX, localY, elW, elH) : null;

    if (!edge && !canDrag) {
      // ドラッグもリサイズも不可 → Stage を直接ドラッグしてカメラ移動
      e.stopPropagation();
      onSelect(obj.id);
      if (!stage) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const origPos = stage.position();
      document.body.style.cursor = 'grabbing';

      const onPointerMove = (me: PointerEvent) => {
        stage.position({
          x: origPos.x + (me.clientX - startX),
          y: origPos.y + (me.clientY - startY),
        });
        stage.batchDraw();
      };
      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        document.body.style.cursor = '';
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      return;
    }

    e.stopPropagation();
    onSelect(obj.id);

    if (edge && onResize) {
      // リサイズ開始
      if (stage?.draggable) stage.draggable(false);
      resizeRef.current = {
        edge,
        startPointerX: e.clientX / scale,
        startPointerY: e.clientY / scale,
        origPxX: pxX,
        origPxY: pxY,
        origPxW: pxW,
        origPxH: pxH,
      };

      const onPointerMove = (me: PointerEvent) => {
        const rs = resizeRef.current;
        if (!rs || !el) return;
        const currentScale = stage?.scaleX?.() ?? 1;
        const curX = me.clientX / currentScale;
        const curY = me.clientY / currentScale;
        const dx = curX - rs.startPointerX;
        const dy = curY - rs.startPointerY;

        let newX = rs.origPxX;
        let newY = rs.origPxY;
        let newW = rs.origPxW;
        let newH = rs.origPxH;

        if (rs.edge.right) newW = Math.max(MIN_SIZE_PX, rs.origPxW + dx);
        if (rs.edge.left) { newW = Math.max(MIN_SIZE_PX, rs.origPxW - dx); newX = rs.origPxX + (rs.origPxW - newW); }
        if (rs.edge.bottom) newH = Math.max(MIN_SIZE_PX, rs.origPxH + dy);
        if (rs.edge.top) { newH = Math.max(MIN_SIZE_PX, rs.origPxH - dy); newY = rs.origPxY + (rs.origPxH - newH); }

        el.style.left = `${newX}px`;
        el.style.top = `${newY}px`;
        el.style.width = `${newW}px`;
        el.style.height = `${newH}px`;
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        if (stage?.draggable) stage.draggable(true);

        const rs = resizeRef.current;
        resizeRef.current = null;
        if (!rs || !el) return;

        const finalX = snapToGrid(parseFloat(el.style.left));
        const finalY = snapToGrid(parseFloat(el.style.top));
        const finalW = snapToGrid(parseFloat(el.style.width));
        const finalH = snapToGrid(parseFloat(el.style.height));

        el.style.left = `${finalX}px`;
        el.style.top = `${finalY}px`;

        // auto_size (extraStyle で width/height が上書きされる) 場合はインラインスタイルをクリア
        // → React の再レンダーで max-content/auto が適用される
        if (extraStyle?.width || extraStyle?.height) {
          el.style.width = '';
          el.style.height = '';
        } else {
          el.style.width = `${finalW}px`;
          el.style.height = `${finalH}px`;
        }

        onMove(obj.id, finalX / GRID_SIZE, finalY / GRID_SIZE);
        onResize(obj.id, Math.max(1, finalW / GRID_SIZE), Math.max(1, finalH / GRID_SIZE));
        setIsInteracting(false);
      };

      setIsInteracting(true);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    } else if (isDraggable && !obj.position_locked) {
      // ドラッグ開始
      dragRef.current = {
        startPointerX: e.clientX / scale,
        startPointerY: e.clientY / scale,
        origPxX: pxX,
        origPxY: pxY,
      };

      const onPointerMove = (me: PointerEvent) => {
        const ds = dragRef.current;
        if (!ds || !el) return;
        const currentScale = stage?.scaleX?.() ?? 1;
        const curX = me.clientX / currentScale;
        const curY = me.clientY / currentScale;
        const dx = curX - ds.startPointerX;
        const dy = curY - ds.startPointerY;

        el.style.left = `${ds.origPxX + dx}px`;
        el.style.top = `${ds.origPxY + dy}px`;
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);

        const ds = dragRef.current;
        dragRef.current = null;
        if (!ds || !el) return;

        const finalX = snapToGrid(parseFloat(el.style.left));
        const finalY = snapToGrid(parseFloat(el.style.top));
        el.style.left = `${finalX}px`;
        el.style.top = `${finalY}px`;

        onMove(obj.id, finalX / GRID_SIZE, finalY / GRID_SIZE);
        setIsInteracting(false);
      };

      setIsInteracting(true);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }
  }, [obj.id, obj.position_locked, obj.size_locked, pxX, pxY, pxW, pxH, isDraggable, isResizable, stageRef, onMove, onSelect, onResize]);

  // エッジホバーでカーソル変更
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const el = elRef.current;
    if (!el) return;
    if (canResize) {
      const rect = el.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const edge = getEdge(localX, localY, rect.width, rect.height);
      // エッジ上: リサイズカーソル、中央かつドラッグ不可: grab、中央かつドラッグ可: move
      el.style.cursor = edge ? edgeToCursor(edge) : (canDrag ? 'move' : 'grab');
    }
  }, [canResize, canDrag]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(obj.id);
  }, [obj.id, onEdit]);

  const selectionBoxShadow = isSelected
    ? '0 0 0 3px rgba(255,255,255,0.5), 0 0 0 4.5px rgba(60,140,255,0.6)'
    : undefined;

  return (
    <div
      ref={elRef}
      style={{
        position: 'absolute',
        left: pxX,
        top: pxY,
        width: pxW,
        height: pxH,
        opacity: obj.opacity,
        pointerEvents: 'auto',
        boxShadow: selectionBoxShadow,
        cursor: canDrag ? 'move' : 'grab',
        transition: isInteracting ? 'none' : 'left 0.2s ease-out, top 0.2s ease-out, width 0.2s ease-out, height 0.2s ease-out',
        ...extraStyle,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onDoubleClick={handleDoubleClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
      }}
      onWheel={(e) => {
        if (hovered && obj.memo && popupRef.current) {
          const canScroll = popupRef.current.scrollHeight > popupRef.current.clientHeight;
          if (canScroll) {
            e.stopPropagation();
            e.preventDefault();
            popupRef.current.scrollTop += e.deltaY;
          }
        }
      }}
    >
      {children}

      {/* ホバー時の白オーバーレイ（移動可能オブジェクトのみ） */}
      {hovered && canDrag && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(255,255,255,0.08)',
          pointerEvents: 'none',
        }} />
      )}

      {/* オブジェクトメモホバーポップアップ */}
      {hovered && obj.memo && (obj.type === 'panel' || obj.type === 'text') && (
        <MemoPopup anchorRef={elRef as React.RefObject<Element | null>} memo={obj.memo} popupRef={popupRef} onScrollableChange={handleScrollableChange} />
      )}

      <DropdownMenu
        mode="context"
        open={contextMenuPos !== null}
        onOpenChange={(open) => { if (!open) setContextMenuPos(null); }}
        position={contextMenuPos ?? { x: 0, y: 0 }}
        items={ctxMenuItems}
      />
      {confirmModal}
    </div>
  );
});

// --- アニメーション画像の Blob URL 共有キャッシュ ---
// 同じ image_asset_id に対して同一の Blob URL を返すことで、シーン切り替え時に
// GIF/APNG アニメーションを途中から再生し続ける。
// refCount で参照管理し、どのコンポーネントも使わなくなったら遅延 revoke する。
// 遅延があるので、シーンA→B で同じ画像が両方にある場合は Blob URL が維持され再生継続。
// シーンBにしかない画像は新規 Blob URL となり最初から再生される。
interface BlobCacheEntry {
  blob: Blob;
  blobUrl: string;
  refCount: number;
  revokeTimer: ReturnType<typeof setTimeout> | null;
}
const blobCache = new Map<string, BlobCacheEntry>();
const pendingFetches = new Map<string, Promise<Blob>>();
const REVOKE_DELAY = 200;

function acquireBlobUrl(imageUrl: string, blob: Blob): string {
  const existing = blobCache.get(imageUrl);
  if (existing) {
    existing.refCount++;
    if (existing.revokeTimer) { clearTimeout(existing.revokeTimer); existing.revokeTimer = null; }
    return existing.blobUrl;
  }
  const blobUrl = URL.createObjectURL(blob);
  blobCache.set(imageUrl, { blob, blobUrl, refCount: 1, revokeTimer: null });
  return blobUrl;
}

function releaseBlobUrl(imageUrl: string): void {
  const entry = blobCache.get(imageUrl);
  if (!entry) return;
  entry.refCount--;
  if (entry.refCount <= 0) {
    entry.revokeTimer = setTimeout(() => {
      // 遅延後もまだ誰も acquire してなければ解放
      if (entry.refCount <= 0) {
        URL.revokeObjectURL(entry.blobUrl);
        blobCache.delete(imageUrl);
      }
    }, REVOKE_DELAY);
  }
}

export function useAnimatedBlobSrc(imageUrl: string | null | undefined): string | null {
  // blobCache/preloadedBlobs から blob を取得し、表示用に毎回新しい blob URL を生成する。
  // 同じ blob URL を再利用するとブラウザのアニメーションデコードキャッシュにより
  // GIF/WebP/APNG が再生されない場合があるため、コンポーネントごとに固有の blob URL を持つ。
  const activeImageUrlRef = useRef<string | null>(null);
  const displayBlobUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  const [blobSrc, setBlobSrc] = useState<string | null>(() => {
    const url = imageUrl ?? null;
    if (!url) return null;
    if (url.startsWith('data:')) return url;
    const existing = blobCache.get(url);
    const blob = existing?.blob ?? preloadedBlobs.get(url) ?? null;
    if (!blob) return null;
    // refCount を上げて blob 保管を維持
    acquireBlobUrl(url, blob);
    // 表示用にフレッシュな blob URL を生成
    const freshUrl = URL.createObjectURL(blob);
    activeImageUrlRef.current = url;
    displayBlobUrlRef.current = freshUrl;
    return freshUrl;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (imageUrl?.startsWith('data:')) {
      if (activeImageUrlRef.current && !activeImageUrlRef.current.startsWith('data:')) {
        releaseBlobUrl(activeImageUrlRef.current);
      }
      if (displayBlobUrlRef.current) {
        URL.revokeObjectURL(displayBlobUrlRef.current);
        displayBlobUrlRef.current = null;
      }
      activeImageUrlRef.current = imageUrl;
      setBlobSrc(imageUrl);
      return;
    }
    if (!imageUrl) {
      if (activeImageUrlRef.current) {
        releaseBlobUrl(activeImageUrlRef.current);
        activeImageUrlRef.current = null;
      }
      if (displayBlobUrlRef.current) {
        URL.revokeObjectURL(displayBlobUrlRef.current);
        displayBlobUrlRef.current = null;
      }
      setBlobSrc(null);
      return;
    }

    // 既に同じ URL で処理済みならスキップ
    if (activeImageUrlRef.current === imageUrl) return;

    const apply = (blob: Blob) => {
      if (!mountedRef.current) return;
      if (activeImageUrlRef.current === imageUrl) return;
      // 前の URL をクリーンアップ
      if (activeImageUrlRef.current) releaseBlobUrl(activeImageUrlRef.current);
      if (displayBlobUrlRef.current) URL.revokeObjectURL(displayBlobUrlRef.current);
      // blob 保管の refCount 管理
      acquireBlobUrl(imageUrl, blob);
      // 表示用にフレッシュな blob URL
      const freshUrl = URL.createObjectURL(blob);
      activeImageUrlRef.current = imageUrl;
      displayBlobUrlRef.current = freshUrl;
      setBlobSrc(freshUrl);
    };

    const existing = blobCache.get(imageUrl);
    if (existing) {
      apply(existing.blob);
    } else {
      const preloaded = preloadedBlobs.get(imageUrl);
      if (preloaded) {
        preloadedBlobs.delete(imageUrl);
        apply(preloaded);
      } else {
        let fetchPromise = pendingFetches.get(imageUrl);
        if (!fetchPromise) {
          fetchPromise = fetch(imageUrl).then(r => r.blob());
          pendingFetches.set(imageUrl, fetchPromise);
          fetchPromise.finally(() => pendingFetches.delete(imageUrl));
        }
        fetchPromise
          .then(blob => apply(blob))
          .catch(() => {
            if (mountedRef.current) setBlobSrc(imageUrl);
          });
      }
    }
  }, [imageUrl]);

  // unmount 時: refCount release + 表示用 blob URL revoke
  useEffect(() => {
    return () => {
      if (activeImageUrlRef.current) { releaseBlobUrl(activeImageUrlRef.current); activeImageUrlRef.current = null; }
      if (displayBlobUrlRef.current) { URL.revokeObjectURL(displayBlobUrlRef.current); displayBlobUrlRef.current = null; }
    };
  }, []);

  return blobSrc ?? (imageUrl || null);
}

/**
 * プリロード用 Blob ストア（blob URL は作らず Blob だけ保持）。
 * useAnimatedBlobSrc が acquire する際に新しい blob URL を生成するため、
 * GIF/APNG/WebP アニメーションがシーン切替時に最初から再生される仕様を維持。
 */
const preloadedBlobs = new Map<string, Blob>();

/**
 * 画像URLリストをバックグラウンドで fetch し preloadedBlobs に保持する。
 * blobCache（表示中の blob URL 管理）とは分離。fetch を省略するためだけに使う。
 */
/** アップロード済みファイルの Blob を preloadedBlobs に直接登録する。fetch を経由しないため CORS の影響を受けない。 */
export function registerPreloadedBlob(url: string, blob: Blob): void {
  if (!url || blobCache.has(url) || preloadedBlobs.has(url)) return;
  preloadedBlobs.set(url, blob);
}

export function preloadImageBlobs(urls: string[]): void {
  for (const url of urls) {
    if (!url || blobCache.has(url) || preloadedBlobs.has(url) || pendingFetches.has(url)) continue;
    const p = fetch(url).then(r => r.blob()).then(blob => {
      if (!blobCache.has(url) && !preloadedBlobs.has(url)) {
        preloadedBlobs.set(url, blob);
      }
      return blob;
    }).catch(() => new Blob());
    pendingFetches.set(url, p);
    p.finally(() => pendingFetches.delete(url));
  }
}

// --- PanelObject (DOM版) ---
const DomPanelObject = memo(function DomPanelObject({
  obj, isSelected, stageRef, onMove, onSelect, onEdit, onResize, baseZIndex, assets: _assets,
}: {
  obj: BoardObject; isSelected: boolean;
  stageRef: React.RefObject<any>;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onResize?: (id: string, w: number, h: number) => void;
  baseZIndex?: number;
  assets?: Asset[];
}) {
  const blobSrc = useAnimatedBlobSrc(resolveAssetId(obj.image_asset_id));

  return (
    <DomObjectWrapper
      obj={obj} isSelected={isSelected} isDraggable={!obj.position_locked}
      isResizable={!obj.size_locked} stageRef={stageRef}
      onMove={onMove} onSelect={onSelect} onEdit={onEdit} onResize={onResize}
      style={{ zIndex: baseZIndex }}
    >
      <div style={{
        width: '100%', height: '100%',
        backgroundColor: obj.background_color,
        overflow: 'hidden',
      }}>
        {blobSrc ? (
          <img
            src={blobSrc}
            style={{
              width: '100%', height: '100%',
              objectFit: obj.image_fit === 'stretch' ? 'fill' : obj.image_fit,
              display: 'block',
            }}
            draggable={false}
          />
        ) : null}
      </div>
    </DomObjectWrapper>
  );
});

// --- TextObject (DOM版) ---
const DomTextObject = memo(function DomTextObject({
  obj, isSelected, stageRef, onMove, onSelect, onEdit, onResize, onSyncSize, baseZIndex,
}: {
  obj: BoardObject; isSelected: boolean;
  stageRef: React.RefObject<any>;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onResize?: (id: string, w: number, h: number) => void;
  onSyncSize?: (id: string, w: number, h: number) => void;
  baseZIndex?: number;
}) {
  const fontFamily = obj.font_family || 'sans-serif';
  const textStr = obj.text_content || '';
  const letterSpacing = obj.letter_spacing ?? 0;
  const lineHeight = obj.line_height ?? 1.2;
  const contentRef = useRef<HTMLDivElement>(null);

  const verticalAlignMap = { top: 'flex-start', middle: 'center', bottom: 'flex-end' } as const;
  const alignItems = verticalAlignMap[obj.text_vertical_align || 'top'];

  // auto_size のときはサイズをコンテンツに合わせる
  const autoSizeStyle: React.CSSProperties = obj.auto_size ? {
    width: 'max-content',
    height: 'auto',
    whiteSpace: 'pre-wrap',
  } : {};

  // auto_size: 描画サイズを obj.width/height に同期
  useEffect(() => {
    if (!obj.auto_size || !onSyncSize || !contentRef.current) return;
    const el = contentRef.current;
    const observer = new ResizeObserver(() => {
      const w = Math.max(1, Math.round(el.offsetWidth / GRID_SIZE));
      const h = Math.max(1, Math.round(el.offsetHeight / GRID_SIZE));
      if (w !== obj.width || h !== obj.height) {
        onSyncSize(obj.id, w, h);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [obj.auto_size, obj.id, obj.width, obj.height, onSyncSize]);

  return (
    <DomObjectWrapper
      obj={obj} isSelected={isSelected} isDraggable={!obj.position_locked}
      isResizable={!obj.size_locked} stageRef={stageRef}
      onMove={onMove} onSelect={onSelect} onEdit={onEdit} onResize={onResize}
      style={{ ...autoSizeStyle, zIndex: baseZIndex }}
    >
      <div ref={contentRef} style={{
        width: '100%', height: '100%',
        backgroundColor: obj.background_color,
        display: 'flex',
        alignItems,
        fontSize: (typeof obj.font_size === 'number' && !Number.isNaN(obj.font_size) && obj.font_size > 0) ? obj.font_size : 16,
        fontFamily,
        letterSpacing,
        lineHeight,
        color: obj.text_color,
        textAlign: obj.text_align || 'left',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        userSelect: 'none',
        overflow: 'hidden',
        transform: `scale(${obj.scale_x ?? 1}, ${obj.scale_y ?? 1})`,
        transformOrigin: 'top left',
        ...autoSizeStyle,
      }}>
        <div style={{ width: '100%' }}>{textStr}</div>
      </div>
    </DomObjectWrapper>
  );
});

// --- ForegroundObject (DOM版) ---
// 前景のクロスフェード用: リマウント前の asset_id と blob URL を保持
let _prevFgAssetId: string | null = null;
let _prevFgBlobSrc: string | null = null;

const DomForegroundObject = memo(function DomForegroundObject({
  obj, isSelected, stageRef, onMove, onSelect, onEdit, fadeInDuration, baseZIndex, assets: _assets,
}: {
  obj: BoardObject; isSelected: boolean;
  stageRef: React.RefObject<any>;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  fadeInDuration?: number;
  baseZIndex?: number;
  assets?: Asset[];
}) {
  const isSolid = !!obj.color_enabled;
  const blobSrc = useAnimatedBlobSrc(
    isSolid ? colorToDataUrl(obj.background_color!) : resolveAssetId(obj.image_asset_id)
  );
  const fgDuration = fadeInDuration ?? 0;

  // リマウント時のフェードアウト層: 前の blob URL を使う
  const [fadeOutSrc] = useState(() => {
    const prevAssetId = _prevFgAssetId;
    const prevBlob = _prevFgBlobSrc;
    return (fgDuration > 0 && prevAssetId && prevAssetId !== obj.image_asset_id && prevBlob) ? prevBlob : null;
  });
  const [showFadeOut, setShowFadeOut] = useState(!!fadeOutSrc);

  // 常に最新の asset_id と blob URL を保持
  useEffect(() => { if (obj.image_asset_id) _prevFgAssetId = obj.image_asset_id; }, [obj.image_asset_id]);
  useEffect(() => { if (blobSrc) _prevFgBlobSrc = blobSrc; }, [blobSrc]);
  // フェードアウト層を duration 後に削除
  useEffect(() => {
    if (showFadeOut && fgDuration > 0) {
      const t = setTimeout(() => setShowFadeOut(false), fgDuration + 100);
      return () => clearTimeout(t);
    }
  }, [showFadeOut, fgDuration]);

  return (
    <div>
      <DomObjectWrapper
        obj={obj} isSelected={isSelected} isDraggable={false}
        isResizable={false} stageRef={stageRef}
        onMove={onMove} onSelect={onSelect} onEdit={onEdit}
        style={{ zIndex: baseZIndex }}
      >
        {/* 旧前景フェードアウト */}
        {showFadeOut && fadeOutSrc && (
          <img
            ref={(el) => {
              if (el) {
                el.style.opacity = '1';
                requestAnimationFrame(() => {
                  el.style.transition = `opacity ${fgDuration}ms ease`;
                  el.style.opacity = '0';
                });
              }
            }}
            src={fadeOutSrc}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: obj.image_fit === 'stretch' ? 'fill' : obj.image_fit, display: 'block', zIndex: 0 }}
          />
        )}
        {/* 新前景フェードイン */}
        <div
          ref={(el) => {
            if (el && fgDuration > 0 && fadeOutSrc) {
              el.style.opacity = '0';
              requestAnimationFrame(() => {
                el.style.transition = `opacity ${fgDuration}ms ease`;
                el.style.opacity = String(obj.opacity);
              });
            }
          }}
          style={{ width: '100%', height: '100%', backgroundColor: obj.background_color ?? 'transparent', position: 'relative', zIndex: 1 }}
        >
          {blobSrc && (
            <img src={blobSrc} alt="" style={{ width: '100%', height: '100%', objectFit: obj.image_fit === 'stretch' ? 'fill' : obj.image_fit, display: 'block' }} draggable={false} />
          )}
        </div>
      </DomObjectWrapper>
    </div>
  );
});

// --- BackgroundObject (DOM版) ---
const DomBackgroundObject = memo(function DomBackgroundObject({
  obj,
}: {
  obj: BoardObject;
}) {
  const pxX = obj.x * GRID_SIZE;
  const pxY = obj.y * GRID_SIZE;
  const pxW = obj.width * GRID_SIZE;
  const pxH = obj.height * GRID_SIZE;

  return (
    <div
      style={{
        position: 'absolute',
        left: pxX, top: pxY,
        width: pxW, height: pxH,
        pointerEvents: 'none',
      }}
    />
  );
});

// --- CharacterLayer (DOM版) ---
const DomCharacterLayer = memo(function DomCharacterLayer({
  characters,
  onUpdatePosition,
  stageRef,
  currentUserId,
  onSelectCharacter,
  onDoubleClickCharacter,
  selectedCharacterId,
  baseZIndex,
  assets: _assets,
}: {
  characters: Character[];
  onUpdatePosition?: (charId: string, x: number, y: number) => void;
  stageRef: React.RefObject<any>;
  currentUserId?: string;
  onSelectCharacter?: (charId: string) => void;
  onDoubleClickCharacter?: (charId: string) => void;
  selectedCharacterId?: string | null;
  baseZIndex?: number;
  assets?: Asset[];
}) {
  // ボード上に表示するキャラをフィルタ: board_visible!=false
  // 配列の順序をそのまま維持（レイヤーパネルの並び順 = z順）
  const visibleChars = characters.filter(c => c.board_visible !== false);

  return (
    <>
      {visibleChars.map((char, idx) => (
        <DomCharacterItem
          key={char.id}
          char={char}
          zIndex={baseZIndex != null ? baseZIndex + (visibleChars.length - 1 - idx) : (visibleChars.length - idx)}
          onUpdatePosition={onUpdatePosition}
          stageRef={stageRef}
          currentUserId={currentUserId}
          onSelectCharacter={onSelectCharacter}
          onDoubleClickCharacter={onDoubleClickCharacter}
          isSelected={selectedCharacterId === char.id}
          assets={_assets}
        />
      ))}
    </>
  );
});

// --- CharacterItem (個別キャラクター表示) ---
const DomCharacterItem = memo(function DomCharacterItem({
  char,
  onUpdatePosition,
  stageRef,
  currentUserId,
  onSelectCharacter,
  onDoubleClickCharacter,
  isSelected,
  zIndex,
  assets: _assets,
}: {
  char: Character;
  onUpdatePosition?: (charId: string, x: number, y: number) => void;
  stageRef: React.RefObject<any>;
  currentUserId?: string;
  onSelectCharacter?: (charId: string) => void;
  onDoubleClickCharacter?: (charId: string) => void;
  isSelected?: boolean;
  zIndex?: number;
  assets?: Asset[];
}) {
  const imageAssetId = resolveAssetId(char.images[char.active_image_index]?.asset_id ?? null);
  const blobSrc = useAnimatedBlobSrc(imageAssetId);
  const elRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startPointerX: number; startPointerY: number; origPxX: number; origPxY: number } | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const ctx = useAdrasteaContext();
  const { addCharacter, removeCharacter } = ctx;
  const popupRef = useRef<HTMLDivElement>(null);
  const blockingRef = useRef(false);
  const hasMemo = !!(char.memo || (currentUserId === char.owner_id && char.secret_memo));
  const charHandlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      await handleClipboardImport(
        text,
        (data) => ctx.addCharacter({ ...data, owner_id: ctx.user?.uid ?? '' }),
        ctx.showToast,
      );
    } catch {
      ctx.showToast('クリップボードの読み取りに失敗しました', 'error');
    }
  }, [ctx]);
  const { items: charCtxMenuItems, confirmModal: charConfirmModal } = useCharacterContextMenu(char, {
    currentUserId: currentUserId ?? '',
    onClose: () => setContextMenuPos(null),
    onDuplicate: (c) => {
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = c as any;
      addCharacter({ ...rest, name: generateDuplicateName(c.name) });
    },
    onRemove: (charId) => {
      removeCharacter(charId);
    },
    onPaste: charHandlePaste,
    showUndoRedo: true,
  });

  // ホバー終了・アンマウント時にカウンタをクリーンアップ
  useEffect(() => {
    if (!hovered || !hasMemo) {
      if (blockingRef.current) {
        __blockBoardWheelCount = Math.max(0, __blockBoardWheelCount - 1);
        blockingRef.current = false;
      }
    }
    return () => {
      if (blockingRef.current) {
        __blockBoardWheelCount = Math.max(0, __blockBoardWheelCount - 1);
        blockingRef.current = false;
      }
    };
  }, [hovered, hasMemo]);

  const pxX = (char.board_x ?? 0) * GRID_SIZE;
  const pxH = (char.size ?? 5) * GRID_SIZE;

  // board_y は足元座標。上端 = 足元 - サイズ
  const pxY = ((char.board_y ?? 0) - (char.size ?? 5)) * GRID_SIZE;

  const handleScrollableChange = useCallback((canScroll: boolean) => {
    if (canScroll && !blockingRef.current) {
      __blockBoardWheelCount++;
      blockingRef.current = true;
    } else if (!canScroll && blockingRef.current) {
      __blockBoardWheelCount = Math.max(0, __blockBoardWheelCount - 1);
      blockingRef.current = false;
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const el = elRef.current;
    if (!el) return;
    e.stopPropagation();

    // 開始座標を保存
    startPosRef.current = { x: e.clientX, y: e.clientY };

    const stage = stageRef.current;
    const scale = stage?.scaleX?.() ?? 1;

    dragRef.current = {
      startPointerX: e.clientX / scale,
      startPointerY: e.clientY / scale,
      origPxX: pxX,
      origPxY: pxY,
    };
    setIsDragging(true);

    const onPointerMove = (me: PointerEvent) => {
      const ds = dragRef.current;
      if (!ds || !el) return;
      const currentScale = stage?.scaleX?.() ?? 1;
      const dx = me.clientX / currentScale - ds.startPointerX;
      const dy = me.clientY / currentScale - ds.startPointerY;
      el.style.left = `${ds.origPxX + dx}px`;
      el.style.top = `${ds.origPxY + dy}px`;
    };

    const onPointerUp = (me: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      const ds = dragRef.current;
      dragRef.current = null;
      setIsDragging(false);
      if (!ds || !el) return;
      const finalX = snapToGrid(parseFloat(el.style.left));
      const finalY = snapToGrid(parseFloat(el.style.top));
      el.style.left = `${finalX}px`;
      el.style.top = `${finalY}px`;
      // finalY は上端。足元 = 上端 + 高さ
      onUpdatePosition?.(char.id, finalX / GRID_SIZE, (finalY + pxH) / GRID_SIZE);

      // クリック検出: 移動量が5px未満なら選択
      const sp = startPosRef.current;
      if (sp) {
        const dist = Math.hypot(me.clientX - sp.x, me.clientY - sp.y);
        if (dist < 5) onSelectCharacter?.(char.id);
        startPosRef.current = null;
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [char.id, pxX, pxY, pxH, stageRef, onUpdatePosition, onSelectCharacter]);

  return (
    <div
      ref={elRef}
      style={{
        position: 'absolute',
        left: pxX,
        top: pxY,
        height: pxH,
        width: 'max-content',
        cursor: 'move',
        pointerEvents: char.board_visible !== false ? 'auto' : 'none',
        userSelect: 'none',
        filter: hovered ? 'drop-shadow(0 0 6px rgba(255,255,255,0.7))' : undefined,
        transition: isDragging ? 'none' : 'filter 0.1s, left 0.2s ease-out, top 0.2s ease-out, height 0.2s ease-out',
        boxShadow: isSelected ? '0 0 0 3px rgba(255,255,255,0.5), 0 0 0 4.5px rgba(60,140,255,0.6)' : undefined,
        zIndex: zIndex,
      }}
      onPointerDown={handlePointerDown}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onWheel={(e) => {
        if (hovered && hasMemo && popupRef.current) {
          const canScroll = popupRef.current.scrollHeight > popupRef.current.clientHeight;
          if (canScroll) {
            e.stopPropagation();
            e.preventDefault();
            popupRef.current.scrollTop += e.deltaY;
          }
        }
      }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClickCharacter?.(char.id); }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenuPos({ x: e.clientX, y: e.clientY }); }}
    >
      {blobSrc ? (
        <img
          src={blobSrc}
          style={{
            height: '100%',
            width: 'auto',
            display: 'block',
            objectFit: 'contain',
          }}
          draggable={false}
        />
      ) : (
        <div style={{
          height: pxH,
          width: pxH * 0.6,
          background: char.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 24,
          fontWeight: 700,
        }}>
          {char.name.charAt(0)}
        </div>
      )}

      {/* 名前ラベル */}
      <div style={{
        position: 'absolute',
        bottom: -26,
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#000',
        fontSize: 22,
        whiteSpace: 'nowrap',
        textShadow: '0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff',
        userSelect: 'none',
        pointerEvents: 'none',
        fontWeight: 600,
      }}>
        {char.name}
      </div>

      {/* ホバーポップアップ（Portal: Board の transform 外に出して要素アンカー表示） */}
      {hovered && (char.memo || (currentUserId === char.owner_id && char.secret_memo)) && (
        <MemoPopup
          anchorRef={elRef as React.RefObject<Element | null>}
          memo={char.memo}
          secretMemo={char.secret_memo}
          showSecret={currentUserId === char.owner_id}
          popupRef={popupRef}
          onScrollableChange={handleScrollableChange}
        />
      )}

      {/* コンテキストメニュー */}
      <DropdownMenu
        mode="context"
        open={contextMenuPos !== null}
        onOpenChange={(open) => { if (!open) setContextMenuPos(null); }}
        position={contextMenuPos ?? { x: 0, y: 0 }}
        items={charCtxMenuItems}
      />
      {charConfirmModal}
    </div>
  );
});

// --- 安定 key 生成 ---
// シーン間で DOM を使い回すため、obj.id ではなく type + image_asset_id + 座標近接性で key を割り当てる。
// 同じ type & 同じ image_asset_id のオブジェクト同士を優先マッチし、GIF アニメーションを継続させる。
// 同じ image_asset_id が複数ある場合は座標が近い順でインデックスを付与。
interface PrevSlotInfo { x: number; y: number }

function generateStableKeys(
  objects: BoardObject[],
  prevSlots: React.MutableRefObject<Map<string, PrevSlotInfo>>,
): { obj: BoardObject; stableKey: string }[] {
  // type + image_asset_id でグループ化
  const groups = new Map<string, BoardObject[]>();
  for (const obj of objects) {
    const groupKey = `${obj.type}:${obj.image_asset_id ?? ''}`;
    const arr = groups.get(groupKey);
    if (arr) arr.push(obj);
    else groups.set(groupKey, [obj]);
  }

  const result: { obj: BoardObject; stableKey: string }[] = [];
  const slotCounters = new Map<string, number>();

  for (const [groupKey, objs] of groups) {
    // 同グループ内で座標が近いものを前回のスロットに優先マッチ
    // 前回のスロット情報を集める
    const prevSlotsForGroup: { slotKey: string; x: number; y: number }[] = [];
    for (const [slotKey, info] of prevSlots.current) {
      if (slotKey.startsWith(groupKey + ':')) {
        prevSlotsForGroup.push({ slotKey, ...info });
      }
    }

    if (prevSlotsForGroup.length > 0 && objs.length > 0) {
      // 距離ベースのグリーディマッチング
      const remaining = [...objs];
      const usedSlots = new Set<string>();

      for (const slot of prevSlotsForGroup) {
        if (remaining.length === 0) break;
        // 最も近いオブジェクトを見つける
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < remaining.length; i++) {
          const dx = remaining[i].x - slot.x;
          const dy = remaining[i].y - slot.y;
          const dist = dx * dx + dy * dy;
          if (dist < bestDist) { bestDist = dist; bestIdx = i; }
        }
        result.push({ obj: remaining[bestIdx], stableKey: slot.slotKey });
        usedSlots.add(slot.slotKey);
        remaining.splice(bestIdx, 1);
      }

      // マッチしなかった残りには新しいスロットキーを付与
      for (const obj of remaining) {
        let idx = slotCounters.get(groupKey) ?? 0;
        let key = `${groupKey}:${idx}`;
        while (usedSlots.has(key)) { idx++; key = `${groupKey}:${idx}`; }
        slotCounters.set(groupKey, idx + 1);
        usedSlots.add(key);
        result.push({ obj, stableKey: key });
      }
    } else {
      // 前回情報なし → 単純にインデックス
      objs.forEach((obj, i) => {
        result.push({ obj, stableKey: `${groupKey}:${i}` });
      });
    }
  }

  // 次回用にスロット情報を更新
  const newSlots = new Map<string, PrevSlotInfo>();
  for (const { obj, stableKey } of result) {
    newSlots.set(stableKey, { x: obj.x, y: obj.y });
  }
  prevSlots.current = newSlots;

  // sort_order 順を維持
  result.sort((a, b) => a.obj.sort_order - b.obj.sort_order);
  return result;
}

// --- DomObjectOverlay 本体 ---
export const DomObjectOverlay = memo(forwardRef<HTMLDivElement, DomObjectOverlayProps>(
  function DomObjectOverlay({
    objects, selectedObjectId, selectedObjectIds = [], activeScene,
    stageRef, onMoveObject, onSelectObject, onEditObject, onResizeObject, onSyncObjectSize,
    characters = [], onUpdateCharacterBoardPosition, currentUserId, onSelectCharacter, onDoubleClickCharacter,
    selectedCharacterId,
  }, ref) {
    const { assets } = useAssets();
    const visibleObjects = objects.filter((o) => o.visible || o.type === 'characters_layer');
    const prevSlotsRef = useRef<Map<string, PrevSlotInfo>>(new Map());
    const keyedObjects = generateStableKeys(visibleObjects, prevSlotsRef);

    // wheel イベントを Konva Stage の canvas に転送（DOM オーバーレイがイベントを奪うため）
    const handleWheel = useCallback((e: React.WheelEvent) => {
      if (__blockBoardWheelCount > 0) return;
      const stage = stageRef.current;
      if (!stage) return;
      const canvas = stage.container()?.querySelector('canvas');
      if (!canvas) return;
      canvas.dispatchEvent(new WheelEvent('wheel', e.nativeEvent));
    }, [stageRef]);

    return (
      <div
        onWheelCapture={handleWheel}
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        {/* Board.tsx が rAF でこの div の style.transform を直接更新する */}
        <div ref={ref} style={{ transformOrigin: '0 0' }}>
          {keyedObjects.map(({ obj, stableKey }, listIdx) => {
            const isSelected = selectedObjectIds.length > 0
              ? selectedObjectIds.includes(obj.id)
              : obj.id === selectedObjectId;

            const baseZIndex = (listIdx + 1) * 100;

            switch (obj.type) {
              case 'background':
                return (
                  <DomBackgroundObject
                    key={stableKey} obj={obj}
                  />
                );
              case 'panel':
                return (
                  <DomPanelObject
                    key={stableKey} obj={obj} isSelected={isSelected}
                    stageRef={stageRef}
                    onMove={onMoveObject} onSelect={onSelectObject}
                    onEdit={onEditObject}
                    onResize={obj.size_locked ? undefined : onResizeObject}
                    baseZIndex={baseZIndex}
                    assets={assets}
                  />
                );
              case 'text':
                return (
                  <DomTextObject
                    key={stableKey} obj={obj} isSelected={isSelected}
                    stageRef={stageRef}
                    onMove={onMoveObject} onSelect={onSelectObject}
                    onEdit={onEditObject}
                    onResize={obj.size_locked ? undefined : onResizeObject}
                    onSyncSize={onSyncObjectSize}
                    baseZIndex={baseZIndex}
                  />
                );
              case 'foreground':
                return (
                  <DomForegroundObject
                    key={stableKey} obj={obj} isSelected={isSelected}
                    stageRef={stageRef}
                    onMove={onMoveObject} onSelect={onSelectObject}
                    onEdit={onEditObject}
                    fadeInDuration={activeScene?.fg_transition === 'fade'
                      ? activeScene.fg_transition_duration
                      : undefined}
                    baseZIndex={baseZIndex}
                    assets={assets}
                  />
                );
              case 'characters_layer':
                return (
                  <DomCharacterLayer
                    key={stableKey}
                    characters={characters}
                    onUpdatePosition={onUpdateCharacterBoardPosition}
                    stageRef={stageRef}
                    currentUserId={currentUserId}
                    onSelectCharacter={onSelectCharacter}
                    onDoubleClickCharacter={onDoubleClickCharacter}
                    selectedCharacterId={selectedCharacterId}
                    baseZIndex={baseZIndex}
                    assets={assets}
                  />
                );
              default:
                return null;
            }
          })}
        </div>
      </div>
    );
  }
));
