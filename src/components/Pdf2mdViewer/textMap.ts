/**
 * ブロック要素内の text node を連結した文字列と、offset → node の対応表。
 * DOM を書き換えず、Range だけで位置を扱うための共通部品（メモ・検索ハイライトで使う）。
 */
/** 本文ブロック要素を示す属性名とセレクタ */
export const BLOCK_ATTR = 'data-block'
export const BLOCK_SELECTOR = `[${BLOCK_ATTR}]`

export interface TextMap {
  nodes: Text[]
  /** nodes[k] の先頭が連結文字列の何文字目か */
  starts: number[]
  text: string
}

export function buildTextMap(el: Element): TextMap {
  const nodes: Text[] = []
  const starts: number[] = []
  let text = ''
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text
    nodes.push(t)
    starts.push(text.length)
    text += t.nodeValue ?? ''
  }
  return { nodes, starts, text }
}

/** 連結文字列上の offset に対応する (node, offset)。境界は preferEnd なら手前の node、そうでなければ次の node に寄せる */
export function pointAt(map: TextMap, offset: number, preferEnd: boolean): { node: Text; offset: number } | null {
  const { nodes, starts } = map
  if (nodes.length === 0) return null
  for (let k = 0; k < nodes.length; k++) {
    const len = nodes[k].length
    const from = starts[k]
    // 境界は終端側なら手前の node、始端側なら次の node に寄せる
    const inside = preferEnd ? offset > from && offset <= from + len : offset >= from && offset < from + len
    if (inside) return { node: nodes[k], offset: offset - from }
  }
  const last = nodes.length - 1
  if (offset <= 0) return { node: nodes[0], offset: 0 }
  return { node: nodes[last], offset: nodes[last].length }
}

/** ブロック要素 el の先頭から (node, offset) までの文字数 */
export function offsetInBlock(el: Element, node: Node, offset: number): number {
  const r = document.createRange()
  r.selectNodeContents(el)
  r.setEnd(node, offset)
  return r.toString().length
}

const BLOCK_ID_PREFIX = 'b-'

/** ブロック番号 → DOM の id */
export function blockDomId(index: number): string {
  return `${BLOCK_ID_PREFIX}${index}`
}

/** ブロック要素の id → ブロック番号 */
export function blockIndexOf(el: Element): number {
  return Number(el.id.slice(BLOCK_ID_PREFIX.length))
}
