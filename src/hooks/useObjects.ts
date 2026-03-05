import { useState, useEffect, useCallback, useMemo } from 'react';
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
  writeBatch,
} from 'firebase/firestore';
import type { BoardObject, BoardObjectScope } from '../types/adrastea.types';

const getCollectionPath = (
  roomId: string,
  scope: BoardObjectScope,
  sceneId?: string | null
) => {
  if (scope === 'scene') {
    if (!sceneId) throw new Error('sceneId required for scene scope');
    return `rooms/${roomId}/scenes/${sceneId}/objects`;
  }
  return `rooms/${roomId}/objects`;
};

const mapDoc = (d: { id: string; data: () => any }): BoardObject => {
  const data = d.data();
  return {
    id: d.id,
    type: data.type ?? 'panel',
    name: data.name ?? '',
    x: data.x ?? 50,
    y: data.y ?? 50,
    width: data.width ?? 4,
    height: data.height ?? 4,
    visible: data.visible ?? true,
    opacity: data.opacity ?? 1,
    sort_order: data.sort_order ?? 0,
    locked: data.locked ?? false,
    image_url: data.image_url ?? null,
    background_color: data.background_color ?? 'transparent',
    image_fit: data.image_fit ?? 'cover',
    text_content: data.text_content ?? null,
    font_size: data.font_size ?? 16,
    text_color: data.text_color ?? '#ffffff',
    created_at: data.created_at ?? Date.now(),
    updated_at: data.updated_at ?? Date.now(),
  };
};

export function useObjects(roomId: string, activeSceneId: string | null) {
  const [roomObjects, setRoomObjects] = useState<BoardObject[]>([]);
  const [sceneObjects, setSceneObjects] = useState<BoardObject[]>([]);
  const [roomLoading, setRoomLoading] = useState(true);
  const [sceneLoading, setSceneLoading] = useState(true);

  // ルームオブジェクト監視
  useEffect(() => {
    if (!roomId) {
      setRoomLoading(false);
      return;
    }
    setRoomLoading(true);
    const q = query(
      collection(db, 'rooms', roomId, 'objects'),
      orderBy('sort_order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setRoomObjects(snapshot.docs.map(mapDoc));
        setRoomLoading(false);
      },
      (error) => {
        console.error('ルームオブジェクトの監視に失敗:', error);
        setRoomLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId]);

  // シーンオブジェクト監視
  useEffect(() => {
    if (!roomId || !activeSceneId) {
      setSceneObjects([]);
      setSceneLoading(false);
      return;
    }
    setSceneLoading(true);
    const q = query(
      collection(db, 'rooms', roomId, 'scenes', activeSceneId, 'objects'),
      orderBy('sort_order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setSceneObjects(snapshot.docs.map(mapDoc));
        setSceneLoading(false);
      },
      (error) => {
        console.error('シーンオブジェクトの監視に失敗:', error);
        setSceneLoading(false);
      }
    );

    return () => unsubscribe();
  }, [roomId, activeSceneId]);

  const loading = roomLoading || sceneLoading;

  const mergedObjects = useMemo(
    () =>
      [...roomObjects, ...sceneObjects].sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    [roomObjects, sceneObjects]
  );

  const addObject = useCallback(
    async (scope: BoardObjectScope, data: Partial<BoardObject>) => {
      const colPath = getCollectionPath(roomId, scope, activeSceneId);
      const currentObjects = scope === 'scene' ? sceneObjects : roomObjects;
      const type = data.type ?? 'panel';
      const docRef = await addDoc(collection(db, colPath), {
        type,
        name: data.name ?? '新規オブジェクト',
        x: data.x ?? 50,
        y: data.y ?? 50,
        width: data.width ?? 4,
        height: data.height ?? 4,
        visible: data.visible ?? true,
        opacity: data.opacity ?? 1,
        sort_order: data.sort_order ?? currentObjects.length,
        locked: data.locked ?? (type === 'background'),
        image_url: data.image_url ?? null,
        background_color: data.background_color ?? 'rgba(255,255,255,0.1)',
        image_fit: data.image_fit ?? 'cover',
        text_content: data.text_content ?? null,
        font_size: data.font_size ?? 16,
        text_color: data.text_color ?? '#ffffff',
        created_at: Date.now(),
        updated_at: Date.now(),
      });
      return docRef.id;
    },
    [roomId, activeSceneId, roomObjects.length, sceneObjects.length]
  );

  const updateObject = useCallback(
    async (scope: BoardObjectScope, id: string, updates: Partial<BoardObject>) => {
      const colPath = getCollectionPath(roomId, scope, activeSceneId);
      const { id: _id, created_at, ...data } = updates as any;
      await updateDoc(doc(db, colPath, id), {
        ...data,
        updated_at: Date.now(),
      });
    },
    [roomId, activeSceneId]
  );

  const removeObject = useCallback(
    async (scope: BoardObjectScope, id: string) => {
      const colPath = getCollectionPath(roomId, scope, activeSceneId);
      await deleteDoc(doc(db, colPath, id));
    },
    [roomId, activeSceneId]
  );

  const reorderObjects = useCallback(
    async (scope: BoardObjectScope, orderedIds: string[]) => {
      const colPath = getCollectionPath(roomId, scope, activeSceneId);
      const batch = writeBatch(db);
      orderedIds.forEach((id, index) => {
        batch.update(doc(db, colPath, id), {
          sort_order: index,
          updated_at: Date.now(),
        });
      });
      await batch.commit();
    },
    [roomId, activeSceneId]
  );

  return {
    roomObjects,
    sceneObjects,
    mergedObjects,
    loading,
    addObject,
    updateObject,
    removeObject,
    reorderObjects,
  };
}
