/** Adrastea の Supabase Realtime / ルーム状態のコンソールデバッグ */
export function isAdrasteaRealtimeDebug(): boolean {
  return (
    import.meta.env.DEV ||
    import.meta.env.VITE_DEBUG_REALTIME === 'true'
  );
}

/** Adrastea の Supabase クエリ・RPC 通信のコンソールデバッグ */
export function isAdrasteaQueryDebug(): boolean {
  return (
    import.meta.env.DEV ||
    import.meta.env.VITE_DEBUG_QUERY === 'true'
  );
}
