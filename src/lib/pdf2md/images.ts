import type { ExtractedImage } from './extract';
import type { Block, ConvertImage, PageData, WorkBlock } from './types';

/** 作業用の top・segs・src を外して公開用の Block にする */
function toBlock(b: WorkBlock): Block {
  const block: WorkBlock = { ...b };
  delete block.top;
  delete block.segs;
  delete block.src;
  return block;
}

/** ページ番号 → そのページのブロックの位置（昇順）。画像の挿入位置を引くための表 */
function indexByPage(blocks: WorkBlock[]): {
  byPage: Map<number, number[]>;
  /** ページ番号が page 未満のブロックのうち最後の位置（無ければ -1） */
  lastBefore: (page: number) => number;
} {
  const byPage = new Map<number, number[]>();
  blocks.forEach((b, i) => {
    const arr = byPage.get(b.page);
    if (arr) arr.push(i);
    else byPage.set(b.page, [i]);
  });
  // ページ昇順に並べ、そこまでの最大位置を持つ（二分探索で引く）
  const pages = [...byPage.keys()].sort((a, b) => a - b);
  const maxUpTo: number[] = [];
  let run = -1;
  for (const p of pages) {
    const idxs = byPage.get(p) as number[];
    run = Math.max(run, idxs[idxs.length - 1]);
    maxUpTo.push(run);
  }
  const lastBefore = (page: number): number => {
    let lo = 0;
    let hi = pages.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (pages[mid] < page) lo = mid + 1;
      else hi = mid;
    }
    return lo === 0 ? -1 : maxUpTo[lo - 1];
  };
  return { byPage, lastBefore };
}

/**
 * 画像を読み順の位置に image ブロックとして挟み、作業用の top・segs・src を取り除く。
 * 挿入位置は、同じページで画像と横方向に重なるブロック（段）のうち、top が画像の上端以上
 * （画像より上）の最後のブロックの直後。段をまたぐ連結段落は、段ごとのかたまり（segs）で判定する。無ければ段の最初のブロックの直前。
 * 重なりは、重なり幅が画像とブロックの幅の小さいほうの半分を超えること。
 * 重なるブロックが無い（segs 未設定を含む）ときはページ内の全ブロックで決める。
 */
export function insertImages(
  blocks: WorkBlock[],
  extracted: ExtractedImage[],
  pages: PageData[],
): { blocks: Block[]; images: ConvertImage[] } {
  if (extracted.length === 0) return { blocks: blocks.map(toBlock), images: [] };

  const counters = new Map<number, number>();
  const placed = extracted.map((e) => {
    const n = (counters.get(e.page) ?? 0) + 1;
    counters.set(e.page, n);
    return { e, id: `p${e.page}-i${n}` };
  });

  // 挿入位置（元ブロック配列のインデックス。その直前に入れる）を求める
  const { byPage, lastBefore } = indexByPage(blocks);
  const slotOf = (e: ExtractedImage): number => {
    const all = byPage.get(e.page);
    if (all) {
      // 画像と同じページで横方向に重なるかたまり（ブロックの page と違うページのかたまりは使わない）
      const overlapSegs = (b: WorkBlock) =>
        (b.segs ?? []).filter((s) => {
          if (s.page !== b.page) return false;
          const ov = Math.min(e.x1, s.right) - Math.max(e.x0, s.left);
          const narrow = Math.min(e.x1 - e.x0, s.right - s.left);
          return ov > narrow / 2;
        });
      const col = all.filter((i) => overlapSegs(blocks[i]).length > 0);
      let lastAbove = -1;
      let idxs = all;
      if (col.length > 0) {
        idxs = col;
        for (const i of col) if (overlapSegs(blocks[i]).some((s) => s.top >= e.y1)) lastAbove = i;
      } else {
        for (const i of all) {
          const t = blocks[i].top;
          if (t !== undefined && t >= e.y1) lastAbove = i;
        }
      }
      return lastAbove >= 0 ? lastAbove + 1 : idxs[0];
    }
    // 同じページにブロックが無い: ページ順で前のブロックの直後
    return lastBefore(e.page) + 1;
  };

  const bySlot = new Map<number, typeof placed>();
  for (const pl of placed) {
    const slot = slotOf(pl.e);
    const arr = bySlot.get(slot) ?? [];
    arr.push(pl);
    bySlot.set(slot, arr);
  }

  const widthOf = new Map(pages.map((p) => [p.page, p.width]));
  const out: Block[] = [];
  const emit = (slot: number) => {
    const arr = bySlot.get(slot);
    if (!arr) return;
    arr.sort((a, b) => b.e.y1 - a.e.y1 || a.e.page - b.e.page);
    for (const { e, id } of arr) {
      const pw = widthOf.get(e.page) || e.pageWidth || 1;
      out.push({
        kind: 'image',
        text: '',
        page: e.page,
        fontSize: 0,
        bold: false,
        lineCount: 0,
        imageId: id,
        displayWidth: Math.min(1, Math.max(0, (e.x1 - e.x0) / pw)),
      });
    }
  };
  for (let i = 0; i < blocks.length; i++) {
    emit(i);
    out.push(toBlock(blocks[i]));
  }
  emit(blocks.length);

  const images: ConvertImage[] = placed.map(({ e, id }) => ({ id, blob: e.blob }));
  return { blocks: out, images };
}
