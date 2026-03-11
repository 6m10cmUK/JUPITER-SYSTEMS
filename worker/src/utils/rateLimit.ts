const DAILY_LIMIT = 90_000; // Workers無料枠10万の90%

export async function checkRateLimit(kv: KVNamespace): Promise<{ ok: boolean; count: number }> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = `usage:${today}`;
    const count = parseInt((await kv.get(key)) ?? '0');

    if (count >= DAILY_LIMIT) {
      return { ok: false, count };
    }

    // 非同期で加算（KVエラーは無視してリクエストを通す）
    kv.put(key, String(count + 1), { expirationTtl: 86400 }).catch(() => {});
    return { ok: true, count: count + 1 };
  } catch {
    // KV障害時はリクエストを通す（カウント不可だが機能継続優先）
    return { ok: true, count: 0 };
  }
}

export async function checkStorageUsage(
  kv: KVNamespace,
  userId: string,
  additionalBytes: number,
): Promise<{ ok: boolean; warning: boolean; usedBytes: number }> {
  const STORAGE_LIMIT = 1 * 1024 * 1024 * 1024; // 1GB per user
  const key = `storage:${userId}`;
  const used = parseInt((await kv.get(key)) ?? '0');
  const newTotal = used + additionalBytes;

  if (newTotal > STORAGE_LIMIT) {
    return { ok: false, warning: true, usedBytes: used };
  }

  return {
    ok: true,
    warning: newTotal > STORAGE_LIMIT * 0.9,
    usedBytes: used,
  };
}

export async function updateStorageUsage(
  kv: KVNamespace,
  userId: string,
  deltaBytes: number,
): Promise<void> {
  const key = `storage:${userId}`;
  const used = parseInt((await kv.get(key)) ?? '0');
  await kv.put(key, String(Math.max(0, used + deltaBytes)));
}
