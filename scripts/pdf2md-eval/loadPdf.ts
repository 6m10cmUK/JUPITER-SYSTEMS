import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'

const require = createRequire(import.meta.url)
const pkgDir = path.dirname(require.resolve('pdfjs-dist/package.json'))
// Node では末尾スラッシュ付きのファイルパスを渡す
const cMapUrl = path.join(pkgDir, 'cmaps') + path.sep
const standardFontDataUrl = path.join(pkgDir, 'standard_fonts') + path.sep

export async function loadPdf(file: string): Promise<PDFDocumentProxy> {
  const data = new Uint8Array(await readFile(file))
  const task = pdfjs.getDocument({
    data,
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
    // 太字検出（core の extract）がフォント名を読むのに必要
    fontExtraProperties: true,
    useSystemFonts: false,
    verbosity: 0,
  })
  return task.promise
}

/** 全ページ getTextContent の str 連結 */
export async function rawText(doc: PDFDocumentProxy): Promise<string> {
  const parts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const tc = await page.getTextContent()
    for (const it of tc.items) if ('str' in it) parts.push(it.str)
    page.cleanup()
  }
  return parts.join('')
}


export async function closePdf(doc: PDFDocumentProxy): Promise<void> {
  await doc.loadingTask.destroy()
}
