/** 統計の共通関数。DOM 非依存。 */

/** 重みが最大のキーを返す。同点は先に入ったキー。floor 以下の重みは採らない（全部そうなら fallback） */
export function argmaxWeight<K>(weights: Map<K, number>, fallback: K, floor = -1): K {
  let best = fallback;
  let bw = floor;
  for (const [k, w] of weights) {
    if (w > bw) {
      best = k;
      bw = w;
    }
  }
  return best;
}

/** フォントサイズを 0.1pt 単位に丸める */
export function roundSize(x: number): number {
  return Math.round(x * 10) / 10;
}

/** サイズを 0.1pt 単位に丸めて重みを足し、重み最大のサイズを返す。空なら 0 */
export function weightedSizeMode<T>(items: Iterable<T>, size: (t: T) => number, weight: (t: T) => number): number {
  const m = new Map<number, number>();
  for (const it of items) {
    const k = roundSize(size(it));
    m.set(k, (m.get(k) ?? 0) + weight(it));
  }
  return argmaxWeight(m, 0);
}

/** 中央値（偶数個のときは上側）。空なら 0 */
export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** 分位点（0〜1）。空なら 0 */
export function quantile(xs: number[], q: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * q))];
}
