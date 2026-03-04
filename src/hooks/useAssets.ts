import { useState, useEffect, useCallback } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import type { Asset } from '../types/adrastea.types';
import { useAuth } from '../contexts/AuthContext';
import { uploadAssetToR2, deleteAssetFromR2 } from '../services/assetService';

export function useAssets() {
  const { user, isGuest } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const uid = user?.uid;

  useEffect(() => {
    if (!uid || isGuest) {
      setAssets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'users', uid, 'assets'),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const updated: Asset[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as Asset));
        setAssets(updated);
        setLoading(false);
      },
      (error) => {
        console.error('アセットの監視に失敗:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid, isGuest]);

  const uploadAsset = useCallback(
    async (file: File): Promise<Asset | null> => {
      if (!uid || isGuest) return null;
      const result = await uploadAssetToR2(file, uid);
      const docRef = await addDoc(collection(db, 'users', uid, 'assets'), {
        uid,
        url: result.url,
        r2_key: result.r2_key,
        filename: file.name,
        size_bytes: result.size_bytes,
        width: result.width,
        height: result.height,
        tags: [],
        created_at: Date.now(),
      });
      return {
        id: docRef.id,
        uid,
        url: result.url,
        r2_key: result.r2_key,
        filename: file.name,
        size_bytes: result.size_bytes,
        width: result.width,
        height: result.height,
        tags: [],
        created_at: Date.now(),
      };
    },
    [uid, isGuest]
  );

  const deleteAsset = useCallback(
    async (assetId: string, r2Key: string) => {
      if (!uid || isGuest) return;
      try {
        await deleteAssetFromR2(r2Key);
      } catch {
        // R2削除失敗してもFirestoreからは消す
      }
      await deleteDoc(doc(db, 'users', uid, 'assets', assetId));
    },
    [uid, isGuest]
  );

  const updateAssetTags = useCallback(
    async (assetId: string, tags: string[]) => {
      if (!uid || isGuest) return;
      await updateDoc(doc(db, 'users', uid, 'assets', assetId), { tags });
    },
    [uid, isGuest]
  );

  return { assets, loading, uploadAsset, deleteAsset, updateAssetTags };
}
