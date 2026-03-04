import { auth } from '../config/firebase';

const R2_WORKER_URL = import.meta.env.VITE_R2_WORKER_URL ?? '';

/**
 * Canvas APIで画像をリサイズ＆JPEG圧縮
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
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
      if (!ctx) return reject(new Error('Canvas context取得失敗'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('圧縮失敗'))),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new Error('画像読み込み失敗'));
    img.src = URL.createObjectURL(file);
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
    options?.quality ?? 0.8
  );
  const token = await getIdToken();
  const form = new FormData();
  form.append('file', compressed, path.replace(/\//g, '_') + '.jpg');
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
