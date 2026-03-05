import { auth } from '../config/firebase';
import { encode as encodeWebP } from '@jsquash/webp';

const R2_WORKER_URL = import.meta.env.VITE_R2_WORKER_URL ?? '';
if (!R2_WORKER_URL) {
  throw new Error('VITE_R2_WORKER_URL is not configured');
}

/**
 * Canvas APIでリサイズ → jSquash(libwebp Wasm)でWebPエンコード
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  quality: number = 80
): Promise<Blob> {
  const imageData = await resizeToImageData(file, maxWidth);
  const webpBuffer = await encodeWebP(imageData, { quality });
  return new Blob([webpBuffer], { type: 'image/webp' });
}

function resizeToImageData(file: File, maxWidth: number): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(objectUrl); return reject(new Error('Canvas context取得失敗')); }
      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      resolve(imageData);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('画像読み込み失敗')); };
    img.src = objectUrl;
  });
}

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('未認証');
  return user.getIdToken();
}

/**
 * 画像アップロード（自動圧縮あり）
 */
export async function uploadImage(
  file: File,
  path: string,
  options?: { maxWidth?: number; quality?: number }
): Promise<string> {
  const compressed = await compressImage(
    file,
    options?.maxWidth ?? 1920,
    options?.quality ?? 80
  );
  const token = await getIdToken();
  const form = new FormData();
  form.append('file', compressed, path.replace(/\//g, '_') + '.webp');
  form.append('path', path);

  const res = await fetch(`${R2_WORKER_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`アップロード失敗: ${res.status}`);
  const data = await res.json();
  return data.url;
}

/**
 * 音声ファイルアップロード（圧縮なし）
 */
export async function uploadAudio(file: File, path: string): Promise<string> {
  const token = await getIdToken();
  const form = new FormData();
  form.append('file', file);
  form.append('path', path);

  const res = await fetch(`${R2_WORKER_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`アップロード失敗: ${res.status}`);
  const data = await res.json();
  return data.url;
}

/**
 * ファイル削除
 */
export async function deleteFile(path: string): Promise<void> {
  const token = await getIdToken();
  const res = await fetch(
    `${R2_WORKER_URL}/delete?path=${encodeURIComponent(path)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) throw new Error(`削除失敗: ${res.status}`);
}
