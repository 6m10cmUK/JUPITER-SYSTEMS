import { API_BASE_URL, GOOGLE_CLIENT_ID, setTokens, clearTokens } from '../config/api';

export interface AuthUser {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  isGuest?: boolean;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string | null;
  user: AuthUser;
}

export class AuthService {
  /**
   * Googleアカウントでログイン（OAuth2 popup flow）
   */
  static async signInWithGoogle(): Promise<AuthUser> {
    // OAuth2 認証URLを構築
    const redirectUri = `${window.location.origin}/auth/callback`;
    const state = globalThis.crypto?.randomUUID?.()
      ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem('oauth_state', state);

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state,
      prompt: 'select_account',
    });

    // ポップアップでGoogle認証画面を開く
    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'google-auth',
      'width=500,height=600,menubar=no,toolbar=no',
    );

    if (!popup) throw new Error('ポップアップがブロックされました');

    // コールバックを待つ（BroadcastChannel + postMessage の両対応）
    return new Promise<AuthUser>((resolve, reject) => {
      let settled = false;
      let timeout: ReturnType<typeof setTimeout>;

      const cleanup = () => {
        settled = true;
        clearTimeout(timeout);
        window.removeEventListener('message', handlePostMessage);
        ch.close();
      };

      const processCallback = async (data: { code?: string; state?: string; error?: string }) => {
        if (settled) return;
        cleanup();

        if (data.error) {
          reject(new Error(`Google認証エラー: ${data.error}`));
          return;
        }

        const { code, state: returnedState } = data;
        const savedState = sessionStorage.getItem('oauth_state');
        sessionStorage.removeItem('oauth_state');

        if (returnedState !== savedState) {
          reject(new Error('OAuth state mismatch'));
          return;
        }

        try {
          const res = await fetch(`${API_BASE_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              redirectUri: `${window.location.origin}/auth/callback`,
            }),
          });

          if (!res.ok) throw new Error('Google認証に失敗しました');

          const authData: AuthResponse = await res.json();
          setTokens(authData.accessToken, authData.refreshToken);
          resolve(authData.user);
        } catch (err) {
          reject(err);
        }
      };

      // BroadcastChannel（COOP環境でも動作）
      const ch = new BroadcastChannel('adrastea-oauth');
      ch.onmessage = (event) => {
        if (event.data?.type === 'oauth_callback') processCallback(event.data);
      };

      // postMessage フォールバック（COOP なし環境）
      const handlePostMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'oauth_callback') processCallback(event.data);
      };
      window.addEventListener('message', handlePostMessage);

      // COOP によりpopup.closedが正しく機能しないため、タイムアウトのみで管理
      // 5分でタイムアウト
      timeout = setTimeout(() => {
        if (!settled) {
          cleanup();
          reject(new Error('認証がタイムアウトしました'));
        }
      }, 5 * 60 * 1000);
    });
  }

  /**
   * ゲストログイン
   */
  static async signInAsGuest(displayName: string): Promise<AuthUser> {
    const res = await fetch(`${API_BASE_URL}/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: displayName || 'ゲスト' }),
    });

    if (!res.ok) {
      throw new Error('ゲストログインに失敗しました');
    }

    const data: AuthResponse = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.user;
  }

  /**
   * ログアウト
   */
  static signOut(): void {
    clearTokens();
  }

  /**
   * 保存されたトークンからユーザー情報を復元
   */
  static restoreUser(): AuthUser | null {
    const token = localStorage.getItem('adrastea_access_token');
    if (!token) return null;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const binary = atob(base64);
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
      const payload = JSON.parse(new TextDecoder().decode(bytes));

      // 有効期限チェック
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
}
