import { useEffect } from 'react';

/**
 * Google OAuth2 コールバックページ
 * ポップアップで開かれ、認証コードを親ウィンドウに送信して閉じる
 *
 * Google が COOP (Cross-Origin-Opener-Policy) を設定するため
 * window.opener が null になる → BroadcastChannel で通信
 */
export function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    const message = code && state
      ? { type: 'oauth_callback', code, state }
      : error
        ? { type: 'oauth_callback', error }
        : null;

    if (!message) return;

    // BroadcastChannel で親ウィンドウに通知
    const ch = new BroadcastChannel('adrastea-oauth');
    ch.postMessage(message);
    ch.close();

    // フォールバック: window.opener が生きてる場合（COOP なし環境）
    try {
      window.opener?.postMessage(message, window.location.origin);
    } catch { /* COOP blocked */ }

    window.close();
  }, []);

  return <div style={{ padding: 20, textAlign: 'center' }}>認証中...</div>;
}
