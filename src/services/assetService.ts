import { API_BASE_URL, getAccessToken } from '../config/api';
import { compressImage } from './fileUpload';

function getIdToken(): string {
  const token = getAccessToken();
  if (!token) throw new Error('未認証');
  return token;
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

  const ext = compressed.type === 'image/gif' ? '.gif' : '.webp';
  const r2_key = `users/${uid}/assets/${Date.now()}_${file.name.replace(/\.[^.]+$/, '')}${ext}`;
  const token = getIdToken();

  const form = new FormData();
  form.append('file', compressed, r2_key.replace(/\//g, '_'));
  form.append('path', r2_key);

  const res = await fetch(`${API_BASE_URL}/upload`, {
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

export async function uploadAudioAssetToR2(
  file: File,
  uid: string
): Promise<{ url: string; r2_key: string; size_bytes: number; width: 0; height: 0 }> {
  const r2_key = `users/${uid}/assets/${Date.now()}_${file.name}`;
  const token = getIdToken();

  const form = new FormData();
  form.append('file', file, r2_key.replace(/\//g, '_'));
  form.append('path', r2_key);

  const res = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`アップロード失敗: ${res.status}`);
  const data = await res.json();

  return { url: data.url, r2_key, size_bytes: file.size, width: 0, height: 0 };
}

export async function deleteAssetFromR2(r2Key: string): Promise<void> {
  const token = getIdToken();
  const res = await fetch(
    `${API_BASE_URL}/delete?path=${encodeURIComponent(r2Key)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) throw new Error(`削除失敗: ${res.status}`);
}
