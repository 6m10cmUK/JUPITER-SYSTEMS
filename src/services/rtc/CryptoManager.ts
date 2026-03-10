/**
 * CryptoManager — ECDSA-P256署名による P2P メッセージ認証
 *
 * WebCrypto API (window.crypto.subtle) を使用して:
 * - ECDSA-P256 キーペア生成
 * - 公開鍵の Base64 エクスポート/インポート
 * - メッセージ署名と検証
 */

export class CryptoManager {
  private keyPair: CryptoKeyPair | null = null;
  private publicKeyBase64: string = '';

  /**
   * ECDSA P-256 キーペア生成
   * 生成後は getPublicKeyBase64() で公開鍵を取得可能
   */
  async generateKeyPair(): Promise<void> {
    this.keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256',
      },
      true, // extractable
      ['sign', 'verify'],
    );

    // 公開鍵を SPKI形式でエクスポートして Base64エンコード
    const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', this.keyPair.publicKey);
    this.publicKeyBase64 = this.bufferToBase64(publicKeyBuffer);
  }

  /**
   * 生成された公開鍵を Base64形式で取得
   */
  getPublicKeyBase64(): string {
    if (!this.publicKeyBase64) {
      throw new Error('CryptoManager: キーペアがまだ生成されていません');
    }
    return this.publicKeyBase64;
  }

  /**
   * メッセージに署名して Base64署名を返す
   * @param message メッセージ文字列
   * @returns Base64エンコードされた署名
   */
  async sign(message: string): Promise<string> {
    if (!this.keyPair) {
      throw new Error('CryptoManager: キーペアがまだ生成されていません');
    }

    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message);

    const signatureBuffer = await window.crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      this.keyPair.privateKey,
      messageBuffer,
    );

    return this.bufferToBase64(signatureBuffer);
  }

  /**
   * 公開鍵（Base64） + メッセージ + 署名を検証
   * @param publicKeyBase64 Base64エンコードされた SPKI公開鍵
   * @param message メッセージ文字列
   * @param signatureBase64 Base64エンコードされた署名
   * @returns 署名が有効な場合 true、それ以外は false
   */
  static async verify(
    publicKeyBase64: string,
    message: string,
    signatureBase64: string,
  ): Promise<boolean> {
    try {
      // Base64 → バッファ変換
      const publicKeyBuffer = this.base64ToBuffer(publicKeyBase64);
      const signatureBuffer = this.base64ToBuffer(signatureBase64);

      // 公開鍵をインポート
      const publicKey = await window.crypto.subtle.importKey(
        'spki',
        publicKeyBuffer,
        {
          name: 'ECDSA',
          namedCurve: 'P-256',
        },
        false, // extractable: 検証用なので false
        ['verify'],
      );

      // メッセージをエンコード
      const encoder = new TextEncoder();
      const messageBuffer = encoder.encode(message);

      // 署名を検証
      const isValid = await window.crypto.subtle.verify(
        { name: 'ECDSA', hash: 'SHA-256' },
        publicKey,
        signatureBuffer,
        messageBuffer,
      );

      return isValid;
    } catch (err) {
      console.warn('CryptoManager: 署名検証エラー', err);
      return false;
    }
  }

  // --- Private helpers ---

  /**
   * ArrayBuffer → Base64文字列
   */
  private static bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Base64文字列 → ArrayBuffer
   */
  private static base64ToBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * インスタンスメソッド版 bufferToBase64（プライベート用）
   */
  private bufferToBase64(buffer: ArrayBuffer): string {
    return CryptoManager.bufferToBase64(buffer);
  }
}
