import { useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Piece, Room } from '../types/adrastea.types';

export function useAdrastea(roomId: string) {
  const roomData = useQuery(api.rooms.get, { id: roomId });
  const piecesData = useQuery(api.pieces.list, { room_id: roomId });

  const updateRoomMutation = useMutation(api.rooms.update).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.rooms.get, { id: roomId });
      if (current !== undefined) {
        localStore.setQuery(api.rooms.get, { id: roomId }, { ...current, ...args } as any);
      }
    }
  );
  const createPieceMutation = useMutation(api.pieces.create);
  const updatePieceMutation = useMutation(api.pieces.update).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.pieces.list, { room_id: roomId });
      if (current !== undefined) {
        localStore.setQuery(
          api.pieces.list,
          { room_id: roomId },
          current.map((p) => p.id === args.id ? { ...p, ...args } : p),
        );
      }
    }
  );
  const removePieceMutation = useMutation(api.pieces.remove);

  const loading = roomData === undefined || piecesData === undefined;

  const room: Room | null = roomData
    ? {
        id: roomData.id,
        name: roomData.name ?? '',
        dice_system: roomData.dice_system ?? 'DiceBot',
        created_at: roomData._creationTime ?? 0,
        updated_at: roomData._creationTime ?? 0,
        active_scene_id: (roomData as any).active_scene_id ?? null,
        active_cutin: (roomData as any).active_cutin ?? null,
        foreground_url: (roomData as any).foreground_url ?? null,
        gm_can_see_secret_memo: (roomData as any).gm_can_see_secret_memo ?? false,
        owner_id: (roomData as any).owner_id ?? '',
      }
    : null;

  const pieces: Piece[] = (piecesData ?? []).map((p) => ({
    id: p.id,
    room_id: p.room_id,
    x: p.x,
    y: p.y,
    width: p.width,
    height: p.height,
    image_url: (p as any).image_url ?? null,
    label: p.label,
    color: p.color,
    z_index: p.z_index,
    statuses: (p as any).statuses ?? [],
    initiative: (p as any).initiative,
    memo: (p as any).memo,
    character_id: (p as any).character_id ?? null,
    created_at: p._creationTime,
  }));

  const movePiece = useCallback(
    (pieceId: string, x: number, y: number) => {
      updatePieceMutation({ id: pieceId, x, y }).catch(console.error);
    },
    [updatePieceMutation]
  );

  const addPiece = useCallback(
    (label: string, color: string, centerX?: number, centerY?: number) => {
      const baseX = centerX ?? 2500;
      const baseY = centerY ?? 2500;
      const offsetX = Math.floor(Math.random() * 100) - 50;
      const offsetY = Math.floor(Math.random() * 100) - 50;
      createPieceMutation({
        room_id: roomId,
        x: baseX + offsetX,
        y: baseY + offsetY,
        width: 60,
        height: 60,
        label,
        color,
        z_index: pieces.length,
      } as any).catch(console.error);
    },
    [roomId, pieces.length, createPieceMutation]
  );

  const removePiece = useCallback(
    (pieceId: string) => {
      removePieceMutation({ id: pieceId }).catch(console.error);
    },
    [removePieceMutation]
  );

  const updatePiece = useCallback(
    (pieceId: string, updates: Partial<Piece>) => {
      const { id: _id, room_id: _rid, created_at: _ca, ...rest } = updates as Piece;
      updatePieceMutation({ id: pieceId, ...rest } as any).catch(console.error);
    },
    [updatePieceMutation]
  );

  const updateRoom = useCallback(
    (updates: Partial<Room>) => {
      const { id: _id, owner_id: _oid, created_at: _ca, ...rest } = updates as Room;
      updateRoomMutation({ id: roomId, ...rest } as any).catch(console.error);
    },
    [roomId, updateRoomMutation]
  );

  return { pieces, room, loading, movePiece, addPiece, removePiece, updatePiece, updateRoom };
}
