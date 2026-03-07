import React, { useRef, useCallback, useState, useEffect, useImperativeHandle, forwardRef, useMemo, memo } from 'react';
import { Stage, Layer, Rect, Group, Text, Image as KonvaImage, Shape } from 'react-konva';
import { theme } from '../../styles/theme';
import { DomObjectOverlay, useAnimatedBlobSrc } from './DomObjectOverlay';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage as StageType } from 'konva/lib/Stage';
import type { Piece as PieceType, BoardObject, Scene } from '../../types/adrastea.types';
import type { ReactNode } from 'react';

export interface BoardHandle {
  getStage: () => StageType | null;
  getScale: () => number;
  setScale: (scale: number) => void;
}

interface BoardProps {
  pieces: PieceType[];
  objects?: BoardObject[];
  activeScene?: Scene | null;
  gridVisible?: boolean;
  onMovePiece: (id: string, x: number, y: number) => void;
  onRemovePiece: (id: string) => void;
  onEditPiece: (id: string) => void;
  onMoveObject?: (id: string, x: number, y: number) => void;
  onSelectObject?: (id: string) => void;
  onEditObject?: (id: string) => void;
  onResizeObject?: (id: string, width: number, height: number) => void;
  selectedObjectId?: string | null;
  selectedObjectIds?: string[];
  children?: ReactNode;
}

export const LOGICAL_SIZE = 5000;
export const GRID_SIZE = 50;
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 10;

const GridLines = memo(function GridLines() {
  return (
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      sceneFunc={(context) => {
        context.beginPath();
        context.strokeStyle = 'rgba(255,255,255,0.05)';
        context.lineWidth = 1;
        for (let x = GRID_SIZE; x < LOGICAL_SIZE; x += GRID_SIZE) {
          context.moveTo(x, 0);
          context.lineTo(x, LOGICAL_SIZE);
        }
        for (let y = GRID_SIZE; y < LOGICAL_SIZE; y += GRID_SIZE) {
          context.moveTo(0, y);
          context.lineTo(LOGICAL_SIZE, y);
        }
        context.stroke();
      }}
    />
  );
});

const PieceImage = memo(function PieceImage({ url, width, height }: { url: string; width: number; height: number }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = url;
    return () => { img.onload = null; img.onerror = null; };
  }, [url]);

  if (!image) return null;
  return (
    <KonvaImage
      image={image}
      x={0}
      y={0}
      width={width}
      height={height}
      cornerRadius={6}
      listening={false}
    />
  );
});

const StatusBars = memo(function StatusBars({ piece }: { piece: PieceType }) {
  if (!piece.statuses || piece.statuses.length === 0) return null;

  const barHeight = 6;
  const barGap = 2;

  return (
    <>
      {piece.statuses.map((status, i) => {
        const ratio = status.max > 0 ? Math.max(0, Math.min(1, status.value / status.max)) : 0;
        const yOffset = piece.height + 4 + i * (barHeight + barGap);
        return (
          <React.Fragment key={i}>
            <Rect
              x={0}
              y={yOffset}
              width={piece.width}
              height={barHeight}
              fill="rgba(0,0,0,0.5)"
              cornerRadius={3}
            />
            <Rect
              x={0}
              y={yOffset}
              width={piece.width * ratio}
              height={barHeight}
              fill={status.color}
              cornerRadius={3}
            />
            <Text
              x={0}
              y={yOffset - 1}
              width={piece.width}
              height={barHeight + 2}
              text={`${status.value}/${status.max}`}
              fontSize={8}
              fill="#fff"
              align="center"
              verticalAlign="middle"
              listening={false}
            />
          </React.Fragment>
        );
      })}
    </>
  );
});

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  pieceId: string | null;
}

function snapToGrid(val: number): number {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

/** ビューポート中央のグリッド座標を返す */
export function getViewportCenter(stage: StageType | null): { x: number; y: number } {
  if (!stage) return { x: 0, y: 0 };
  const scale = stage.scaleX();
  const stagePos = stage.position();
  const width = stage.width();
  const height = stage.height();
  // ビューポート中心 → 論理座標 → グリッド座標
  const cx = (width / 2 - stagePos.x) / scale;
  const cy = (height / 2 - stagePos.y) / scale;
  return {
    x: Math.round(cx / GRID_SIZE),
    y: Math.round(cy / GRID_SIZE),
  };
}

export const Board = forwardRef<BoardHandle, BoardProps>(function Board({ pieces, objects = [], activeScene, gridVisible = true, onMovePiece, onRemovePiece, onEditPiece, onMoveObject, onSelectObject, onEditObject, onResizeObject, selectedObjectId, selectedObjectIds, children }, ref) {
  const stageRef = useRef<StageType>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, pieceId: null });

  useImperativeHandle(ref, () => ({
    getStage: () => stageRef.current,
    getScale: () => stageRef.current?.scaleX() ?? 1,
    setScale: (newScale: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
      const oldScale = stage.scaleX();
      // ビューポート中心を基準にズーム
      const centerX = stage.width() / 2;
      const centerY = stage.height() / 2;
      const pointTo = {
        x: (centerX - stage.x()) / oldScale,
        y: (centerY - stage.y()) / oldScale,
      };
      stage.scale({ x: clamped, y: clamped });
      stage.position({
        x: centerX - pointTo.x * clamped,
        y: centerY - pointTo.y * clamped,
      });
      stage.batchDraw();
    },
  }));

  // 初期表示: 背景オブジェクトにフィットするようカメラ配置
  // 背景オブジェクトが変わった時（別サイズ/別IDの背景に切り替わった時）のみリセット
  const initializedRef = useRef(false);
  const prevBgKeyRef = useRef<string>('');
  useEffect(() => {
    const bg = objects.find(o => o.type === 'background');
    const bgKey = bg ? `${bg.id}:${bg.width}:${bg.height}` : '';
    if (prevBgKeyRef.current && bgKey !== prevBgKeyRef.current) {
      initializedRef.current = false;
    }
    prevBgKeyRef.current = bgKey;
  }, [objects]);

  useEffect(() => {
    if (initializedRef.current || stageSize.width === 0 || stageSize.height === 0) return;
    const stage = stageRef.current;
    if (!stage) return;

    const bg = objects.find(o => o.type === 'background');
    // 背景オブジェクトの矩形（px）。なければ論理盤面中央
    const targetX = (bg?.x ?? 0) * GRID_SIZE;
    const targetY = (bg?.y ?? 0) * GRID_SIZE;
    const targetW = (bg?.width ?? 100) * GRID_SIZE;
    const targetH = (bg?.height ?? 100) * GRID_SIZE;

    // ビューポートに収まるスケール（余白10%）
    const padding = 0.9;
    const scaleX = (stageSize.width * padding) / targetW;
    const scaleY = (stageSize.height * padding) / targetH;
    const scale = Math.min(Math.min(scaleX, scaleY), MAX_SCALE);

    // 背景の中心をビューポート中心に
    const centerX = targetX + targetW / 2;
    const centerY = targetY + targetH / 2;

    stage.scale({ x: scale, y: scale });
    stage.position({
      x: stageSize.width / 2 - centerX * scale,
      y: stageSize.height / 2 - centerY * scale,
    });
    initializedRef.current = true;
  }, [stageSize, objects]);

  // ResizeObserverでビューポート追従
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setStageSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.08;
    const newScale = e.evt.deltaY < 0
      ? Math.min(oldScale * scaleBy, MAX_SCALE)
      : Math.max(oldScale / scaleBy, MIN_SCALE);

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, []);

  const handlePieceDragEnd = useCallback(
    (pieceId: string, e: KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const snappedX = snapToGrid(node.x());
      const snappedY = snapToGrid(node.y());
      node.position({ x: snappedX, y: snappedY });
      onMovePiece(pieceId, snappedX, snappedY);
    },
    [onMovePiece]
  );

  const handleContextMenu = useCallback(
    (pieceId: string, e: KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const containerRect = stage.container().getBoundingClientRect();
      setContextMenu({
        visible: true,
        x: e.evt.clientX - containerRect.left,
        y: e.evt.clientY - containerRect.top,
        pieceId,
      });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0, pieceId: null });
  }, []);

  // Stageクリックでメニュー閉じ
  const handleStageClick = useCallback(() => {
    if (contextMenu.visible) closeContextMenu();
  }, [contextMenu.visible, closeContextMenu]);

  // 背景オブジェクト（HTMLで描画 — ビューポート固定）
  const bgObject = useMemo(() => objects.find(o => o.type === 'background' && o.visible), [objects]);
  const bgObjectUrl = bgObject?.image_url ?? null;
  const bgObjectColor = bgObject?.background_color ?? null;
  const bgObjectOpacity = bgObject?.opacity ?? 1;

  // 背景ブラー画像 — 共有 Blob URL キャッシュ経由（シーン間で同じ画像なら GIF 再生継続）
  const bgBlobSrc = useAnimatedBlobSrc(bgObjectUrl);

  // DOM オーバーレイの ref（rAF で Stage の transform に同期）
  const domLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;
    const sync = () => {
      const stage = stageRef.current;
      const el = domLayerRef.current;
      if (stage && el) {
        const s = stage.scaleX();
        const pos = stage.position();
        el.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${s})`;
      }
      rafId = requestAnimationFrame(sync);
    };
    rafId = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}
      onClick={closeContextMenu}
    >
      {/* 背景オブジェクト: ビューポート固定 */}
      {(bgObjectUrl || bgObjectColor) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: bgObjectColor ?? 'transparent',
            opacity: bgObjectOpacity,
            pointerEvents: 'none',
            zIndex: 0,
            transition: activeScene?.bg_transition === 'fade'
              ? `opacity ${activeScene.bg_transition_duration}ms ease`
              : undefined,
          }}
        >
          {bgBlobSrc && (
            <img
              src={bgBlobSrc}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center center',
                filter: 'blur(8px)',
                transform: 'scale(1.05)',
              }}
            />
          )}
        </div>
      )}
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        draggable
        onWheel={handleWheel}
        onClick={handleStageClick}
        style={{ backgroundColor: 'transparent', position: 'relative', zIndex: 1 }}
      >
        {/* 背景+グリッド: hitテスト不要 */}
        {gridVisible && (
          <Layer hitGraphEnabled={false} listening={false}>
            <GridLines />
          </Layer>
        )}
        {/* インタラクティブ要素 */}
        <Layer>
          {/* コマ */}
          {pieces.map((piece) => (
            <Group
              key={piece.id}
              x={piece.x}
              y={piece.y}
              draggable
              onDragEnd={(e) => handlePieceDragEnd(piece.id, e)}
              onContextMenu={(e) => handleContextMenu(piece.id, e)}
            >
              {piece.image_url ? (
                <PieceImage url={piece.image_url} width={piece.width} height={piece.height} />
              ) : (
                <Rect
                  width={piece.width}
                  height={piece.height}
                  fill={piece.color}
                  cornerRadius={6}
                  shadowColor="black"
                  shadowBlur={6}
                  shadowOpacity={0.3}
                  shadowOffsetY={2}
                />
              )}
              <Text
                text={piece.label}
                width={piece.width}
                height={piece.height}
                align="center"
                verticalAlign="middle"
                fontSize={14}
                fontStyle="bold"
                fill="#fff"
                listening={false}
              />
              <StatusBars piece={piece} />
            </Group>
          ))}
        </Layer>
      </Stage>
      {/* オブジェクトオーバーレイ（DOM描画、rAF で Stage に同期） */}
      <DomObjectOverlay
        ref={domLayerRef}
        objects={objects}
        selectedObjectId={selectedObjectId}
        selectedObjectIds={selectedObjectIds}
        activeScene={activeScene}
        stageRef={stageRef}
        onMoveObject={onMoveObject ?? (() => {})}
        onSelectObject={onSelectObject ?? (() => {})}
        onEditObject={onEditObject ?? (() => {})}
        onResizeObject={onResizeObject}
      />
      {/* 右クリックメニュー（HTML DOM） */}
      {contextMenu.visible && contextMenu.pieceId && (
        <div
          style={{
            position: 'absolute',
            top: contextMenu.y,
            left: contextMenu.x,
            background: theme.bgInput,
            border: `1px solid ${theme.border}`,
            borderRadius: 0,
            padding: '4px 0',
            zIndex: 100,
            minWidth: '120px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onEditPiece(contextMenu.pieceId!);
              closeContextMenu();
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              color: theme.textPrimary,
              fontSize: '0.85rem',
              textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = theme.bgInput)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            編集
          </button>
          <button
            onClick={() => {
              onRemovePiece(contextMenu.pieceId!);
              closeContextMenu();
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              color: theme.danger,
              fontSize: '0.85rem',
              textAlign: 'left',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = theme.bgInput)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            削除
          </button>
        </div>
      )}
      {children}
    </div>
  );
});
