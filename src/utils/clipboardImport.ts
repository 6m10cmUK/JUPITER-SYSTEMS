import type { Character } from '../types/adrastea.types';

export type ClipboardParseResult =
  | { type: 'character'; data: Partial<Character> }
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
    const data = parseIacharaCharacter(obj.data);
    return { type: 'character', data };
  }

  // kind が存在するが 'character' 以外の場合
  if (typeof kind === 'string') {
    return { type: 'unknown', kind };
  }

  return null;
}

/**
 * iachara 形式のキャラクターデータを Adrastea Character に変換する
 */
function parseIacharaCharacter(raw: unknown): Partial<Character> {
  if (typeof raw !== 'object' || raw === null) {
    return {};
  }

  const obj = raw as Record<string, unknown>;
  const result: Partial<Character> = {};

  // name
  if (typeof obj.name === 'string') {
    result.name = obj.name;
  }

  // images (iconUrl から)
  if (typeof obj.iconUrl === 'string' && obj.iconUrl) {
    result.images = [{ url: obj.iconUrl, label: 'メイン' }];
    result.active_image_index = 0;
  }

  // sheet_url (externalUrl から)
  if (typeof obj.externalUrl === 'string' || obj.externalUrl === null) {
    result.sheet_url = obj.externalUrl;
  }

  // initiative
  if (obj.initiative !== undefined) {
    result.initiative = Number(obj.initiative) || 0;
  }

  // color
  if (typeof obj.color === 'string') {
    result.color = obj.color;
  } else {
    result.color = '#555555';
  }

  // statuses
  if (Array.isArray(obj.status)) {
    result.statuses = obj.status.map((s: unknown) => {
      if (typeof s !== 'object' || s === null) {
        return { label: '', value: 0, max: 0 };
      }
      const statusObj = s as Record<string, unknown>;
      return {
        label: typeof statusObj.label === 'string' ? statusObj.label : '',
        value: Number(statusObj.value) || 0,
        max: Number(statusObj.max) || 0,
      };
    });
  }

  // parameters
  if (Array.isArray(obj.params)) {
    result.parameters = obj.params.map((p: unknown) => {
      if (typeof p !== 'object' || p === null) {
        return { label: '', value: '' };
      }
      const paramObj = p as Record<string, unknown>;
      return {
        label: typeof paramObj.label === 'string' ? paramObj.label : '',
        value: typeof paramObj.value === 'string' ? paramObj.value : '',
      };
    });
  }

  // chat_palette (commands から)
  if (typeof obj.commands === 'string') {
    result.chat_palette = obj.commands;
  }

  return result;
}
