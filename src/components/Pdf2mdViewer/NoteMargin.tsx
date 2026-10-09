import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { NoteForm } from './NoteForm'
import type { NoteView } from './useNotes'
import type { NotePanelState } from './notePanel'

interface Props {
  /** 幅が足りてカードを出すとき true */
  wide: boolean
  articleRef: RefObject<HTMLElement | null>
  views: readonly NoteView[]
  ranges: Map<string, Range>
  panel: NotePanelState
  setPanel: (p: NotePanelState) => void
  onHover: (id: string | null) => void
  /** 開いているパネルの内容を保存して閉じる */
  onSave: (body: string) => void
  /** 開いているパネルのメモを削除して閉じる（新規なら閉じるだけ） */
  onRemove: () => void
  onClose: () => void
}

const GAP = 8
const NEW_ID = '\0new'

interface Item {
  id: string
  range: Range
}

function Card(p: {
  view: NoteView
  editing: boolean
  top: number | undefined
  setEl: (id: string, el: HTMLElement | null) => void
  onOpen: () => void
  onHover: (id: string | null) => void
  onSave: (body: string) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { note } = p.view
  const long = note.body.length > 80 || note.body.split('\n').length > 3
  return (
    <div
      ref={(el) => p.setEl(note.id, el)}
      onMouseEnter={() => p.onHover(note.id)}
      onMouseLeave={() => p.onHover(null)}
      onFocus={() => p.onHover(note.id)}
      onBlur={() => p.onHover(null)}
      data-note-card
      style={{ top: p.top ?? 0, visibility: p.top === undefined ? 'hidden' : 'visible' }}
      className="pdf2md-ui absolute left-0 right-0 rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-sm"
    >
      {p.editing ? (
        <NoteForm initial={note.body} canDelete onSave={p.onSave} onDelete={p.onDelete} onClose={p.onClose} />
      ) : (
        <>
          <button type="button" onClick={p.onOpen} className="block w-full text-left">
            <div
              className={`whitespace-pre-wrap break-words text-gray-800 ${expanded ? '' : 'line-clamp-3'}`}
            >
              {note.body}
            </div>
          </button>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-1 text-xs text-jupiter-600 hover:text-jupiter-700"
            >
              {expanded ? '折りたたむ' : '続きを表示'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

/** 本文の右の余白に、メモを対象行の高さへ揃えて並べる（Google ドキュメントのコメント欄風） */
export function NoteMargin(p: Props) {
  const { wide, articleRef, views, ranges, panel, setPanel } = p
  const colRef = useRef<HTMLDivElement>(null)
  const cardEls = useRef(new Map<string, HTMLElement>())
  const [tops, setTops] = useState<Map<string, number>>(new Map())

  const items = useMemo(() => {
    const list: Item[] = []
    for (const v of views) {
      const r = v.range ? ranges.get(v.note.id) : undefined
      if (r) list.push({ id: v.note.id, range: r })
    }
    if (panel?.kind === 'new') list.push({ id: NEW_ID, range: panel.range })
    return list
  }, [views, ranges, panel])
  const itemIds = useMemo(() => new Set(items.map((i) => i.id)), [items])

  const recalc = useCallback(() => {
    const col = colRef.current
    if (!col || !wide) return
    const colTop = col.getBoundingClientRect().top
    const list = items
      .map((it) => {
        const rect = it.range.getClientRects()[0] ?? it.range.getBoundingClientRect()
        return { id: it.id, top: rect.top - colTop, h: cardEls.current.get(it.id)?.offsetHeight ?? 0 }
      })
      .sort((a, b) => a.top - b.top)
    const next = new Map<string, number>()
    let y = -Infinity
    for (const it of list) {
      const t = Math.max(it.top, y)
      next.set(it.id, Math.round(t))
      y = t + it.h + GAP
    }
    setTops((prev) => {
      if (prev.size === next.size && [...next].every(([k, v]) => prev.get(k) === v)) return prev
      return next
    })
  }, [wide, items])

  // 位置の再計算はスクロールでは行わない（カードは本文と同じスクロールで動く）
  useLayoutEffect(() => {
    recalc()
    const article = articleRef.current
    if (!article || !wide) return
    const ro = new ResizeObserver(recalc)
    ro.observe(article)
    cardEls.current.forEach((el) => ro.observe(el))
    window.addEventListener('resize', recalc)
    article.addEventListener('load', recalc, true) // 画像の遅延読み込み
    void document.fonts?.ready.then(recalc)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recalc)
      article.removeEventListener('load', recalc, true)
    }
  }, [recalc, articleRef, wide])

  const { onHover } = p
  useEffect(() => {
    if (!wide) onHover(null)
  }, [wide, onHover])

  const setEl = useCallback((id: string, el: HTMLElement | null) => {
    if (el) cardEls.current.set(id, el)
    else cardEls.current.delete(id)
  }, [])

  if (!wide) return null

  return (
    <div ref={colRef} className="pdf2md-ui relative w-64 shrink-0">
      {views.map((v) => {
        if (!itemIds.has(v.note.id)) return null
        const editing = panel?.kind === 'edit' && panel.id === v.note.id
        return (
          <Card
            key={v.note.id}
            view={v}
            editing={editing}
            top={tops.get(v.note.id)}
            setEl={setEl}
            onOpen={() => setPanel({ kind: 'edit', id: v.note.id })}
            onHover={p.onHover}
            onSave={p.onSave}
            onDelete={p.onRemove}
            onClose={p.onClose}
          />
        )
      })}
      {panel?.kind === 'new' && (
        <div
          ref={(el) => setEl(NEW_ID, el)}
          style={{ top: tops.get(NEW_ID) ?? 0, visibility: tops.has(NEW_ID) ? 'visible' : 'hidden' }}
          className="pdf2md-ui absolute left-0 right-0 rounded-lg border border-jupiter-300 bg-white p-2 shadow-md"
        >
          <NoteForm
            initial=""
            canDelete={false}
            onSave={p.onSave}
            onDelete={p.onRemove}
            onClose={p.onClose}
          />
        </div>
      )}
    </div>
  )
}
