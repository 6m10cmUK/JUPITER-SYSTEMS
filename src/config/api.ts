export const API_BASE_URL = import.meta.env.VITE_R2_WORKER_URL ?? '';
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';

if (!API_BASE_URL) {
  console.error('VITE_R2_WORKER_URL が設定されていません。.envファイルを確認してください。');
}

/** JWT付きfetch（Convex がセッション管理するため、Authorizationヘッダーは不要） */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  return res;
}
