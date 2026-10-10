import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { matchNext } from './greedyMatch';
import type { PageData, RawImage, TextRun } from './types';
import { jpNfkc } from './jpNfkc';

/** pdfjs-dist 6.x の OPS 値（本ファイルは DOM/worker 非依存にするため pdfjs の実体は import しない） */
const OP_SAVE = 10;
const OP_RESTORE = 11;
const OP_SHOW_TEXT = 44;
const OP_SHOW_SPACED_TEXT = 45;
const OP_NEXT_LINE_SHOW_TEXT = 46;
const OP_NEXT_LINE_SET_SPACING_SHOW_TEXT = 47;
const OP_SET_FILL_RGB = 59;
const OP_TRANSFORM = 12;
const OP_PAINT_IMAGE_XOBJECT = 85;
const OP_PAINT_INLINE_IMAGE_XOBJECT = 86;
// paintImageMaskXObject(83) / paintImageXObjectRepeat(88) / paintInlineImageXObjectGroup(87) は対象外（無視）
const OP_FORM_BEGIN = 74;
const OP_FORM_END = 75;

const ITALIC_RE = /italic|oblique/i;
const COLOR_RE = /^#[0-9a-f]{6}$/i;
const LOOKAHEAD = 32;

const BOLD_RE =
  /(bold|black|heavy|ultra|extrabold|semibold|demibold|midashi|[-_,\s]w[6-9]($|[-_,\s])|[-_]db$|[-_]eb$|[-_]b$)/i;

interface PdfFontLike {
  name?: string;
  bold?: boolean;
  black?: boolean;
  italic?: boolean;
}

interface RawItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}

function isRawItem(item: unknown): item is RawItem {
  return typeof item === 'object' && item !== null && 'str' in item && 'transform' in item;
}

type FontFlag = 'bold' | 'italic';

/** フラグごとの判定。name・フラグの値が両方とも無いフォントは「分からない」扱い（name は fontExtraProperties: true のときだけ入る） */
const FLAG_RULES: Record<FontFlag, { known: (f: PdfFontLike) => boolean; value: (f: PdfFontLike) => boolean }> = {
  bold: {
    known: (f) => f.name !== undefined || f.bold !== undefined,
    value: (f) => Boolean(f.bold || f.black || (f.name && BOLD_RE.test(f.name))),
  },
  italic: {
    known: (f) => f.name !== undefined || f.italic !== undefined,
    value: (f) => Boolean(f.italic || (f.name && ITALIC_RE.test(f.name))),
  },
};

/** フォントの太字・斜体フラグを commonObjs から引く。分からなければ undefined（キャッシュしない） */
function lookupFontFlag(
  flag: FontFlag,
  commonObjs: { has(id: string): boolean; get(id: string): unknown },
  fontId: string,
  cache: Map<string, boolean | undefined>,
): boolean | undefined {
  const hit = cache.get(fontId);
  if (hit !== undefined) return hit;
  try {
    if (!commonObjs.has(fontId)) return undefined;
    const f = commonObjs.get(fontId) as PdfFontLike | null;
    if (!f) return undefined;
    const rule = FLAG_RULES[flag];
    if (!rule.known(f)) return undefined;
    const v = rule.value(f);
    cache.set(fontId, v);
    return v;
  } catch {
    return undefined;
  }
}

interface GlyphLike {
  unicode?: unknown;
}

interface StreamChar {
  c: string;
  color: string;
}

/** operator list から、塗り色つきの文字ストリーム（空白除く、jpNfkc 済み 1 文字ずつ）を作る */
function buildColorStream(fnArray: ArrayLike<number>, argsArray: ArrayLike<unknown>): StreamChar[] {
  const out: StreamChar[] = [];
  // PDF 由来色の既定値（色のハードコード禁止の例外）
  let color = '#000000';
  const stack: string[] = [];
  const pushGlyphs = (arg: unknown) => {
    if (!Array.isArray(arg)) return;
    for (const g of arg) {
      if (typeof g !== 'object' || g === null) continue;
      const u = (g as GlyphLike).unicode;
      if (typeof u !== 'string') continue;
      for (const ch of jpNfkc(u)) {
        if (/\s/.test(ch)) continue;
        out.push({ c: ch, color });
      }
    }
  };
  for (let i = 0; i < fnArray.length; i++) {
    const op = fnArray[i];
    const args = argsArray[i] as unknown[] | null | undefined;
    switch (op) {
      case OP_SAVE:
      case OP_FORM_BEGIN:
        stack.push(color);
        break;
      case OP_RESTORE:
      case OP_FORM_END:
        if (stack.length > 0) color = stack.pop() as string;
        break;
      case OP_SET_FILL_RGB: {
        const v = args?.[0];
        if (typeof v === 'string' && COLOR_RE.test(v)) color = v.toLowerCase();
        break;
      }
      case OP_SHOW_TEXT:
      case OP_SHOW_SPACED_TEXT:
      case OP_NEXT_LINE_SHOW_TEXT:
      case OP_NEXT_LINE_SET_SPACING_SHOW_TEXT:
        if (args && args.length > 0) pushGlyphs(args[args.length - 1]);
        break;
    }
  }
  return out;
}

/** str の UTF-16 単位ごとの色。stream を順に追い、見つからなければ直前の色を使う */
function matchColors(str: string, stream: StreamChar[], ptr: { i: number; last: string }): string[] {
  const colors: string[] = [];
  for (const ch of str) {
    let col = ptr.last;
    if (!/\s/.test(ch)) {
      const hit = matchNext(stream, ptr.i, ch, LOOKAHEAD);
      if (hit) {
        col = stream[hit.index].color;
        ptr.i = hit.next;
      }
      ptr.last = col;
    }
    for (let u = 0; u < ch.length; u++) colors.push(col);
  }
  return colors;
}

type Mat = [number, number, number, number, number, number];
const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

/** m を先に適用し、続けて n を適用する合成 */
function mulMat(m: Mat, n: Mat): Mat {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

function asMat(v: unknown): Mat | null {
  if (!Array.isArray(v) || v.length < 6) return null;
  const m = v.slice(0, 6).map(Number);
  return m.every((x) => Number.isFinite(x)) ? (m as Mat) : null;
}

interface ImagePlacement {
  /** page.objs / commonObjs の id。インライン画像は undefined */
  objId?: string;
  /** インライン画像のデータ */
  inline?: unknown;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** 表示サイズ（pt） */
  dw: number;
  dh: number;
}

/** operator list から画像の配置（ページ座標の bbox）を集める。マスク画像は見ない */
function collectImagePlacements(fnArray: ArrayLike<number>, argsArray: ArrayLike<unknown>): ImagePlacement[] {
  const out: ImagePlacement[] = [];
  let ctm: Mat = IDENTITY;
  const stack: Mat[] = [];
  for (let i = 0; i < fnArray.length; i++) {
    const op = fnArray[i];
    const args = argsArray[i] as unknown[] | null | undefined;
    switch (op) {
      case OP_SAVE:
        stack.push(ctm);
        break;
      case OP_FORM_BEGIN: {
        stack.push(ctm);
        const m = asMat(args?.[0]);
        if (m) ctm = mulMat(m, ctm);
        break;
      }
      case OP_RESTORE:
      case OP_FORM_END:
        if (stack.length > 0) ctm = stack.pop() as Mat;
        break;
      case OP_TRANSFORM: {
        const m = asMat(args);
        if (m) ctm = mulMat(m, ctm);
        break;
      }
      case OP_PAINT_IMAGE_XOBJECT:
      case OP_PAINT_INLINE_IMAGE_XOBJECT: {
        const first = args?.[0];
        const xs: number[] = [];
        const ys: number[] = [];
        for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          xs.push(ctm[0] * u + ctm[2] * v + ctm[4]);
          ys.push(ctm[1] * u + ctm[3] * v + ctm[5]);
        }
        const x0 = Math.min(...xs);
        const x1 = Math.max(...xs);
        const y0 = Math.min(...ys);
        const y1 = Math.max(...ys);
        if (![x0, x1, y0, y1].every((x) => Number.isFinite(x))) break;
        const p: ImagePlacement = {
          x0, y0, x1, y1,
          dw: Math.hypot(ctm[0], ctm[1]),
          dh: Math.hypot(ctm[2], ctm[3]),
        };
        if (op === OP_PAINT_IMAGE_XOBJECT) {
          if (typeof first !== 'string') break;
          p.objId = first;
        } else {
          p.inline = first;
        }
        out.push(p);
        break;
      }
    }
  }
  return out;
}

interface ObjStore {
  has?(id: string): boolean;
  get(id: string, cb?: (v: unknown) => void): unknown;
}

const OBJ_TIMEOUT_MS = 5000;

/** objs.get のコールバック版を Promise 化（未解決なら resolve を待つ。待ちすぎたら null） */
function getObj(store: ObjStore, id: string): Promise<unknown> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), OBJ_TIMEOUT_MS);
    try {
      store.get(id, (v: unknown) => {
        clearTimeout(timer);
        resolve(v);
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

function toRawImage(v: unknown): RawImage | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as { width?: unknown; height?: unknown; data?: unknown; kind?: unknown; bitmap?: unknown };
  if (typeof o.width !== 'number' || typeof o.height !== 'number' || !(o.width > 0) || !(o.height > 0)) return null;
  const img: RawImage = { width: o.width, height: o.height };
  if (o.data instanceof Uint8ClampedArray || o.data instanceof Uint8Array) img.data = o.data;
  if (typeof o.kind === 'number') img.kind = o.kind;
  if (o.bitmap !== undefined) img.bitmap = o.bitmap;
  if (img.data === undefined && img.bitmap === undefined) return null;
  return img;
}

/** 画像を取るとき、進捗のうち文字抽出に割り当てる割合（残りは画像の取得・エンコード） */
const TEXT_PHASE_SHARE = 0.9;
const MIN_IMAGE_PT = 40;
const BACKGROUND_RATIO = 0.85;
const REPEAT_PAGES = 3;
const BACKGROUND_TEXT_CHARS = 200;

export interface ExtractedImage {
  page: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** ページ幅（pt） */
  pageWidth: number;
  blob: Blob;
}

/** ふるいを通った画像の配置（まだ取得・エンコードしていない） */
interface ImageCandidate {
  page: number;
  pageWidth: number;
  placement: ImagePlacement;
  /** ページ内の配置の通し番号。ページを開き直すと objId が振り直されるので、再取得のとき配置をこの番号で引く */
  index: number;
  /** 繰り返し判定用キー */
  key: string;
}

interface ExtractResult {
  pages: PageData[];
  /** サイズ・背景・繰り返しのふるいを通り、エンコードできた画像（ページ順・出現順）。encodeImage が無ければ空 */
  images: ExtractedImage[];
  /** ふるい前の画像描画数（マスク除く） */
  imagesFound: number;
  /** 読み込みに失敗して飛ばしたページ（1 始まり） */
  failedPages: number[];
  /**
   * getOperatorList に失敗したページ（1 始まり）。文字の色・太字を付けられないだけでなく、
   * 画像の配置も検出できないので、そのページの画像は出ない。issues に載せて利用者に知らせる
   */
  stylelessPages: number[];
  /** 取得・エンコードに失敗して捨てた画像の枚数 */
  imageFailures: number;
}

/** page.cleanup() の失敗で変換全体を落とさない。失敗は警告に残す */
function safeCleanup(page: PDFPageProxy | undefined): void {
  try {
    page?.cleanup();
  } catch (e) {
    console.warn('page.cleanup() に失敗しました', e);
  }
}

type TextContentLike = Awaited<ReturnType<PDFPageProxy['getTextContent']>>;

/** ページとテキスト内容を取る。失敗したら null（途中まで取れたページは片付ける） */
async function loadPage(doc: PDFDocumentProxy, p: number): Promise<{ page: PDFPageProxy; tc: TextContentLike } | null> {
  let page: PDFPageProxy | undefined;
  try {
    page = await doc.getPage(p);
    const tc = await page.getTextContent();
    return { page, tc };
  } catch {
    safeCleanup(page);
    return null;
  }
}

const BBOX_TOLERANCE_PT = 0.5;

/** 2 つの配置の bbox が許容誤差内で一致するか */
function samePlacement(a: ImagePlacement, b: ImagePlacement): boolean {
  return (
    Math.abs(a.x0 - b.x0) <= BBOX_TOLERANCE_PT &&
    Math.abs(a.y0 - b.y0) <= BBOX_TOLERANCE_PT &&
    Math.abs(a.x1 - b.x1) <= BBOX_TOLERANCE_PT &&
    Math.abs(a.y1 - b.y1) <= BBOX_TOLERANCE_PT
  );
}

/** 同じ表示サイズ・位置の画像が REPEAT_PAGES ページ以上に出るなら飾り・ロゴとして捨てる */
function dropRepeated(candidates: ImageCandidate[]): ImageCandidate[] {
  const pagesByKey = new Map<string, Set<number>>();
  for (const c of candidates) {
    const set = pagesByKey.get(c.key) ?? new Set<number>();
    set.add(c.page);
    pagesByKey.set(c.key, set);
  }
  return candidates.filter((c) => (pagesByKey.get(c.key)?.size ?? 0) < REPEAT_PAGES);
}

/**
 * 画像 1 枚の取得とエンコード。objId ごとに結果をキャッシュする（同じ画像を何度も描くページ・共有画像のため）。失敗は null。
 * pl は開き直したページの operator list から作った、c と同じ配置（objId はこちらのものを使う）。
 */
async function encodeCandidate(
  page: PDFPageProxy,
  c: ImageCandidate,
  pl: ImagePlacement,
  encodeImage: (img: RawImage) => Promise<Blob | null>,
  cache: Map<string, Blob | null>,
): Promise<ExtractedImage | null> {
  // ページ内の id（page.objs）はページ単位の連番なのでページ番号を付ける。g_ は文書共通（commonObjs）
  const cacheKey = pl.objId === undefined ? undefined : pl.objId.startsWith('g_') ? pl.objId : `${c.page}:${pl.objId}`;
  let blob = cacheKey === undefined ? undefined : cache.get(cacheKey);
  if (blob === undefined) {
    try {
      let obj: unknown = pl.inline;
      if (pl.objId !== undefined) {
        const store = (pl.objId.startsWith('g_') ? page.commonObjs : page.objs) as unknown as ObjStore;
        obj = await getObj(store, pl.objId);
      }
      const raw = toRawImage(obj);
      blob = raw ? await encodeImage(raw) : null;
    } catch {
      blob = null;
    }
    if (cacheKey !== undefined) cache.set(cacheKey, blob);
  }
  if (!blob) return null;
  return { page: c.page, x0: pl.x0, y0: pl.y0, x1: pl.x1, y1: pl.y1, pageWidth: c.pageWidth, blob };
}

/** 画像を取りたいページを開き直し、ふるいを通った画像だけ取得・エンコードする。失敗は画像ごとに数える */
async function encodeImages(
  doc: PDFDocumentProxy,
  candidates: ImageCandidate[],
  encodeImage: (img: RawImage) => Promise<Blob | null>,
  opts: { onStep?: (done: number, total: number) => void } = {},
): Promise<{ images: ExtractedImage[]; failures: number }> {
  const byPage = new Map<number, ImageCandidate[]>();
  for (const c of candidates) byPage.set(c.page, [...(byPage.get(c.page) ?? []), c]);
  const cache = new Map<string, Blob | null>();
  const images: ExtractedImage[] = [];
  let failures = 0;
  let donePages = 0;
  for (const [p, cs] of byPage) {
    let page: PDFPageProxy | undefined;
    let placements: ImagePlacement[];
    try {
      page = await doc.getPage(p);
      // 画像の実体は operator list の処理中にページの objs へ入る。objId は開くたびに振り直される
      const ol = await page.getOperatorList();
      placements = collectImagePlacements(ol.fnArray, ol.argsArray);
    } catch {
      failures += cs.length;
      safeCleanup(page);
      opts.onStep?.(++donePages, byPage.size);
      continue;
    }
    for (const c of cs) {
      const fresh = placements[c.index];
      // 開き直しで配置の並びが変わっていたら別の画像を拾うので、bbox が一致したときだけ採る
      const e = fresh && samePlacement(fresh, c.placement) ? await encodeCandidate(page, c, fresh, encodeImage, cache) : null;
      if (e) images.push(e);
      else failures++;
    }
    safeCleanup(page);
    opts.onStep?.(++donePages, byPage.size);
  }
  return { images, failures };
}

/**
 * pdfjs の各ページから TextRun を取り出す。
 * item 境界・hasEOL は信用せず、transform / width / height から座標だけ使う。
 */
export async function extractPages(
  doc: PDFDocumentProxy,
  opts: {
    encodeImage?: (img: RawImage) => Promise<Blob | null>;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<ExtractResult> {
  const total = doc.numPages;
  const boldCache = new Map<string, boolean | undefined>();
  const italicCache = new Map<string, boolean | undefined>();
  const pages: PageData[] = [];
  const encodeImage = opts.encodeImage;
  const candidates: ImageCandidate[] = [];
  const failedPages: number[] = [];
  const stylelessPages: number[] = [];
  let imagesFound = 0;
  // 進捗は「total ページ中 done」のまま。画像を取るときは文字抽出で 9 割、画像のエンコードで残り 1 割を使う
  const textShare = encodeImage ? TEXT_PHASE_SHARE : 1;
  const textPhaseDone = (p: number) => Math.floor(p * textShare);

  for (let p = 1; p <= total; p++) {
    const loaded = await loadPage(doc, p);
    if (!loaded) {
      failedPages.push(p);
      opts.onProgress?.(textPhaseDone(p), total);
      continue;
    }
    const { page, tc } = loaded;
    const [vx0, vy0, vx1, vy1] = page.view;

    let stream: StreamChar[] = [];
    const pw = vx1 - vx0;
    const ph = vy1 - vy0;
    let placements: ImagePlacement[] = [];
    try {
      const ol = await page.getOperatorList();
      stream = buildColorStream(ol.fnArray, ol.argsArray);
      placements = collectImagePlacements(ol.fnArray, ol.argsArray);
    } catch {
      // 太字・書式検出・画像検出は努力目標。本文は読めるが書式は付かない
      stylelessPages.push(p);
    }
    const runs: TextRun[] = [];
    // PDF 由来色の既定値（色のハードコード禁止の例外）
    const ptr = { i: 0, last: '#000000' };
    for (const it of tc.items) {
      if (!isRawItem(it)) continue;
      // 色は並べ替え前の item 順で文字ストリームと突き合わせる（空白だけの item も読み飛ばさない）
      const colors = stream.length > 0 ? matchColors(it.str, stream, ptr) : undefined;
      if (it.str.trim() === '') continue;
      const [a, b, c, d, e, f] = it.transform;
      // 回転・縦書きは v1 対象外。c だけが立つのは文字を傾けた斜体なので本文として残す
      if (Math.abs(b) > Math.abs(a) * 0.3) continue;
      const fontSize = Math.hypot(a, b) || it.height;
      if (!(fontSize > 0)) continue;
      const bold = lookupFontFlag('bold', page.commonObjs, it.fontName, boldCache) ?? false;
      const italic =
        Math.abs(c) > Math.abs(d) * 0.15 || (lookupFontFlag('italic', page.commonObjs, it.fontName, italicCache) ?? false);
      runs.push({
        str: it.str,
        x: e,
        y: f,
        w: it.width,
        fontSize,
        bold,
        italic,
        colors,
      });
    }
    pages.push({ page: p, width: pw, height: ph, yMin: vy0, runs });
    imagesFound += placements.length;
    for (const [index, pl] of placements.entries()) {
      if (pl.dw < MIN_IMAGE_PT || pl.dh < MIN_IMAGE_PT) continue;
      if ((pl.x1 - pl.x0) * (pl.y1 - pl.y0) >= pw * ph * BACKGROUND_RATIO) {
        // 大きな画像は、上に本文が載っているときだけ本文の背景として捨てる（表紙などは残す）
        let chars = 0;
        for (const r of runs) {
          if (r.x >= pl.x0 && r.x <= pl.x1 && r.y >= pl.y0 && r.y <= pl.y1) chars += r.str.replace(/\s/g, '').length;
        }
        if (chars >= BACKGROUND_TEXT_CHARS) continue;
      }
      candidates.push({
        page: p,
        pageWidth: pw,
        placement: pl,
        index,
        key: [pl.dw, pl.dh, pl.x0, pl.y0].map((v) => Math.round(v / 2)).join(','),
      });
    }

    safeCleanup(page);
    opts.onProgress?.(textPhaseDone(p), total);
  }

  // 繰り返し画像は取得・エンコードの前に捨てる。画像を取らない指定（encodeImage なし）なら何もしない
  const kept = encodeImage ? dropRepeated(candidates) : [];
  const { images, failures } = encodeImage
    ? await encodeImages(doc, kept, encodeImage, {
        onStep: (done, n) => opts.onProgress?.(Math.floor(total * (TEXT_PHASE_SHARE + (1 - TEXT_PHASE_SHARE) * (done / n))), total),
      })
    : { images: [], failures: 0 };
  opts.onProgress?.(total, total);
  return { pages, images, imagesFound, failedPages, stylelessPages, imageFailures: failures };
}
