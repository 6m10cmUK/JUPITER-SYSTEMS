import {
  signInWithPopup,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

export class AuthService {
  /**
   * Googleアカウントでログイン
   */
  static async signInWithGoogle(): Promise<User> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('ログインエラー:', error);
      throw new Error('Googleログインに失敗しました');
    }
  }

  /**
   * 匿名ログイン（ゲスト用）
   */
  static async signInAnonymously(): Promise<User> {
    try {
      const result = await firebaseSignInAnonymously(auth);
      return result.user;
    } catch (error) {
      console.error('匿名ログインエラー:', error);
      throw new Error('匿名ログインに失敗しました');
    }
  }

  /**
   * ログアウト
   */
  static async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('ログアウトエラー:', error);
      throw new Error('ログアウトに失敗しました');
    }
  }

  /**
   * 現在のユーザーを取得
   */
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * 認証状態の変更を監視
   */
  static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }
}