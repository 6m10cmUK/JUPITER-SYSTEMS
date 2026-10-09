import { useEffect, useMemo, useState } from 'react'
import type { Block } from '../../lib/pdf2md/types'
import { BREAKPOINT_LG, useMediaQuery } from '../../hooks/useMediaQuery'
import { NotesPanel } from './NotesPanel'
import { stickyTopHeight } from './stickyOffset'
import { blockDomId } from './textMap'
import type { NoteView } from './useNotes'

interface Props {
  blocks: Block[]
  notes: readonly NoteView[]
  onOpenNote: (id: string) => void
  onRemoveNote: (id: string) => void
  onClearNotes: () => void
}

type Tab = 'toc' | 'notes'

export function TocSidebar({ blocks, notes, onOpenNote, onRemoveNote, onClearNotes }: Props) {
  const [tab, setTab] = useState<Tab>('toc')
  const isLg = useMediaQuery(BREAKPOINT_LG)
  // 開閉は狭い画面だけの操作。初期状態だけ幅に合わせる
  const [open, setOpen] = useState(isLg)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const items = useMemo(
    () =>
      blocks
        .map((b, index) => ({ b, index }))
        .filter(({ b }) => b.kind === 'heading' && (b.level ?? 1) <= 3),
    [blocks],
  )

  useEffect(() => {
    const els = items.map(({ index }) => document.getElementById(blockDomId(index)))
    let raf = 0
    const update = () => {
      raf = 0
      const line = stickyTopHeight() + 24
      // バーの直下の線を越えた最後の見出しを現在地にする
      let found: number | null = null
      for (let k = 0; k < els.length; k++) {
        const el = els[k]
        if (!el) continue
        if (el.getBoundingClientRect().top > line) break
        found = items[k].index
      }
      setActiveIndex(found)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [items])

  return (
    <aside className="pdf2md-ui pdf2md-toc lg:w-64 lg:shrink-0 lg:sticky lg:self-start lg:overflow-y-auto bg-white rounded-xl shadow-sm p-3">
      <div className="flex items-center gap-1 text-sm font-semibold bg-white lg:sticky lg:-top-3 lg:z-10 lg:-mx-3 lg:-mt-3 lg:px-3 lg:pt-3 lg:pb-2 lg:border-b lg:border-gray-100">
        {(['toc', 'notes'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t)
              setOpen(true)
            }}
            className={`rounded px-2 py-1 ${
              tab === t ? 'bg-jupiter-100 text-jupiter-700' : 'text-gray-600 hover:bg-jupiter-50'
            }`}
          >
            {t === 'toc' ? '目次' : `メモ ${notes.length}`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="ml-auto lg:hidden text-xs font-normal text-gray-500"
        >
          {open ? '閉じる' : '開く'}
        </button>
      </div>
      {tab === 'notes' && (
        <NotesPanel
          notes={notes}
          open={open}
          onOpenNote={onOpenNote}
          onRemoveNote={onRemoveNote}
          onClearNotes={onClearNotes}
        />
      )}
      <nav className={`${open && tab === 'toc' ? 'block' : 'hidden'} ${tab === 'toc' ? 'lg:block' : ''} mt-2`}>
        {items.length === 0 && <p className="text-xs text-gray-500">見出しはありません</p>}
        <ul className="space-y-0.5">
          {items.map(({ b, index }) => (
            <li key={index} style={{ paddingLeft: `${((b.level ?? 1) - 1) * 12}px` }}>
              <button
                type="button"
                onClick={() => document.getElementById(blockDomId(index))?.scrollIntoView({ block: 'start' })}
                className={`w-full text-left text-sm rounded px-2 py-1 truncate hover:bg-jupiter-50 ${
                  activeIndex === index
                    ? 'bg-jupiter-100 text-jupiter-700 font-semibold'
                    : 'text-gray-600'
                }`}
                title={b.text}
              >
                {b.text}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
