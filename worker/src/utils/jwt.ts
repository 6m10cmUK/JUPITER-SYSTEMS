import type { AuthUser } from '../types';

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function verifyJwt(token: string, jwtSecret: string): Promise<AuthUser | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const decoder = new TextDecoder();
    const payload = JSON.parse(decoder.decode(base64urlDecode(parts[1])));

    // 期限切れチェック
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    // HS256 で署名検証
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const sig = base64urlDecode(parts[2]);
    const valid = await crypto.subtle.verify('HMAC', key, sig, data);
    if (!valid) return null;

    // Supabase JWT: sub = user UUID, user_metadata に名前等
    const metadata = payload.user_metadata ?? {};
    return {
      uid: payload.sub,
      displayName: metadata.full_name ?? metadata.name ?? '',
      avatarUrl: metadata.avatar_url ?? null,
      isGuest: payload.is_anonymous ?? false,
    };
  } catch {
    return null;
  }
}
