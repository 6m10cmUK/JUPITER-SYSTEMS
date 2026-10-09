import { jpNfkc } from './jpNfkc';
/** しおりの照合キー。pdfjs に依存しない（段落組みが使う）。 */

/** PDF のしおり 1 項目（平坦化済み） */
export interface OutlineEntry {
  title: string;
  /** 深さ（1 始まり） */
  level: number;
  /** 1 始まりのページ番号 */
  page: number;
}

/** 空白を除き jpNfkc 化したタイトル。しおりと本文の一致判定に使う */
export const normalizeKey = (s: string): string => jpNfkc(s).replace(/\s+/g, '');

/** 「ページ番号＋正規化したタイトル」の照合キー */
export function outlineKeyOf(page: number, title: string): string {
  return `${page}:${normalizeKey(title)}`;
}

/** しおりから、段落組みで使う照合キーの集合を作る */
export function outlineKeySet(entries: OutlineEntry[]): Set<string> {
  return new Set(entries.filter((e) => normalizeKey(e.title)).map((e) => outlineKeyOf(e.page, e.title)));
}
