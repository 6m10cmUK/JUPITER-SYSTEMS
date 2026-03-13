import type { Env, AuthUser } from '../types';

function json(data: unknown, headers: Record<string, string>, status = 200): Response {
  return Response.json(data, { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

function isAdmin(env: Env, user: AuthUser): boolean {
  const adminIds = (env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return adminIds.includes(user.uid);
}

export async function handleAdmin(
  request: Request,
  url: URL,
  env: Env,
  headers: Record<string, string>,
  user: AuthUser,
): Promise<Response> {
  if (!isAdmin(env, user)) {
    return json({ error: 'Forbidden' }, headers, 403);
  }

  const pathParts = url.pathname.replace('/api/admin', '').split('/').filter(Boolean);
  const resource = pathParts[0];
  const resourceId = pathParts[1];

  // GET /api/admin/assets
  if (resource === 'assets' && !resourceId && request.method === 'GET') {
    const rows = await env.DB.prepare(
      'SELECT * FROM assets ORDER BY created_at DESC LIMIT 500'
    ).all();
    const results = (rows.results as Record<string, unknown>[]).map((r) => ({
      ...r,
      tags: JSON.parse((r.tags as string) || '[]'),
    }));
    return json(results, headers);
  }

  // DELETE /api/admin/assets/:id
  if (resource === 'assets' && resourceId && request.method === 'DELETE') {
    const asset = await env.DB.prepare('SELECT r2_key, size_bytes, owner_id FROM assets WHERE id = ?')
      .bind(resourceId)
      .first<{ r2_key: string; size_bytes: number; owner_id: string }>();
    if (!asset) return json({ error: 'Not Found' }, headers, 404);

    await env.DB.prepare('DELETE FROM assets WHERE id = ?').bind(resourceId).run();

    try {
      if (asset.r2_key) await env.R2_BUCKET.delete(asset.r2_key);
    } catch (e) {
      console.error('R2削除失敗:', asset.r2_key, e);
    }

    if (asset.size_bytes > 0) {
      const { releaseStorageUsage } = await import('../utils/rateLimit');
      await releaseStorageUsage(env.DB, asset.owner_id, asset.size_bytes).catch((e: unknown) =>
        console.error('ストレージ使用量更新失敗:', e),
      );
    }

    return json({ ok: true }, headers);
  }

  return new Response('Not Found', { status: 404, headers });
}
