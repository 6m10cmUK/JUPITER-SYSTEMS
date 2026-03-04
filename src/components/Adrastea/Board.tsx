import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Line, Group, Text, Image as KonvaImage } from 'react-konva';
import { theme } from '../../styles/theme';
import { ObjectOverlay } from './ObjectOverlay';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage as StageType } from 'konva/lib/Stage';
import type { Piece as PieceType, BoardObject } from '../../types/adrastea.types';
import type { ReactNode } from 'react';

interface BoardProps {
  pieces: PieceType[];
  backgroundUrl: string | null;
  objects?: BoardObject[];
  onMovePiece: (id: string, x: number, y: number) => void;
  onRemovePiece: (id: string) => void;
  onEditPiece: (id: string) => void;
  onMoveObject?: (id: string, x: number, y: number) => void;
  onEditObject?: (id: string) => void;
  children?: ReactNode;
}

export const LOGICAL_SIZE = 5000;
export const GRID_SIZE = 50;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;

function GridLines() {
  const lines: React.JSX.Element[] = [];

  for (let x = GRID_SIZE; x < LOGICAL_SIZE; x += GRID_SIZE) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, LOGICAL_SIZE]}
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={1}
      />
    );
  }
  for (let y = GRID_SIZE; y < LOGICAL_SIZE; y += GRID_SIZE) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y, LOGICAL_SIZE, y]}
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={1}
      />
    );
  }

  return <>{lines}</>;
}

function PieceImage({ url, width, height }: { url: string; width: number; height: number }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = url;
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
}

function StatusBars({ piece }: { piece: PieceType }) {
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
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  pieceId: string | null;
}

function snapToGrid(val: number): number {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

export function Board({ pieces, backgroundUrl, objects = [], onMovePiece, onRemovePiece, onEditPiece, onMoveObject, onEditObject, children }: BoardProps) {
  const stageRef = useRef<StageType>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, pieceId: null });

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

  // 背景オブジェクト（HTMLで描画）
  const bgObject = objects.find(o => o.type === 'background' && o.visible);
  const bgObjectUrl = bgObject?.image_url ?? null;
  const bgObjectOpacity = bgObject?.opacity ?? 1;

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}
      onClick={closeContextMenu}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        draggable
        onWheel={handleWheel}
        onClick={handleStageClick}
        style={{ backgroundColor: theme.bgBase }}
      >
        <Layer>
          {/* 背景 */}
          <Rect
            x={0}
            y={0}
            width={LOGICAL_SIZE}
            height={LOGICAL_SIZE}
            fill={theme.bgBase}
            listening={false}
          />
          <GridLines />
          {/* オブジェクト（パネル・テキスト、コマの下に描画されるもの） */}
          {objects.length > 0 && onMoveObject && onEditObject && (
            <ObjectOverlay
              objects={objects.filter(o => o.type === 'panel' || o.type === 'text')}
              onMoveObject={onMoveObject}
              onEditObject={onEditObject}
            />
          )}
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
          {/* 前景オブジェクト（コマの上） */}
          {objects.length > 0 && onMoveObject && onEditObject && (
            <ObjectOverlay
              objects={objects.filter(o => o.type === 'foreground')}
              onMoveObject={onMoveObject}
              onEditObject={onEditObject}
            />
          )}
        </Layer>
      </Stage>
      {/* シーン背景: ビューポート固定、ぼかし、cover */}
      {backgroundUrl && (
        <img
          src={backgroundUrl}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(8px)',
            opacity: 1,
            pointerEvents: 'none',
            zIndex: 2,
            transform: 'scale(1.05)',
          }}
        />
      )}
      {/* 背景オブジェクト: ビューポート固定、ぼかし、cover */}
      {bgObjectUrl && (
        <img
          src={bgObjectUrl}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(8px)',
            opacity: bgObjectOpacity,
            pointerEvents: 'none',
            zIndex: 3,
            transform: 'scale(1.05)',
          }}
        />
      )}
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
}
