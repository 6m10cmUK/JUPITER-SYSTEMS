import { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { isAdrasteaQueryDebug } from '../utils/debugFlags';

/**
 * RPC get_room_initial_data で全テーブルのデータを1リクエストで取得する。
 * Realtime subscription は各フックが個別に行う。
 */

export interface RoomInitialData {
  room: Record<string, unknown> | null;
  pieces: Record<string, unknown>[];
  scenes: Record<string, unknown>[];
  characters_stats: Record<string, unknown>[];
  characters_base: Record<string, unknown>[];
  objects: Record<string, unknown>[];
  bgms: Record<string, unknown>[];
  scenario_texts: Record<string, unknown>[];
  cutins: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  room_members: Record<string, unknown>[];
  channels: Record<string, unknown>[];
}

export function useInitialRoomData(roomId: string) {
  const [data, setData] = useState<RoomInitialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!roomId || fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchInitial = async () => {
      try {
        if (isAdrasteaQueryDebug()) {
          console.log('[Adrastea:Query] RPC get_room_initial_data', { roomId });
        }
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'get_room_initial_data',
          { room_id_arg: roomId, message_limit_arg: 200 }
        );

        if (rpcError) throw rpcError;

        if (isAdrasteaQueryDebug()) {
          const tables = rpcData ? Object.keys(rpcData) : [];
          console.log('[Adrastea:Query] RPC success', { tables, roomId });
        }
        setData(rpcData as RoomInitialData);
      } catch (err) {
        console.error('[useInitialRoomData] RPC failed, falling back to individual queries', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitial();
  }, [roomId]);

  return { data, loading, error };
}
