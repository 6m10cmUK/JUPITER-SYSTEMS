import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Piece as PieceType } from '../../types/adrastea.types';
import { theme } from '../../styles/theme';

interface PieceProps {
  piece: PieceType;
  onRemove: (id: string) => void;
}

export function Piece({ piece, onRemove }: PieceProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: piece.id,
    data: piece,
  });

  const style: React.CSSProperties = {
    position: 'absolute',
    left: piece.x,
    top: piece.y,
    width: piece.width,
    height: piece.height,
    transform: CSS.Translate.toString(transform),
    zIndex: piece.z_index,
    backgroundColor: piece.image_url ? 'transparent' : piece.color,
    backgroundImage: piece.image_url ? `url(${piece.image_url})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    borderRadius: 0,
    cursor: 'grab',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    border: '2px solid rgba(255,255,255,0.3)',
    boxShadow: theme.shadowSm,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <span
        style={{
          color: '#fff',
          fontSize: '11px',
          fontWeight: 'bold',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          textAlign: 'center',
          lineHeight: 1.2,
          pointerEvents: 'none',
        }}
      >
        {piece.label}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(piece.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: theme.danger,
          color: theme.textOnAccent,
          border: 'none',
          cursor: 'pointer',
          fontSize: '12px',
          lineHeight: '20px',
          textAlign: 'center',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="削除"
      >
        ×
      </button>
    </div>
  );
}
