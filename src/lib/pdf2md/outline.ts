import type { PDFDocumentProxy } from 'pdfjs-dist';
import { normalizeKey } from './outlineKeys';
import type { OutlineEntry } from './outlineKeys';
import type { WorkBlock } from './types';

interface RawOutlineItem {
  title?: string;
  dest?: string | unknown[] | null;
  items?: RawOutlineItem[];
}

async function resolvePage(doc: PDFDocumentProxy, dest: RawOutlineItem['dest']): Promise<number | null> {
  try {
    const resolved = typeof dest === 'string' ? await doc.getDestination(dest) : dest;
    if (!Array.isArray(resolved) || resolved.length === 0) return null;
    const head: unknown = resolved[0];
    if (typeof head === 'number') return head + 1;
    if (head && typeof head === 'object') {
      const index = await doc.getPageIndex(head as Parameters<PDFDocumentProxy['getPageIndex']>[0]);
      return index + 1;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * PDF のしおりを深さ優先で平坦化して返す。しおりが無いときは entries が空。
 * しおりの一覧そのものを読めなかったときは unreadable（飛び先を解決できなかった項目が個別に落ちただけでは立てない）。
 */
export async function readOutline(doc: PDFDocumentProxy): Promise<{ entries: OutlineEntry[]; unreadable: boolean }> {
  let outline: RawOutlineItem[] | null;
  try {
    outline = (await doc.getOutline()) as RawOutlineItem[] | null;
  } catch {
    return { entries: [], unreadable: true };
  }
  const entries: OutlineEntry[] = [];
  if (!outline) return { entries, unreadable: false };
  const walk = async (items: RawOutlineItem[], level: number): Promise<void> => {
    for (const item of items) {
      const title = (item.title ?? '').trim();
      if (title) {
        const page = await resolvePage(doc, item.dest);
        if (page !== null) entries.push({ title, level, page });
      }
      if (item.items && item.items.length > 0) await walk(item.items, level + 1);
    }
  };
  await walk(outline, 1);
  return { entries, unreadable: false };
}

/** 元テキストの先頭から、正規化後に length 文字ぶんになる位置（元テキスト上の index）を返す */
function splitIndex(text: string, length: number): number {
  let count = 0;
  const chars = Array.from(text);
  let offset = 0;
  for (let i = 0; i < chars.length; i += 1) {
    if (count >= length) break;
    count += normalizeKey(chars[i]).length;
    offset += chars[i].length;
  }
  return offset;
}

interface WorkItem {
  block: WorkBlock;
  used: boolean;
}

/**
 * しおりを見出しとして blocks に当てはめる。しおりがあれば見出しは必ずしおりどおりにする
 * （既存の見出しはすべて段落に戻し、当たらないしおりは見出しブロックを挿入する）。
 * blocks は破壊しない。
 */
export function applyOutline(blocks: WorkBlock[], entries: OutlineEntry[]): WorkBlock[] {
  if (entries.length === 0) return blocks;

  const items: WorkItem[] = blocks.map((b) => {
    const block: WorkBlock = { ...b };
    if (block.kind === 'heading') {
      block.kind = 'paragraph';
      delete block.level;
    }
    return { block, used: false };
  });

  for (const entry of entries) {
    const target = normalizeKey(entry.title);
    if (!target) continue;
    const level = Math.min(entry.level, 6);
    const toHeading = (b: WorkBlock, text: string): WorkBlock => ({ ...b, kind: 'heading', level, text });
    const toParagraph = (b: WorkBlock, text: string): WorkBlock => {
      const p: WorkBlock = { ...b, kind: 'paragraph', text };
      delete p.level;
      return p;
    };

    const tryPage = (page: number, adjacent = false): boolean => {
      // 隣のページの本文の途中に含まれるだけの一致は、2 文字以下のしおりだと偶然一致（目次の語句など）が多いので使わない
      const allowInner = !adjacent || target.length > 2;
      const candidates: number[] = [];
      items.forEach((it, i) => {
        if (!it.used && it.block.page === page) candidates.push(i);
      });
      const norms = new Map<number, string>(candidates.map((i) => [i, normalizeKey(items[i].block.text)]));

      // 1. 完全一致
      for (const i of candidates) {
        if (norms.get(i) === target) {
          items[i] = { block: toHeading(items[i].block, items[i].block.text), used: true };
          return true;
        }
      }
      // 2. 先頭一致
      for (const i of candidates) {
        const norm = norms.get(i) ?? '';
        if (norm.startsWith(target) && norm.length > target.length) {
          const block = items[i].block;
          const at = splitIndex(block.text, target.length);
          const rest = block.text.slice(at).trim();
          const out: WorkItem[] = [{ block: toHeading(block, block.text.slice(0, at)), used: true }];
          if (rest) out.push({ block: toParagraph(block, rest), used: false });
          items.splice(i, 1, ...out);
          return true;
        }
      }
      // 3. 途中に含む
      for (const i of allowInner ? candidates : []) {
        const norm = norms.get(i) ?? '';
        const found = norm.indexOf(target);
        if (found > 0) {
          const block = items[i].block;
          const start = splitIndex(block.text, found);
          const end = splitIndex(block.text, found + target.length);
          const before = block.text.slice(0, start).trim();
          const after = block.text.slice(end).trim();
          const out: WorkItem[] = [];
          if (before) out.push({ block: toParagraph(block, before), used: false });
          out.push({ block: toHeading(block, block.text.slice(start, end)), used: true });
          if (after) out.push({ block: toParagraph(block, after), used: false });
          items.splice(i, 1, ...out);
          return true;
        }
      }
      // 4. 連続 2〜3 ブロックの連結一致
      for (const i of candidates) {
        let joined = norms.get(i) ?? '';
        for (let n = 2; n <= 3 && i + n <= items.length; n += 1) {
          const tail = items[i + n - 1];
          if (tail.used || tail.block.page > entry.page + 1) break;
          joined += normalizeKey(tail.block.text);
          if (joined === target) {
            const text = items
              .slice(i, i + n)
              .map((it) => it.block.text.replace(/\s+/g, ''))
              .join('');
            items.splice(i, n, { block: toHeading(items[i].block, text), used: true });
            return true;
          }
          if (joined.length > target.length) break;
        }
      }
      return false;
    };

    if (tryPage(entry.page) || tryPage(entry.page - 1, true) || tryPage(entry.page + 1, true)) continue;

    // どこにも当たらないしおりは見出しブロックを挿入する
    let pos = items.findIndex((it) => it.block.page >= entry.page);
    if (pos === -1) pos = items.length;
    for (let i = items.length - 1; i >= pos; i -= 1) {
      if (items[i].used && items[i].block.page === entry.page) {
        pos = i + 1;
        break;
      }
    }
    const ref = items[pos]?.block ?? items[pos - 1]?.block;
    const inserted: WorkBlock = {
      kind: 'heading',
      level,
      text: entry.title,
      page: entry.page,
      fontSize: ref?.fontSize ?? 0,
      bold: ref?.bold ?? false,
      lineCount: 1,
    };
    items.splice(pos, 0, { block: inserted, used: true });
  }

  return items.map((it) => it.block);
}
