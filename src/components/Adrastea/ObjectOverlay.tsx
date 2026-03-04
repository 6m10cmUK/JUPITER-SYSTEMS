import { useState, useEffect, useCallback } from 'react';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { BoardObject } from '../../types/adrastea.types';
import { GRID_SIZE } from './Board';

interface ObjectOverlayProps {
  objects: BoardObject[];
  onMoveObject: (id: string, x: number, y: number) => void;
  onEditObject: (id: string) => void;
}

function snapToGrid(val: number): number {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

function ObjectImage({
  url,
  width,
  height,
  fit,
}: {
  url: string;
  width: number;
  height: number;
  fit: 'contain' | 'cover';
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

  if (fit === 'cover') {
    // 中央トリミング: アスペクト比を維持しつつ枠を埋める
    const imgRatio = image.naturalWidth / image.naturalHeight;
    const boxRatio = width / height;
    let cropW: number, cropH: number, cropX: number, cropY: number;
    if (imgRatio > boxRatio) {
      // 画像が横長 → 横をトリミング
      cropH = image.naturalHeight;
      cropW = cropH * boxRatio;
      cropX = (image.naturalWidth - cropW) / 2;
      cropY = 0;
    } else {
      // 画像が縦長 → 縦をトリミング
      cropW = image.naturalWidth;
      cropH = cropW / boxRatio;
      cropX = 0;
      cropY = (image.naturalHeight - cropH) / 2;
    }
    return (
      <KonvaImage
        image={image}
        width={width}
        height={height}
        crop={{ x: cropX, y: cropY, width: cropW, height: cropH }}
        listening={false}
      />
    );
  }

  // contain: アスペクト比維持で枠内に収める
  const imgRatio = image.naturalWidth / image.naturalHeight;
  const boxRatio = width / height;
  let drawW: number, drawH: number;
  if (imgRatio > boxRatio) {
    drawW = width;
    drawH = width / imgRatio;
  } else {
    drawH = height;
    drawW = height * imgRatio;
  }
  const offsetX = (width - drawW) / 2;
  const offsetY = (height - drawH) / 2;

  return (
    <KonvaImage
      image={image}
      x={offsetX}
      y={offsetY}
      width={drawW}
      height={drawH}
      listening={false}
    />
  );
}

function PanelObject({
  obj,
  onMove,
  onEdit,
}: {
  obj: BoardObject;
  onMove: (id: string, x: number, y: number) => void;
  onEdit: (id: string) => void;
}) {
  const pxX = obj.x * GRID_SIZE;
  const pxY = obj.y * GRID_SIZE;
  const pxW = obj.width * GRID_SIZE;
  const pxH = obj.height * GRID_SIZE;

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const snappedX = snapToGrid(e.target.x());
      const snappedY = snapToGrid(e.target.y());
      e.target.position({ x: snappedX, y: snappedY });
      onMove(obj.id, snappedX / GRID_SIZE, snappedY / GRID_SIZE);
    },
    [obj.id, onMove]
  );

  return (
    <Group
      x={pxX}
      y={pxY}
      draggable
      opacity={obj.opacity}
      onDragEnd={handleDragEnd}
      onDblClick={() => onEdit(obj.id)}
      onDblTap={() => onEdit(obj.id)}
    >
      <Rect width={pxW} height={pxH} fill={obj.background_color} />
      {obj.image_url && (
        <ObjectImage url={obj.image_url} width={pxW} height={pxH} fit={obj.image_fit} />
      )}
    </Group>
  );
}

function TextObject({
  obj,
  onMove,
  onEdit,
}: {
  obj: BoardObject;
  onMove: (id: string, x: number, y: number) => void;
  onEdit: (id: string) => void;
}) {
  const pxX = obj.x * GRID_SIZE;
  const pxY = obj.y * GRID_SIZE;
  const pxW = obj.width * GRID_SIZE;
  const pxH = obj.height * GRID_SIZE;

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const snappedX = snapToGrid(e.target.x());
      const snappedY = snapToGrid(e.target.y());
      e.target.position({ x: snappedX, y: snappedY });
      onMove(obj.id, snappedX / GRID_SIZE, snappedY / GRID_SIZE);
    },
    [obj.id, onMove]
  );

  return (
    <Group
      x={pxX}
      y={pxY}
      draggable
      opacity={obj.opacity}
      onDragEnd={handleDragEnd}
      onDblClick={() => onEdit(obj.id)}
      onDblTap={() => onEdit(obj.id)}
    >
      <Rect width={pxW} height={pxH} fill={obj.background_color} />
      <Text
        text={obj.text_content ?? ''}
        fontSize={obj.font_size}
        fill={obj.text_color}
        width={pxW}
        height={pxH}
        listening={false}
      />
    </Group>
  );
}

function ForegroundObject({
  obj,
  onMove,
  onEdit,
}: {
  obj: BoardObject;
  onMove: (id: string, x: number, y: number) => void;
  onEdit: (id: string) => void;
}) {
  const pxX = obj.x * GRID_SIZE;
  const pxY = obj.y * GRID_SIZE;
  const pxW = obj.width * GRID_SIZE;
  const pxH = obj.height * GRID_SIZE;

  const handleDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      const snappedX = snapToGrid(e.target.x());
      const snappedY = snapToGrid(e.target.y());
      e.target.position({ x: snappedX, y: snappedY });
      onMove(obj.id, snappedX / GRID_SIZE, snappedY / GRID_SIZE);
    },
    [obj.id, onMove]
  );

  return (
    <Group
      x={pxX}
      y={pxY}
      draggable
      opacity={obj.opacity}
      listening={true}
      onDragEnd={handleDragEnd}
      onDblClick={() => onEdit(obj.id)}
      onDblTap={() => onEdit(obj.id)}
    >
      {obj.image_url && (
        <ObjectImage url={obj.image_url} width={pxW} height={pxH} fit={obj.image_fit} />
      )}
    </Group>
  );
}

export function ObjectOverlay({ objects, onMoveObject, onEditObject }: ObjectOverlayProps) {
  const visibleObjects = objects.filter((o) => o.visible);

  return (
    <>
      {visibleObjects.map((obj) => {
        switch (obj.type) {
          case 'panel':
            return <PanelObject key={obj.id} obj={obj} onMove={onMoveObject} onEdit={onEditObject} />;
          case 'text':
            return <TextObject key={obj.id} obj={obj} onMove={onMoveObject} onEdit={onEditObject} />;
          case 'foreground':
            return <ForegroundObject key={obj.id} obj={obj} onMove={onMoveObject} onEdit={onEditObject} />;
        }
      })}
    </>
  );
}
