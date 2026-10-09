import { normalizeText } from './normalize';
import { median, quantile } from './stats';
import type { Line, PageData } from './types';

const BAND = 0.08;
/** 単独の数字行（ノンブル）は版面外側に寄せて置かれがちなので少し広く見る */
const NOMBRE_BAND = 0.12;
const PAGE_RATIO = 0.3;
const NOMBRE_RE = /^[\s\-–—―‐・.[\]()（）［］【】〈〉<>]*[0-9]{1,4}[\s\-–—―‐・.[\]()（）［］【】〈〉<>]*$/;

/** 正規化して空白を除いた文字数（サロゲートペアは 1 文字） */
function compactLength(text: string): number {
  return [...normalizeText(text).replace(/\s+/g, '')].length;
}

/** 行のページ内の相対高さ（0 が下端、1 が上端） */
function relY(l: Line, p: PageData): number {
  return (l.y - p.yMin) / (p.height || 1);
}

function inBand(l: Line, p: PageData, band = BAND): boolean {
  const rel = relY(l, p);
  return rel > 1 - band || rel < band;
}

/** 左右の外側の帯（つめ見出し・インデックスタブ） */
const SIDE_BAND = 0.12;
const SIDE_MAX_CHARS = 8;
const SIDE_MIN_PAGES = 3;
/** 版面（行頭・行末の分布）より完全に外側にある短い行。ページ幅に対する相対位置で見る */
function inSideBand(l: Line, p: PageData, box: { left: number; right: number }): boolean {
  if (compactLength(l.text) > SIDE_MAX_CHARS) return false;
  const w = p.width || 1;
  const mid = (l.x0 + l.x1) / 2 / w;
  if (!(mid < SIDE_BAND || mid > 1 - SIDE_BAND)) return false;
  return l.x1 / w < box.left || l.x0 / w > box.right;
}

function furnitureKey(text: string): string {
  return normalizeText(text).replace(/\s+/g, '').replace(/[0-9]+/g, '#');
}

/** 版面の端（上下 20%）にあり、隣の行との間が通常の行送りの 1.5 倍以上空いている最上・最下の行（帯の外にあっても柱として扱う候補） */
const DETACH_BAND = 0.2;
const DETACH_RATIO = 1.5;
const DETACH_MAX_CHARS = 20;
const DETACH_PAGE_RATE = 0.7;
interface EdgeInfo {
  ys: number[];
  pitch: number;
  topDetached: boolean;
  bottomDetached: boolean;
}
function edgeInfo(ls: Line[]): EdgeInfo | null {
  if (ls.length < 4) return null;
  const ys: number[] = [];
  for (const l of [...ls].sort((a, b) => b.y - a.y)) {
    if (ys.length === 0 || ys[ys.length - 1] - l.y > l.fontSize * 0.5) ys.push(l.y);
  }
  if (ys.length < 4) return null;
  const pitch = median(ys.slice(1).map((y, k) => ys[k] - y));
  const n = ys.length;
  return {
    ys,
    pitch,
    topDetached: ys[0] - ys[1] >= pitch * DETACH_RATIO,
    bottomDetached: ys[n - 2] - ys[n - 1] >= pitch * DETACH_RATIO,
  };
}
/**
 * 端に孤立した最上・最下の行のうち、文書全体の版面の上端・下端（各ページの本文の最上・最下行の中央値）より
 * 行送り 1 つぶん以上外にあるもの。版面内の見出しは版面の端と同じ位置なので候補にならない。
 */
function detachedEdgeLines(perPage: Line[][], pages: PageData[]): Line[][] {
  const infos = perPage.map(edgeInfo);
  const tops: number[] = [];
  const bottoms: number[] = [];
  for (const f of infos) {
    if (!f) continue;
    tops.push(f.topDetached ? f.ys[1] : f.ys[0]);
    bottoms.push(f.bottomDetached ? f.ys[f.ys.length - 2] : f.ys[f.ys.length - 1]);
  }
  if (tops.length < 4) return perPage.map(() => []);
  const bodyTop = median(tops);
  const bodyBottom = median(bottoms);
  // 柱は（左右で入れ替わっても）ほぼ全ページにある。数ページにしか無い孤立行は見出しとみなす
  const hasTop = (f: EdgeInfo | null) => !!f && f.topDetached && f.ys[0] >= bodyTop + f.pitch;
  const hasBottom = (f: EdgeInfo | null) => !!f && f.bottomDetached && f.ys[f.ys.length - 1] <= bodyBottom - f.pitch;
  const topRate = infos.filter(hasTop).length / tops.length;
  const bottomRate = infos.filter(hasBottom).length / tops.length;
  return perPage.map((ls, i) => {
    const f = infos[i];
    if (!f) return [];
    const near = (y: number) => ls.filter((l) => Math.abs(l.y - y) <= l.fontSize * 0.5);
    const out: Line[] = [];
    if (topRate >= DETACH_PAGE_RATE && hasTop(f)) out.push(...near(f.ys[0]));
    const last = f.ys[f.ys.length - 1];
    if (bottomRate >= DETACH_PAGE_RATE && hasBottom(f)) out.push(...near(last));
    return out.filter((l) => inBand(l, pages[i], DETACH_BAND) && compactLength(l.text) <= DETACH_MAX_CHARS);
  });
}

/** 柱・ノンブルを除去する。除去キーを debug 用に返す */
export function removeFurniture(
  pages: PageData[],
  perPage: Line[][],
): { lines: Line[][]; keys: string[]; removedCount: number } {
  const textPages = perPage.filter((ls) => ls.length > 0).length;
  const rel0: number[] = [];
  const rel1: number[] = [];
  perPage.forEach((ls, i) => {
    for (const l of ls) {
      rel0.push(l.x0 / (pages[i].width || 1));
      rel1.push(l.x1 / (pages[i].width || 1));
    }
  });
  const box = { left: quantile(rel0, 0.1), right: quantile(rel1, 0.9) };
  // 行ごとの照合キー。何度も使うので 1 回だけ作る
  const keyOf = new Map<Line, string>();
  for (const ls of perPage) for (const l of ls) keyOf.set(l, furnitureKey(l.text));
  const counts = new Map<string, number>();
  const sideCounts = new Map<string, number>();
  perPage.forEach((ls, i) => {
    const seen = new Set<string>();
    const sideSeen = new Set<string>();
    for (const l of ls) {
      const k = keyOf.get(l) as string;
      if (!k) continue;
      if (inBand(l, pages[i])) seen.add(k);
      if (inSideBand(l, pages[i], box)) sideSeen.add(k);
    }
    for (const k of seen) counts.set(k, (counts.get(k) ?? 0) + 1);
    for (const k of sideSeen) sideCounts.set(k, (sideCounts.get(k) ?? 0) + 1);
  });
  const sideRepeating = new Set<string>();
  for (const [k, c] of sideCounts) if (c >= SIDE_MIN_PAGES && textPages >= 4) sideRepeating.add(k);

  const repeating = new Set<string>();
  if (textPages >= 4) {
    for (const [k, c] of counts) {
      // 出現ページ率で判定する（数字だけの行は "#" キーになり、ノンブルもここで繰り返しとして数える）
      if (c / textPages >= PAGE_RATIO) repeating.add(k);
    }
  }

  // 帯の外でも、ほぼ全ページの端に孤立した短い行がある文書では、それを柱として除く（章ごとに変わる柱・章の 1 ページ目だけの柱を含む）
  const detached = detachedEdgeLines(perPage, pages).map((ds) => new Set(ds));
  for (const set of detached) for (const l of set) repeating.add(keyOf.get(l) as string);

  let removedCount = 0;
  const lines = perPage.map((ls, i) =>
    ls.filter((l) => {
      if (detached[i].has(l)) {
        removedCount++;
        return false;
      }
      const key = keyOf.get(l) as string;
      const nombre = inBand(l, pages[i], NOMBRE_BAND) && NOMBRE_RE.test(normalizeText(l.text));
      const drop =
        nombre ||
        (inBand(l, pages[i]) && repeating.has(key)) ||
        (inSideBand(l, pages[i], box) && sideRepeating.has(key));
      if (drop) removedCount++;
      return !drop;
    }),
  );
  return { lines, keys: [...repeating, ...sideRepeating], removedCount };
}
