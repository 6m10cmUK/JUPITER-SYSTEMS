import { useState, useEffect, useCallback } from 'react';
import { useAuthToken } from '@convex-dev/auth/react';
import type { Asset } from '../types/adrastea.types';
import { useAuth } from '../contexts/AuthContext';
import { uploadAssetToR2, uploadAudioAssetToR2, deleteR2File } from '../services/assetService';
import { apiFetch } from '../config/api';

// モジュールレベルキャッシュ（モーダル再マウント時の再取得を防止）
let assetCache: { uid: string; assets: Asset[] } | null = null;

export function useAssets(options?: { disabled?: boolean }) {
  const disabled = options?.disabled ?? false;
  const { user } = useAuth();
  const token = useAuthToken();
  const uid = user?.uid;

  // disabled モード（デモ）ではキャッシュを使わない
  const cached = !disabled && uid && assetCache?.uid === uid ? assetCache.assets : null;
  const [assets, setAssetsRaw] = useState<Asset[]>(cached ?? []);
  const [loading, setLoading] = useState(!disabled && !cached);

  // setAssets のラッパー: state とキャッシュを同時に更新
  const setAssets: typeof setAssetsRaw = useCallback((action) => {
    setAssetsRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (uid) assetCache = { uid, assets: next };
      return next;
    });
  }, [uid]);

  const fetchAssets = useCallback(async () => {
    if (disabled) {
      setLoading(false);
      return;
    }
    if (!uid || !token) {
      setAssets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/assets', undefined, token ?? undefined);
      const data: Asset[] = await res.json();
      setAssets(data);
    } catch (error) {
      console.error('アセットの取得に失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [disabled, uid, token]);

  // キャッシュがあればフェッチをスキップ
  useEffect(() => {
    if (disabled) return;
    if (uid && assetCache && assetCache.uid === uid) return;
    fetchAssets();
  }, [disabled, fetchAssets, uid]);

  const uploadAsset = useCallback(
    async (file: File): Promise<Asset | null> => {
      if (!uid) return null;

      // デモモード: token なしなら blob URL で返す
      if (!token) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        const dims = await new Promise<{ width: number; height: number }>((resolve) => {
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => resolve({ width: 0, height: 0 });
          img.src = url;
        });
        const asset: Asset = {
          id: crypto.randomUUID(),
          uid: uid!,
          url,
          r2_key: '',
          filename: file.name,
          title: file.name,
          size_bytes: file.size,
          width: dims.width,
          height: dims.height,
          tags: [],
          asset_type: 'image',
          created_at: Date.now(),
        };
        setAssets((prev) => [asset, ...prev]);
        return asset;
      }

      // 本番: R2へのアップロード処理
      const result = await uploadAssetToR2(file, uid, token ?? '');
      const title = file.name;
      let res: Response;
      try {
        res = await apiFetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: result.url,
            r2_key: result.r2_key,
            filename: file.name,
            title,
            size_bytes: result.size_bytes,
            width: result.width,
            height: result.height,
            tags: [],
            asset_type: 'image',
          }),
        }, token ?? undefined);
      } catch (e) {
        // D1登録失敗 → R2ファイルを削除してロールバック
        await deleteR2File(result.r2_key, token ?? '').catch((err) => {
          console.error('R2削除失敗（アセット登録ロールバック中）:', err);
        });
        throw e;
      }
      const created: Asset = await res.json();
      setAssets((prev) => [created, ...prev]);
      return created;
    },
    [uid, token]
  );

  const uploadAudioAsset = useCallback(
    async (file: File): Promise<Asset | null> => {
      if (!uid) return null;

      // デモモード: token なしなら blob URL で返す
      if (!token) {
        const url = URL.createObjectURL(file);
        const asset: Asset = {
          id: crypto.randomUUID(),
          uid: uid!,
          url,
          r2_key: '',
          filename: file.name,
          title: file.name,
          size_bytes: file.size,
          width: 0,
          height: 0,
          tags: [],
          asset_type: 'audio',
          created_at: Date.now(),

        };
        setAssets((prev) => [asset, ...prev]);
        return asset;
      }

      // 本番: R2へのアップロード処理
      const result = await uploadAudioAssetToR2(file, uid, token ?? '');
      const title = file.name;
      let res: Response;
      try {
        res = await apiFetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: result.url,
            r2_key: result.r2_key,
            filename: file.name,
            title,
            size_bytes: result.size_bytes,
            width: 0,
            height: 0,
            tags: [],
            asset_type: 'audio',
          }),
        }, token ?? undefined);
      } catch (e) {
        await deleteR2File(result.r2_key, token ?? '').catch((err) => {
          console.error('R2削除失敗（オーディオアセット登録ロールバック中）:', err);
        });
        throw e;
      }
      const created: Asset = await res.json();
      setAssets((prev) => [created, ...prev]);
      return created;
    },
    [uid, token]
  );

  const addAssetByUrl = useCallback(
    async (url: string, assetType: 'image' | 'audio'): Promise<Asset | null> => {
      if (!uid) return null;
      // Dropbox共有URL（dl=0）を直接ダウンロードURL（dl=1）に変換
      // 新形式(scl): dl=0 → dl=1 のみでOK
      // 旧形式(/s/): www.dropbox.com → dl.dropboxusercontent.com でも可
      const normalizedUrl = url.includes('dropbox.com')
        ? url.replace(/([?&])dl=0(&|$)/, '$1dl=1$2').replace(/www\.dropbox\.com\/s\//, 'dl.dropboxusercontent.com/s/')
        : url;
      const filename = decodeURIComponent(normalizedUrl.split('/').pop() || normalizedUrl).replace(/[?#].*$/, '');
      const title = filename;

      // デモモード: token なしならそのまま URL を登録
      if (!token) {
        const asset: Asset = {
          id: crypto.randomUUID(),
          uid: uid!,
          url: normalizedUrl,
          r2_key: '',
          filename,
          title,
          size_bytes: 0,
          width: 0,
          height: 0,
          tags: [],
          asset_type: assetType,
          created_at: Date.now(),

        };
        setAssets((prev) => [asset, ...prev]);
        return asset;
      }

      // 本番: D1に登録
      const res = await apiFetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: normalizedUrl,
          r2_key: '',
          filename,
          title,
          size_bytes: 0,
          width: 0,
          height: 0,
          tags: [],
          asset_type: assetType,
        }),
      }, token ?? undefined);
      const created: Asset = await res.json();
      setAssets((prev) => [created, ...prev]);
      return created;
    },
    [uid, token]
  );

  const deleteAsset = useCallback(
    async (assetId: string, _r2Key?: string) => {
      if (!uid) return;

      // デモモード: token なしならローカル削除のみ
      if (!token) {
        setAssets((prev) => prev.filter((a) => a.id !== assetId));
        return;
      }

      // 本番: API経由で削除
      await apiFetch(`/api/assets/${assetId}`, { method: 'DELETE' }, token ?? undefined);
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    },
    [uid, token]
  );

  const updateAssetTags = useCallback(
    async (assetId: string, tags: string[]) => {
      if (!uid) return;

      // デモモード: token なしならローカル更新のみ
      if (!token) {
        setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, tags } : a)));
        return;
      }

      // 本番: API経由で更新
      await apiFetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      }, token ?? undefined);
      setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, tags } : a)));
    },
    [uid, token]
  );

  const updateAssetTitle = useCallback(
    async (assetId: string, title: string) => {
      if (!uid) return;

      // デモモード: token なしならローカル更新のみ
      if (!token) {
        setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, title } : a)));
        return;
      }

      // 本番: API経由で更新
      await apiFetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      }, token ?? undefined);
      setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, title } : a)));
    },
    [uid, token]
  );

  return { assets, loading, fetchAssets, uploadAsset, uploadAudioAsset, addAssetByUrl, deleteAsset, updateAssetTags, updateAssetTitle };
}
