/**
 * Cloudflare Worker — Adrastea API
 *
 * - R2 ファイルアップロード/配信
 * - D1 ユーザー/ルーム/アセット管理
 * - Supabase Auth (JWT HS256)
 * - WebRTC シグナリング (KV polling)
 * - 使用量制御 (KV カウンター)
 */

import { handleRooms } from './routes/rooms';
import { handleMessages } from './routes/messages';
import { handleAssets } from './routes/assets';
import { handleR2 } from './routes/r2';
import { handleAdmin } from './routes/admin';
import { corsHeaders } from './utils/cors';
import { checkRateLimit } from './utils/rateLimit';
import { verifyJwt } from './utils/jwt';
import type { Env, AuthUser } from './types';

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

  // Supabase pause 予防 ping（週2回実行）
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return;
    try {
      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rooms?select=id&limit=1`, {
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        },
      });
      console.log(`Supabase ping: ${res.status}`);
    } catch (err) {
      console.error('Supabase ping failed:', err);
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

    // --- 認証エンドポイント（Supabase Auth が担当、Worker では不要） ---
    if (url.pathname.startsWith('/auth/')) {
      return new Response('Auth endpoint deprecated (use Supabase Auth)', { status: 410, headers });
    }

    // --- Messages Archive (JWT or X-Archive-Secret) ---
    if (url.pathname.match(/^\/api\/rooms\/[^/]+\/messages\/archive/) && request.method === 'POST') {
      const archiveSecret = request.headers.get('X-Archive-Secret');
      if (archiveSecret && env.ARCHIVE_SECRET && archiveSecret === env.ARCHIVE_SECRET) {
        return handleMessages(request, url, env, headers, null);
      }
    }

    // --- 以下は認証必須 ---
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401, headers });
    }
    const user = await verifyJwt(authHeader.slice(7), env.SUPABASE_JWT_SECRET);
    if (!user) {
      return new Response('Unauthorized', { status: 401, headers });
    }

    // --- R2 アップロード/削除 ---
    if (url.pathname === '/upload' && request.method === 'POST') {
      return handleR2.upload(request, env, headers, user);
    }
    if (url.pathname === '/delete' && request.method === 'DELETE') {
      return handleR2.deleteFile(request, url, env, headers, user);
    }

    // --- Messages API ---
    if (url.pathname.match(/^\/api\/rooms\/[^/]+\/messages/)) {
      return handleMessages(request, url, env, headers, user);
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
