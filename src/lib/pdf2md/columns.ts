import type { Group, Line, TextRun } from './types';

export interface Gutter {
  start: number;
  end: number;
  /** このガターが有効な y 区間 [上端, 下端]（PDF 座標） */
  regions: [number, number][];
}

/** ガター g が高さ y で有効か */
export function gutterAt(g: Gutter, y: number): boolean {
  return g.regions.some(([top, bottom]) => y <= top && y >= bottom);
}

const PIECE_GAP_EM = 0.8;

/** 行候補を 0.8em 以上のギャップで区切った断片の x 範囲 */
function piecesOf(row: TextRun[]): [number, number][] {
  const out: [number, number][] = [];
  let cur: [number, number] | null = null;
  let prev: TextRun | null = null;
  for (const r of row) {
    const end = r.x + r.w;
    if (cur && prev && r.x - (prev.x + prev.w) <= Math.max(prev.fontSize, r.fontSize) * PIECE_GAP_EM) {
      cur[1] = Math.max(cur[1], end);
    } else {
      cur = [r.x, end];
      out.push(cur);
    }
    prev = r;
  }
  return out;
}

/** 行候補の y。最大フォントの run のベースライン（同サイズなら最初の run） */
export function rowY(row: TextRun[]): number {
  let best = row[0];
  for (const r of row) if (r.fontSize > best.fontSize) best = r;
  return best.y;
}

/**
 * x 投影の空白ガターを検出する。
 * 候補帯は「過半数の行が跨がない縦帯」。そのうえで帯ごとに、帯を跨ぐ行を挟まず連続する行の区間（領域）を求め、
 * 左右に十分な断片がある領域だけを有効にする（上半分だけ 2 段・下半分は全幅、のようなページに対応）。
 */
function detectGuttersOnce(rows: TextRun[][], bodySize: number): Gutter[] {
  const n = rows.length;
  if (n < 6) return [];
  const pieceRows = rows.map(piecesOf);
  const pieces = pieceRows.flat().map(([x0, x1]) => ({ x0, x1 }));
  const minX = Math.floor(Math.min(...pieces.map((l) => l.x0)));
  const maxX = Math.ceil(Math.max(...pieces.map((l) => l.x1)));
  const range = maxX - minX;
  if (range < bodySize * 6) return [];

  const cover = new Int32Array(range + 2);
  for (const l of pieces) {
    const a = Math.max(0, Math.floor(l.x0 - minX));
    const b = Math.min(range, Math.ceil(l.x1 - minX));
    for (let x = a; x < b; x++) cover[x]++;
  }
  const thr = Math.max(1, Math.floor(n * 0.5));
  const minGutter = Math.max(bodySize * 1.0, 4);

  // 低被覆の区間ごとに、最も空いている谷（最小被覆 + 誤差）の最広部分だけをガター候補にする
  const stripes: { start: number; end: number }[] = [];
  const slack = Math.max(1, Math.floor(n * 0.05));
  const pushValley = (from: number, to: number) => {
    let m = Infinity;
    for (let x = from; x < to; x++) m = Math.min(m, cover[x]);
    let bestA = -1;
    let bestB = -1;
    let a = -1;
    for (let x = from; x <= to; x++) {
      const ok = x < to && cover[x] <= m + slack;
      if (ok && a < 0) a = x;
      if (!ok && a >= 0) {
        if (x - a > bestB - bestA) {
          bestA = a;
          bestB = x;
        }
        a = -1;
      }
    }
    if (bestA >= 0 && bestB - bestA >= minGutter) stripes.push({ start: bestA + minX, end: bestB + minX });
  };
  let s = -1;
  for (let x = 0; x <= range + 1; x++) {
    const low = x <= range && cover[x] <= thr;
    if (low && s < 0) s = x;
    if (!low && s >= 0) {
      pushValley(s, x);
      s = -1;
    }
  }

  const order = rows.map((_, i) => i).sort((i, j) => rowY(rows[j]) - rowY(rows[i]));
  const out: Gutter[] = [];
  for (const g of stripes) {
    if (g.start <= minX + 1 || g.end >= maxX - 1) continue;
    const c = (g.start + g.end) / 2;
    const w = g.end - g.start;
    const regions: [number, number][] = [];
    let run: number[] = [];
    const flush = () => {
      if (run.length >= 3) {
        let left = 0;
        let right = 0;
        for (const i of run) {
          for (const [x0, x1] of pieceRows[i]) {
            if (x1 <= c) left++;
            else if (x0 >= c) right++;
          }
        }
        if (left >= 3 && right >= 3) {
          regions.push([rowY(rows[run[0]]) + bodySize * 0.8, rowY(rows[run[run.length - 1]]) - bodySize * 0.6]);
        }
      }
      run = [];
    };
    for (const i of order) {
      // 谷の中央 1/2 を覆う断片が跨ぎ。段の端が谷に食い込むだけの断片は跨ぎとしない
      const crossing = pieceRows[i].some(([x0, x1]) => x0 < g.start + w * 0.25 && x1 > g.end - w * 0.25);
      if (crossing) flush();
      else run.push(i);
    }
    flush();
    if (regions.length) out.push({ start: g.start, end: g.end, regions });
  }
  return out;
}

/** ページ内で段構成が部分的に違っても拾えるよう、領域外に残った行に対して繰り返し検出する */
export function detectGutters(rows: TextRun[][], bodySize: number): Gutter[] {
  const sorted = [...rows].sort((a, b) => rowY(b) - rowY(a));
  let remaining = sorted.map((_, i) => i);
  const all: Gutter[] = [];
  for (let pass = 0; pass < 3 && remaining.length >= 6; pass++) {
    // 元の y 順で隣り合う行ごとの塊に分ける
    const segments: number[][] = [];
    let cur: number[] = [];
    for (const i of remaining) {
      if (cur.length && i !== cur[cur.length - 1] + 1) {
        segments.push(cur);
        cur = [];
      }
      cur.push(i);
    }
    if (cur.length) segments.push(cur);

    const found: Gutter[] = [];
    for (const seg of segments) found.push(...detectGuttersOnce(seg.map((i) => sorted[i]), bodySize));
    if (!found.length) break;
    all.push(...found);
    remaining = remaining.filter((i) => {
      const y = rowY(sorted[i]);
      return !found.some((g) => gutterAt(g, y));
    });
  }
  return all;
}

/** 1 ページの行を読み順（段ごと上→下、全幅行はバンド境界）のグループ列にする */
export function orderPage(lines: Line[], page: number, gutters: Gutter[]): Group[] {
  if (lines.length === 0) return [];
  const byY = (a: Line, b: Line) => b.y - a.y || a.x0 - b.x0;

  if (gutters.length === 0) {
    return [{ page, spanning: false, colKey: `${page}:0`, lines: [...lines].sort(byY) }];
  }

  const active = (l: Line) => gutters.map((g, i) => ({ g, i })).filter(({ g }) => gutterAt(g, l.y));
  // 領域外の行、または有効な帯を跨ぐ行は全幅行
  const isSpanning = (l: Line) => {
    const act = active(l);
    return act.length === 0 || act.some(({ g }) => l.x0 < g.start && l.x1 > g.end);
  };
  const sigOf = (l: Line) => active(l).map(({ i }) => i).join(',');
  const colOf = (l: Line) => {
    const c = (l.x0 + l.x1) / 2;
    return active(l).filter(({ g }) => (g.start + g.end) / 2 < c).length;
  };

  const sorted = [...lines].sort(byY);
  const groups: Group[] = [];
  let band: Line[] = [];
  let spanBuf: Line[] = [];

  const flushBand = () => {
    if (!band.length) return;
    const sig = sigOf(band[0]);
    const nCols = sig === '' ? 1 : sig.split(',').length + 1;
    for (let c = 0; c < nCols; c++) {
      const ls = band.filter((l) => colOf(l) === c);
      if (ls.length) groups.push({ page, spanning: false, colKey: `${page}:${sig}:${c}`, lines: ls });
    }
    band = [];
  };
  const flushSpan = () => {
    if (!spanBuf.length) return;
    groups.push({ page, spanning: true, colKey: `${page}:s`, lines: spanBuf });
    spanBuf = [];
  };

  for (const l of sorted) {
    if (isSpanning(l)) {
      flushBand();
      spanBuf.push(l);
    } else {
      flushSpan();
      // 帯の構成（有効なガターの組）が変わったらバンドを切る
      if (band.length && sigOf(band[0]) !== sigOf(l)) flushBand();
      band.push(l);
    }
  }
  flushBand();
  flushSpan();
  return groups;
}
