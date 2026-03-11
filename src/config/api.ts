export const API_BASE_URL = import.meta.env.VITE_R2_WORKER_URL ?? '';
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

if (!API_BASE_URL) {
  console.error('VITE_R2_WORKER_URL が設定されていません。.envファイルを確認してください。');
}

/** localStorageに保存したJWTを取得 */
export function getAccessToken(): string | null {
  return localStorage.getItem('adrastea_access_token');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('adrastea_refresh_token');
}

export function setTokens(accessToken: string, refreshToken: string | null): void {
  localStorage.setItem('adrastea_access_token', accessToken);
  if (refreshToken) {
    localStorage.setItem('adrastea_refresh_token', refreshToken);
  }
}

export function clearTokens(): void {
  localStorage.removeItem('adrastea_access_token');
  localStorage.removeItem('adrastea_refresh_token');
}

/** JWT付きfetch。401時に自動リフレッシュ */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  // 401 → リフレッシュ試行
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers.set('Authorization', `Bearer ${getAccessToken()}`);
      res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
    }
  }

  return res;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return false;
    }
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}
