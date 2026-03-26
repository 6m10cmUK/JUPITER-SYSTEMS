import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

/**
 * Supabase Realtime 購読オプション
 */
export interface UseSupabaseQueryOptions {
  table: string;
  columns: string; // 'id,name,...' — select('*') 禁止（カラム指定必須）
  roomId: string; // チャネルキー用
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter?: (q: any) => any; // フィルタ関数（e.g., (q) => q.eq('room_id', roomId)）。Supabase の PostgrestFilterBuilder の型は非常に複雑なため any を許容
  orderBy?: { column: string; ascending?: boolean };
  enabled?: boolean; // false なら購読しない
}

export interface UseSupabaseQueryResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
}

/**
 * モジュールレベル チャネルキャッシュ
 * roomId → channel
 */
const channelCache = new Map<string, RealtimeChannel>();

/**
 * モジュールレベル リスナーレジストリ
 * roomId → table → Set<listener>
 */
const listenerRegistry = new Map<string, Map<string, Set<(payload: any) => void>>>();

/**
 * モジュールレベル echo suppression キャッシュ
 * テーブル → pending ID → timer ID
 */
const pendingUpdatesRegistry = new Map<string, Map<string, NodeJS.Timeout>>();

/**
 * 1ルーム1チャネルを取得・作成
 */
function getOrCreateChannel(roomId: string): RealtimeChannel {
  if (channelCache.has(roomId)) {
    return channelCache.get(roomId)!;
  }

  const channel = supabase.channel(`room:${roomId}`);

  // リスナーレジストリを初期化
  listenerRegistry.set(roomId, new Map());

  channel.subscribe();
  channelCache.set(roomId, channel);

  return channel;
}

/**
 * テーブル別リスナーを登録
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function registerListener(
  roomId: string,
  table: string,
  listener: (payload: any) => void
): void {
  const channel = getOrCreateChannel(roomId);
  const tableListeners = listenerRegistry.get(roomId)!;

  if (!tableListeners.has(table)) {
    tableListeners.set(table, new Set());

    // Realtime イベント設定（テーブル初回時のみ）
    channel.on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: table,
      },
      (payload) => {
        // 全リスナーに通知
        const listeners = tableListeners.get(table);
        if (listeners) {
          listeners.forEach((cb) => cb(payload));
        }
      }
    );
  }

  tableListeners.get(table)!.add(listener);
}

/**
 * テーブル別リスナーを削除
 */
function unregisterListener(
  roomId: string,
  table: string,
  listener: (payload: any) => void
): void {
  const tableListeners = listenerRegistry.get(roomId)?.get(table);
  if (tableListeners) {
    tableListeners.delete(listener);

    // 全リスナー削除時、チャネルをクリーンアップ
    if (tableListeners.size === 0) {
      const allEmpty = Array.from(listenerRegistry.get(roomId)!.values()).every(
        (set) => set.size === 0
      );
      if (allEmpty) {
        const channel = channelCache.get(roomId);
        if (channel) {
          channel.unsubscribe();
          channelCache.delete(roomId);
          listenerRegistry.delete(roomId);
        }
      }
    }
  }
}

/**
 * echo suppression: pending 更新を登録
 * Realtime で同じ ID の UPDATE を受信したら state 更新をスキップ
 */
function markAsPending(table: string, id: string): void {
  if (!pendingUpdatesRegistry.has(table)) {
    pendingUpdatesRegistry.set(table, new Map());
  }

  const pending = pendingUpdatesRegistry.get(table)!;

  // 既存の timer をクリア
  if (pending.has(id)) {
    clearTimeout(pending.get(id)!);
  }

  // 3秒後に自動削除（取りこぼし防止）
  const timerId = setTimeout(() => {
    pending.delete(id);
  }, 3000);

  pending.set(id, timerId);
}

function isPending(table: string, id: string): boolean {
  return pendingUpdatesRegistry.get(table)?.has(id) ?? false;
}

function clearPending(table: string, id: string): void {
  const pending = pendingUpdatesRegistry.get(table);
  if (pending?.has(id)) {
    clearTimeout(pending.get(id)!);
    pending.delete(id);
  }
}

/**
 * Supabase Realtime 購読 + 初回取得
 *
 * @param options 購読オプション
 * @returns data, loading, error
 */
export function useSupabaseQuery<T extends { id: string }>(
  options: UseSupabaseQueryOptions
): UseSupabaseQueryResult<T> {
  const {
    table,
    columns,
    roomId,
    filter,
    orderBy,
    enabled = true,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const listenerRef = useRef<((payload: any) => void) | null>(null);
  const filterRef = useRef(filter);
  const orderByRef = useRef(orderBy);

  // filter と orderBy を ref で保持（毎レンダーの新参照を防ぐ）
  filterRef.current = filter;
  orderByRef.current = orderBy;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchInitial = async () => {
      try {
        // 初回取得
        let query = supabase.from(table).select(columns);

        if (filterRef.current) {
          query = filterRef.current(query);
        }

        if (orderByRef.current) {
          query = query.order(orderByRef.current.column, {
            ascending: orderByRef.current.ascending !== false,
          });
        }

        const { data: fetchedData, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        if (!isMounted) return;

        setData((fetchedData || []) as unknown as T[]);
        setLoading(false);
        setError(null);

        // Realtime リスナー定義
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const realtimeListener = (payload: any) => {
          const { eventType, new: newData, old: oldData } = payload;

          if (!isMounted) return;

          switch (eventType) {
            case 'INSERT': {
              // フィルタを満たすかチェック（room_id等）
              if (!matchesFilter(newData, roomId)) {
                return;
              }
              setData((prev) => {
                const exists = prev.some((row) => row.id === newData.id);
                if (exists) return prev; // 重複防止
                return [...prev, newData];
              });
              break;
            }
            case 'UPDATE': {
              const id = newData.id;
              if (isPending(table, id)) {
                clearPending(table, id);
                return; // echo suppression: スキップ
              }

              // フィルタを再チェック（room_idが変わった場合の削除対応）
              if (!matchesFilter(newData, roomId)) {
                setData((prev) => prev.filter((row) => row.id !== id));
                return;
              }

              setData((prev) =>
                prev.map((row) => (row.id === id ? newData : row))
              );
              break;
            }
            case 'DELETE': {
              const id = oldData.id;
              clearPending(table, id);
              setData((prev) => prev.filter((row) => row.id !== id));
              break;
            }
          }
        };

        listenerRef.current = realtimeListener;

        // チャネルにリスナー登録（1ルーム1チャネル統合）
        registerListener(roomId, table, realtimeListener);
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    };

    fetchInitial();

    return () => {
      isMounted = false;

      // リスナー削除
      if (listenerRef.current) {
        unregisterListener(roomId, table, listenerRef.current);
      }
    };
  }, [table, columns, roomId, enabled]);

  return { data, loading, error, setData };
}

/**
 * フィルタ関数がデータを満たすかチェック（簡易版）
 * room_id の一致をチェック
 */
function matchesFilter(data: Record<string, unknown>, roomId: string | undefined): boolean {
  if (!roomId) return true;
  if ('room_id' in data && data.room_id !== roomId) return false;
  return true;
}

/**
 * 楽観的更新用 mutation ヘルパー
 * 使用例: useSupabaseMutation<Scene>('scenes', setScenes)
 */
export function useSupabaseMutation<T extends { id: string }>(
  table: string,
  setData: React.Dispatch<React.SetStateAction<T[]>>
) {
  const insert = async (item: T): Promise<void> => {
    // スナップショットを closure で保持
    let snapshot: T[] = [];
    setData((prev) => {
      snapshot = [...prev]; // スナップショット取得
      return [...prev, item];
    });

    try {
      const { error } = await supabase.from(table).insert([item]);
      if (error) {
        // ロールバック: closure のスナップショットを使用
        setData(snapshot);
        throw error;
      }
    } catch (err) {
      console.error(`[useSupabaseMutation] insert failed:`, err);
      throw err;
    }
  };

  const update = async (id: string, updates: Partial<T>): Promise<void> => {
    // スナップショットを closure で保持
    let snapshot: T[] = [];
    setData((prev) => {
      snapshot = [...prev]; // スナップショット取得
      return prev.map((row) =>
        row.id === id ? { ...row, ...updates } : row
      );
    });

    // echo suppression マーク
    markAsPending(table, id);

    try {
      const { error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id);
      if (error) {
        // ロールバック: closure のスナップショットを使用
        setData(snapshot);
        clearPending(table, id);
        throw error;
      }
    } catch (err) {
      console.error(`[useSupabaseMutation] update failed:`, err);
      throw err;
    }
  };

  const remove = async (id: string): Promise<void> => {
    // スナップショットを closure で保持
    let snapshot: T[] = [];
    setData((prev) => {
      snapshot = [...prev]; // スナップショット取得
      return prev.filter((row) => row.id !== id);
    });

    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        // ロールバック: closure のスナップショットを使用
        setData(snapshot);
        throw error;
      }
    } catch (err) {
      console.error(`[useSupabaseMutation] remove failed:`, err);
      throw err;
    }
  };

  const reorder = async (orderedIds: string[]): Promise<void> => {
    // スナップショットを closure で保持
    let snapshot: T[] = [];
    const now = Date.now();

    setData((prev) => {
      snapshot = [...prev]; // スナップショット取得
      const idToIndex = new Map(orderedIds.map((id, i) => [id, i]));
      return prev.map((row) => {
        const idx = idToIndex.get(row.id);
        return idx !== undefined
          ? { ...row, sort_order: idx, updated_at: now } as T
          : row;
      }).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    });

    try {
      const results = await Promise.all(
        orderedIds.map((id, i) =>
          supabase.from(table).update({ sort_order: i, updated_at: now }).eq('id', id)
        )
      );
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        // ロールバック: closure のスナップショットを使用
        setData(snapshot);
        throw new Error('reorder failed with partial updates');
      }
    } catch (err) {
      console.error(`[useSupabaseMutation] reorder failed:`, err);
      throw err;
    }
  };

  return { insert, update, remove, reorder };
}
