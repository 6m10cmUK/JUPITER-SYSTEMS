import type { PDFDocumentProxy } from 'pdfjs-dist';
import { detectGutters, orderPage } from './columns';
import { extractPages } from './extract';
import { removeFurniture } from './furniture';
import { assignHeadings, bodySizeOf } from './headings';
import { insertImages } from './images';
import { buildRows, rowsToLines } from './lines';
import { normalizeText, stripTocLeaders } from './normalize';
import { applyOutline, readOutline } from './outline';
import { outlineKeySet } from './outlineKeys';
import { buildBlocks } from './paragraphs';
import { attachSpans, bodyColorOf } from './styles';
import type { ConvertDebug, ConvertIssues, ConvertOptions, ConvertResult, Group, WorkBlock } from './types';

const NO_TEXT_MESSAGE = '文字情報のないPDFです（画像だけのPDFは読めません）';
const NO_PAGE_MESSAGE = 'ページを読み込めませんでした';

/**
 * PDF 文書をブロック列に変換する。DOM 非依存。
 * PDF の読み込み（getDocument）は呼び出し側で行う。太字検出には getDocument の fontExtraProperties: true が必要。
 */
export async function convertDocument(
  doc: PDFDocumentProxy,
  options: ConvertOptions = {},
): Promise<ConvertResult> {
  const { pages, images: extractedImages, imagesFound, failedPages, stylelessPages, imageFailures } = await extractPages(doc, {
    encodeImage: options.encodeImage,
    onProgress: options.onProgress,
  });

  if (pages.length === 0) throw new Error(NO_PAGE_MESSAGE);
  if (pages.every((p) => p.runs.length === 0)) throw new Error(NO_TEXT_MESSAGE);

  const bodySize = bodySizeOf(
    pages.flatMap((p) => p.runs.map((r) => ({ fontSize: r.fontSize, chars: r.str.replace(/\s/g, '').length }))),
  );

  const pageGutters = pages.map((p) => {
    const rows = buildRows(p);
    const gutters = detectGutters(rows, bodySize);
    return { rows, gutters };
  });
  const rawLines = pages.map((p, i) => rowsToLines(pageGutters[i].rows, p.page, pageGutters[i].gutters, bodySize));
  const { lines, keys, removedCount } = removeFurniture(pages, rawLines);

  const groups: Group[] = [];
  const columnCounts: number[] = [];
  lines.forEach((ls, i) => {
    const gs = orderPage(ls, pages[i].page, pageGutters[i].gutters);
    columnCounts.push(new Set(gs.filter((g) => !g.spanning).map((g) => g.colKey)).size);
    groups.push(...gs);
  });

  // しおりは段落組みの前に読み、しおりの見出し行を連結させない
  const { entries, unreadable: outlineUnreadable } = await readOutline(doc);
  const paragraphs = buildBlocks(groups, bodySize, outlineKeySet(entries))
    .map((b) => ({ ...b, text: normalizeText(b.text) }))
    .filter((b) => b.text.length > 0);

  const { blocks, sizes } = assignHeadings(paragraphs, bodySize);
  const outlineApplied = entries.length > 0;
  const headed: WorkBlock[] = outlineApplied ? applyOutline(blocks, entries) : blocks;
  const stripped: WorkBlock[] = headed.map((b) => ({ ...b, text: stripTocLeaders(b.text) }));
  const bodyColor = bodyColorOf(pages);
  const { blocks: spanned, coloredBlocks } = attachSpans(stripped, bodyColor);
  const { blocks: finalBlocks, images } = insertImages(spanned, extractedImages, pages);

  const debug: ConvertDebug | undefined = options.debug
    ? {
        pageCount: pages.length,
        bodySize,
        headingSizes: sizes,
        outline: { entries: entries.length, applied: outlineApplied },
        headingCount: headed.filter((b) => b.kind === 'heading').length,
        paragraphCount: headed.filter((b) => b.kind === 'paragraph').length,
        furnitureKeys: keys,
        furnitureRemoved: removedCount,
        columnsPerPage: columnCounts,
        styles: { bodyColor, coloredBlocks },
        images: { found: imagesFound, kept: extractedImages.length },
      }
    : undefined;
  const issues: ConvertIssues = {
    failedPages,
    // 表紙など画像だけのページは画像を出しているので数えない
    pagesWithoutText: pages
      .filter((p) => p.runs.length === 0 && !extractedImages.some((im) => im.page === p.page))
      .map((p) => p.page),
    stylelessPages,
    imageFailures,
    outlineUnreadable,
  };
  return { blocks: finalBlocks, images, issues, debug };
}
