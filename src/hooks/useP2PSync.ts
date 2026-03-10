import { useEffect, useRef, useCallback, useState } from 'react';
import { RoomSync } from '../services/rtc/RoomSync';
import type {
  RoomSnapshot,
  ConnectionState,
  CollectionName,
  PatchOp,
} from '../services/rtc/types';
import type { Room, ChatMessage } from '../types/adrastea.types';

interface UseP2PSyncOptions {
  roomId: string;
  userId: string;
  enabled: boolean; // initialLoadDone 後に有効化
  getSnapshot: () => RoomSnapshot | null;
  onFullSync: (snapshot: RoomSnapshot) => void;
  onPatch: (collection: CollectionName, op: PatchOp, id: string, data?: Record<string, unknown>) => void;
  onRoomUpdate: (data: Partial<Room>) => void;
  onChatMessage: (msg: ChatMessage) => void;
  onHostElection?: (isHost: boolean, hostPeerId: string | null) => void;
  onSaveSnapshot?: () => void;
}

export function useP2PSync(options: UseP2PSyncOptions) {
  const {
    roomId, userId, enabled,
    getSnapshot, onFullSync, onPatch, onRoomUpdate, onChatMessage,
    onHostElection, onSaveSnapshot,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isHost, setIsHost] = useState(false);
  const syncRef = useRef<RoomSync | null>(null);

  // Stable callback refs
  const getSnapshotRef = useRef(getSnapshot);
  getSnapshotRef.current = getSnapshot;
  const onFullSyncRef = useRef(onFullSync);
  onFullSyncRef.current = onFullSync;
  const onPatchRef = useRef(onPatch);
  onPatchRef.current = onPatch;
  const onRoomUpdateRef = useRef(onRoomUpdate);
  onRoomUpdateRef.current = onRoomUpdate;
  const onChatMessageRef = useRef(onChatMessage);
  onChatMessageRef.current = onChatMessage;
  const onHostElectionRef = useRef(onHostElection);
  onHostElectionRef.current = onHostElection;
  const onSaveSnapshotRef = useRef(onSaveSnapshot);
  onSaveSnapshotRef.current = onSaveSnapshot;

  useEffect(() => {
    if (!enabled || !userId) return;

    const sync = new RoomSync(
      roomId,
      userId,
      false, // 最初は全員候補（isHost は false で初期化）
      () => getSnapshotRef.current(),
    );

    sync.setCallbacks({
      onFullSync: (s) => onFullSyncRef.current(s),
      onPatch: (c, o, id, d) => onPatchRef.current(c, o, id, d),
      onRoomUpdate: (d) => onRoomUpdateRef.current(d),
      onChatMessage: (m) => onChatMessageRef.current(m),
      onConnectionStateChange: setConnectionState,
      onHostElection: (hostPeerId: string | null, isMe: boolean) => {
        setIsHost(isMe);
        onHostElectionRef.current?.(isMe, hostPeerId);
      },
      onSaveSnapshot: () => {
        onSaveSnapshotRef.current?.();
      },
    });

    syncRef.current = sync;
    sync.start().catch(err => console.error('P2P start failed:', err));

    return () => {
      sync.destroy();
      syncRef.current = null;
      setConnectionState('disconnected');
      setIsHost(false);
    };
  }, [roomId, userId, enabled]);

  const sendPatch = useCallback(
    (collection: CollectionName, op: PatchOp, id: string, data?: Record<string, unknown>) => {
      syncRef.current?.sendPatch(collection, op, id, data);
    },
    [],
  );

  const sendRoomUpdate = useCallback((data: Partial<Room>) => {
    syncRef.current?.sendRoomUpdate(data);
  }, []);

  const sendChatMessage = useCallback((msg: ChatMessage) => {
    syncRef.current?.sendChatMessage(msg);
  }, []);

  return {
    connectionState,
    isHost,
    sendPatch,
    sendRoomUpdate,
    sendChatMessage,
  };
}
