import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User } from 'firebase/auth';

interface UserEncryptionKey {
  userId: string;
  encryptionKey: string;
  createdAt: Date;
  lastUsed: Date;
}

export class EncryptionKeyService {
  private static readonly COLLECTION_NAME = 'userEncryptionKeys';

  /**
   * ユーザーの暗号化キーを取得（なければ生成）
   */
  static async getUserKey(user: User): Promise<string> {
    const docRef = doc(db, this.COLLECTION_NAME, user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as UserEncryptionKey;
      // 最終使用日時を更新
      await setDoc(docRef, {
        ...data,
        lastUsed: new Date()
      }, { merge: true });
      return data.encryptionKey;
    } else {
      // 新規ユーザーの場合、キーを生成
      const newKey = await this.generateSecureKey();
      await this.saveUserKey(user, newKey);
      return newKey;
    }
  }

  /**
   * 安全な暗号化キーを生成
   */
  private static async generateSecureKey(): Promise<string> {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * ユーザーの暗号化キーを保存
   */
  private static async saveUserKey(user: User, encryptionKey: string): Promise<void> {
    const docRef = doc(db, this.COLLECTION_NAME, user.uid);
    const keyData: UserEncryptionKey = {
      userId: user.uid,
      encryptionKey,
      createdAt: new Date(),
      lastUsed: new Date()
    };
    
    await setDoc(docRef, keyData);
  }

  /**
   * キーの定期的なローテーション（オプション）
   */
  static async rotateUserKey(user: User): Promise<string> {
    const newKey = await this.generateSecureKey();
    await this.saveUserKey(user, newKey);
    return newKey;
  }
}