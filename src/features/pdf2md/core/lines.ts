import { gutterAt, rowY } from './columns';
import type { Gutter } from './columns';
import { weightedSizeMode } from './stats';
import type { CharStyle, Line, PageData, TextRun } from './types';

interface Cluster {
  y: number;
  fs: number;
  runs: TextRun[];
}

const SEGMENT_GAP_EM = 2.5;
const SPACE_GAP_EM = 0.25;

function segmentToLine(runs: TextRun[], page: number): Line {
  let text = '';
  const styles: (CharStyle | null)[] = [];
  let prev: TextRun | null = null;
  for (const r of runs) {
    if (prev) {
      const gap = r.x - (prev.x + prev.w);
      const em = Math.max(prev.fontSize, 1);
      const bridged = /\s$/.test(text) || /^\s/.test(r.str);
      if (gap > em * SPACE_GAP_EM && !bridged) {
        text += ' ';
        styles.push(null);
      }
    }
    text += r.str;
    for (let k = 0; k < r.str.length; k++) {
      // PDF 由来色の既定値（色のハードコード禁止の例外）
      styles.push({ color: r.colors?.[k] ?? '#000000', bold: r.bold, italic: r.italic });
    }
    prev = r;
  }
  const weight = (r: TextRun) => r.str.replace(/\s/g, '').length || 1;
  const fontSize = weightedSizeMode(runs, (r) => r.fontSize, weight);
  const main = runs.filter((r) => Math.abs(r.fontSize - fontSize) < 0.15);
  const y = main.length ? main.reduce((s, r) => s + r.y, 0) / main.length : runs[0].y;
  const totalW = runs.reduce((s, r) => s + weight(r), 0);
  const boldW = runs.filter((r) => r.bold).reduce((s, r) => s + weight(r), 0);
  const last = runs[runs.length - 1];
  return {
    page,
    text,
    x0: runs[0].x,
    x1: last.x + last.w,
    y,
    fontSize,
    bold: totalW > 0 && boldW / totalW >= 0.6,
    chars: text.replace(/\s/g, '').length,
    styles,
  };
}

/** run を y 近接でまとめた「行候補」（x 昇順）。横方向の分割はまだしない */
export function buildRows(pageData: PageData): TextRun[][] {
  const runs = [...pageData.runs].sort((a, b) => b.y - a.y || a.x - b.x);
  const clusters: Cluster[] = [];
  for (const r of runs) {
    let target: Cluster | null = null;
    for (let i = clusters.length - 1; i >= 0; i--) {
      const c = clusters[i];
      const tol = 0.35 * Math.max(r.fontSize, c.fs);
      if (c.y - r.y > tol * 3 + 20) break;
      if (Math.abs(c.y - r.y) <= tol) {
        target = c;
        break;
      }
    }
    if (!target) {
      clusters.push({ y: r.y, fs: r.fontSize, runs: [r] });
    } else {
      target.runs.push(r);
      if (r.fontSize > target.fs) {
        target.fs = r.fontSize;
        target.y = r.y;
      }
    }
  }

  return clusters.map((c) => c.runs.sort((a, b) => a.x - b.x));
}

/** 行候補を、段ガターをまたぐギャップと大きな横ギャップ（2.5em）で分割して行にする */
export function rowsToLines(rows: TextRun[][], page: number, gutters: Gutter[], bodySize: number): Line[] {
  const lines: Line[] = [];
  for (const runs of rows) {
    let seg: TextRun[] = [];
    const ry = rowY(runs);
    const here = gutters.filter((g) => gutterAt(g, ry));
    for (const r of runs) {
      const prev = seg[seg.length - 1];
      if (prev) {
        const from = prev.x + prev.w;
        const gap = r.x - from;
        // 谷が広いと段の端の run が谷に入る。谷の中心を境に run の中心が左→右へ移るときだけ段をまたぐとみなす
        const crossesGutter = here.some((g) => {
          const c = (g.start + g.end) / 2;
          return prev.x + prev.w / 2 < c && r.x + r.w / 2 >= c && r.x >= g.start && from <= g.end;
        });
        if (crossesGutter || gap > Math.max(prev.fontSize, r.fontSize) * SEGMENT_GAP_EM) {
          lines.push(segmentToLine(seg, page));
          seg = [];
        }
      }
      seg.push(r);
    }
    if (seg.length) lines.push(segmentToLine(seg, page));
  }
  return dropRuby(lines, bodySize);
}

/** 本文行のすぐ上にある小サイズだけの行（ルビ）を捨てる */
function dropRuby(lines: Line[], bodySize: number): Line[] {
  if (bodySize <= 0) return lines;
  return lines.filter((l) => {
    if (l.fontSize > bodySize * 0.65) return true;
    return !lines.some(
      (m) =>
        m !== l &&
        m.fontSize >= bodySize * 0.8 &&
        l.y > m.y &&
        l.y - m.y <= m.fontSize * 1.25 &&
        l.x0 < m.x1 &&
        l.x1 > m.x0,
    );
  });
}
