import { useState, useEffect, useCallback } from 'react';
import type { Asset } from '../types/adrastea.types';
import { useAuth } from '../contexts/AuthContext';
import { uploadAssetToR2, uploadAudioAssetToR2, deleteR2File } from '../services/assetService';
import { apiFetch } from '../config/api';

// モジュールレベルキャッシュ（モーダル再マウント時の再取得を防止）
let assetCache: { uid: string; assets: Asset[] } | null = null;
let demoCache: Asset[] | null = null;

// バックグラウンドフェッチ用：進行中のリクエスト + fetchSingleAsset 関数への参照
const pendingFetches = new Set<string>();
let fetchSingleAssetFn: ((id: string) => void) | null = null;

/** asset_id から URL を解決する。モジュールレベルキャッシュを直接参照。キャッシュミス時はバックグラウンドフェッチをトリガー。 */
export function resolveAssetId(assetId: string | null | undefined): string | null {
  if (!assetId) return null;
  const assets = assetCache?.assets ?? demoCache ?? [];
  const asset = assets.find(a => a.id === assetId);
  if (asset) return asset.url ?? null;
  // キャッシュミス → バックグラウンドフェッチをトリガー
  if (fetchSingleAssetFn && !pendingFetches.has(assetId)) {
    fetchSingleAssetFn(assetId);
  }
  return null;
}

export function useAssets(options?: { disabled?: boolean }) {
  const disabled = options?.disabled ?? false;
  const { user, token } = useAuth();
  const uid = user?.uid;

  // disabled モード（デモ）ではデモキャッシュを使う
  const cached = disabled
    ? demoCache
    : (uid && assetCache?.uid === uid ? assetCache.assets : null);
  const [assets, setAssetsRaw] = useState<Asset[]>(cached ?? []);
  const [loading, setLoading] = useState(!disabled && !cached);

  // setAssets のラッパー: state とキャッシュを同時に更新
  const setAssets: typeof setAssetsRaw = useCallback((action) => {
    setAssetsRaw(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (disabled) {
        demoCache = next;
      } else if (uid) {
        assetCache = { uid, assets: next };
      }
      return next;
    });
  }, [uid, disabled]);

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

  // 単体アセットをバックグラウンドで取得する
  const fetchSingleAsset = useCallback(
    async (assetId: string) => {
      // デモモード時はフェッチしない
      if (disabled) return;
      if (!uid || !token) return;

      pendingFetches.add(assetId);
      try {
        const res = await apiFetch(`/api/assets/${assetId}`, undefined, token ?? undefined);
        const data = await res.json();
        if (!data?.id) return;
        const asset: Asset = { ...data, tags: data.tags ?? [] };
        setAssets((prev) => {
          // 既に存在する場合はスキップ
          if (prev.some((a) => a.id === asset.id)) return prev;
          return [asset, ...prev];
        });
      } catch (error) {
        console.error(`[useAssets] fetchSingleAsset failed for ${assetId}:`, error);
      } finally {
        pendingFetches.delete(assetId);
      }
    },
    [disabled, uid, token]
  );

  // uid 変更時にキャッシュをクリア（別ユーザーのアセット混在防止）
  useEffect(() => {
    if (!disabled && uid && assetCache && assetCache.uid !== uid) {
      assetCache = null;
    }
  }, [disabled, uid]);

  // キャッシュがあればフェッチをスキップ
  useEffect(() => {
    if (disabled) return;
    if (uid && assetCache && assetCache.uid === uid) return;
    fetchAssets();
  }, [disabled, fetchAssets, uid]);

  // fetchSingleAsset を module-level 関数にバインド
  useEffect(() => {
    fetchSingleAssetFn = fetchSingleAsset;
    return () => {
      fetchSingleAssetFn = null;
    };
  }, [fetchSingleAsset]);

  const uploadAsset = useCallback(
    async (file: File): Promise<Asset | null> => {
      // デモモード: 通信なし、blob URLのみ
      if (disabled) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        const dims = await new Promise<{ width: number; height: number }>((resolve) => {
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => resolve({ width: 0, height: 0 });
          img.src = url;
        });
        const asset: Asset = {
          id: crypto.randomUUID(),
          uid: 'demo-user',
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
      if (!uid || !token) return null;

      const result = await uploadAssetToR2(file, uid, token);
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
        }, token);
      } catch (e) {
        // D1登録失敗 → R2ファイルを削除してロールバック
        await deleteR2File(result.r2_key, token).catch((err) => {
          console.error('R2削除失敗（アセット登録ロールバック中）:', err);
        });
        throw e;
      }
      const created: Asset = await res.json();
      setAssets((prev) => [created, ...prev]);
      return created;
    },
    [uid, token, disabled]
  );

  const uploadAudioAsset = useCallback(
    async (file: File): Promise<Asset | null> => {
      // デモモード: 通信なし、blob URLのみ
      if (disabled) {
        const url = URL.createObjectURL(file);
        const asset: Asset = {
          id: crypto.randomUUID(),
          uid: 'demo-user',
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
      if (!uid || !token) return null;

      const result = await uploadAudioAssetToR2(file, uid, token);
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
        }, token);
      } catch (e) {
        await deleteR2File(result.r2_key, token).catch((err) => {
          console.error('R2削除失敗（オーディオアセット登録ロールバック中）:', err);
        });
        throw e;
      }
      const created: Asset = await res.json();
      setAssets((prev) => [created, ...prev]);
      return created;
    },
    [uid, token, disabled]
  );

  const addAssetByUrl = useCallback(
    async (url: string, assetType: 'image' | 'audio'): Promise<Asset | null> => {
      // Dropbox共有URL（dl=0）を直接ダウンロードURL（dl=1）に変換
      // 新形式(scl): dl=0 → dl=1 のみでOK
      // 旧形式(/s/): www.dropbox.com → dl.dropboxusercontent.com でも可
      const normalizedUrl = url.includes('dropbox.com')
        ? url.replace(/([?&])dl=0(&|$)/, '$1dl=1$2').replace(/www\.dropbox\.com\/s\//, 'dl.dropboxusercontent.com/s/')
        : url;
      const filename = decodeURIComponent(normalizedUrl.split('/').pop() || normalizedUrl).replace(/[?#].*$/, '');
      const title = filename;

      // デモモード: URL をそのまま登録（通信なし）
      if (disabled) {
        const asset: Asset = {
          id: crypto.randomUUID(),
          uid: 'demo-user',
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
      if (!uid || !token) return null;

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
      }, token);
      const created: Asset = await res.json();
      setAssets((prev) => [created, ...prev]);
      return created;
    },
    [uid, token, disabled]
  );

  const deleteAsset = useCallback(
    async (assetId: string, _r2Key?: string) => {
      // デモモード: ローカル削除のみ
      if (disabled) {
        setAssets((prev) => prev.filter((a) => a.id !== assetId));
        return;
      }

      // 本番: API経由で削除
      if (!uid || !token) return;

      await apiFetch(`/api/assets/${assetId}`, { method: 'DELETE' }, token);
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    },
    [uid, token, disabled]
  );

  const updateAssetTags = useCallback(
    async (assetId: string, tags: string[]) => {
      // デモモード: ローカル更新のみ
      if (disabled) {
        setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, tags } : a)));
        return;
      }

      // 本番: API経由で更新
      if (!uid || !token) return;

      await apiFetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
      }, token);
      setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, tags } : a)));
    },
    [uid, token, disabled]
  );

  const updateAssetTitle = useCallback(
    async (assetId: string, title: string) => {
      // デモモード: ローカル更新のみ
      if (disabled) {
        setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, title } : a)));
        return;
      }

      // 本番: API経由で更新
      if (!uid || !token) return;

      await apiFetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      }, token);
      setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, title } : a)));
    },
    [uid, token, disabled]
  );

  return { assets, loading, fetchAssets, uploadAsset, uploadAudioAsset, addAssetByUrl, deleteAsset, updateAssetTags, updateAssetTitle };
}
