import { signJwt } from '../utils/jwt';
import type { Env } from '../types';

function json(data: unknown, headers: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function generateId(): string {
  return crypto.randomUUID();
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Google OAuth2: code → tokens → user info
async function googleCodeExchange(
  code: string,
  redirectUri: string,
  env: Env,
): Promise<{ googleId: string; displayName: string; avatarUrl: string | null; email: string } | null> {
  // code → access_token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) return null;
  const tokenData = (await tokenRes.json()) as { access_token: string };

  // access_token → user info
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userRes.ok) return null;
  const userData = (await userRes.json()) as {
    id: string;
    name: string;
    picture?: string;
    email: string;
  };

  return {
    googleId: userData.id,
    displayName: userData.name,
    avatarUrl: userData.picture ?? null,
    email: userData.email,
  };
}

async function issueTokens(
  userId: string,
  displayName: string,
  avatarUrl: string | null,
  env: Env,
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = await signJwt(
    { sub: userId, name: displayName, avatar: avatarUrl },
    env.JWT_SECRET,
    3600, // 1時間
  );

  const refreshToken = generateId() + '-' + generateId();
  const tokenHash = await hashToken(refreshToken);
  const now = Date.now();
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30日

  await env.DB.prepare(
    'INSERT INTO refresh_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  )
    .bind(tokenHash, userId, expiresAt, now)
    .run();

  return { accessToken, refreshToken };
}

export async function handleAuth(
  request: Request,
  url: URL,
  env: Env,
  headers: Record<string, string>,
): Promise<Response> {
  const path = url.pathname.replace('/auth', '');

  // POST /auth/google — Google OAuth code → JWT
  if (path === '/google' && request.method === 'POST') {
    const body = (await request.json()) as { code: string; redirectUri: string };
    if (!body.code || !body.redirectUri) return json({ error: 'code and redirectUri required' }, headers, 400);

    const googleUser = await googleCodeExchange(body.code, body.redirectUri, env);
    if (!googleUser) return json({ error: 'Google認証に失敗しました' }, headers, 401);

    const now = Date.now();

    // 既存ユーザー検索
    const existing = await env.DB.prepare('SELECT * FROM users WHERE google_id = ?')
      .bind(googleUser.googleId)
      .first<{ id: string; display_name: string; avatar_url: string | null }>();

    let userId: string;
    let displayName: string;
    let avatarUrl: string | null;

    if (existing) {
      userId = existing.id;
      displayName = existing.display_name;
      avatarUrl = existing.avatar_url;
      // 最終ログイン更新
      await env.DB.prepare('UPDATE users SET updated_at = ? WHERE id = ?')
        .bind(now, userId)
        .run();
    } else {
      userId = generateId();
      displayName = googleUser.displayName;
      avatarUrl = googleUser.avatarUrl;
      await env.DB.prepare(
        'INSERT INTO users (id, google_id, display_name, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
        .bind(userId, googleUser.googleId, displayName, avatarUrl, now, now)
        .run();
    }

    const tokens = await issueTokens(userId, displayName, avatarUrl, env);
    return json(
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: { uid: userId, displayName, avatarUrl },
      },
      headers,
    );
  }

  // POST /auth/guest — ゲスト一時JWT
  if (path === '/guest' && request.method === 'POST') {
    const body = (await request.json()) as { displayName?: string };
    const displayName = body.displayName || 'ゲスト';
    const guestId = `guest-${generateId()}`;

    const accessToken = await signJwt(
      { sub: guestId, name: displayName, avatar: null, guest: true },
      env.JWT_SECRET,
      24 * 3600, // 24時間
    );

    return json(
      {
        accessToken,
        refreshToken: null,
        user: { uid: guestId, displayName, avatarUrl: null, isGuest: true },
      },
      headers,
    );
  }

  // POST /auth/refresh — リフレッシュトークンで再発行
  if (path === '/refresh' && request.method === 'POST') {
    const body = (await request.json()) as { refreshToken: string };
    if (!body.refreshToken) return json({ error: 'refreshToken required' }, headers, 400);

    const tokenHash = await hashToken(body.refreshToken);
    const row = await env.DB.prepare(
      'SELECT rt.user_id, u.display_name, u.avatar_url FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.token_hash = ? AND rt.expires_at > ?',
    )
      .bind(tokenHash, Date.now())
      .first<{ user_id: string; display_name: string; avatar_url: string | null }>();

    if (!row) return json({ error: 'Invalid or expired refresh token' }, headers, 401);

    // 古いトークン削除
    await env.DB.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').bind(tokenHash).run();

    const tokens = await issueTokens(row.user_id, row.display_name, row.avatar_url, env);
    return json(
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: { uid: row.user_id, displayName: row.display_name, avatarUrl: row.avatar_url },
      },
      headers,
    );
  }

  return new Response('Not Found', { status: 404, headers });
}
