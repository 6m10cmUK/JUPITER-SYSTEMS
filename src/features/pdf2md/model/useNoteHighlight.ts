import { useEffect, useState, type RefObject } from 'react'
import type { NoteView } from './useNotes'
import { clearHighlight, setHighlight } from '../lib/highlightApi'
import { resolveNoteRanges } from '../lib/noteRanges'

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
    const next = resolveNoteRanges(el, items)
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
