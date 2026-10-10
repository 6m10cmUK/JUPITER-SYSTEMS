import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { clearHighlight, setHighlight } from '../lib/highlightApi'
import { buildSearchIndex, findSearchRanges, type BlockIndex } from '../lib/searchIndex'

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
        cache.current = { key: contentKey, index: buildSearchIndex(el) }
      }
      found = findSearchRanges(cache.current.index, debounced)
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
