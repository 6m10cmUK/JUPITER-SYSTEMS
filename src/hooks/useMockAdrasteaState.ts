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

// シーン 2個
const DEMO_SCENES: Scene[] = [
  {
    id: 'demo-scene-1',
    room_id: 'demo-room-001',
    name: 'タウン',
    background_url: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=1920&q=80',
    foreground_url: null,
    foreground_opacity: 1,
    bg_blur: true,
    bg_transition: 'fade',
    bg_transition_duration: 500,
    fg_transition: 'none',
    fg_transition_duration: 500,
    sort_order: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  {
    id: 'demo-scene-2',
    room_id: 'demo-room-001',
    name: 'ダンジョン',
    background_url: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1920&q=80',
    foreground_url: null,
    foreground_opacity: 1,
    bg_blur: false,
    bg_transition: 'fade',
    bg_transition_duration: 800,
    fg_transition: 'none',
    fg_transition_duration: 500,
    sort_order: 1,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
];

// オブジェクト: 背景 + キャラレイヤー + パネル2つ + 前景
const DEMO_OBJECTS: BoardObject[] = [
  // background (scene-1用)
  {
    id: 'demo-bg-1',
    room_id: 'demo-room-001',
    type: 'background',
    name: '背景',
    image_url: null,
    image_asset_id: null,
    background_color: '#333333',
    image_fit: 'cover',
    x: -50,
    y: -50,
    width: 100,
    height: 100,
    sort_order: 0,
    visible: true,
    opacity: 1,
    locked: true,
    position_locked: false,
    size_locked: false,
    global: false,
    scene_ids: ['demo-scene-1', 'demo-scene-2'],
    text_content: null,
    font_size: 16,
    font_family: 'sans-serif',
    letter_spacing: 0,
    line_height: 1.5,
    auto_size: false,
    text_align: 'left',
    text_vertical_align: 'top',
    text_color: '#000000',
    scale_x: 1,
    scale_y: 1,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  // characters_layer
  {
    id: 'demo-char-layer',
    room_id: 'demo-room-001',
    type: 'characters_layer',
    name: 'キャラクター',
    image_url: null,
    image_asset_id: null,
    background_color: 'transparent',
    image_fit: 'cover',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    sort_order: 9999,
    visible: true,
    opacity: 1,
    locked: false,
    position_locked: true,
    size_locked: true,
    global: true,
    scene_ids: [],
    text_content: null,
    font_size: 16,
    font_family: 'sans-serif',
    letter_spacing: 0,
    line_height: 1.5,
    auto_size: false,
    text_align: 'left',
    text_vertical_align: 'top',
    text_color: '#000000',
    scale_x: 1,
    scale_y: 1,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  // panel 1
  {
    id: 'demo-panel-1',
    room_id: 'demo-room-001',
    type: 'panel',
    name: 'マップオブジェクト',
    image_url: 'https://images.unsplash.com/photo-1553949345-eb786bb3f7ba?w=400&q=80',
    image_asset_id: null,
    background_color: '#ffffff',
    image_fit: 'cover',
    x: 5,
    y: 5,
    width: 8,
    height: 6,
    sort_order: 2,
    visible: true,
    opacity: 1,
    locked: false,
    position_locked: false,
    size_locked: false,
    global: false,
    scene_ids: ['demo-scene-1'],
    text_content: null,
    font_size: 16,
    font_family: 'sans-serif',
    letter_spacing: 0,
    line_height: 1.5,
    auto_size: false,
    text_align: 'left',
    text_vertical_align: 'top',
    text_color: '#000000',
    scale_x: 1,
    scale_y: 1,
    memo: 'これはデモ用パネルオブジェクトです',
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  // panel 2
  {
    id: 'demo-panel-2',
    room_id: 'demo-room-001',
    type: 'panel',
    name: 'NPC立ち絵',
    image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&q=80',
    image_asset_id: null,
    background_color: '#ffffff',
    image_fit: 'contain',
    x: 20,
    y: 3,
    width: 5,
    height: 10,
    sort_order: 3,
    visible: true,
    opacity: 1,
    locked: false,
    position_locked: false,
    size_locked: false,
    global: false,
    scene_ids: ['demo-scene-1'],
    text_content: null,
    font_size: 16,
    font_family: 'sans-serif',
    letter_spacing: 0,
    line_height: 1.5,
    auto_size: false,
    text_align: 'left',
    text_vertical_align: 'top',
    text_color: '#000000',
    scale_x: 1,
    scale_y: 1,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  // foreground
  {
    id: 'demo-fg-1',
    room_id: 'demo-room-001',
    type: 'foreground',
    name: '前景',
    image_url: null,
    image_asset_id: null,
    background_color: '#666666',
    image_fit: 'cover',
    x: -24,
    y: -14,
    width: 48,
    height: 27,
    sort_order: 100,
    visible: true,
    opacity: 1,
    locked: false,
    position_locked: false,
    size_locked: false,
    global: false,
    scene_ids: ['demo-scene-1', 'demo-scene-2'],
    text_content: null,
    font_size: 16,
    font_family: 'sans-serif',
    letter_spacing: 0,
    line_height: 1.5,
    auto_size: false,
    text_align: 'left',
    text_vertical_align: 'top',
    text_color: '#000000',
    scale_x: 1,
    scale_y: 1,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
];

// キャラクター 2体
const DEMO_CHARACTERS: Character[] = [
  {
    id: 'demo-char-1',
    room_id: 'demo-room-001',
    owner_id: 'demo-user',
    name: 'アリス',
    images: [{ url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80', label: '通常' }],
    active_image_index: 0,
    color: '#e74c3c',
    statuses: [
      { label: 'HP', value: 45, max: 50, color: '#e74c3c' },
      { label: 'MP', value: 20, max: 30, color: '#3498db' },
    ],
    parameters: [
      { label: 'STR', value: 14 },
      { label: 'DEX', value: 12 },
    ],
    memo: 'デモ用キャラクター（アリス）',
    secret_memo: '',
    chat_palette: '2d6+{STR}\n1d20+{DEX}',
    sheet_url: null,
    initiative: 15,
    size: 5,
    is_status_private: false,
    is_hidden_on_board: false,
    is_speech_hidden: false,
    board_x: 10,
    board_y: 15,
    board_visible: true,
    sort_order: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  {
    id: 'demo-char-2',
    room_id: 'demo-room-001',
    owner_id: 'demo-user',
    name: 'ボブ',
    images: [{ url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80', label: '通常' }],
    active_image_index: 0,
    color: '#3498db',
    statuses: [
      { label: 'HP', value: 30, max: 30, color: '#e74c3c' },
      { label: 'MP', value: 50, max: 50, color: '#3498db' },
    ],
    parameters: [
      { label: 'INT', value: 18 },
      { label: 'WIS', value: 16 },
    ],
    memo: 'デモ用キャラクター（ボブ）',
    secret_memo: 'GM向け秘密メモ',
    chat_palette: '2d6+{INT}\n1d20+{WIS}',
    sheet_url: null,
    initiative: 10,
    size: 5,
    is_status_private: false,
    is_hidden_on_board: false,
    is_speech_hidden: false,
    board_x: 18,
    board_y: 15,
    board_visible: true,
    sort_order: 1,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
];

// BGM トラック
const DEMO_BGMS: BgmTrack[] = [
  {
    id: 'demo-bgm-1',
    name: 'タウンBGM',
    bgm_type: 'url',
    bgm_source: '',
    bgm_volume: 0.5,
    bgm_loop: true,
    is_playing: false,
    is_paused: false,
    scene_ids: ['demo-scene-1'],
    auto_play_scene_ids: ['demo-scene-1'],
    fade_in: false,
    fade_out: false,
    fade_duration: 500,
    sort_order: 0,
    created_at: Date.now(),
    updated_at: Date.now(),
  },
];

const DEMO_MESSAGES: ChatMessage[] = [];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMockAdrasteaState() {
  // --- State ---
  const [room, setRoom] = useState<Room>(DEMO_ROOM);
  const [scenes, setScenes] = useState<Scene[]>(DEMO_SCENES);
  const [objects, setObjects] = useState<BoardObject[]>(DEMO_OBJECTS);
  const [characters, setCharacters] = useState<Character[]>(DEMO_CHARACTERS);
  const [bgms, setBgms] = useState<BgmTrack[]>(DEMO_BGMS);
  const [cutins, setCutins] = useState<Cutin[]>([]);
  const [scenarioTexts, setScenarioTexts] = useState<ScenarioText[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(DEMO_MESSAGES);
  const [pieces, setPieces] = useState<Piece[]>([]);

  // --- Derived ---
  const activeScene = useMemo(() => {
    if (!room.active_scene_id) return null;
    return scenes.find(s => s.id === room.active_scene_id) ?? null;
  }, [scenes, room.active_scene_id]);

  const activeObjects = useMemo(() => {
    if (!activeScene) return [];
    return objects
      .filter(o => o.global || o.scene_ids?.includes(activeScene.id))
      .map(o => {
        // シーンの background_url / foreground_url をオブジェクトに反映
        if (o.type === 'background' && activeScene.background_url !== undefined) {
          return { ...o, image_url: activeScene.background_url };
        }
        if (o.type === 'foreground' && activeScene.foreground_url !== undefined) {
          return { ...o, image_url: activeScene.foreground_url };
        }
        return o;
      });
  }, [objects, activeScene]);

  const layerOrderedCharacters = useMemo(
    () => [...characters].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [characters]
  );

  // --- Mutations: Scene ---

  const addScene = useCallback(
    async (data: Partial<Scene>, duplicateFromId?: string, allObjsForDup?: BoardObject[]) => {
      const id = crypto.randomUUID();
      const now = Date.now();
      const newScene: Scene = {
        id,
        room_id: 'demo-room-001',
        name: data.name ?? '新しいシーン',
        background_url: data.background_url ?? null,
        foreground_url: data.foreground_url ?? null,
        foreground_opacity: data.foreground_opacity ?? 1,
        bg_blur: data.bg_blur ?? true,
        bg_transition: data.bg_transition ?? 'none',
        bg_transition_duration: data.bg_transition_duration ?? 500,
        fg_transition: data.fg_transition ?? 'none',
        fg_transition_duration: data.fg_transition_duration ?? 500,
        sort_order: data.sort_order ?? scenes.length,
        created_at: now,
        updated_at: now,
      };
      setScenes(prev => [...prev, newScene]);

      // 背景・前景オブジェクトを自動生成（本番と同じ動作）
      const createdObjects: BoardObject[] = [];
      if (duplicateFromId && allObjsForDup) {
        const sourceObjects = allObjsForDup.filter(
          (o) => !o.global && o.scene_ids.includes(duplicateFromId)
        );
        for (const obj of sourceObjects) {
          createdObjects.push({
            ...obj,
            id: crypto.randomUUID(),
            room_id: 'demo-room-001',
            scene_ids: [id],
            created_at: now,
            updated_at: now,
          });
        }
      } else {
        createdObjects.push({
          id: crypto.randomUUID(), room_id: 'demo-room-001', type: 'background', name: '背景',
          global: false, scene_ids: [id],
          x: -50, y: -50, width: 100, height: 100,
          visible: true, opacity: 1, sort_order: 0, locked: true,
          position_locked: false, size_locked: false,
          image_url: null, image_asset_id: null, background_color: '#333333', image_fit: 'cover',
          text_content: null, font_size: 16, font_family: 'sans-serif',
          letter_spacing: 0, line_height: 1.2, auto_size: true,
          text_align: 'left', text_vertical_align: 'top', text_color: '#ffffff',
          scale_x: 1, scale_y: 1, created_at: now, updated_at: now,
        } as BoardObject);
        createdObjects.push({
          id: crypto.randomUUID(), room_id: 'demo-room-001', type: 'foreground', name: '前景',
          global: false, scene_ids: [id],
          x: -24, y: -14, width: 48, height: 27,
          visible: true, opacity: 1, sort_order: 100, locked: false,
          position_locked: false, size_locked: false,
          image_url: null, image_asset_id: null, background_color: '#666666', image_fit: 'cover',
          text_content: null, font_size: 16, font_family: 'sans-serif',
          letter_spacing: 0, line_height: 1.2, auto_size: true,
          text_align: 'left', text_vertical_align: 'top', text_color: '#ffffff',
          scale_x: 1, scale_y: 1, created_at: now, updated_at: now,
        } as BoardObject);
      }
      if (createdObjects.length > 0) {
        setObjects(prev => [...prev, ...createdObjects]);
      }
      return { scene: newScene, objects: createdObjects };
    },
    [scenes.length]
  );

  const updateScene = useCallback(async (id: string, data: Partial<Scene>) => {
    setScenes(prev => prev.map(s => (s.id === id ? { ...s, ...data, updated_at: Date.now() } : s)));
  }, []);

  const removeScene = useCallback(async (id: string) => {
    setScenes(prev => prev.filter(s => s.id !== id));
  }, []);

  const reorderScenes = useCallback(async (orderedIds: string[]) => {
    setScenes(prev => {
      const map = new Map(prev.map(s => [s.id, s]));
      return orderedIds
        .map((id, i) => {
          const s = map.get(id);
          return s ? { ...s, sort_order: i } : null;
        })
        .filter(Boolean) as Scene[];
    });
  }, []);

  const activateScene = useCallback(async (sceneId: string | null) => {
    setRoom(prev => ({ ...prev, active_scene_id: sceneId ?? prev.active_scene_id }));
  }, []);

  // --- Mutations: Object ---

  const addObject = useCallback(
    async (data: Partial<BoardObject>) => {
      const id = crypto.randomUUID();
      const newObj: BoardObject = {
        id,
        room_id: 'demo-room-001',
        type: data.type ?? 'panel',
        name: data.name ?? '新規オブジェクト',
        image_url: data.image_url ?? null,
        image_asset_id: data.image_asset_id ?? null,
        background_color: data.background_color ?? '#ffffff',
        image_fit: data.image_fit ?? 'cover',
        x: data.x ?? 0,
        y: data.y ?? 0,
        width: data.width ?? 4,
        height: data.height ?? 4,
        sort_order: data.sort_order ?? objects.length,
        visible: data.visible ?? true,
        opacity: data.opacity ?? 1,
        locked: data.locked ?? false,
        position_locked: data.position_locked ?? false,
        size_locked: data.size_locked ?? false,
        global: data.global ?? false,
        scene_ids: data.scene_ids ?? (activeScene ? [activeScene.id] : []),
        text_content: data.text_content ?? null,
        font_size: data.font_size ?? 16,
        font_family: data.font_family ?? 'sans-serif',
        letter_spacing: data.letter_spacing ?? 0,
        line_height: data.line_height ?? 1.5,
        auto_size: data.auto_size ?? false,
        text_align: data.text_align ?? 'left',
        text_vertical_align: data.text_vertical_align ?? 'top',
        text_color: data.text_color ?? '#000000',
        scale_x: data.scale_x ?? 1,
        scale_y: data.scale_y ?? 1,
        memo: data.memo,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      setObjects(prev => [...prev, newObj]);
      return id;
    },
    [objects.length, activeScene]
  );

  const updateObject = useCallback(async (id: string, data: Partial<BoardObject>) => {
    setObjects(prev => prev.map(o => (o.id === id ? { ...o, ...data, updated_at: Date.now() } : o)));
  }, []);

  const moveObject = useCallback(async (id: string, data: Partial<BoardObject>) => {
    setObjects(prev => prev.map(o => (o.id === id ? { ...o, ...data, updated_at: Date.now() } : o)));
  }, []);

  const removeObject = useCallback(async (id: string) => {
    setObjects(prev => prev.filter(o => o.id !== id));
  }, []);

  const reorderObjects = useCallback(async (orderedIds: string[]) => {
    setObjects(prev => {
      const map = new Map(prev.map(o => [o.id, o]));
      const reordered = orderedIds
        .map((id, i) => {
          const o = map.get(id);
          return o ? { ...o, sort_order: i } : null;
        })
        .filter(Boolean) as BoardObject[];
      const remaining = prev.filter(o => !orderedIds.includes(o.id));
      return [...reordered, ...remaining];
    });
  }, []);

  const batchUpdateSort = useCallback(async (updates: { id: string; sort: number }[]) => {
    setObjects(prev => {
      const updateMap = new Map(updates.map(u => [u.id, u.sort]));
      return prev.map(o => {
        const newSort = updateMap.get(o.id);
        return newSort !== undefined ? { ...o, sort_order: newSort } : o;
      });
    });
  }, []);

  const injectOptimistic = useCallback((_objects: BoardObject[]) => {}, []);

  // --- Mutations: Character ---

  const addCharacter = useCallback(
    async (data: Partial<Character>) => {
      const id = crypto.randomUUID();
      const newChar: Character = {
        id,
        room_id: 'demo-room-001',
        owner_id: 'demo-user',
        name: data.name ?? '新規キャラクター',
        images: data.images ?? [],
        active_image_index: data.active_image_index ?? 0,
        color: data.color ?? '#888888',
        statuses: data.statuses ?? [],
        parameters: data.parameters ?? [],
        memo: data.memo ?? '',
        secret_memo: data.secret_memo ?? '',
        chat_palette: data.chat_palette ?? '',
        sheet_url: data.sheet_url ?? null,
        initiative: data.initiative ?? 0,
        size: data.size ?? 5,
        is_status_private: data.is_status_private ?? false,
        is_hidden_on_board: data.is_hidden_on_board ?? false,
        is_speech_hidden: data.is_speech_hidden ?? false,
        board_x: data.board_x ?? 0,
        board_y: data.board_y ?? 5,
        board_visible: data.board_visible ?? true,
        sort_order: data.sort_order ?? characters.length,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      setCharacters(prev => [...prev, newChar]);
      return id;
    },
    [characters.length]
  );

  const updateCharacter = useCallback(async (id: string, data: Partial<Character>) => {
    setCharacters(prev => prev.map(c => (c.id === id ? { ...c, ...data, updated_at: Date.now() } : c)));
  }, []);

  const moveCharacter = useCallback(async (id: string, data: { board_x?: number; board_y?: number }) => {
    setCharacters(prev => prev.map(c => (c.id === id ? { ...c, ...data, updated_at: Date.now() } : c)));
  }, []);

  const removeCharacter = useCallback(async (id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
  }, []);

  const reorderCharacters = useCallback(async (orderedIds: string[]) => {
    setCharacters(prev => {
      const map = new Map(prev.map(c => [c.id, c]));
      return orderedIds
        .map((id, i) => {
          const c = map.get(id);
          return c ? { ...c, sort_order: i } : null;
        })
        .filter(Boolean) as Character[];
    });
  }, []);

  const reorderLayerCharacters = useCallback(async (orderedIds: string[]) => {
    setCharacters(prev => {
      const map = new Map(prev.map(c => [c.id, c]));
      return orderedIds
        .map((id, i) => {
          const c = map.get(id);
          return c ? { ...c, sort_order: i } : null;
        })
        .filter(Boolean) as Character[];
    });
  }, []);

  // --- Mutations: BGM ---

  const addBgm = useCallback(
    async (data: Partial<Omit<BgmTrack, 'id'>>) => {
      const id = crypto.randomUUID();
      const newBgm: BgmTrack = {
        id,
        name: data.name ?? '新規BGM',
        bgm_type: data.bgm_type ?? 'url',
        bgm_source: data.bgm_source ?? '',
        bgm_volume: data.bgm_volume ?? 0.5,
        bgm_loop: data.bgm_loop ?? true,
        is_playing: false,
        is_paused: false,
        scene_ids: data.scene_ids ?? [],
        auto_play_scene_ids: data.auto_play_scene_ids ?? [],
        fade_in: data.fade_in ?? false,
        fade_out: data.fade_out ?? false,
        fade_duration: data.fade_duration ?? 500,
        sort_order: data.sort_order ?? bgms.length,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      setBgms(prev => [...prev, newBgm]);
      return id;
    },
    [bgms.length]
  );

  const updateBgm = useCallback(async (id: string, data: Partial<BgmTrack>) => {
    setBgms(prev => prev.map(b => (b.id === id ? { ...b, ...data, updated_at: Date.now() } : b)));
  }, []);

  const removeBgm = useCallback(async (id: string) => {
    setBgms(prev => prev.filter(b => b.id !== id));
  }, []);

  const reorderBgms = useCallback(async (orderedIds: string[]) => {
    setBgms(prev => {
      const map = new Map(prev.map(b => [b.id, b]));
      return orderedIds
        .map((id, i) => {
          const b = map.get(id);
          return b ? { ...b, sort_order: i } : null;
        })
        .filter(Boolean) as BgmTrack[];
    });
  }, []);

  // --- Mutations: Cutin ---

  const addCutin = useCallback(async (data: Partial<Cutin>) => {
    const id = crypto.randomUUID();
    const newCutin: Cutin = {
      id,
      room_id: 'demo-room-001',
      name: data.name ?? '新規カットイン',
      image_url: data.image_url ?? null,
      text: data.text ?? '',
      animation: data.animation ?? 'fade',
      duration: data.duration ?? 3000,
      text_color: data.text_color ?? '#ffffff',
      background_color: data.background_color ?? '#000000',
      sort_order: data.sort_order ?? cutins.length,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    setCutins(prev => [...prev, newCutin]);
    return id;
  }, [cutins.length]);

  const updateCutin = useCallback(async (id: string, data: Partial<Cutin>) => {
    setCutins(prev => prev.map(c => (c.id === id ? { ...c, ...data, updated_at: Date.now() } : c)));
  }, []);

  const removeCutin = useCallback(async (id: string) => {
    setCutins(prev => prev.filter(c => c.id !== id));
  }, []);

  const reorderCutins = useCallback(async (orderedIds: string[]) => {
    setCutins(prev => {
      const map = new Map(prev.map(c => [c.id, c]));
      return orderedIds
        .map((id, i) => {
          const c = map.get(id);
          return c ? { ...c, sort_order: i } : null;
        })
        .filter(Boolean) as Cutin[];
    });
  }, []);

  const triggerCutin = useCallback(async (_id: string) => {}, []);

  const clearCutin = useCallback(() => {}, []);

  // --- Mutations: Message ---

  const sendMessage = useCallback(
    async (data: {
      content: string;
      character_id?: string;
      channel?: string;
      message_type?: ChatMessage['message_type'];
    }) => {
      const char = data.character_id ? characters.find(c => c.id === data.character_id) : null;
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        room_id: 'demo-room-001',
        sender_name: char?.name ?? 'デモユーザー',
        sender_uid: 'demo-user',
        sender_avatar: char?.images[char.active_image_index]?.url ?? null,
        content: data.content,
        channel: data.channel ?? 'main',
        message_type: data.message_type ?? (char ? 'chat' : 'chat'),
        created_at: Date.now(),
      };
      setMessages(prev => [...prev, msg]);
    },
    [characters]
  );

  const loadMore = useCallback(async () => {}, []);

  const clearMessages = useCallback(async () => {
    setMessages([]);
  }, []);

  // --- Mutations: ScenarioText ---

  const addScenarioText = useCallback(async (data: Partial<ScenarioText>) => {
    const id = crypto.randomUUID();
    const newText: ScenarioText = {
      id,
      room_id: 'demo-room-001',
      title: data.title ?? '新規シナリオテキスト',
      content: data.content ?? '',
      visible: data.visible ?? true,
      sort_order: data.sort_order ?? scenarioTexts.length,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    setScenarioTexts(prev => [...prev, newText]);
    return id;
  }, [scenarioTexts.length]);

  const updateScenarioText = useCallback(async (id: string, data: Partial<ScenarioText>) => {
    setScenarioTexts(prev => prev.map(t => (t.id === id ? { ...t, ...data, updated_at: Date.now() } : t)));
  }, []);

  const removeScenarioText = useCallback(async (id: string) => {
    setScenarioTexts(prev => prev.filter(t => t.id !== id));
  }, []);

  const reorderScenarioTexts = useCallback(async (orderedIds: string[]) => {
    setScenarioTexts(prev => {
      const map = new Map(prev.map(t => [t.id, t]));
      return orderedIds
        .map((id, i) => {
          const t = map.get(id);
          return t ? { ...t, sort_order: i } : null;
        })
        .filter(Boolean) as ScenarioText[];
    });
  }, []);

  // --- Mutations: Piece ---

  const addPiece = useCallback(async (data: Partial<Piece>) => {
    const id = crypto.randomUUID();
    const newPiece: Piece = {
      id,
      room_id: 'demo-room-001',
      x: data.x ?? 0,
      y: data.y ?? 0,
      width: data.width ?? 5,
      height: data.height ?? 5,
      image_url: data.image_url ?? null,
      label: data.label ?? 'ピース',
      color: data.color ?? '#888888',
      z_index: data.z_index ?? 0,
      statuses: data.statuses ?? [],
      initiative: data.initiative ?? 0,
      memo: data.memo ?? '',
      character_id: data.character_id ?? null,
      created_at: Date.now(),
    };
    setPieces(prev => [...prev, newPiece]);
    return id;
  }, []);

  const removePiece = useCallback(async (id: string) => {
    setPieces(prev => prev.filter(p => p.id !== id));
  }, []);

  const updatePiece = useCallback(async (id: string, data: Partial<Piece>) => {
    setPieces(prev => prev.map(p => (p.id === id ? { ...p, ...data } : p)));
  }, []);

  const movePiece = useCallback(async (id: string, x: number, y: number) => {
    setPieces(prev => prev.map(p => (p.id === id ? { ...p, x, y } : p)));
  }, []);

  // --- Mutations: Room ---

  const updateRoom = useCallback(async (data: Partial<Room>) => {
    setRoom(prev => ({ ...prev, ...data, updated_at: Date.now() }));
  }, []);

  const deleteRoom = useCallback(async () => {}, []);

  // --- UI State ---

  const setPendingEdit = useCallback((_key: string, _edit: any) => {}, []);


  // --- Return ---

  return {
    // State
    room,
    scenes,
    allObjects: objects,
    activeObjects,
    activeScene,
    characters,
    layerOrderedCharacters,
    bgms,
    cutins,
    scenarioTexts,
    messages,
    pieces,

    // Mutations: Scene
    addScene,
    updateScene,
    removeScene,
    reorderScenes,
    activateScene,

    // Mutations: Object
    addObject,
    updateObject,
    moveObject,
    removeObject,
    reorderObjects,
    batchUpdateSort,
    injectOptimistic,

    // Mutations: Character
    addCharacter,
    updateCharacter,
    moveCharacter,
    removeCharacter,
    reorderCharacters,
    reorderLayerCharacters,

    // Mutations: BGM
    addBgm,
    updateBgm,
    removeBgm,
    reorderBgms,

    // Mutations: Cutin
    addCutin,
    updateCutin,
    removeCutin,
    reorderCutins,
    triggerCutin,
    clearCutin,

    // Mutations: Message
    sendMessage,
    loadMore,
    clearMessages,

    // Mutations: ScenarioText
    addScenarioText,
    updateScenarioText,
    removeScenarioText,
    reorderScenarioTexts,

    // Mutations: Piece
    addPiece,
    removePiece,
    updatePiece,
    movePiece,

    // Mutations: Room
    updateRoom,
    deleteRoom,

    // UI
    setPendingEdit,
  };
}
