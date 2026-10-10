import { jpNfkc } from './jpNfkc';
import { matchNext } from './greedyMatch';
import { argmaxWeight } from './stats';
import type { CharStyle, PageData, StyledSpan, WorkBlock } from './types';

const START_CHARS = 4;
const LOOKAHEAD = 16;
const WHITE_LUMINANCE = 0.8;

/** 文書全体の本文色：全 TextRun の空白以外の文字数で最多の色 */
export function bodyColorOf(pages: PageData[]): string {
  const m = new Map<string, number>();
  for (const p of pages) {
    for (const r of p.runs) {
      if (!r.colors) continue;
      let k = 0;
      for (const ch of r.str) {
        if (!/\s/.test(ch)) m.set(r.colors[k], (m.get(r.colors[k]) ?? 0) + 1);
        k += ch.length;
      }
    }
  }
  // PDF 由来色の既定値（色のハードコード禁止の例外）
  return argmaxWeight(m, '#000000', 0);
}

function luminance(hex: string): number {
  const ch = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
}

/** NFKC 化した非空白の 1 文字列。idx は元の UTF-16 位置 */
function nonSpaceSeq(text: string): { c: string; idx: number }[] {
  const out: { c: string; idx: number }[] = [];
  let k = 0;
  for (const ch of text) {
    if (!/\s/.test(ch)) for (const c of jpNfkc(ch)) if (!/\s/.test(c)) out.push({ c, idx: k });
    k += ch.length;
  }
  return out;
}

// PDF 由来色の既定値（色のハードコード禁止の例外）
const DEFAULT_STYLE: CharStyle = { color: '#000000', bold: false, italic: false };

/** block.text の UTF-16 単位ごとの書式を src から貪欲に復元する */
function alignStyles(text: string, src: { text: string; styles: (CharStyle | null)[] }): CharStyle[] {
  const seq = nonSpaceSeq(src.text);
  const head = nonSpaceSeq(text)
    .slice(0, START_CHARS)
    .map((x) => x.c);
  let ptr = 0;
  if (head.length === START_CHARS) {
    for (let i = 0; i + START_CHARS <= seq.length; i++) {
      if (head.every((c, j) => seq[i + j].c === c)) {
        ptr = i;
        break;
      }
    }
  }
  const styleAt = (i: number): CharStyle | null => src.styles[seq[i]?.idx ?? -1] ?? null;
  let last: CharStyle = styleAt(ptr) ?? src.styles.find((s) => s) ?? DEFAULT_STYLE;
  const out: CharStyle[] = [];
  for (const ch of text) {
    if (!/\s/.test(ch)) {
      const hit = matchNext(seq, ptr, ch, LOOKAHEAD);
      if (hit) {
        last = styleAt(hit.index) ?? last;
        ptr = hit.next;
      }
    }
    for (let u = 0; u < ch.length; u++) out.push(last);
  }
  return out;
}

/** 各ブロックに spans を付け、作業用の src を取り除く（top・segs は画像の挿入位置決めのために残す） */
export function attachSpans(blocks: WorkBlock[], bodyColor: string): { blocks: WorkBlock[]; coloredBlocks: number } {
  let coloredBlocks = 0;
  const result = blocks.map((b) => {
    const { src, ...rest } = b;
    if (!src || src.styles.length === 0 || b.text.length === 0) return rest;
    const styles = alignStyles(b.text, src);
    const spans: StyledSpan[] = [];
    let anyStyle = false;
    let anyColor = false;
    let curKey = '';
    for (let i = 0; i < b.text.length; i++) {
      const st = styles[i];
      const color = st.color === bodyColor || luminance(st.color) > WHITE_LUMINANCE ? undefined : st.color;
      const key = `${color ?? ''}|${st.bold ? 1 : 0}|${st.italic ? 1 : 0}`;
      if (key !== curKey || spans.length === 0) {
        const span: StyledSpan = { text: '' };
        if (color) span.color = color;
        if (st.bold) span.bold = true;
        if (st.italic) span.italic = true;
        spans.push(span);
        curKey = key;
      }
      spans[spans.length - 1].text += b.text[i];
      if (color) anyColor = true;
      if (color || st.bold || st.italic) anyStyle = true;
    }
    if (!anyStyle) return rest;
    if (anyColor) coloredBlocks++;
    return { ...rest, spans };
  });
  return { blocks: result, coloredBlocks };
}
