import { auth } from '../config/firebase';
import { compressImage } from './fileUpload';

const R2_WORKER_URL = import.meta.env.VITE_R2_WORKER_URL ?? '';

async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('未認証');
  return user.getIdToken();
}

function getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('画像読み込み失敗'));
    img.src = URL.createObjectURL(blob);
  });
}

export async function uploadAssetToR2(
  file: File,
  uid: string
): Promise<{ url: string; r2_key: string; size_bytes: number; width: number; height: number }> {
  const compressed = await compressImage(file);
  const { width, height } = await getImageDimensions(compressed);

  const r2_key = `users/${uid}/assets/${Date.now()}_${file.name.replace(/\.[^.]+$/, '')}.webp`;
  const token = await getIdToken();

  const form = new FormData();
  form.append('file', compressed, r2_key.replace(/\//g, '_'));
  form.append('path', r2_key);

  const res = await fetch(`${R2_WORKER_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`アップロード失敗: ${res.status}`);
  const data = await res.json();

  return {
    url: data.url,
    r2_key,
    size_bytes: compressed.size,
    width,
    height,
  };
}

export async function deleteAssetFromR2(r2Key: string): Promise<void> {
  const token = await getIdToken();
  const res = await fetch(
    `${R2_WORKER_URL}/delete?path=${encodeURIComponent(r2Key)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) throw new Error(`削除失敗: ${res.status}`);
}
