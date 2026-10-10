import { BLOCK_SELECTOR } from './textMap'

/** ブロック文字列の配列をコピー用テキストにする（純粋関数）。 */
export function joinBlocks(texts: readonly string[]): string {
  return texts.filter((t) => t.length > 0).join('\n\n')
}

/**
 * 選択範囲と交わる data-block 要素ごとに、選択部分の文字列を文書順で返す。
 * 本文コンテナと交わらなければ null。
 */
export function selectedBlockTexts(container: HTMLElement, selection: Selection): string[] | null {
  if (selection.rangeCount === 0 || selection.isCollapsed) return null
  const range = selection.getRangeAt(0)
  if (!range.intersectsNode(container)) return null
  const texts: string[] = []
  container.querySelectorAll<HTMLElement>(BLOCK_SELECTOR).forEach((el) => {
    if (!range.intersectsNode(el)) return
    const part = document.createRange()
    part.selectNodeContents(el)
    if (range.compareBoundaryPoints(Range.START_TO_START, part) > 0) {
      part.setStart(range.startContainer, range.startOffset)
    }
    if (range.compareBoundaryPoints(Range.END_TO_END, part) < 0) {
      part.setEnd(range.endContainer, range.endOffset)
    }
    texts.push(part.toString())
  })
  return texts
}

/** クリップボードへ書く。http（安全でない文脈）では Clipboard API が無いので execCommand に落とす */
export async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.setAttribute('readonly', '')
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    if (!document.execCommand('copy')) throw new Error('copy failed')
  } finally {
    ta.remove()
  }
}
