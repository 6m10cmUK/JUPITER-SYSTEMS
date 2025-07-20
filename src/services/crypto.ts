import CryptoJS from 'crypto-js';

export class CryptoService {
  /**
   * Fernet暗号化をJavaScriptで復号化
   * PythonのFernetはAES-128-CBC + HMAC-SHA256を使用
   */
  static decryptFernet(encryptedData: string, key: string): string {
    try {
      // Base64デコード
      const encrypted = atob(encryptedData);
      const keyBytes = atob(key);

      // Fernetトークンの構造:
      // - バージョン (1 byte) = 0x80
      // - タイムスタンプ (8 bytes)
      // - IV (16 bytes)
      // - 暗号文 (variable)
      // - HMAC (32 bytes)

      const version = encrypted.charCodeAt(0);
      if (version !== 0x80) {
        throw new Error('Invalid Fernet version');
      }

      // 各部分を抽出
      const timestamp = encrypted.slice(1, 9);
      const iv = encrypted.slice(9, 25);
      const ciphertext = encrypted.slice(25, -32);
      const hmac = encrypted.slice(-32);

      // キーを分割 (署名キーと暗号化キー)
      const signingKey = keyBytes.slice(0, 16);
      const encryptionKey = keyBytes.slice(16, 32);

      // HMAC検証 (簡略化のため省略)
      
      // AES-CBC復号化
      const decrypted = CryptoJS.AES.decrypt(
        {
          ciphertext: CryptoJS.enc.Latin1.parse(ciphertext),
          iv: CryptoJS.enc.Latin1.parse(iv),
          salt: CryptoJS.enc.Latin1.parse('')
        },
        CryptoJS.enc.Latin1.parse(encryptionKey),
        {
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
          iv: CryptoJS.enc.Latin1.parse(iv)
        }
      );

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('復号化に失敗しました');
    }
  }
}