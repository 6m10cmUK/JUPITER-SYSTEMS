import { TOC_LEADER_ANY, isCjkLike, isLatinLetter } from './chars';
import { median, weightedSizeMode } from './stats';
import { outlineKeyOf } from './outlineKeys';
import type { CharStyle, Group, Line, WorkBlock } from './types';

/** 区切り判定の閾値（設計書「段落境界の判定」） */
const RIGHT_SHORT_EM = 1.5;
const INDENT_EM = 0.8;
const GAP_RATIO = 1.5;
const INDENT_STYLE_RATIO = 0.2;
const SIZE_TOL = 0.1;

const BULLET_START = /^[\s\u3000]*(?:[・■◆◇●○□▲△▼▽★☆※◎◯【]|[0-9０-９]+[.．)）]|[(（][0-9０-９]+[)）]|[①-⑳])/;
const CLOSE_END = /[」』）)】]$/;
const OPEN_START = /^[\s\u3000]*[「『（(]/;
const SENTENCE_END = /[。！？!?」』]$/;
const FULL_STOP_END = /[。！？!?]$/;
/** 目次の 1 項目（リーダー＋ページ番号で終わる行）。1 項目 1 段落にする */
const TOC_ENTRY = new RegExp(`(?:${TOC_LEADER_ANY})[\\s\\u3000]*[0-9０-９]+[\\s\\u3000]*$`);
/** 罫線・区切りだけの行（------ など）。前後で必ず段落を切る */
const RULE_LINE = /^[\s\u3000]*[-‐－ー―─━=＝_＿~〜～*＊・.…]{4,}[\s\u3000]*$/;

interface ColStat {
  left: number;
  right: number;
}

function pushTo<K>(m: Map<K, Line[]>, key: K, lines: Line[]): void {
  const arr = m.get(key);
  if (arr) arr.push(...lines);
  else m.set(key, [...lines]);
}

function dominantSize(lines: Line[]): number {
  return weightedSizeMode(lines, (l) => l.fontSize, (l) => l.chars);
}

function colStat(lines: Line[], minLines = 3): ColStat | null {
  // 段内の支配的なサイズ（本文・注釈など）の行だけで統計を取る
  const ref = dominantSize(lines);
  const body = lines.filter((l) => Math.abs(l.fontSize - ref) <= ref * 0.15);
  const ls = body.length >= minLines ? body : lines;
  if (ls.length < minLines) return null;
  const n = ls.length;
  // 右端は、行数の 1 割以上が集まる x1 クラスタのうち最も右（満行が揃う位置）。
  // 最頻だけだと、短い行が多いページ（表・繰り返し行）で短い位置を右端と誤認する
  // 固定ビンだと境目で割れるので、各行の x1 から ±0.3em の窓で数える
  const win = Math.max(ref * 0.3, 0.5);
  const x1s = ls.map((l) => l.x1).sort((a, b) => a - b);
  // 各 x1 から ±win に入る範囲を、ソート済みの 2 ポインタと累積和で求める
  const prefix: number[] = [0];
  for (const x of x1s) prefix.push(prefix[prefix.length - 1] + x);
  const minN = Math.max(2, Math.ceil(n * 0.1));
  let right = x1s[x1s.length - 1];
  let bestN = 0;
  let found = false;
  let lo = 0;
  let hi = 0;
  for (const v of x1s) {
    while (v - x1s[lo] > win) lo++;
    if (hi < lo) hi = lo;
    while (hi < n && x1s[hi] - v <= win) hi++;
    const cnt = hi - lo;
    const avg = (prefix[hi] - prefix[lo]) / cnt;
    if (cnt >= minN) {
      right = avg;
      found = true;
    } else if (!found && cnt >= bestN) {
      bestN = cnt;
      right = avg;
    }
  }
  const x0s = ls.map((l) => l.x0).sort((a, b) => a - b);
  const need = Math.max(2, Math.ceil(n * 0.15));
  let left = x0s[0];
  let a = 0;
  let b = 0;
  for (const v of x0s) {
    while (x0s[a] < v - 0.01) a++;
    while (b < n && x0s[b] <= v + ref * 0.3) b++;
    if (b - a >= need) {
      left = v;
      break;
    }
  }
  return { left, right };
}

function pitchOf(lines: Line[]): number | null {
  const dys: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const a = lines[i - 1];
    const b = lines[i];
    const dy = a.y - b.y;
    if (dy > 0 && Math.abs(a.fontSize - b.fontSize) <= a.fontSize * SIZE_TOL && dy <= a.fontSize * 4) dys.push(dy);
  }
  if (dys.length < 3) return null;
  // 段落間の空きを行送りに数えないよう、最も狭い行間のまとまり（最小の 1.25 倍以内）を優先する
  const m = Math.min(...dys);
  const tight = dys.filter((d) => d <= m * 1.25);
  return tight.length >= Math.max(2, dys.length * 0.3) ? median(tight) : median(dys);
}

/** 行 i の周り（前 4 行・後 3 行）が段より狭く、右端が揃っていればその位置を右端とする */
function localRight(lines: Line[], i: number, st: ColStat): number {
  const a = lines[i];
  const fs = a.fontSize || 1;
  const win = lines.slice(Math.max(0, i - 4), i + 4).filter((l) => Math.abs(l.fontSize - fs) <= fs * SIZE_TOL);
  if (win.length < 4 || !Number.isFinite(st.right)) return st.right;
  const r = Math.max(...win.map((l) => l.x1));
  if (st.right - r <= fs * RIGHT_SHORT_EM) return st.right;
  if (r - st.left < (st.right - st.left) * 0.6) return st.right;
  const aligned = win.filter((l) => r - l.x1 <= fs * 0.5).length;
  return aligned >= 3 ? r : st.right;
}

/** 行頭の分割できない塊（開き括弧＋英数字列かカタカナ列＋閉じ括弧類）の幅の見積もり。全角 1em、半角 0.55em */
const LEAD_CHUNK = /^[\s\u3000]*[「『（(“"]*(?:[A-Za-z0-9Ａ-Ｚａ-ｚ０-９.-]+|[ァ-ヶー・]+|.)[」』）)】”"、。，．,.]*/u;
function leadChunkWidth(l: Line): number {
  const m = LEAD_CHUNK.exec(l.text);
  if (!m) return 0;
  let em = 0;
  for (const ch of m[0].trim()) em += /[\x20-\x7e]/.test(ch) ? 0.55 : 1;
  return em * l.fontSize;
}

/** a の行末の余白に b の行頭の塊が入らない＝組版上の折り返し。文末記号で終わる行と、段の半分に満たない行は対象外 */
function wrapsInto(a: Line, b: Line, right: number): boolean {
  const at = a.text.trim();
  // 文末記号の後に閉じ括弧が続く行（。] など）、【見出し】や [注記] で終わる行、英数字（URL 等）の次に括弧で始まる行は対象外
  if (/[。！？!?」』][\]】」』）)]*$/.test(at) || /[】\]]$/.test(at) || BULLET_START.test(b.text)) return false;
  if (/[\x21-\x7e]$/.test(at) && OPEN_START.test(b.text)) return false;
  const room = right - a.x1;
  // 余白が 3 字を超える行は、続く語が長くても段落末とみなす（行頭が長い語の段落を誤って続けない）
  if (room < 0 || room > a.fontSize * 3 || a.x1 - a.x0 < (right - a.x0) * 0.5) return false;
  return leadChunkWidth(b) > room;
}

function sizeChanged(a: Line, b: Line): boolean {
  const r = b.fontSize / (a.fontSize || 1);
  return r > 1 + SIZE_TOL || r < 1 - SIZE_TOL;
}

function isIndented(b: Line, left: number, prev?: Line): boolean {
  if (/^\u3000/.test(b.text)) return true;
  if (b.x0 - left < b.fontSize * INDENT_EM) return false;
  // 枠・引用など行頭が揃って下がっているブロックは字下げではない（直前の行より右に始まるときだけ字下げ）
  return !prev || b.x0 - prev.x0 >= b.fontSize * INDENT_EM * 0.5;
}

/** 段の中央に寄せた短い行（題辞・詩・中央揃えの見出し）。1 行ずつ独立させる */
function isCentered(l: Line, st: ColStat): boolean {
  if (!Number.isFinite(st.right)) return false;
  const fs = l.fontSize || 1;
  const colMid = (st.left + st.right) / 2;
  return l.x0 - st.left > fs * 2 && st.right - l.x1 > fs * 2 && Math.abs((l.x0 + l.x1) / 2 - colMid) < fs * 1.5;
}

function joinLines(prev: string, next: string): string {
  const a = prev.replace(/\s+$/, '');
  const b = next.replace(/^[\s\u3000]+/, '');
  if (!a) return b;
  if (!b) return a;
  const last = a[a.length - 1];
  const first = b[0];
  if (/[-‐­]/.test(last) && isLatinLetter(a[a.length - 2]) && isLatinLetter(first)) {
    return a.slice(0, -1) + b;
  }
  if (isCjkLike(last) || isCjkLike(first)) return a + b;
  return `${a} ${b}`;
}

/** 段・ページの統計。段落の区切り判定が使う */
interface Stats {
  /** 文書全体の左右端 */
  docStat: ColStat;
  /** ページ内の段数 */
  colCount: (g: Group) => number;
  /** グループ（段・全幅バンド）の左右端 */
  statOf: (g: Group) => ColStat;
}

/** グループ列から統計（文書・ページ・段・段の位置ごと）を作る。statOf の結果はグループごとにキャッシュする */
function buildStats(groups: Group[], bodySize: number): Stats {
  const byCol = new Map<string, Line[]>();
  const byPage = new Map<number, Line[]>();
  for (const g of groups) {
    if (!g.spanning) pushTo(byCol, g.colKey, g.lines);
    pushTo(byPage, g.page, g.lines);
  }
  const docStat: ColStat = colStat(groups.flatMap((g) => g.lines)) ?? { left: 0, right: Infinity };
  const colStats = new Map<string, ColStat | null>();
  for (const [k, ls] of byCol) colStats.set(k, colStat(ls));
  const pageStat = new Map<number, ColStat>();
  for (const [p, ls] of byPage) pageStat.set(p, colStat(ls) ?? docStat);

  // ページ内の段数（1 段組のページは文書全体の左右端も基準にする）
  const colsOnPage = new Map<number, Set<string>>();
  for (const g of groups) if (!g.spanning) colsOnPage.set(g.page, (colsOnPage.get(g.page) ?? new Set()).add(g.colKey));
  const colCount = (g: Group): number => colsOnPage.get(g.page)?.size ?? 1;

  // 段の位置（左端）ごとに全ページの行を集めた統計。短い行ばかりの段の右端を補う
  const slotOf = (left: number): number => Math.round(left / (bodySize * 1.5));
  const bySlot = new Map<number, Line[]>();
  for (const [k, ls] of byCol) {
    const st = colStats.get(k);
    if (!st) continue;
    pushTo(bySlot, slotOf(st.left), ls);
  }
  const slotStats = new Map<number, ColStat | null>();
  for (const [k, ls] of bySlot) slotStats.set(k, colStat(ls));

  const cache = new Map<Group, ColStat>();
  const compute = (g: Group): ColStat => {
    if (g.spanning) return pageStat.get(g.page) ?? docStat;
    // 統計が取れない段（行が少ない）は、自分の行から 2 行以上で推定し、無理なら幾何条件で区切らない（右端 Infinity）
    const st =
      colStats.get(g.colKey) ?? colStat(g.lines, 2) ?? { left: Math.min(...g.lines.map((l) => l.x0)), right: Infinity };
    // 短い行ばかりの段（箇条・台詞の続くページ）は満行が無く右端を短く見誤る。
    // 推定した右端を越える行が複数あるときだけ、同じ位置の段の右端（1 段組なら文書の右端）まで広げる
    const ls = byCol.get(g.colKey) ?? g.lines;
    const beyond = ls.filter((l) => l.x1 > st.right + bodySize * 2).length;
    if (beyond < 2 || !Number.isFinite(st.right)) return st;
    const ref =
      colCount(g) === 1 && Math.abs(st.left - docStat.left) < bodySize ? docStat : slotStats.get(slotOf(st.left));
    if (!ref || !Number.isFinite(ref.right)) return st;
    return { left: st.left, right: Math.max(st.right, ref.right) };
  };
  const statOf = (g: Group): ColStat => {
    let st = cache.get(g);
    if (!st) {
      st = compute(g);
      cache.set(g, st);
    }
    return st;
  };
  return { docStat, colCount, statOf };
}

/** 字下げで段落を示す本か：明らかな段落末（短い行の文末）の次の行が字下げされている割合 */
function usesIndentStyle(groups: Group[], statOf: (g: Group) => ColStat): boolean {
  let ends = 0;
  let indented = 0;
  for (const g of groups) {
    const st = statOf(g);
    g.lines.forEach((b, i) => {
      const a = g.lines[i - 1];
      if (!a || !FULL_STOP_END.test(a.text.trim()) || st.right - a.x1 <= a.fontSize * RIGHT_SHORT_EM * 2) return;
      ends++;
      if (isIndented(b, st.left, a)) indented++;
    });
  }
  return ends >= 10 && indented / ends >= INDENT_STYLE_RATIO;
}

/** 区切り判定が文書全体から受け取る情報 */
interface BreakContext {
  stats: Stats;
  usesIndent: boolean;
  /** しおりの見出し行か（前後とも連結しない） */
  isOutlineLine: (l: Line) => boolean;
}

/**
 * 行 a（直前の行。文書の最初は null）の次に行 b が来るとき、段落を区切るか。
 * g は b の属するグループ、idx は g 内の b の位置、st は g の統計、pitch は g の行送り、
 * prevStat は a が属した（前の）グループの統計。
 */
function shouldBreak(
  a: Line | null,
  b: Line,
  g: Group,
  idx: number,
  st: ColStat,
  pitch: number,
  prevStat: ColStat | null,
  ctx: BreakContext,
): boolean {
  if (!a) return true;
  const { docStat, colCount } = ctx.stats;
  if (
    sizeChanged(a, b) ||
    ctx.isOutlineLine(a) ||
    ctx.isOutlineLine(b) ||
    BULLET_START.test(b.text) ||
    RULE_LINE.test(a.text) ||
    RULE_LINE.test(b.text) ||
    TOC_ENTRY.test(a.text)
  ) {
    return true;
  }
  if (CLOSE_END.test(a.text.trim()) && OPEN_START.test(b.text) && idx > 0 && !wrapsInto(a, b, localRight(g.lines, idx - 1, st))) {
    return true;
  }
  if (idx > 0) {
    // 同一グループ内：幾何条件 1〜3
    const gap = a.y - b.y;
    // 囲み枠・引用など段より狭いブロックは、近くの行の右端が揃う位置をそのブロックの右端とみなす
    // 文末記号で終わる行は段の右端で測る（枠内の段落末を続きと誤らない）
    const right = SENTENCE_END.test(a.text.trim()) ? st.right : localRight(g.lines, idx - 1, st);
    // 右端が揃わない組版でも、次の行頭の語が余白に入らないなら折り返し（段落末ではない）
    const aShort = right - a.x1 > a.fontSize * RIGHT_SHORT_EM && !wrapsInto(a, b, right);
    // 満行で文末記号もない行の次は、下がって始まっていても続き（ぶら下げ・字下げブロックの折り返し）
    // 図のラベルのように右端に寄っただけの短い行や、横に並んだ行は除く
    const runOn =
      !aShort &&
      gap > 0 &&
      a.x1 <= right + a.fontSize &&
      a.x1 - a.x0 >= (right - st.left) * 0.5 &&
      !SENTENCE_END.test(a.text.trim()) &&
      !CLOSE_END.test(a.text.trim());
    // ぶら下げ字下げ（話者名「…」や箇条の続き行）：満行の次から、続く行も同じだけ下がっていれば続き
    const c = g.lines[idx + 1];
    const hanging =
      !aShort &&
      !/^\u3000/.test(b.text) &&
      c !== undefined &&
      c.x0 - st.left >= c.fontSize * INDENT_EM &&
      Math.abs(c.x0 - b.x0) < b.fontSize * 1.5;
    return (
      aShort ||
      (!hanging && !runOn && isIndented(b, st.left, a)) ||
      isCentered(a, st) ||
      (!runOn && isCentered(b, st)) ||
      (!g.spanning && colCount(g) === 1 && (isCentered(a, docStat) || (!runOn && isCentered(b, docStat)))) ||
      gap >= pitch * GAP_RATIO ||
      // 字下げのない本では、満行でも文末記号で終わる行の後は段落を切る（見分けがつかないため切る側に倒す）
      (!ctx.usesIndent && FULL_STOP_END.test(a.text.trim()))
    );
  }
  // 段・ページまたぎ：文末記号か字下げ。前の段の満行で文が終わっていなければ、下がっていても続き
  const aFull =
    prevStat !== null && prevStat.right - a.x1 <= a.fontSize * RIGHT_SHORT_EM && a.x1 - a.x0 >= (prevStat.right - prevStat.left) * 0.5;
  const runOn = aFull && !CLOSE_END.test(a.text.trim());
  return SENTENCE_END.test(a.text.trim()) || (!runOn && isIndented(b, st.left));
}

/** 読み順に並んだグループ列から段落ブロックを組む */
export function buildBlocks(groups: Group[], bodySize: number, outlineKeys?: ReadonlySet<string>): WorkBlock[] {
  const stats = buildStats(groups, bodySize);
  const { statOf } = stats;
  const ctx: BreakContext = {
    stats,
    usesIndent: usesIndentStyle(groups, statOf),
    // しおりの見出し行（ページ＋正規化タイトルが完全一致）は、前後とも連結しない
    isOutlineLine: (l) => !!outlineKeys && outlineKeys.has(outlineKeyOf(l.page, l.text)),
  };

  const pitchRatios: number[] = [];
  const groupPitch = new Map<Group, number | null>();
  for (const g of groups) {
    const p = pitchOf(g.lines);
    groupPitch.set(g, p);
    if (p) pitchRatios.push(p / (g.lines[0].fontSize || 1));
  }
  const docRatio = median(pitchRatios) || 1.6;

  const blocks: WorkBlock[] = [];
  let cur: { lines: Line[]; text: string; srcText: string; srcStyles: (CharStyle | null)[]; top: number } | null = null;
  /** 行を、y が上に戻る所・ページが変わる所で区切ったかたまりにする */
  const segsOf = (ls: Line[]): NonNullable<WorkBlock['segs']> => {
    const out: NonNullable<WorkBlock['segs']> = [];
    let prev: Line | null = null;
    for (const l of ls) {
      const last = out[out.length - 1];
      if (!prev || !last || l.page !== prev.page || l.y > prev.y) {
        out.push({ page: l.page, top: l.y, left: l.x0, right: l.x1 });
      } else {
        last.left = Math.min(last.left, l.x0);
        last.right = Math.max(last.right, l.x1);
      }
      prev = l;
    }
    return out;
  };
  const flush = () => {
    if (!cur) return;
    const ls = cur.lines;
    blocks.push({
      kind: 'paragraph',
      text: cur.text,
      page: ls[0].page,
      fontSize: Math.max(...ls.map((l) => l.fontSize)),
      bold: ls.every((l) => l.bold),
      lineCount: ls.length,
      src: { text: cur.srcText, styles: cur.srcStyles },
      top: cur.top,
      segs: segsOf(ls),
    });
    cur = null;
  };

  let prevLine: Line | null = null;
  let prevStat: ColStat | null = null;
  for (const g of groups) {
    const st = statOf(g);
    const pitch = groupPitch.get(g) ?? docRatio * (g.lines[0]?.fontSize ?? bodySize);
    g.lines.forEach((b, idx) => {
      if (shouldBreak(prevLine, b, g, idx, st, pitch, prevStat, ctx) || !cur) {
        flush();
        cur = { lines: [b], text: b.text, srcText: b.text, srcStyles: [...(b.styles ?? [])], top: b.y };
      } else {
        cur.lines.push(b);
        cur.text = joinLines(cur.text, b.text);
        cur.srcText += b.text;
        if (b.styles) cur.srcStyles.push(...b.styles);
      }
      prevLine = b;
    });
    prevStat = st;
  }
  flush();
  return blocks;
}
