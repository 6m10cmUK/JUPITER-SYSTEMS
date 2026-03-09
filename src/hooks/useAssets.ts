import { useState, useEffect, useCallback, useRef } from 'react';
import type { Asset } from '../types/adrastea.types';
import { useAuth } from '../contexts/AuthContext';
import { uploadAssetToR2, uploadAudioAssetToR2, deleteR2File } from '../services/assetService';
import { apiFetch } from '../config/api';

// モジュールレベルキャッシュ（モーダル再マウント時の再取得を防止）
let assetCache: { uid: string; assets: Asset[] } | null = null;

export function useAssets() {
  const { user, isGuest } = useAuth();
  const uid = user?.uid;
  const cached = uid && assetCache?.uid === uid ? assetCache.assets : null;
  const [assets, setAssetsRaw] = useState<Asset[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);

  // setAssets のラッパー: state とキャッシュを同時に更新
  const setAssets: typeof setAssetsRaw = useCallback((action) => {
    setAssetsRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (uid) assetCache = { uid, assets: next };
      return next;
    });
  }, [uid]);

  const fetchAssets = useCallback(async () => {
    if (!uid || isGuest) {
      setAssets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/assets');
      const data: Asset[] = await res.json();
      setAssets(data);
    } catch (error) {
      console.error('アセットの取得に失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [uid, isGuest]);

  // キャッシュがあればフェッチをスキップ
  useEffect(() => {
    if (uid && assetCache && assetCache.uid === uid) return;
    fetchAssets();
  }, [fetchAssets, uid]);

  const uploadAsset = useCallback(
    async (file: File): Promise<Asset | null> => {
      if (!uid || isGuest) return null;
      const result = await uploadAssetToR2(file, uid);
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
        });
      } catch (e) {
        // D1登録失敗 → R2ファイルを削除してロールバック
        await deleteR2File(result.r2_key).catch(() => {});
        throw e;
      }
      const created: Asset = await res.json();
      setAssets((prev) => [created, ...prev]);
      return created;
    },
    [uid, isGuest]
  );

  const uploadAudioAsset = useCallback(
    async (file: File): Promise<Asset | null> => {
      if (!uid || isGuest) return null;
      const result = await uploadAudioAssetToR2(file, uid);
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
        });
      } catch (e) {
        await deleteR2File(result.r2_key).catch(() => {});
        throw e;
      }
      const created: Asset = await res.json();
      setAssets((prev) => [created, ...prev]);
      return created;
    },
    [uid, isGuest]
  );

  const addAssetByUrl = useCallback(
    async (url: string, assetType: 'image' | 'audio'): Promise<Asset | null> => {
      if (!uid || isGuest) return null;
      const filename = decodeURIComponent(url.split('/').pop() || url).replace(/[?#].*$/, '');
      const title = filename;
      const res = await apiFetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          r2_key: '',
          filename,
          title,
          size_bytes: 0,
          width: 0,
          height: 0,
          tags: [],
          asset_type: assetType,
        }),
      });
      const created: Asset = await res.json();
      setAssets((prev) => [created, ...prev]);
      return created;
    },
    [uid, isGuest]
  );

  const deleteAsset = useCallback(
    async (assetId: string, _r2Key?: string) => {
      if (!uid || isGuest) return;
      await apiFetch(`/api/assets/${assetId}`, { method: 'DELETE' });
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    },
    [uid, isGuest]
  );

  const updateAssetTags = useCallback(
    async (assetId: string, tags: string[]) => {
      if (!uid || isGuest) return;
      await apiFetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      });
      setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, tags } : a)));
    },
    [uid, isGuest]
  );

  const updateAssetTitle = useCallback(
    async (assetId: string, title: string) => {
      if (!uid || isGuest) return;
      await apiFetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, title } : a)));
    },
    [uid, isGuest]
  );

  return { assets, loading, fetchAssets, uploadAsset, uploadAudioAsset, addAssetByUrl, deleteAsset, updateAssetTags, updateAssetTitle };
}
