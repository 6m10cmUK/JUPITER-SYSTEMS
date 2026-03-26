import { useCallback } from 'react';
import type { Piece, Room } from '../types/adrastea.types';
import { supabase } from '../services/supabase';
import { useSupabaseQuery } from './useSupabaseQuery';

export function useAdrastea(roomId: string) {
  const roomsQuery = useSupabaseQuery<Room>({
    table: 'rooms',
    columns: 'id,name,dice_system,created_at,updated_at,active_scene_id,active_cutin,thumbnail_asset_id,gm_can_see_secret_memo,owner_id,description,default_login_role',
    roomId,
    filter: (q) => q.eq('id', roomId),
  });

  const piecesQuery = useSupabaseQuery<Piece>({
    table: 'pieces',
    columns: 'id,room_id,x,y,width,height,label,color,image_asset_id,z_index,statuses,initiative,memo,character_id,created_at',
    roomId,
    filter: (q) => q.eq('room_id', roomId),
  });

  const loading = roomsQuery.loading || piecesQuery.loading;

  const room: Room | null = roomsQuery.data[0] ?? null;
  const pieces: Piece[] = piecesQuery.data;

  const movePiece = useCallback(
    (pieceId: string, x: number, y: number) => {
      void supabase.from('pieces').update({ x, y }).eq('id', pieceId).then(() => {}, () => {});
    },
    []
  );

  const addPiece = useCallback(
    (label: string, color: string, centerX?: number, centerY?: number) => {
      const baseX = centerX ?? 2500;
      const baseY = centerY ?? 2500;
      const offsetX = Math.floor(Math.random() * 100) - 50;
      const offsetY = Math.floor(Math.random() * 100) - 50;
      void supabase.from('pieces').insert({
        room_id: roomId,
        x: baseX + offsetX,
        y: baseY + offsetY,
        width: 60,
        height: 60,
        label,
        color,
        z_index: pieces.length,
      }).then(() => {}, () => {});
    },
    [roomId, pieces.length]
  );

  const removePiece = useCallback(
    (pieceId: string) => {
      void supabase.from('pieces').delete().eq('id', pieceId).then(() => {}, () => {});
    },
    []
  );

  const updatePiece = useCallback(
    (pieceId: string, updates: Partial<Piece>) => {
      const { id: _id, room_id: _rid, created_at: _ca, ...rest } = updates as Piece;
      void supabase.from('pieces').update(rest).eq('id', pieceId).then(() => {}, () => {});
    },
    []
  );

  const updateRoom = useCallback(
    (updates: Partial<Room>) => {
      const { id: _id, owner_id: _oid, created_at: _ca, ...rest } = updates as Room;
      void supabase.from('rooms').update(rest).eq('id', roomId).then(() => {}, () => {});
    },
    [roomId]
  );

  return { pieces, room, loading, movePiece, addPiece, removePiece, updatePiece, updateRoom };
}
