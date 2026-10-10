import { BLOCK_SELECTOR, buildTextMap } from './textMap'

/** NFKC＋小文字化。正規化後の各文字が元の何文字目に由来するかも返す。 */
export function normalizeWithMap(text: string): { norm: string; start: number[]; end: number[] } {
  let norm = ''
  const start: number[] = []
  const end: number[] = []
  let i = 0
  for (const ch of text) {
    const n = ch.normalize('NFKC').toLowerCase()
    for (let k = 0; k < n.length; k++) {
      start.push(i)
      end.push(i + ch.length)
    }
    norm += n
    i += ch.length
  }
  return { norm, start, end }
}

/** ブロックごとの検索用インデックス。正規化テキストと、正規化後の各文字の元位置（node 番号・offset） */
export interface BlockIndex {
  nodes: Text[]
  norm: string
  owner: number[]
  start: number[]
  end: number[]
}

export function buildSearchIndex(container: HTMLElement): BlockIndex[] {
  const out: BlockIndex[] = []
  container.querySelectorAll<HTMLElement>(BLOCK_SELECTOR).forEach((el) => {
    // ブロック内の全テキストノードを連結して検索し、span の境目をまたぐ一致も拾う
    const { nodes } = buildTextMap(el)
    const owner: number[] = []
    const start: number[] = []
    const end: number[] = []
    let norm = ''
    nodes.forEach((node, ni) => {
      const m = normalizeWithMap(node.nodeValue ?? '')
      for (let k = 0; k < m.norm.length; k++) {
        owner.push(ni)
        start.push(m.start[k])
        end.push(m.end[k])
      }
      norm += m.norm
    })
    out.push({ nodes, norm, owner, start, end })
  })
  return out
}

export function findSearchRanges(index: readonly BlockIndex[], query: string): Range[] {
  const q = query.normalize('NFKC').toLowerCase()
  if (!q) return []
  const ranges: Range[] = []
  for (const { nodes, norm, owner, start, end } of index) {
    let from = 0
    for (;;) {
      const idx = norm.indexOf(q, from)
      if (idx < 0) break
      const last = idx + q.length - 1
      const r = document.createRange()
      r.setStart(nodes[owner[idx]], start[idx])
      r.setEnd(nodes[owner[last]], end[last])
      ranges.push(r)
      from = idx + q.length
    }
  }
  return ranges
}
