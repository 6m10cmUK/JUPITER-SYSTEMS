import type { AuthUser } from '../types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function base64url(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSec = 3600,
): Promise<string> {
  const key = await getKey(secret);
  const header = base64url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(
    encoder.encode(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec })),
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${body}`));
  return `${header}.${body}.${base64url(signature)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<AuthUser | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const key = await getKey(secret);
    const signatureBytes = base64urlDecode(parts[2]);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(`${parts[0]}.${parts[1]}`),
    );
    if (!valid) return null;

    const payload = JSON.parse(decoder.decode(base64urlDecode(parts[1])));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      uid: payload.sub,
      displayName: payload.name ?? '',
      avatarUrl: payload.avatar ?? null,
      isGuest: payload.guest ?? false,
    };
  } catch {
    return null;
  }
}
