import { useEffect, useState, type RefObject } from 'react'
import type { ResolvedRange } from '../lib/notes'
import type { NoteView } from './useNotes'
import { clearHighlight, setHighlight } from '../lib/highlightApi'
import { BLOCK_SELECTOR, blockIndexOf, buildTextMap, pointAt, type TextMap } from '../lib/textMap'

/** 解決済みの範囲を Range に変換する。ブロックごとの対応表は使い回す */
function rangesFor(
  container: HTMLElement,
  items: readonly { id: string; range: ResolvedRange }[],
): Map<string, Range> {
  const maps = new Map<number, TextMap>()
  const els = new Map<number, HTMLElement>()
  container.querySelectorAll<HTMLElement>(BLOCK_SELECTOR).forEach((el) => els.set(blockIndexOf(el), el))
  const mapOf = (b: number): TextMap | null => {
    const hit = maps.get(b)
    if (hit) return hit
    const el = els.get(b)
    if (!el) return null
    const m = buildTextMap(el)
    maps.set(b, m)
    return m
  }
  const out = new Map<string, Range>()
  for (const it of items) {
    const { start, end } = it.range
    const sm = mapOf(start.block)
    const em = mapOf(end.block)
    if (!sm || !em) continue
    const s = pointAt(sm, start.offset, false)
    const e = pointAt(em, end.offset, true)
    if (!s || !e) continue
    const r = document.createRange()
    r.setStart(s.node, s.offset)
    r.setEnd(e.node, e.offset)
    out.set(it.id, r)
  }
  return out
}

/** メモの範囲を CSS Custom Highlight `pdf2md-note` で塗り、id → Range の表を返す。更新のたびに新しい Map を返す */
export function useNoteHighlight(
  containerRef: RefObject<HTMLElement | null>,
  views: readonly NoteView[],
  contentKey: unknown,
): Map<string, Range> {
  const [ranges, setRanges] = useState<Map<string, Range>>(() => new Map())

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const items = views.flatMap((v) => (v.range ? [{ id: v.note.id, range: v.range }] : []))
    const next = rangesFor(el, items)
    setRanges(next)
    // 検索ハイライトより下に敷く
    setHighlight('pdf2md-note', [...next.values()], -1)
    return () => clearHighlight('pdf2md-note')
  }, [containerRef, views, contentKey])

  return ranges
}

/** 今書いている／見ているメモの範囲を濃い色で出す（textarea にフォーカスが移っても残る） */
export function useActiveNoteHighlight(range: Range | null) {
  useEffect(() => {
    if (!range) {
      clearHighlight('pdf2md-note-active')
      return
    }
    setHighlight('pdf2md-note-active', [range], 1)
    return () => clearHighlight('pdf2md-note-active')
  }, [range])
}
