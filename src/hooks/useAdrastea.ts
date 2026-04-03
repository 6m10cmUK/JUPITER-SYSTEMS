import { useCallback } from 'react';
import type { Piece, Room } from '../types/adrastea.types';
import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { genId } from '../utils/id';
import { omitKeys } from '../utils/object';

export function useAdrastea(
  roomId: string,
  options?: { initialRoom?: unknown[]; initialPieces?: unknown[]; enabled?: boolean }
) {
  const queryEnabled = options?.enabled !== false;
  // postgres_changes の server-side filter は型・エスケープでイベントが来ない事例があるため付けない。
  // 自ルーム以外の行は matchesFilter(data.id === roomId) で無視する。
  const roomsQuery = useSupabaseQuery<Room>({
    table: 'rooms',
    columns: 'id,name,dice_system,created_at,updated_at,active_scene_id,active_cutin,thumbnail_asset_id,gm_can_see_secret_memo,owner_id,description,default_login_role',
    roomId,
    filter: (q) => q.eq('id', roomId),
    enabled: queryEnabled,
    initialData: options?.initialRoom,
  });

  const piecesQuery = useSupabaseQuery<Piece>({
    table: 'pieces',
    columns: 'id,room_id,x,y,width,height,label,color,image_asset_id,z_index,statuses,initiative,memo,character_id,created_at',
    roomId,
    filter: (q) => q.eq('room_id', roomId),
    enabled: queryEnabled,
    initialData: options?.initialPieces,
  });

  const roomsMutation = useSupabaseMutation<Room>('rooms', roomsQuery.setData);
  const piecesMutation = useSupabaseMutation<Piece>('pieces', piecesQuery.setData);

  const loading = roomsQuery.loading || piecesQuery.loading;

  const room: Room | null = roomsQuery.data[0] ?? null;
  const pieces: Piece[] = piecesQuery.data;

  const movePiece = useCallback(
    (pieceId: string, x: number, y: number) => {
      void piecesMutation.update(pieceId, { x, y } as Partial<Piece>).catch((error) => {
        console.error('[useAdrastea] movePiece failed:', error);
        // TODO: showToast でユーザー通知
      });
    },
    [piecesMutation]
  );

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
        label,
        color,
        z_index: pieces.length,
        image_asset_id: null,
        statuses: [],
        initiative: 0,
        memo: '',
        character_id: null,
        created_at: Date.now(),
      };
      void piecesMutation.insert(newPiece).catch((error) => {
        console.error('[useAdrastea] addPiece failed:', error);
        // TODO: showToast でユーザー通知
      });
    },
    [roomId, pieces.length, piecesMutation]
  );

  const removePiece = useCallback(
    (pieceId: string) => {
      void piecesMutation.remove(pieceId).catch((error) => {
        console.error('[useAdrastea] removePiece failed:', error);
        // TODO: showToast でユーザー通知
      });
    },
    [piecesMutation]
  );

  const updatePiece = useCallback(
    (pieceId: string, updates: Partial<Piece>) => {
      const rest = omitKeys(updates as Piece, ['id', 'room_id', 'created_at']);
      void piecesMutation.update(pieceId, rest as Partial<Piece>).catch((error) => {
        console.error('[useAdrastea] updatePiece failed:', error);
        // TODO: showToast でユーザー通知
      });
    },
    [piecesMutation]
  );

  const updateRoom = useCallback(
    (updates: Partial<Room>) => {
      const rest = omitKeys(updates as Room, ['id', 'owner_id', 'created_at']);
      void roomsMutation.update(roomId, rest as Partial<Room>).catch((error) => {
        console.error('[useAdrastea] updateRoom failed:', error);
        // TODO: showToast でユーザー通知
      });
    },
    [roomId, roomsMutation]
  );

  return { pieces, room, loading, movePiece, addPiece, removePiece, updatePiece, updateRoom };
}
