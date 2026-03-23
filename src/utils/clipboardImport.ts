import type { Character, BoardObject, Scene, BgmTrack } from '../types/adrastea.types';

export type ClipboardParseResult =
  | { type: 'character'; data: Partial<Character> }
  | { type: 'object'; data: Partial<BoardObject> }
  | { type: 'scene'; data: { scene: Partial<Scene>; objects: Partial<BoardObject>[]; bgms: Partial<BgmTrack>[] } }
  | { type: 'bgm'; data: Partial<BgmTrack> }
  | { type: 'unknown'; kind: string }
  | null;

/**
 * クリップボードテキストを解析し、Adrastea のデータ型に変換する
 */
export function parseClipboardData(text: string): ClipboardParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    // JSON ですらない
    return null;
  }

  // parsed が object ではない、または null の場合
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const obj = parsed as Record<string, unknown>;

  // kind プロパティがない場合
  if (!('kind' in obj)) {
    return null;
  }

  const kind = obj.kind;

  // kind が character の場合
  if (kind === 'character') {
    const data = parseCharacterData(obj.data);
    return { type: 'character', data };
  }

  // kind が object の場合
  if (kind === 'object') {
    const data = parseObjectData(obj.data);
    return { type: 'object', data };
  }

  // kind が scene の場合
  if (kind === 'scene') {
    const sceneData = parseSceneData(obj.data);
    return { type: 'scene', data: sceneData };
  }

  // kind が bgm の場合
  if (kind === 'bgm') {
    const data = parseBgmData(obj.data);
    return { type: 'bgm', data };
  }

  // kind が存在するが 'character' 以外の場合
  if (typeof kind === 'string') {
    return { type: 'unknown', kind };
  }

  return null;
}

/**
 * character データをパースする。
 * Adrastea ネイティブフィールドがあればそのまま採用し、
 * なければ iachara 互換フィールドからフォールバック変換する。
 */
function parseCharacterData(raw: unknown): Partial<Character> {
  if (typeof raw !== 'object' || raw === null) {
    return {};
  }

  const obj = raw as Record<string, unknown>;
  const result: Partial<Character> = {};

  // --- Adrastea ネイティブフィールド（あればそのまま採用） ---
  if (typeof obj.name === 'string') result.name = obj.name;
  if (typeof obj.color === 'string') result.color = obj.color;
  else result.color = '#555555';
  if (Array.isArray(obj.images)) result.images = obj.images as Character['images'];
  if (typeof obj.active_image_index === 'number') result.active_image_index = obj.active_image_index;
  if (typeof obj.sheet_url === 'string' || obj.sheet_url === null) result.sheet_url = obj.sheet_url as string | null;
  if (typeof obj.initiative === 'number') result.initiative = obj.initiative;
  if (typeof obj.size === 'number') result.size = obj.size;
  if (Array.isArray(obj.statuses)) result.statuses = obj.statuses as Character['statuses'];
  if (Array.isArray(obj.parameters)) result.parameters = obj.parameters as Character['parameters'];
  if (typeof obj.memo === 'string') result.memo = obj.memo;
  if (typeof obj.secret_memo === 'string') result.secret_memo = obj.secret_memo;
  if (typeof obj.chat_palette === 'string') result.chat_palette = obj.chat_palette;
  if (typeof obj.is_status_private === 'boolean') result.is_status_private = obj.is_status_private;
  if (typeof obj.is_hidden_on_board === 'boolean') result.is_hidden_on_board = obj.is_hidden_on_board;
  if (typeof obj.is_speech_hidden === 'boolean') result.is_speech_hidden = obj.is_speech_hidden;
  if (typeof obj.board_x === 'number') result.board_x = obj.board_x;
  if (typeof obj.board_y === 'number') result.board_y = obj.board_y;
  if (typeof obj.board_visible === 'boolean') result.board_visible = obj.board_visible;

  // --- iachara 互換フォールバック ---
  if (!result.images && typeof obj.iconUrl === 'string' && obj.iconUrl) {
    result.images = [{ url: obj.iconUrl, label: 'メイン' }];
    result.active_image_index = 0;
  }
  if (result.sheet_url === undefined && (typeof obj.externalUrl === 'string' || obj.externalUrl === null)) {
    result.sheet_url = obj.externalUrl as string | null;
  }
  if (result.initiative === undefined && obj.initiative !== undefined) {
    result.initiative = Number(obj.initiative) || 0;
  }
  if (!result.statuses && Array.isArray(obj.status)) {
    result.statuses = obj.status.map((s: unknown) => {
      if (typeof s !== 'object' || s === null) return { label: '', value: 0, max: 0 };
      const so = s as Record<string, unknown>;
      return { label: typeof so.label === 'string' ? so.label : '', value: Number(so.value) || 0, max: Number(so.max) || 0 };
    });
  }
  if (!result.parameters && Array.isArray(obj.params)) {
    result.parameters = obj.params.map((p: unknown) => {
      if (typeof p !== 'object' || p === null) return { label: '', value: '' };
      const po = p as Record<string, unknown>;
      return { label: typeof po.label === 'string' ? po.label : '', value: typeof po.value === 'string' ? po.value : '' };
    });
  }
  if (!result.chat_palette && typeof obj.commands === 'string') {
    result.chat_palette = obj.commands;
  }

  return result;
}

/**
 * object データをパースする。
 */
function parseObjectData(raw: unknown): Partial<BoardObject> {
  if (typeof raw !== 'object' || raw === null) {
    return {};
  }

  const obj = raw as Record<string, unknown>;
  const result: Partial<BoardObject> = {};

  if (typeof obj.type === 'string') result.type = obj.type as BoardObject['type'];
  if (typeof obj.name === 'string') result.name = obj.name;
  // global / scene_ids は含めない（貼り付け先のシーンに属させるため）
  if (typeof obj.x === 'number') result.x = obj.x;
  if (typeof obj.y === 'number') result.y = obj.y;
  if (typeof obj.width === 'number') result.width = obj.width;
  if (typeof obj.height === 'number') result.height = obj.height;
  if (typeof obj.sort_order === 'number') result.sort_order = obj.sort_order;
  if (typeof obj.visible === 'boolean') result.visible = obj.visible;
  if (typeof obj.opacity === 'number') result.opacity = obj.opacity;
  if (typeof obj.locked === 'boolean') result.locked = obj.locked;
  if (typeof obj.position_locked === 'boolean') result.position_locked = obj.position_locked;
  if (typeof obj.size_locked === 'boolean') result.size_locked = obj.size_locked;
  if (typeof obj.image_url === 'string' || obj.image_url === null) result.image_url = obj.image_url as string | null;
  if (typeof obj.image_asset_id === 'string' || obj.image_asset_id === null) result.image_asset_id = obj.image_asset_id as string | null;
  if (typeof obj.background_color === 'string') result.background_color = obj.background_color;
  if (typeof obj.image_fit === 'string') result.image_fit = obj.image_fit as BoardObject['image_fit'];
  if (typeof obj.text_content === 'string' || obj.text_content === null) result.text_content = obj.text_content as string | null;
  if (typeof obj.font_size === 'number') result.font_size = obj.font_size;
  if (typeof obj.font_family === 'string') result.font_family = obj.font_family;
  if (typeof obj.letter_spacing === 'number') result.letter_spacing = obj.letter_spacing;
  if (typeof obj.line_height === 'number') result.line_height = obj.line_height;
  if (typeof obj.auto_size === 'boolean') result.auto_size = obj.auto_size;
  if (typeof obj.text_align === 'string') result.text_align = obj.text_align as BoardObject['text_align'];
  if (typeof obj.text_vertical_align === 'string') result.text_vertical_align = obj.text_vertical_align as BoardObject['text_vertical_align'];
  if (typeof obj.text_color === 'string') result.text_color = obj.text_color;
  if (typeof obj.scale_x === 'number') result.scale_x = obj.scale_x;
  if (typeof obj.scale_y === 'number') result.scale_y = obj.scale_y;
  if (typeof obj.memo === 'string') result.memo = obj.memo;

  return result;
}

/**
 * Character をクリップボード JSON 文字列に変換する。
 * Adrastea ネイティブフィールドをすべて含み、iachara 互換フィールドも付与する。
 */
export function characterToClipboardJson(char: Character): string {
  const { id, _id, _creationTime, room_id, owner_id, created_at, updated_at, sort_order, ...rest } = char as any;
  const data: Record<string, unknown> = { ...rest };
  // iachara 互換フィールド
  data.iconUrl = char.images?.[char.active_image_index ?? 0]?.url ?? null;
  data.externalUrl = char.sheet_url ?? null;
  if (char.statuses && char.statuses.length > 0) {
    data.status = char.statuses.map(s => ({ label: s.label, value: s.value, max: s.max }));
  }
  if (char.parameters && char.parameters.length > 0) {
    data.params = char.parameters.map(p => ({ label: p.label, value: p.value }));
  }
  if (char.chat_palette) {
    data.commands = char.chat_palette;
  }
  return JSON.stringify({ kind: 'character', data });
}

/**
 * BoardObject をクリップボード JSON 文字列に変換する。
 */
function objectToData(obj: BoardObject): Record<string, unknown> {
  const data: Record<string, unknown> = {
    type: obj.type, name: obj.name,
    x: obj.x, y: obj.y, width: obj.width, height: obj.height,
    visible: obj.visible, opacity: obj.opacity, sort_order: obj.sort_order,
    locked: obj.locked, position_locked: obj.position_locked, size_locked: obj.size_locked,
  };
  if (obj.memo) data.memo = obj.memo;
  if (obj.type === 'text') {
    Object.assign(data, {
      text_content: obj.text_content, font_size: obj.font_size, font_family: obj.font_family,
      letter_spacing: obj.letter_spacing, line_height: obj.line_height, auto_size: obj.auto_size,
      text_align: obj.text_align, text_vertical_align: obj.text_vertical_align, text_color: obj.text_color,
      background_color: obj.background_color,
    });
  } else {
    Object.assign(data, {
      image_url: obj.image_url, image_asset_id: obj.image_asset_id,
      background_color: obj.background_color, image_fit: obj.image_fit,
      scale_x: obj.scale_x, scale_y: obj.scale_y,
    });
  }
  return data;
}

export function objectToClipboardJson(obj: BoardObject): string {
  return JSON.stringify({ kind: 'object', data: objectToData(obj) });
}

/**
 * scene データをパースする。
 */
function parseSceneData(raw: unknown): { scene: Partial<Scene>; objects: Partial<BoardObject>[]; bgms: Partial<BgmTrack>[] } {
  if (typeof raw !== 'object' || raw === null) return { scene: {}, objects: [], bgms: [] };
  const obj = raw as Record<string, unknown>;
  const scene: Partial<Scene> = {};
  if (typeof obj.name === 'string') scene.name = obj.name;
  if (typeof obj.background_url === 'string' || obj.background_url === null) scene.background_url = obj.background_url as string | null;
  if (typeof obj.foreground_url === 'string' || obj.foreground_url === null) scene.foreground_url = obj.foreground_url as string | null;
  if (typeof obj.foreground_opacity === 'number') scene.foreground_opacity = obj.foreground_opacity;
  if (typeof obj.bg_transition === 'string') scene.bg_transition = obj.bg_transition as Scene['bg_transition'];
  if (typeof obj.bg_transition_duration === 'number') scene.bg_transition_duration = obj.bg_transition_duration;
  if (typeof obj.fg_transition === 'string') scene.fg_transition = obj.fg_transition as Scene['fg_transition'];
  if (typeof obj.fg_transition_duration === 'number') scene.fg_transition_duration = obj.fg_transition_duration;
  if (typeof obj.bg_blur === 'boolean') scene.bg_blur = obj.bg_blur;

  const objects: Partial<BoardObject>[] = [];
  if (Array.isArray(obj.objects)) {
    for (const o of obj.objects) {
      if (typeof o === 'object' && o !== null) objects.push(parseObjectData(o));
    }
  }
  const bgms: Partial<BgmTrack>[] = [];
  if (Array.isArray(obj.bgms)) {
    for (const b of obj.bgms) {
      if (typeof b === 'object' && b !== null) bgms.push(parseBgmData(b));
    }
  }
  return { scene, objects, bgms };
}

function parseBgmData(raw: unknown): Partial<BgmTrack> {
  if (typeof raw !== 'object' || raw === null) return {};
  const obj = raw as Record<string, unknown>;
  const result: Partial<BgmTrack> = {};
  if (typeof obj.name === 'string') result.name = obj.name;
  if (typeof obj.bgm_type === 'string') result.bgm_type = obj.bgm_type as BgmTrack['bgm_type'];
  if (typeof obj.bgm_source === 'string' || obj.bgm_source === null) result.bgm_source = obj.bgm_source as string | null;
  if (typeof obj.bgm_volume === 'number') result.bgm_volume = obj.bgm_volume;
  if (typeof obj.bgm_loop === 'boolean') result.bgm_loop = obj.bgm_loop;
  if (typeof obj.fade_in === 'boolean') result.fade_in = obj.fade_in;
  if (typeof obj.fade_out === 'boolean') result.fade_out = obj.fade_out;
  if (typeof obj.fade_duration === 'number') result.fade_duration = obj.fade_duration;
  return result;
}

/**
 * BgmTrack をクリップボード JSON 文字列に変換する。
 * scene_ids, auto_play_scene_ids, is_playing, is_paused 等の再生状態は含めない。
 */
export function bgmToClipboardJson(bgm: BgmTrack): string {
  const { id, _id, _creationTime, room_id, created_at, updated_at, scene_ids, auto_play_scene_ids, is_playing, is_paused, sort_order, ...rest } = bgm as any;
  return JSON.stringify({ kind: 'bgm', data: rest });
}

/**
 * Scene とそのシーンに属するオブジェクト群をクリップボード JSON に変換する。
 */
export function sceneToClipboardJson(scene: Scene, sceneObjects: BoardObject[], sceneBgms: BgmTrack[] = []): string {
  const { id, _id, _creationTime, room_id, created_at, updated_at, sort_order, ...sceneRest } = scene as any;
  const objs = sceneObjects
    .filter(o => o.type !== 'characters_layer')
    .map(o => objectToData(o));
  const bgms = sceneBgms.map(b => {
    const { id: _bid, _id: _bid2, _creationTime: _bct, scene_ids, auto_play_scene_ids, is_playing, is_paused, sort_order: _bso, created_at: _bca, updated_at: _bua, ...rest } = b as any;
    return rest;
  });
  return JSON.stringify({ kind: 'scene', data: { ...sceneRest, objects: objs, bgms } });
}

/**
 * BGM をシーンにペーストする共通処理。
 * 同じソースの既存トラックがあれば scene_ids に追加、なければ新規作成。
 */
export async function pasteBgmToScene(
  data: Partial<BgmTrack>,
  sceneId: string | null,
  ctx: {
    bgms: BgmTrack[];
    updateBgm: (id: string, data: Partial<BgmTrack>) => Promise<void>;
    addBgm: (data: Partial<BgmTrack>) => Promise<any>;
  },
): Promise<void> {
  if (!sceneId) return; // シーンがなければ何もしない
  const existing = ctx.bgms.find(b => b.bgm_source === data.bgm_source && b.bgm_type === data.bgm_type);
  if (existing) {
    await ctx.updateBgm(existing.id, {
      scene_ids: existing.scene_ids.includes(sceneId) ? existing.scene_ids : [...existing.scene_ids, sceneId],
      auto_play_scene_ids: existing.auto_play_scene_ids.includes(sceneId) ? existing.auto_play_scene_ids : [...existing.auto_play_scene_ids, sceneId],
    });
  } else {
    await ctx.addBgm({ ...data, scene_ids: [sceneId], auto_play_scene_ids: [sceneId] });
  }
}

/**
 * クリップボードからシーンをペーストする共通処理。
 */
export async function pasteSceneFromClipboard(
  data: { scene: Partial<Scene>; objects: Partial<BoardObject>[]; bgms: Partial<BgmTrack>[] },
  ctx: {
    addScene: (data: Partial<any>, dup?: string, objs?: BoardObject[]) => Promise<{ scene: { id: string } } | null>;
    addObject: (data: Partial<BoardObject>) => Promise<string>;
    bgms: BgmTrack[];
    updateBgm: (id: string, data: Partial<BgmTrack>) => Promise<void>;
    addBgm: (data: Partial<BgmTrack>) => Promise<any>;
    activateScene: (id: string | null) => void | Promise<void>;
  },
): Promise<void> {
  const { scene, objects, bgms } = data;
  const result = await ctx.addScene({
    name: scene.name ? `${scene.name} (コピー)` : '新規シーン',
    background_url: scene.background_url ?? null,
    foreground_url: scene.foreground_url ?? null,
    foreground_opacity: scene.foreground_opacity,
    bg_transition: scene.bg_transition,
    bg_transition_duration: scene.bg_transition_duration,
    fg_transition: scene.fg_transition,
    fg_transition_duration: scene.fg_transition_duration,
    bg_blur: scene.bg_blur,
  }, '_paste_', []);
  if (!result) return;
  const newSceneId = result.scene.id;
  const sorted = [...objects].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  await Promise.all(sorted.map(obj => ctx.addObject({ ...obj, scene_ids: [newSceneId] })));
  await Promise.all(bgms.map(bgm => pasteBgmToScene(bgm, newSceneId, ctx)));
  await ctx.activateScene(newSceneId);
}
