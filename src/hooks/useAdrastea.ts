import { useState, useEffect, useCallback } from 'react';
import type { Piece, Room } from '../types/adrastea.types';

const genId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');

export function useAdrastea(
  roomId: string,
  initialData?: { room: Room | null; pieces: Piece[] }
) {
  const [pieces, setPieces] = useState<Piece[]>(initialData?.pieces ?? []);
  const [room, setRoom] = useState<Room | null>(initialData?.room ?? null);
  const [loading, setLoading] = useState(!initialData);

  // 初期データが後から届いた場合に反映
  useEffect(() => {
    if (initialData) {
      setRoom(initialData.room);
      setPieces(initialData.pieces);
      setLoading(false);
    }
  }, [initialData]);

  const movePiece = useCallback((pieceId: string, x: number, y: number) => {
    setPieces((prev) =>
      prev.map((p) => (p.id === pieceId ? { ...p, x, y } : p))
    );
  }, []);

  const addPiece = useCallback(
    (label: string, color: string, centerX?: number, centerY?: number) => {
      const baseX = centerX ?? 2500;
      const baseY = centerY ?? 2500;
      const offsetX = Math.floor(Math.random() * 100) - 50;
      const offsetY = Math.floor(Math.random() * 100) - 50;
      const newPiece: Piece = {
        id: genId(),
        room_id: roomId,
        x: baseX + offsetX,
        y: baseY + offsetY,
        width: 60,
        height: 60,
        image_url: null,
        label,
        color,
        z_index: pieces.length,
        statuses: [],
        initiative: 0,
        memo: '',
        character_id: null,
        created_at: Date.now(),
      };
      setPieces((prev) => [...prev, newPiece]);
    },
    [roomId, pieces.length]
  );

  const removePiece = useCallback((pieceId: string) => {
    setPieces((prev) => prev.filter((p) => p.id !== pieceId));
  }, []);

  const updatePiece = useCallback((pieceId: string, updates: Partial<Piece>) => {
    setPieces((prev) =>
      prev.map((p) => (p.id === pieceId ? { ...p, ...updates } : p))
    );
  }, []);

  const updateRoom = useCallback((updates: Partial<Room>) => {
    setRoom((prev) => (prev ? { ...prev, ...updates, updated_at: Date.now() } : prev));
  }, []);

  return { pieces, room, loading, movePiece, addPiece, removePiece, updatePiece, updateRoom };
}
