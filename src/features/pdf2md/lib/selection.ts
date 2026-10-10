import type { NewNotePanel } from './notePanel'
import { BLOCK_ATTR, BLOCK_SELECTOR, blockIndexOf, offsetInBlock } from './textMap'

/** DOM の選択・座標から、メモの位置（ブロック番号と offset）を読む */

function blockOf(node: Node, container: HTMLElement): HTMLElement | null {
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
  const b = el?.closest<HTMLElement>(BLOCK_SELECTOR) ?? null
  return b && container.contains(b) ? b : null
}

function siblingBlock(el: HTMLElement, dir: 'previousElementSibling' | 'nextElementSibling'): HTMLElement | null {
  let p = el[dir]
  while (p && !p.hasAttribute(BLOCK_ATTR)) p = p[dir]
  return p as HTMLElement | null
}

/** 非空の選択が data-block 内に収まっていれば、新規メモのパネル状態（ブロック番号と offset）で返す */
export function readSelection(container: HTMLElement): NewNotePanel | null {
  const s = window.getSelection()
  if (!s || s.rangeCount === 0 || s.isCollapsed) return null
  const r = s.getRangeAt(0)
  if (!container.contains(r.commonAncestorContainer)) return null
  let a = blockOf(r.startContainer, container)
  let b = blockOf(r.endContainer, container)
  if (!a || !b) return null
  let so = offsetInBlock(a, r.startContainer, r.startOffset)
  let eo = offsetInBlock(b, r.endContainer, r.endOffset)
  // 三連打などで終端が次ブロックの先頭に落ちる／始端が前ブロックの末尾に落ちるのを寄せる
  if (a !== b && eo === 0) {
    const p = siblingBlock(b, 'previousElementSibling')
    if (!p) return null
    b = p
    eo = p.textContent?.length ?? 0
  }
  if (a !== b && so === (a.textContent?.length ?? 0)) {
    const n = siblingBlock(a, 'nextElementSibling')
    if (!n) return null
    a = n
    so = 0
  }
  const start = { block: blockIndexOf(a), offset: so }
  const end = { block: blockIndexOf(b), offset: eo }
  if (start.block > end.block || (start.block === end.block && start.offset >= end.offset)) return null
  if (r.toString().trim() === '') return null
  return { kind: 'new', start, end, range: r.cloneRange() }
}

/** 画面座標 (x, y) にあるメモの id。重なっていれば短いほう */
export function findNoteAt(ranges: ReadonlyMap<string, Range>, x: number, y: number): string | null {
  let node: Node | null = null
  let off = 0
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y)
    if (p) {
      node = p.offsetNode
      off = p.offset
    }
  } else if (doc.caretRangeFromPoint) {
    const r = doc.caretRangeFromPoint(x, y)
    if (r) {
      node = r.startContainer
      off = r.startOffset
    }
  }
  if (!node) return null
  let best: { id: string; len: number } | null = null
  for (const [id, r] of ranges) {
    try {
      if (r.comparePoint(node, off) !== 0) continue
    } catch {
      continue
    }
    // 端の caret に丸められた誤判定を、実際の描画矩形で絞る
    const hit = Array.from(r.getClientRects()).some(
      (c) => x >= c.left - 1 && x <= c.right + 1 && y >= c.top - 1 && y <= c.bottom + 1,
    )
    if (!hit) continue
    const len = r.toString().length
    if (!best || len < best.len) best = { id, len }
  }
  return best?.id ?? null
}
