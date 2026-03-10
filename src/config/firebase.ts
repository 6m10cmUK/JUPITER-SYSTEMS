import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebaseの設定
// これらの値は公開されても問題ありません（Firebaseのセキュリティルールで保護）
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Firebaseアプリの初期化（API keyが未設定の場合はスキップ）
const app = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null;

// 認証の初期化
export const auth = app ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();

// Google Providerにスコープを追加してプロフィール情報を確実に取得
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Firestoreの初期化
export const db = app ? getFirestore(app) : null;

// エラーハンドリング
if (!firebaseConfig.apiKey) {
  console.error('Firebase設定が見つかりません。.envファイルを確認してください。');
}