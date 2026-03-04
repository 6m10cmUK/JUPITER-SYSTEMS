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
import type { Piece, Room } from '../types/adrastea.types';

export function useAdrastea(roomId: string) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  // Room ドキュメント監視
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = onSnapshot(doc(db, 'rooms', roomId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoom({
          id: snap.id,
          ...data,
          active_scene_id: data.active_scene_id ?? null,
          foreground_url: data.foreground_url ?? null,
          active_cutin: data.active_cutin ?? null,
        } as Room);
      }
    });
    return () => unsubscribe();
  }, [roomId]);

  // Firestore リアルタイム監視
  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'rooms', roomId, 'pieces'),
      orderBy('z_index', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updated: Piece[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          statuses: data.statuses ?? [],
          initiative: data.initiative ?? 0,
          memo: data.memo ?? '',
          character_id: data.character_id ?? null,
        };
      }) as Piece[];
      setPieces(updated);
      setLoading(false);
    }, (error) => {
      console.error('コマの監視に失敗:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [roomId]);

  const movePiece = useCallback(async (pieceId: string, x: number, y: number) => {
    setPieces((prev) =>
      prev.map((p) => (p.id === pieceId ? { ...p, x, y } : p))
    );
    try {
      await updateDoc(doc(db, 'rooms', roomId, 'pieces', pieceId), { x, y });
    } catch (error) {
      console.error('コマの移動に失敗:', error);
    }
  }, [roomId]);

  const addPiece = useCallback(async (label: string, color: string) => {
    try {
      await addDoc(collection(db, 'rooms', roomId, 'pieces'), {
        room_id: roomId,
        x: Math.floor(Math.random() * 400) + 100,
        y: Math.floor(Math.random() * 400) + 100,
        width: 60,
        height: 60,
        image_url: null,
        label,
        color,
        z_index: pieces.length,
        statuses: [],
        initiative: 0,
        memo: '',
        character_id: null,
        created_at: Date.now(),
      });
    } catch (error) {
      console.error('コマの追加に失敗:', error);
    }
  }, [roomId, pieces.length]);

  const removePiece = useCallback(async (pieceId: string) => {
    setPieces((prev) => prev.filter((p) => p.id !== pieceId));
    try {
      await deleteDoc(doc(db, 'rooms', roomId, 'pieces', pieceId));
    } catch (error) {
      console.error('コマの削除に失敗:', error);
    }
  }, [roomId]);

  const updatePiece = useCallback(async (pieceId: string, updates: Partial<Piece>) => {
    setPieces((prev) =>
      prev.map((p) => (p.id === pieceId ? { ...p, ...updates } : p))
    );
    try {
      const { id, ...data } = updates as any;
      await updateDoc(doc(db, 'rooms', roomId, 'pieces', pieceId), data);
    } catch (error) {
      console.error('コマの更新に失敗:', error);
    }
  }, [roomId]);

  const updateRoom = useCallback(async (updates: Partial<Room>) => {
    try {
      const { id, ...data } = updates as any;
      await updateDoc(doc(db, 'rooms', roomId), { ...data, updated_at: Date.now() });
    } catch (error) {
      console.error('ルームの更新に失敗:', error);
    }
  }, [roomId]);

  return { pieces, room, loading, movePiece, addPiece, removePiece, updatePiece, updateRoom };
}
