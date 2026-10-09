import { TOC_LEADER_ANY } from './chars';
import { roundSize, weightedSizeMode } from './stats';
import type { Block, WorkBlock } from './types';

const HEADING_RATIO = 1.12;
const HEADING_MAX_CHARS = 40;
const BOLD_HEADING_MAX_CHARS = 25;
const CLUSTER_RATIO = 1.06;
const TERMINAL = /[。！？!?」』、,.]$/;
const NUMERIC_ONLY = /^[\d\s.,:/%＋+\-−–—()（）]+$/;
const isNumericOnly = (text: string) => NUMERIC_ONLY.test(text.normalize('NFKC').trim());
const LIST_START = /^[・※]|^[0-9０-９]+[.．)）]/;
/** 目次の行（リーダー点＋ページ番号）は見出しにしない */
const TOC_LINE = new RegExp(`(?:${TOC_LEADER_ANY})[\\s\\u3000]*[0-9０-９]*[\\s\\u3000]*$`);

/** 文字数最頻のサイズ（0.1pt 単位）を本文サイズとする */
export function bodySizeOf(items: { fontSize: number; chars: number }[]): number {
  return weightedSizeMode(items, (it) => it.fontSize, (it) => it.chars);
}

/** 大きい順に並んだサイズを、隣との比が CLUSTER_RATIO 未満のまとまりに分ける */
function clusterSizes(sizesDesc: number[]): number[][] {
  const clusters: number[][] = [];
  for (const s of sizesDesc) {
    const last = clusters[clusters.length - 1];
    if (last && last[last.length - 1] / s < CLUSTER_RATIO) last.push(s);
    else clusters.push([s]);
  }
  return clusters;
}

export function assignHeadings(
  blocks: WorkBlock[],
  bodySize: number,
): { blocks: WorkBlock[]; sizes: number[] } {
  const sizeKey = (b: Block) => roundSize(b.fontSize);
  const isCandRaw = (b: Block) =>
    !TOC_LINE.test(b.text) &&
    b.fontSize >= bodySize * HEADING_RATIO && [...b.text].length <= HEADING_MAX_CHARS && !isNumericOnly(b.text);
  // 1 ページにだけ 3 個以上かたまって出るサイズは図・地図のラベルとみなし、見出しにしない
  const pagesBySize = new Map<number, { pages: Set<number>; n: number }>();
  for (const b of blocks) {
    if (!isCandRaw(b)) continue;
    const e = pagesBySize.get(sizeKey(b)) ?? { pages: new Set<number>(), n: 0 };
    e.pages.add(b.page);
    e.n++;
    pagesBySize.set(sizeKey(b), e);
  }
  const isLabelSize = (k: number) => {
    const e = pagesBySize.get(k);
    return !!e && e.pages.size === 1 && e.n >= 3;
  };
  const isCand = (b: Block) => isCandRaw(b) && !isLabelSize(sizeKey(b));
  const sizes = [...new Set(blocks.filter(isCand).map(sizeKey))].sort((a, b) => b - a);

  const clusters = clusterSizes(sizes);
  const levelOf = (size: number) => {
    const k = roundSize(size);
    const i = clusters.findIndex((c) => c.includes(k));
    return Math.min(i + 1, 3);
  };

  // 本文サイズの文字の多くが太字の文書（本文フォント自体が太い）では、太字は見出しの手がかりにならない
  let bodyChars = 0;
  let boldChars = 0;
  for (const b of blocks) {
    if (Math.abs(b.fontSize - bodySize) > bodySize * 0.05) continue;
    const n = [...b.text].length;
    bodyChars += n;
    if (b.bold) boldChars += n;
  }
  // 大きさで見出しを付けている文書では、太字の短い行は強調・ラベルであることが多い。
  // 大きさの見出しがページ数の半分に満たない文書（太字で見出しを表す本）だけ太字を使う
  const pageCount = new Set(blocks.map((b) => b.page)).size;
  const sizeHeadingCount = blocks.filter(isCand).length;
  const boldIsSignal =
    (bodyChars === 0 || boldChars / bodyChars < 0.3) && sizeHeadingCount < Math.max(1, pageCount * 0.5);

  const isBoldCand = (b: Block) =>
    boldIsSignal &&
    !isCand(b) &&
    b.bold &&
    b.lineCount === 1 &&
    b.fontSize >= bodySize * 0.95 &&
    [...b.text].length <= BOLD_HEADING_MAX_CHARS &&
    !TERMINAL.test(b.text) &&
    !TOC_LINE.test(b.text) &&
    !LIST_START.test(b.text) &&
    !isNumericOnly(b.text);
  const boldSizes = [...new Set(blocks.filter(isBoldCand).map((b) => roundSize(b.fontSize)))].sort(
    (a, b) => b - a,
  );
  const boldClusters = clusterSizes(boldSizes);
  const boldLevelOf = (size: number) => {
    const k = roundSize(size);
    const i = boldClusters.findIndex((c) => c.includes(k));
    return Math.min(clusters.length + 1 + i, 4);
  };

  const out = blocks.map((b): WorkBlock => {
    if (isCand(b)) return { ...b, kind: 'heading', level: levelOf(b.fontSize) };
    if (isBoldCand(b)) return { ...b, kind: 'heading', level: boldLevelOf(b.fontSize) };
    return b;
  });
  return { blocks: splitByMarker(out), sizes: clusters.map((c) => c[0]) };
}

const NEST_RUN_RATIO = 0.2;
const NEST_MIN = 5;
/** 段を分ける記号。【】〈〉などの括弧はラベルで、階層の印ではない */
const SPLIT_MARKER = /^[▼▽◆◇■□▎▍▌●○◎★☆]/;

/**
 * 同じレベルの見出しの中で、頭の記号（■ と ● など）で階層を分けている本に合わせて段を分ける。
 * 文書で先に現れる記号を上位とし、記号なしは最上位と同じ段に置く。最後に 1〜6 へ詰め直す
 */
function splitByMarker(blocks: WorkBlock[]): WorkBlock[] {
  const markerOf = (t: string): string => SPLIT_MARKER.exec(t.trim())?.[0] ?? '';
  const order = new Map<number, string[]>();
  const count = new Map<string, number>();
  for (const b of blocks) {
    if (b.kind !== 'heading' || b.level === undefined) continue;
    const m = markerOf(b.text);
    const key = `${b.level}:${m}`;
    count.set(key, (count.get(key) ?? 0) + 1);
  }
  for (const b of blocks) {
    if (b.kind !== 'heading' || b.level === undefined) continue;
    const m = markerOf(b.text);
    // 2 回以上使われる記号だけを段として数える
    if (!m || (count.get(`${b.level}:${m}`) ?? 0) < 2) continue;
    const ms = order.get(b.level) ?? [];
    if (!ms.includes(m)) ms.push(m);
    order.set(b.level, ms);
  }
  // 下位の記号は上位の見出しの間に細切れに挟まる。まとまった塊でしか出ない記号は別の章の同格の見出しとみなす
  const subs = new Map<string, number>();
  for (const [lv, ms] of order) {
    const seq = blocks
      .filter((b) => b.kind === 'heading' && b.level === lv && ms.includes(markerOf(b.text)))
      .map((b) => markerOf(b.text));
    let next = 0;
    ms.forEach((m, i) => {
      const n = seq.filter((x) => x === m).length;
      const runs = seq.filter((x, j) => x === m && seq[j - 1] !== m).length;
      subs.set(`${lv}:${m}`, i > 0 && n >= NEST_MIN && runs / n >= NEST_RUN_RATIO ? ++next : 0);
    });
  }
  const subOf = (b: Block): number => subs.get(`${b.level}:${markerOf(b.text)}`) ?? 0;
  const keys = [
    ...new Set(blocks.filter((b) => b.kind === 'heading' && b.level !== undefined).map((b) => b.level! * 100 + subOf(b))),
  ].sort((a, b) => a - b);
  return blocks.map((b) =>
    b.kind === 'heading' && b.level !== undefined
      ? { ...b, level: Math.min(keys.indexOf(b.level * 100 + subOf(b)) + 1, 6) }
      : b,
  );
}
