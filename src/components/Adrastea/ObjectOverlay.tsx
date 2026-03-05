import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';
import type { BoardObject, Scene } from '../../types/adrastea.types';
import { GRID_SIZE } from './Board';

interface ObjectOverlayProps {
  objects: BoardObject[];
  selectedObjectId?: string | null;
  selectedObjectIds?: string[];
  activeScene?: Scene | null;
  onMoveObject: (id: string, x: number, y: number) => void;
  onSelectObject: (id: string) => void;
  onEditObject: (id: string) => void;
  onResizeObject?: (id: string, width: number, height: number) => void;
}

const MIN_SIZE_PX = 50;
const EDGE_THRESHOLD = 14;

function snapToGrid(val: number): number {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

// --- エッジ検出 ---
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

// --- 画像描画 ---
const ObjectImage = memo(function ObjectImage({
  url, width, height, fit,
}: {
  url: string; width: number; height: number;
  fit: 'contain' | 'cover' | 'stretch';
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = url;
    return () => { img.onload = null; };
  }, [url]);

  if (!image) return null;

  if (fit === 'stretch') {
    return <KonvaImage image={image} width={width} height={height} listening={false} />;
  }

  if (fit === 'cover') {
    const imgRatio = image.naturalWidth / image.naturalHeight;
    const boxRatio = width / height;
    let cropW: number, cropH: number, cropX: number, cropY: number;
    if (imgRatio > boxRatio) {
      cropH = image.naturalHeight;
      cropW = cropH * boxRatio;
      cropX = (image.naturalWidth - cropW) / 2;
      cropY = 0;
    } else {
      cropW = image.naturalWidth;
      cropH = cropW / boxRatio;
      cropX = 0;
      cropY = (image.naturalHeight - cropH) / 2;
    }
    return (
      <KonvaImage
        image={image} width={width} height={height}
        crop={{ x: cropX, y: cropY, width: cropW, height: cropH }}
        listening={false}
      />
    );
  }

  // contain
  const imgRatio = image.naturalWidth / image.naturalHeight;
  const boxRatio = width / height;
  let drawW: number, drawH: number;
  if (imgRatio > boxRatio) { drawW = width; drawH = width / imgRatio; }
  else { drawH = height; drawW = height * imgRatio; }
  return (
    <KonvaImage
      image={image}
      x={(width - drawW) / 2} y={(height - drawH) / 2}
      width={drawW} height={drawH} listening={false}
    />
  );
});

// --- エッジリサイズ対応の共通フック ---
interface ResizeState {
  edge: Edge;
  startPointerX: number;
  startPointerY: number;
  origPxX: number;
  origPxY: number;
  origPxW: number;
  origPxH: number;
}

function useEdgeResize(
  objId: string,
  groupRef: React.RefObject<Konva.Group | null>,
  pxW: number,
  pxH: number,
  pxX: number,
  pxY: number,
  onMove: (id: string, x: number, y: number) => void,
  onResize?: (id: string, w: number, h: number) => void,
) {
  const resizeRef = useRef<ResizeState | null>(null);

  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage || !groupRef.current) return;
    const pos = groupRef.current.getRelativePointerPosition();
    if (!pos) return;
    const edge = getEdge(pos.x, pos.y, pxW, pxH);
    stage.container().style.cursor = edgeToCursor(edge);
  }, [pxW, pxH, groupRef]);

  const handleMouseLeave = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = 'default';
  }, []);

  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const group = groupRef.current;
    const stage = e.target.getStage();
    if (!group || !stage) return;
    const pos = group.getRelativePointerPosition();
    if (!pos) return;
    const edge = getEdge(pos.x, pos.y, pxW, pxH);
    if (!edge || !onResize) {
      group.draggable(true);
      return;
    }
    // エッジ上 → ドラッグ無効化してリサイズ開始
    group.draggable(false);
    stage.draggable(false); // Stageパンも止める
    const pointer = stage.getPointerPosition()!;
    const scale = stage.scaleX();
    resizeRef.current = {
      edge,
      startPointerX: pointer.x / scale,
      startPointerY: pointer.y / scale,
      origPxX: pxX,
      origPxY: pxY,
      origPxW: pxW,
      origPxH: pxH,
    };

    const container = stage.container();

    const onPointerMove = (me: MouseEvent) => {
      const rs = resizeRef.current;
      if (!rs) return;
      const rect = container.getBoundingClientRect();
      const curX = (me.clientX - rect.left) / scale;
      const curY = (me.clientY - rect.top) / scale;
      // stage position offset
      const stagePos = stage.position();
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

      group.position({ x: newX, y: newY });
      group.width(newW);
      group.height(newH);
      // 子Rectも更新
      const rect0 = group.findOne('Rect') as Konva.Rect | undefined;
      if (rect0) { rect0.width(newW); rect0.height(newH); }
      group.getLayer()?.batchDraw();
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      const rs = resizeRef.current;
      resizeRef.current = null;
      if (!rs) return;

      const finalX = snapToGrid(group.x());
      const finalY = snapToGrid(group.y());
      const finalW = snapToGrid(group.width());
      const finalH = snapToGrid(group.height());
      group.position({ x: finalX, y: finalY });
      group.width(finalW);
      group.height(finalH);
      const rect0 = group.findOne('Rect') as Konva.Rect | undefined;
      if (rect0) { rect0.width(finalW); rect0.height(finalH); }

      onMove(objId, finalX / GRID_SIZE, finalY / GRID_SIZE);
      onResize(objId, Math.max(1, finalW / GRID_SIZE), Math.max(1, finalH / GRID_SIZE));
      group.draggable(true);
      const stage = group.getStage();
      if (stage) stage.draggable(true);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [objId, pxW, pxH, pxX, pxY, onMove, onResize, groupRef]);

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const snappedX = snapToGrid(e.target.x());
      const snappedY = snapToGrid(e.target.y());
      e.target.position({ x: snappedX, y: snappedY });
      onMove(objId, snappedX / GRID_SIZE, snappedY / GRID_SIZE);
    },
    [objId, onMove]
  );

  return { handleMouseMove, handleMouseLeave, handleMouseDown, handleDragEnd };
}

// --- PanelObject ---
const PanelObject = memo(function PanelObject({
  obj, isSelected, onMove, onSelect, onEdit, onResize,
}: {
  obj: BoardObject; isSelected: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onResize?: (id: string, w: number, h: number) => void;
}) {
  const pxX = obj.x * GRID_SIZE;
  const pxY = obj.y * GRID_SIZE;
  const pxW = obj.width * GRID_SIZE;
  const pxH = obj.height * GRID_SIZE;
  const groupRef = useRef<Konva.Group>(null);

  const { handleMouseMove, handleMouseLeave, handleMouseDown, handleDragEnd } =
    useEdgeResize(obj.id, groupRef, pxW, pxH, pxX, pxY, onMove, onResize);

  return (
    <Group
      ref={groupRef}
      x={pxX} y={pxY} width={pxW} height={pxH}
      draggable
      opacity={obj.opacity}
      onMouseDown={handleMouseDown}
      onDragEnd={handleDragEnd}
      onClick={() => onSelect(obj.id)}
      onTap={() => onSelect(obj.id)}
      onDblClick={() => onEdit(obj.id)}
      onDblTap={() => onEdit(obj.id)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Rect width={pxW} height={pxH} fill={obj.background_color} />
      {obj.image_url && (
        <ObjectImage url={obj.image_url} width={pxW} height={pxH} fit={obj.image_fit} />
      )}
      {!obj.image_url && (
        <Text
          text={obj.name} width={pxW} height={pxH}
          align="center" verticalAlign="middle"
          fontSize={14} fill="rgba(255,255,255,0.4)" listening={false}
        />
      )}
    </Group>
  );
});

// --- TextObject ---
const TextObject = memo(function TextObject({
  obj, isSelected, onMove, onSelect, onEdit, onResize,
}: {
  obj: BoardObject; isSelected: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onResize?: (id: string, w: number, h: number) => void;
}) {
  const pxX = obj.x * GRID_SIZE;
  const pxY = obj.y * GRID_SIZE;
  const pxW = obj.width * GRID_SIZE;
  const pxH = obj.height * GRID_SIZE;
  const groupRef = useRef<Konva.Group>(null);

  const { handleMouseMove, handleMouseLeave, handleMouseDown, handleDragEnd } =
    useEdgeResize(obj.id, groupRef, pxW, pxH, pxX, pxY, onMove, onResize);

  return (
    <Group
      ref={groupRef}
      x={pxX} y={pxY} width={pxW} height={pxH}
      draggable
      opacity={obj.opacity}
      onMouseDown={handleMouseDown}
      onDragEnd={handleDragEnd}
      onClick={() => onSelect(obj.id)}
      onTap={() => onSelect(obj.id)}
      onDblClick={() => onEdit(obj.id)}
      onDblTap={() => onEdit(obj.id)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Rect width={pxW} height={pxH} fill={obj.background_color} />
      <Text
        text={obj.text_content || obj.name}
        fontSize={obj.font_size} fill={obj.text_color}
        width={pxW} height={pxH} listening={false}
      />
    </Group>
  );
});

// --- BackgroundObject ---
const BackgroundObject = memo(function BackgroundObject({
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

  return (
    <Group
      x={pxX} y={pxY}
      onClick={() => onSelect(obj.id)}
      onTap={() => onSelect(obj.id)}
      onDblClick={() => onEdit(obj.id)}
      onDblTap={() => onEdit(obj.id)}
    >
      <Rect width={pxW} height={pxH} fill="transparent" />
    </Group>
  );
});

// --- ForegroundObject ---
const ForegroundObject = memo(function ForegroundObject({
  obj, onMove, onSelect, onEdit, fadeIn,
}: {
  obj: BoardObject;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  fadeIn?: { duration: number };
}) {
  const pxX = obj.x * GRID_SIZE;
  const pxY = obj.y * GRID_SIZE;
  const pxW = obj.width * GRID_SIZE;
  const pxH = obj.height * GRID_SIZE;
  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    if (fadeIn && groupRef.current) {
      const node = groupRef.current;
      node.opacity(0);
      node.to({ opacity: obj.opacity, duration: fadeIn.duration / 1000 });
    }
  }, []);

  return (
    <Group
      ref={groupRef}
      x={pxX} y={pxY}
      draggable={false}
      opacity={fadeIn ? 0 : obj.opacity}
      onClick={() => onSelect(obj.id)}
      onTap={() => onSelect(obj.id)}
      onDblClick={() => onEdit(obj.id)}
      onDblTap={() => onEdit(obj.id)}
    >
      <Rect width={pxW} height={pxH} fill={obj.background_color ?? 'transparent'} />
      {obj.image_url && (
        <ObjectImage url={obj.image_url} width={pxW} height={pxH} fit={obj.image_fit} />
      )}
    </Group>
  );
});

// --- ObjectOverlay ---
export const ObjectOverlay = memo(function ObjectOverlay({
  objects, selectedObjectId, selectedObjectIds = [], activeScene,
  onMoveObject, onSelectObject, onEditObject, onResizeObject,
}: ObjectOverlayProps) {
  const visibleObjects = objects.filter((o) => o.visible);

  return (
    <>
      {visibleObjects.map((obj) => {
        const isSelected = selectedObjectIds.length > 0
          ? selectedObjectIds.includes(obj.id)
          : obj.id === selectedObjectId;
        switch (obj.type) {
          case 'background':
            return <BackgroundObject key={obj.id} obj={obj} onSelect={onSelectObject} onEdit={onEditObject} />;
          case 'panel':
            return <PanelObject key={obj.id} obj={obj} isSelected={isSelected} onMove={onMoveObject} onSelect={onSelectObject} onEdit={onEditObject} onResize={onResizeObject} />;
          case 'text':
            return <TextObject key={obj.id} obj={obj} isSelected={isSelected} onMove={onMoveObject} onSelect={onSelectObject} onEdit={onEditObject} onResize={onResizeObject} />;
          case 'foreground':
            return <ForegroundObject key={obj.id} obj={obj} onMove={onMoveObject} onSelect={onSelectObject} onEdit={onEditObject} fadeIn={activeScene?.fg_transition === 'fade' ? { duration: activeScene.fg_transition_duration } : undefined} />;
        }
      })}
    </>
  );
});
