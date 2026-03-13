import type { AuthUser } from '../types';

// JWKS URL → { keys, expiry } のキャッシュ
const jwksCache = new Map<string, { keys: CryptoKey[]; expiry: number }>();

const FALLBACK_JWKS_URL = 'https://useful-jay-379.convex.site/.well-known/jwks.json';

async function getPublicKeys(jwksUrl: string): Promise<CryptoKey[]> {
  const now = Date.now();
  const cached = jwksCache.get(jwksUrl);
  if (cached && now < cached.expiry) return cached.keys;

  const res = await fetch(jwksUrl);
  if (!res.ok) throw new Error('Failed to fetch JWKS');
  const data = (await res.json()) as { keys: JsonWebKey[] };
  const keys = data.keys || [];

  const cryptoKeys = await Promise.all(
    keys.map((k) =>
      crypto.subtle.importKey(
        'jwk',
        k,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      ),
    ),
  );
  jwksCache.set(jwksUrl, { keys: cryptoKeys, expiry: now + 5 * 60 * 1000 });
  return cryptoKeys;
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function verifyJwt(token: string, convexSiteUrl?: string): Promise<AuthUser | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const decoder = new TextDecoder();
    const payload = JSON.parse(decoder.decode(base64urlDecode(parts[1])));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    const jwksUrl = convexSiteUrl
      ? `${convexSiteUrl}/.well-known/jwks.json`
      : FALLBACK_JWKS_URL;

    const keys = await getPublicKeys(jwksUrl);
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const sig = base64urlDecode(parts[2]);

    const valid = await Promise.any(
      keys.map((k) =>
        crypto.subtle.verify('RSASSA-PKCS1-v1_5', k, sig, data).then((v) => {
          if (!v) throw new Error();
          return true;
        }),
      ),
    ).catch(() => false);

    if (!valid) return null;

    return {
      uid: payload.sub.split('|')[0],
      displayName: payload.name ?? '',
      avatarUrl: payload.avatar ?? null,
      isGuest: payload.isAnonymous ?? false,
    };
  } catch {
    return null;
  }
}
