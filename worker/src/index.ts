/**
 * Cloudflare Worker — Adrastea API
 *
 * - R2 ファイルアップロード/配信
 * - D1 ユーザー/ルーム/アセット管理
 * - Google OAuth2 認証 + 自前JWT
 * - WebRTC シグナリング (KV polling)
 * - 使用量制御 (KV カウンター)
 */

import { handleAuth } from './routes/auth';
import { handleRooms } from './routes/rooms';
import { handleAssets } from './routes/assets';
import { handleR2 } from './routes/r2';
import { handleAdmin } from './routes/admin';
import { corsHeaders } from './utils/cors';
import { checkRateLimit } from './utils/rateLimit';
import { verifyJwt } from './utils/jwt';
import type { Env, AuthUser } from './types';

async function handleAuthMe(
  request: Request,
  env: Env,
  headers: Record<string, string>,
  user: AuthUser,
): Promise<Response> {
  // GET /auth/me — プロフィール取得
  if (request.method === 'GET') {
    const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.uid).first();
    if (!row) {
      return Response.json({ uid: user.uid, display_name: user.displayName, avatar_url: user.avatarUrl }, { headers });
    }
    return Response.json(row, { headers });
  }

  // PATCH /auth/me — プロフィール更新
  if (request.method === 'PATCH') {
    const body = (await request.json()) as Record<string, unknown>;
    const sets: string[] = ['updated_at = ?'];
    const vals: unknown[] = [Date.now()];

    if (body.display_name !== undefined) { sets.push('display_name = ?'); vals.push(body.display_name); }
    if (body.avatar_url !== undefined) { sets.push('avatar_url = ?'); vals.push(body.avatar_url); }
    if (body.encryption_key !== undefined) { sets.push('encryption_key = ?'); vals.push(body.encryption_key); }

    vals.push(user.uid);
    await env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return Response.json({ ok: true }, { headers });
  }

  return new Response('Method Not Allowed', { status: 405, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') ?? '';
    const headers = corsHeaders(origin, env.ALLOWED_ORIGINS ?? '');

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    try {
      return await handleRequest(request, url, env, headers);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } });
    }
  },
};

async function handleRequest(request: Request, url: URL, env: Env, headers: Record<string, string>): Promise<Response> {

    // 使用量制御（GET /file/* は除外）
    if (!url.pathname.startsWith('/file/')) {
      const rateLimitResult = await checkRateLimit(env.DB);
      if (!rateLimitResult.ok) {
        return new Response(
          JSON.stringify({ error: '本日の利用上限に達しました' }),
          { status: 429, headers: { ...headers, 'Content-Type': 'application/json' } },
        );
      }
    }

    // --- R2 画像配信（認証不要） ---
    if (url.pathname.startsWith('/file/') && request.method === 'GET') {
      return handleR2.getFile(request, env, headers);
    }

    // --- 認証エンドポイント（認証不要） ---
    if (url.pathname.startsWith('/auth/') && !url.pathname.startsWith('/auth/me')) {
      return handleAuth(request, url, env, headers);
    }

    // --- 以下は認証必須 ---
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401, headers });
    }
    const user = await verifyJwt(authHeader.slice(7));
    if (!user) {
      return new Response('Unauthorized', { status: 401, headers });
    }

    // --- /auth/me（認証必須） ---
    if (url.pathname === '/auth/me') {
      return handleAuthMe(request, env, headers, user);
    }

    // --- R2 アップロード/削除 ---
    if (url.pathname === '/upload' && request.method === 'POST') {
      return handleR2.upload(request, env, headers, user);
    }
    if (url.pathname === '/delete' && request.method === 'DELETE') {
      return handleR2.deleteFile(request, url, env, headers, user);
    }

    // --- Rooms API ---
    if (url.pathname.startsWith('/api/rooms')) {
      return handleRooms(request, url, env, headers, user);
    }

    // --- Admin API ---
    if (url.pathname.startsWith('/api/admin')) {
      return handleAdmin(request, url, env, headers, user);
    }

    // --- Assets API ---
    if (url.pathname.startsWith('/api/assets')) {
      return handleAssets(request, url, env, headers, user);
    }

    return new Response('Not Found', { status: 404, headers });
}
