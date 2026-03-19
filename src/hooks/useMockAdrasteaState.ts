import { useState, useCallback, useMemo } from 'react';
import type {
  Scene,
  BoardObject,
  Character,
  BgmTrack,
  Cutin,
  ScenarioText,
  Piece,
  Room,
  ChatMessage,
} from '../types/adrastea.types';
import type {
  ScenesInject,
  ObjectsInject,
  CharactersInject,
  BgmsInject,
  CutinsInject,
  ChatInject,
} from '../types/adrastea-persistence';

// --- モックデータ ---

const DEMO_ROOM: Room = {
  id: 'demo-room-001',
  owner_id: 'demo-user',
  name: 'Adrastea デモ',
  active_scene_id: 'demo-scene-1',
  active_cutin: null,
  foreground_url: null,
  dice_system: 'DiceBot',
  gm_can_see_secret_memo: true,
  default_login_role: 'guest',
  created_at: Date.now(),
  updated_at: Date.now(),
};

const DEMO_SCENES: Scene[] = [];

const DEMO_OBJECTS: BoardObject[] = [];

const DEMO_CHARACTERS: Character[] = [];

const DEMO_BGMS: BgmTrack[] = [];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMockAdrasteaState() {
  // === State ===
  const [room, setRoom] = useState<Room>(DEMO_ROOM);
  const [scenes, setScenes] = useState<Scene[]>(DEMO_SCENES);
  const [objects, setObjects] = useState<BoardObject[]>(DEMO_OBJECTS);
  const [characters, setCharacters] = useState<Character[]>(DEMO_CHARACTERS);
  const [bgms, setBgms] = useState<BgmTrack[]>(DEMO_BGMS);
  const [cutins, setCutins] = useState<Cutin[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [scenarioTexts, setScenarioTexts] = useState<ScenarioText[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);

  // === Room ===
  const updateRoom = useCallback(async (data: Partial<Room>) => {
    setRoom(p => ({ ...p, ...data, updated_at: Date.now() }));
  }, []);

  // === Scenes inject ===
  const scenesCreate = useCallback(async (s: Scene) => setScenes(p => [...p, s]), []);
  const scenesUpdate = useCallback(async (id: string, data: Partial<Scene>) => {
    setScenes(p => p.map(s => s.id === id ? { ...s, ...data, updated_at: Date.now() } : s));
  }, []);
  const scenesRemove = useCallback(async (id: string) => {
    setScenes(p => p.filter(s => s.id !== id));
  }, []);
  const scenesReorder = useCallback(async (updates: { id: string; sort_order: number }[]) => {
    setScenes(p => {
      const map = new Map(updates.map(u => [u.id, u.sort_order]));
      return p.map(s => map.has(s.id) ? { ...s, sort_order: map.get(s.id)! } : s);
    });
  }, []);
  const objectsCreateBatch = useCallback(async (objs: BoardObject[]) => {
    setObjects(p => [...p, ...objs]);
  }, []);
  const scenesInject = useMemo<ScenesInject>(() => ({
    data: scenes,
    create: scenesCreate,
    update: scenesUpdate,
    remove: scenesRemove,
    reorder: scenesReorder,
    createObjectBatch: objectsCreateBatch,
  }), [scenes, scenesCreate, scenesUpdate, scenesRemove, scenesReorder, objectsCreateBatch]);

  // === Objects inject ===
  const objectsCreate = useCallback(async (o: BoardObject) => setObjects(p => [...p, o]), []);
  const objectsUpdate = useCallback(async (id: string, data: Partial<BoardObject>) => {
    setObjects(p => p.map(o => o.id === id ? { ...o, ...data, updated_at: Date.now() } : o));
  }, []);
  const objectsRemove = useCallback(async (id: string) => {
    setObjects(p => p.filter(o => o.id !== id));
  }, []);
  const objectsReorder = useCallback(async (updates: { id: string; sort_order: number }[]) => {
    setObjects(p => {
      const map = new Map(updates.map(u => [u.id, u.sort_order]));
      return p.map(o => map.has(o.id) ? { ...o, sort_order: map.get(o.id)! } : o);
    });
  }, []);
  const objectsBatchUpdateSort = useCallback(async (updates: { id: string; sort: number }[]) => {
    setObjects(p => {
      const map = new Map(updates.map(u => [u.id, u.sort]));
      return p.map(o => map.has(o.id) ? { ...o, sort_order: map.get(o.id)! } : o);
    });
  }, []);
  const objectsInject = useMemo<ObjectsInject>(() => ({
    data: objects,
    create: objectsCreate,
    update: objectsUpdate,
    remove: objectsRemove,
    reorder: objectsReorder,
    batchUpdateSort: objectsBatchUpdateSort,
  }), [objects, objectsCreate, objectsUpdate, objectsRemove, objectsReorder, objectsBatchUpdateSort]);

  // === Characters inject ===
  const charactersCreate = useCallback(async (c: Character) => setCharacters(p => [...p, c]), []);
  const charactersUpdate = useCallback(async (id: string, data: Partial<Character>) => {
    setCharacters(p => p.map(c => c.id === id ? { ...c, ...data, updated_at: Date.now() } : c));
  }, []);
  const charactersMove = useCallback(async (id: string, data: { board_x?: number; board_y?: number }) => {
    setCharacters(p => p.map(c => c.id === id ? { ...c, ...data, updated_at: Date.now() } : c));
  }, []);
  const charactersRemove = useCallback(async (id: string) => {
    setCharacters(p => p.filter(c => c.id !== id));
  }, []);
  const charactersInject = useMemo<CharactersInject>(() => ({
    data: characters,
    create: charactersCreate,
    update: charactersUpdate,
    move: charactersMove,
    remove: charactersRemove,
  }), [characters, charactersCreate, charactersUpdate, charactersMove, charactersRemove]);

  // === Bgms inject ===
  const bgmsCreate = useCallback(async (b: BgmTrack) => setBgms(p => [...p, b]), []);
  const bgmsUpdate = useCallback(async (id: string, data: Partial<BgmTrack>) => {
    setBgms(p => p.map(b => b.id === id ? { ...b, ...data, updated_at: Date.now() } : b));
  }, []);
  const bgmsRemove = useCallback(async (id: string) => {
    setBgms(p => p.filter(b => b.id !== id));
  }, []);
  const bgmsInject = useMemo<BgmsInject>(() => ({
    data: bgms,
    create: bgmsCreate,
    update: bgmsUpdate,
    remove: bgmsRemove,
  }), [bgms, bgmsCreate, bgmsUpdate, bgmsRemove]);

  // === Cutins inject ===
  const cutinsCreate = useCallback(async (c: Cutin) => setCutins(p => [...p, c]), []);
  const cutinsUpdate = useCallback(async (id: string, data: Partial<Cutin>) => {
    setCutins(p => p.map(c => c.id === id ? { ...c, ...data, updated_at: Date.now() } : c));
  }, []);
  const cutinsRemove = useCallback(async (id: string) => {
    setCutins(p => p.filter(c => c.id !== id));
  }, []);
  const cutinsReorder = useCallback(async (updates: { id: string; sort_order: number }[]) => {
    setCutins(p => {
      const map = new Map(updates.map(u => [u.id, u.sort_order]));
      return p.map(c => map.has(c.id) ? { ...c, sort_order: map.get(c.id)! } : c);
    });
  }, []);
  const cutinsTrigger = useCallback((id: string) => {
    setRoom(p => ({ ...p, active_cutin: { cutin_id: id, triggered_at: Date.now() } as any }));
  }, []);
  const cutinsClear = useCallback(() => {
    setRoom(p => ({ ...p, active_cutin: null }));
  }, []);
  const cutinsInject = useMemo<CutinsInject>(() => ({
    data: cutins,
    create: cutinsCreate,
    update: cutinsUpdate,
    remove: cutinsRemove,
    reorder: cutinsReorder,
    triggerCutin: cutinsTrigger,
    clearCutin: cutinsClear,
  }), [cutins, cutinsCreate, cutinsUpdate, cutinsRemove, cutinsReorder, cutinsTrigger, cutinsClear]);

  // === Chat inject ===
  const chatSend = useCallback(async (
    senderName: string,
    content: string,
    messageType: ChatMessage['message_type'] = 'chat',
    _senderUid?: string,
    senderAvatar?: string | null,
    _diceSystem?: string,
    channel?: string,
    allowedUserIds?: string[],
  ): Promise<ChatMessage | null> => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      room_id: 'demo-room-001',
      sender_name: senderName,
      sender_uid: 'demo-user',
      sender_avatar: senderAvatar ?? null,
      content,
      channel: channel ?? 'main',
      message_type: messageType,
      allowed_user_ids: allowedUserIds,
      created_at: Date.now(),
    };
    setMessages(p => [...p, msg]);
    return msg;
  }, []);
  const chatInject = useMemo<ChatInject>(() => ({
    data: messages,
    send: chatSend,
  }), [messages, chatSend]);

  // === ScenarioTexts (本番 hook なし) ===
  const addScenarioText = useCallback(async (data: Partial<ScenarioText>) => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const newText: ScenarioText = {
      id, room_id: 'demo-room-001',
      title: data.title ?? '新規シナリオテキスト',
      content: data.content ?? '',
      visible: data.visible ?? true,
      sort_order: data.sort_order ?? 0,
      created_at: now, updated_at: now,
    };
    setScenarioTexts(p => [...p, newText]);
    return id;
  }, []);
  const updateScenarioText = useCallback(async (id: string, data: Partial<ScenarioText>) => {
    setScenarioTexts(p => p.map(t => t.id === id ? { ...t, ...data, updated_at: Date.now() } : t));
  }, []);
  const removeScenarioText = useCallback(async (id: string) => {
    setScenarioTexts(p => p.filter(t => t.id !== id));
  }, []);
  const reorderScenarioTexts = useCallback(async (orderedIds: string[]) => {
    setScenarioTexts(p => {
      const map = new Map(p.map(t => [t.id, t]));
      return orderedIds.map((id, i) => {
        const t = map.get(id);
        return t ? { ...t, sort_order: i } : null;
      }).filter(Boolean) as ScenarioText[];
    });
  }, []);

  // === Pieces (本番 hook なし) ===
  const addPiece = useCallback(async (label: string, color: string, x: number, y: number) => {
    const id = crypto.randomUUID();
    const newPiece: Piece = {
      id, room_id: 'demo-room-001',
      x, y, width: 5, height: 5,
      image_url: null, label, color,
      z_index: 0, statuses: [], initiative: 0, memo: '',
      character_id: null, created_at: Date.now(),
    };
    setPieces(p => [...p, newPiece]);
    return id;
  }, []);
  const updatePiece = useCallback(async (id: string, data: Partial<Piece>) => {
    setPieces(p => p.map(piece => piece.id === id ? { ...piece, ...data } : piece));
  }, []);
  const removePiece = useCallback(async (id: string) => {
    setPieces(p => p.filter(piece => piece.id !== id));
  }, []);
  const movePiece = useCallback(async (id: string, x: number, y: number) => {
    setPieces(p => p.map(piece => piece.id === id ? { ...piece, x, y } : piece));
  }, []);

  return {
    // Room (inject 対象外)
    room,
    updateRoom,
    // Inject objects
    scenesInject,
    objectsInject,
    charactersInject,
    bgmsInject,
    cutinsInject,
    chatInject,
    // ScenarioTexts (inject 対象外)
    scenarioTexts,
    addScenarioText,
    updateScenarioText,
    removeScenarioText,
    reorderScenarioTexts,
    // Pieces (inject 対象外)
    pieces,
    addPiece,
    updatePiece,
    removePiece,
    movePiece,
  };
}
