import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { clearHighlight, setHighlight } from './highlightApi'
import { BLOCK_SELECTOR, buildTextMap } from './textMap'

/** NFKC＋小文字化。正規化後の各文字が元の何文字目に由来するかも返す。 */
function normalizeWithMap(text: string): { norm: string; start: number[]; end: number[] } {
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
interface BlockIndex {
  nodes: Text[]
  norm: string
  owner: number[]
  start: number[]
  end: number[]
}

function buildIndex(container: HTMLElement): BlockIndex[] {
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

function findRanges(index: readonly BlockIndex[], query: string): Range[] {
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

const DEBOUNCE_MS = 150

export function useSearchHighlight(
  containerRef: RefObject<HTMLElement | null>,
  query: string,
  contentKey: unknown,
) {
  const [ranges, setRanges] = useState<Range[]>([])
  const [current, setCurrent] = useState(0)
  const [debounced, setDebounced] = useState(query)
  // blocks（contentKey）が変わるまで使い回す
  const cache = useRef<{ key: unknown; index: BlockIndex[] } | null>(null)
  // Enter で debounce を待たず確定したときの、確定後に進める向き（結果が出た直後の effect で消費する）
  const pendingStep = useRef<1 | -1 | 0>(0)

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    const el = containerRef.current
    let found: Range[] = []
    if (el && debounced) {
      if (!cache.current || cache.current.key !== contentKey) {
        cache.current = { key: contentKey, index: buildIndex(el) }
      }
      found = findRanges(cache.current.index, debounced)
    }
    setRanges(found)
    const step = pendingStep.current
    pendingStep.current = 0
    // 確定直後の Enter は 1 件目、Shift+Enter は最後の件へ
    setCurrent(step < 0 && found.length > 0 ? found.length - 1 : 0)
  }, [containerRef, debounced, contentKey])

  // 入力中の query と確定済みの値が違う間は、古い結果を出さない
  const stale = query !== debounced

  useEffect(() => {
    if (stale) clearHighlight('pdf2md-search')
    else setHighlight('pdf2md-search', ranges)
    return () => clearHighlight('pdf2md-search')
  }, [stale, ranges])

  useEffect(() => {
    const r = stale ? undefined : ranges[current]
    if (!r) {
      clearHighlight('pdf2md-current')
      return
    }
    setHighlight('pdf2md-current', [r])
    r.startContainer.parentElement?.scrollIntoView({ block: 'center' })
    return () => clearHighlight('pdf2md-current')
  }, [stale, ranges, current])

  const step = useCallback(
    (dir: 1 | -1) => {
      if (stale) {
        // debounce を待たず即確定し、確定した結果から動く
        pendingStep.current = dir
        setDebounced(query)
        return
      }
      setCurrent((c) => (ranges.length ? (c + dir + ranges.length) % ranges.length : 0))
    },
    [stale, query, ranges.length],
  )
  const next = useCallback(() => step(1), [step])
  const prev = useCallback(() => step(-1), [step])

  return { count: stale ? 0 : ranges.length, current: stale ? 0 : current, next, prev }
}
