import { forwardRef, memo, useCallback, useRef, useEffect, useState } from 'react';
import type { BoardObject, Scene } from '../../types/adrastea.types';
import { GRID_SIZE } from './Board';

// --- 定数 ---
const MIN_SIZE_PX = 50;
const EDGE_THRESHOLD = 28;

// --- Props ---
interface DomObjectOverlayProps {
  objects: BoardObject[];
  /** アクティブなオブジェクト ID のセット。含まれないオブジェクトは非表示だが DOM に保持 */
  activeObjectIds?: Set<string>;
  selectedObjectId?: string | null;
  selectedObjectIds?: string[];
  activeScene?: Scene | null;
  stageRef: React.RefObject<any>;
  onMoveObject: (id: string, x: number, y: number) => void;
  onSelectObject: (id: string) => void;
  onEditObject: (id: string) => void;
  onResizeObject?: (id: string, width: number, height: number) => void;
}

// --- ユーティリティ ---
function snapToGrid(val: number): number {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

interface Edge { top: boolean; bottom: boolean; left: boolean; right: boolean }

function getEdge(localX: number, localY: number, w: number, h: number): Edge | null {
  const t = EDGE_THRESHOLD;
  const top = localY < t;
  const bottom = localY > h - t;
  const left = localX < t;
  const right = localX > w - t;
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
  onResize?: (id: string, width: number, height: number) => void;
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

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect(obj.id);

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
    const edge = isResizable && onResize ? getEdge(localX, localY, elW, elH) : null;

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
        el.style.width = `${finalW}px`;
        el.style.height = `${finalH}px`;

        onMove(obj.id, finalX / GRID_SIZE, finalY / GRID_SIZE);
        onResize(obj.id, Math.max(1, finalW / GRID_SIZE), Math.max(1, finalH / GRID_SIZE));
      };

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
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }
  }, [obj.id, obj.position_locked, pxX, pxY, pxW, pxH, isDraggable, isResizable, stageRef, onMove, onSelect, onResize]);

  // エッジホバーでカーソル変更
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isResizable || !onResize) return;
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const edge = getEdge(localX, localY, rect.width, rect.height);
    el.style.cursor = edgeToCursor(edge);
  }, [isResizable, onResize]);

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
        cursor: isDraggable && !obj.position_locked ? 'move' : 'default',
        ...extraStyle,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onDoubleClick={handleDoubleClick}
    >
      {children}
    </div>
  );
});

// --- アニメーション画像の Blob URL 共有キャッシュ ---
// 同じ image_url に対して同一の Blob URL を返すことで、シーン切り替え時に
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
  const [blobSrc, setBlobSrc] = useState<string | null>(null);
  const activeUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      if (activeUrlRef.current) { releaseBlobUrl(activeUrlRef.current); activeUrlRef.current = null; }
      setBlobSrc(null);
      return;
    }

    let cancelled = false;

    const apply = (blob: Blob) => {
      if (cancelled) return;
      // 前の imageUrl を release
      if (activeUrlRef.current && activeUrlRef.current !== imageUrl) {
        releaseBlobUrl(activeUrlRef.current);
      }
      const url = acquireBlobUrl(imageUrl, blob);
      activeUrlRef.current = imageUrl;
      setBlobSrc(url);
    };

    const existing = blobCache.get(imageUrl);
    if (existing) {
      apply(existing.blob);
    } else {
      fetch(imageUrl)
        .then(r => r.blob())
        .then(blob => apply(blob))
        .catch(() => {
          // フォールバック: Blob 化できなければ元 URL をそのまま使う
          if (!cancelled) setBlobSrc(imageUrl);
        });
    }

    return () => { cancelled = true; };
  }, [imageUrl]);

  // コンポーネント unmount 時に release
  useEffect(() => {
    return () => {
      if (activeUrlRef.current) { releaseBlobUrl(activeUrlRef.current); activeUrlRef.current = null; }
    };
  }, []);

  return blobSrc;
}

// --- PanelObject (DOM版) ---
const DomPanelObject = memo(function DomPanelObject({
  obj, isSelected, stageRef, onMove, onSelect, onEdit, onResize,
}: {
  obj: BoardObject; isSelected: boolean;
  stageRef: React.RefObject<any>;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onResize?: (id: string, w: number, h: number) => void;
}) {
  const blobSrc = useAnimatedBlobSrc(obj.image_url);

  return (
    <DomObjectWrapper
      obj={obj} isSelected={isSelected} isDraggable={!obj.position_locked}
      isResizable={!obj.size_locked} stageRef={stageRef}
      onMove={onMove} onSelect={onSelect} onEdit={onEdit} onResize={onResize}
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
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.4)', fontSize: 14,
            userSelect: 'none',
          }}>
            {obj.name}
          </div>
        )}
      </div>
    </DomObjectWrapper>
  );
});

// --- TextObject (DOM版) ---
const DomTextObject = memo(function DomTextObject({
  obj, isSelected, stageRef, onMove, onSelect, onEdit, onResize,
}: {
  obj: BoardObject; isSelected: boolean;
  stageRef: React.RefObject<any>;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onResize?: (id: string, w: number, h: number) => void;
}) {
  const fontFamily = obj.font_family || 'sans-serif';
  const textStr = obj.text_content || obj.name;
  const letterSpacing = obj.letter_spacing ?? 0;
  const lineHeight = obj.line_height ?? 1.2;

  const verticalAlignMap = { top: 'flex-start', middle: 'center', bottom: 'flex-end' } as const;
  const alignItems = verticalAlignMap[obj.text_vertical_align || 'top'];

  // auto_size のときはサイズをコンテンツに合わせる
  const autoSizeStyle: React.CSSProperties = obj.auto_size ? {
    width: 'fit-content',
    whiteSpace: 'pre-wrap',
  } : {};

  return (
    <DomObjectWrapper
      obj={obj} isSelected={isSelected} isDraggable={!obj.position_locked}
      isResizable={!(obj.auto_size || obj.size_locked)} stageRef={stageRef}
      onMove={onMove} onSelect={onSelect} onEdit={onEdit} onResize={onResize}
      style={autoSizeStyle}
    >
      <div style={{
        width: '100%', height: '100%',
        backgroundColor: obj.background_color,
        display: 'flex',
        alignItems,
        fontSize: obj.font_size,
        fontFamily,
        letterSpacing,
        lineHeight,
        color: obj.text_color,
        textAlign: obj.text_align || 'left',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        userSelect: 'none',
        overflow: 'hidden',
        ...autoSizeStyle,
      }}>
        <div style={{ width: '100%' }}>{textStr}</div>
      </div>
    </DomObjectWrapper>
  );
});

// --- ForegroundObject (DOM版) ---
const DomForegroundObject = memo(function DomForegroundObject({
  obj, isSelected, stageRef, onMove, onSelect, onEdit, fadeInDuration,
}: {
  obj: BoardObject; isSelected: boolean;
  stageRef: React.RefObject<any>;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  fadeInDuration?: number;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const blobSrc = useAnimatedBlobSrc(obj.image_url);
  // 初回マウント時のみフェードインを実行（シーン継続時はスキップ）
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current && fadeInDuration && elRef.current) {
      const el = elRef.current;
      el.style.opacity = '0';
      requestAnimationFrame(() => {
        el.style.transition = `opacity ${fadeInDuration}ms ease`;
        el.style.opacity = String(obj.opacity);
      });
    }
    mountedRef.current = true;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // opacity 変更時は transition なしで即座に反映
  useEffect(() => {
    if (mountedRef.current && elRef.current) {
      elRef.current.style.opacity = String(obj.opacity);
    }
  }, [obj.opacity]);

  return (
    <div ref={elRef}>
      <DomObjectWrapper
        obj={obj} isSelected={isSelected} isDraggable={false}
        isResizable={false} stageRef={stageRef}
        onMove={onMove} onSelect={onSelect} onEdit={onEdit}
      >
        <div style={{
          width: '100%', height: '100%',
          backgroundColor: obj.background_color ?? 'transparent',
          overflow: 'hidden',
        }}>
          {blobSrc && (
            <img
              src={blobSrc}
              style={{
                width: '100%', height: '100%',
                objectFit: obj.image_fit === 'stretch' ? 'fill' : obj.image_fit,
                display: 'block',
              }}
              draggable={false}
            />
          )}
        </div>
      </DomObjectWrapper>
    </div>
  );
});

// --- BackgroundObject (DOM版) ---
const DomBackgroundObject = memo(function DomBackgroundObject({
  obj, onSelect, onEdit,
}: {
  obj: BoardObject;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const pxX = obj.x * GRID_SIZE;
  const pxY = obj.y * GRID_SIZE;
  const pxW = obj.width * GRID_SIZE;
  const pxH = obj.height * GRID_SIZE;

  const handleClick = useCallback(() => onSelect(obj.id), [obj.id, onSelect]);
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(obj.id);
  }, [obj.id, onEdit]);

  return (
    <div
      style={{
        position: 'absolute',
        left: pxX, top: pxY,
        width: pxW, height: pxH,
        pointerEvents: 'auto',
        cursor: 'default',
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    />
  );
});

// --- DomObjectOverlay 本体 ---
// forwardRef で内側の transform 用 div の ref を公開
export const DomObjectOverlay = memo(forwardRef<HTMLDivElement, DomObjectOverlayProps>(
  function DomObjectOverlay({
    objects, selectedObjectId, selectedObjectIds = [], activeScene,
    stageRef, onMoveObject, onSelectObject, onEditObject, onResizeObject,
  }, ref) {
    const visibleObjects = objects.filter((o) => o.visible);

    return (
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 2,
      }}>
        {/* Board.tsx が rAF でこの div の style.transform を直接更新する */}
        <div ref={ref} style={{ transformOrigin: '0 0' }}>
          {visibleObjects.map((obj) => {
            const isSelected = selectedObjectIds.length > 0
              ? selectedObjectIds.includes(obj.id)
              : obj.id === selectedObjectId;

            switch (obj.type) {
              case 'background':
                return (
                  <DomBackgroundObject
                    key={obj.id} obj={obj}
                    onSelect={onSelectObject} onEdit={onEditObject}
                  />
                );
              case 'panel':
                return (
                  <DomPanelObject
                    key={obj.id} obj={obj} isSelected={isSelected}
                    stageRef={stageRef}
                    onMove={onMoveObject} onSelect={onSelectObject}
                    onEdit={onEditObject}
                    onResize={obj.size_locked ? undefined : onResizeObject}
                  />
                );
              case 'text':
                return (
                  <DomTextObject
                    key={obj.id} obj={obj} isSelected={isSelected}
                    stageRef={stageRef}
                    onMove={onMoveObject} onSelect={onSelectObject}
                    onEdit={onEditObject}
                    onResize={(obj.auto_size || obj.size_locked) ? undefined : onResizeObject}
                  />
                );
              case 'foreground':
                return (
                  <DomForegroundObject
                    key={obj.id} obj={obj} isSelected={isSelected}
                    stageRef={stageRef}
                    onMove={onMoveObject} onSelect={onSelectObject}
                    onEdit={onEditObject}
                    fadeInDuration={activeScene?.fg_transition === 'fade'
                      ? activeScene.fg_transition_duration
                      : undefined}
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
