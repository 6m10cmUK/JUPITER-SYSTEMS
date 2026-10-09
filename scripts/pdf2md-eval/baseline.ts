import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'

/** 素朴版: 各ページの TextItem を hasEOL で改行し、ページ間も改行で連結 */
export async function baselineConvert(doc: PDFDocumentProxy): Promise<{ markdown: string }> {
  const lines: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const tc = await page.getTextContent()
    let cur = ''
    for (const it of tc.items) {
      if (!('str' in it)) continue
      cur += it.str
      if (it.hasEOL) {
        lines.push(cur)
        cur = ''
      }
    }
    if (cur) lines.push(cur)
    page.cleanup()
  }
  return { markdown: lines.join('\n') }
}
