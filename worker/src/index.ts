/**
 * Cloudflare Worker — R2 アップロードプロキシ + 画像配信 + Firebase JWT検証
 *
 * バインディング:
 *   R2_BUCKET: R2バケット
 * 環境変数:
 *   FIREBASE_PROJECT_ID: Firebase プロジェクトID
 *   ALLOWED_ORIGINS: 許可するオリジン（カンマ区切り）
 */

interface Env {
  R2_BUCKET: R2Bucket;
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGINS: string;
}

// Googleの公開鍵キャッシュ
let cachedKeys: { keys: JsonWebKey[]; exp: number } | null = null;

async function getGooglePublicKeys(): Promise<JsonWebKey[]> {
  if (cachedKeys && Date.now() < cachedKeys.exp) return cachedKeys.keys;

  const res = await fetch(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
  );
  const data = (await res.json()) as { keys: JsonWebKey[] };
  cachedKeys = { keys: data.keys, exp: Date.now() + 3600_000 };
  return data.keys;
}

async function verifyFirebaseToken(
  token: string,
  projectId: string
): Promise<{ uid: string } | null> {
  try {
    // JWTをデコード（ヘッダー、ペイロード）
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // 基本検証
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (payload.exp < Date.now() / 1000) return null;

    // 公開鍵で署名検証
    const keys = await getGooglePublicKeys();
    const key = keys.find((k: any) => k.kid === header.kid);
    if (!key) return null;

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      key,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = Uint8Array.from(
      atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    );
    const dataBytes = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);

    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBytes,
      dataBytes
    );

    if (!valid) return null;
    return { uid: payload.sub };
  } catch {
    return null;
  }
}

function corsHeaders(origin: string, allowedOrigins: string): Record<string, string> {
  const origins = allowedOrigins.split(',').map((o) => o.trim());
  const allowed = origins.includes(origin) || origins.includes('*');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') ?? '';
    const headers = corsHeaders(origin, env.ALLOWED_ORIGINS ?? '*');

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // GET /file/* — 認証不要、R2から画像を配信
    if (url.pathname.startsWith('/file/') && request.method === 'GET') {
      const key = decodeURIComponent(url.pathname.slice('/file/'.length));
      if (!key) {
        return new Response('Bad Request', { status: 400, headers });
      }

      const object = await env.R2_BUCKET.get(key);
      if (!object) {
        return new Response('Not Found', { status: 404, headers });
      }

      return new Response(object.body, {
        status: 200,
        headers: {
          ...headers,
          'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // --- 以下は認証必須 ---
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401, headers });
    }
    const token = authHeader.slice(7);
    const user = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
    if (!user) {
      return new Response('Unauthorized', { status: 401, headers });
    }

    // POST /upload
    if (url.pathname === '/upload' && request.method === 'POST') {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const path = formData.get('path') as string | null;

      if (!file || !path) {
        return new Response('Bad Request: file and path required', {
          status: 400,
          headers,
        });
      }

      const key = `${path}/${Date.now()}_${file.name}`;
      await env.R2_BUCKET.put(key, file.stream(), {
        httpMetadata: { contentType: file.type },
      });

      // Worker経由の公開URL
      const publicUrl = `${url.origin}/file/${encodeURIComponent(key)}`;

      return new Response(JSON.stringify({ url: publicUrl, key }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /delete
    if (url.pathname === '/delete' && request.method === 'DELETE') {
      const path = url.searchParams.get('path');
      if (!path) {
        return new Response('Bad Request: path required', { status: 400, headers });
      }

      // パス配下のオブジェクトを全削除
      const list = await env.R2_BUCKET.list({ prefix: path });
      for (const obj of list.objects) {
        await env.R2_BUCKET.delete(obj.key);
      }

      return new Response('OK', { status: 200, headers });
    }

    return new Response('Not Found', { status: 404, headers });
  },
};
