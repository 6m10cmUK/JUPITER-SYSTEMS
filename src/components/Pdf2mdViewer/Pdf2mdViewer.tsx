import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type ReactNode } from 'react'
import type { Block } from '../../lib/pdf2md/types'
import { joinBlocks, selectedBlockTexts, writeClipboard } from './copyText'
import { TocSidebar } from './TocSidebar'
import { Toolbar } from './Toolbar'
import { useSearchHighlight } from './useSearchHighlight'
import { useNotes } from './useNotes'
import { useActiveNoteHighlight, useNoteHighlight } from './useNoteHighlight'
import { NoteLayer } from './NoteLayer'
import type { NotePanelState } from './notePanel'
import { NoteMargin } from './NoteMargin'
import { BLOCK_ATTR, blockDomId } from './textMap'
import { TOOLBAR_H_VAR, useHeightVar } from '../../hooks/useHeightVar'
import { BREAKPOINT_XL, useMediaQuery } from '../../hooks/useMediaQuery'
import './Pdf2mdViewer.css'

interface Props {
  fileName: string
  fileId: string | null
  blocks: Block[]
  imageUrls: Record<string, string>
  /** 変換時の警告。空でなければツールバー下に常時表示する */
  warnings: string[]
  onReset: () => void
}

const HEADING_STYLE: Record<'h2' | 'h3' | 'h4', string> = {
  h2: 'mt-8 mb-3 text-2xl font-bold text-gray-900',
  h3: 'mt-6 mb-2 text-xl font-bold text-gray-900',
  h4: 'mt-4 mb-2 text-lg font-semibold text-gray-900',
}

/** 見出しレベル（1以下→h2, 2→h3, 3以上→h4） */
function headingTag(level: number): 'h2' | 'h3' | 'h4' {
  if (level <= 1) return 'h2'
  return level === 2 ? 'h3' : 'h4'
}

const BLOCK_PROPS = { [BLOCK_ATTR]: 'true' }

// color は PDF 由来のデータ色なのでデザインシステムの色ハードコード禁止の対象外
function renderText(b: Block): ReactNode {
  if (!b.spans || b.spans.length === 0) return b.text
  return b.spans.map((s, i) => {
    if (!s.color && !s.bold && !s.italic) return s.text
    const cls = [s.bold ? 'font-bold' : '', s.italic ? 'italic' : ''].filter(Boolean).join(' ')
    return (
      <span key={i} className={cls || undefined} style={s.color ? { color: s.color } : undefined}>
        {s.text}
      </span>
    )
  })
}

export function Pdf2mdViewer(p: Props) {
  const bodyRef = useRef<HTMLElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  useHeightVar(barRef, TOOLBAR_H_VAR)
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  const notify = useCallback((message: string) => {
    setNotice(message)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 5000)
  }, [])
  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])
  const copiedTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(copiedTimer.current), [])
  const search = useSearchHighlight(bodyRef, query, p.blocks)
  const notes = useNotes(p.fileId, p.blocks, notify)
  const noteRanges = useNoteHighlight(bodyRef, notes.views, p.blocks)
  const [panel, setPanel] = useState<NotePanelState>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const wide = useMediaQuery(BREAKPOINT_XL)
  // 書いている・開いているメモ、なければカードにホバー中のメモを濃く出す
  const activeRange = useMemo(() => {
    if (panel?.kind === 'new') return panel.range
    const id = panel?.kind === 'edit' ? panel.id : hoverId
    return id ? (noteRanges.get(id) ?? null) : null
  }, [panel, hoverId, noteRanges])
  useActiveNoteHighlight(activeRange)

  const openNote = useCallback(
    (id: string) => {
      const view = notes.views.find((v) => v.note.id === id)
      if (!view?.range) return
      document.getElementById(blockDomId(view.range.start.block))?.scrollIntoView({ block: 'start' })
      setPanel({ kind: 'edit', id })
    },
    [notes.views],
  )

  const closePanel = useCallback(() => setPanel(null), [])
  // 入力パネルの保存・削除。メモ列（NoteMargin）と浮動パネル（NoteLayer）で共通
  const savePanel = useCallback(
    (body: string) => {
      if (panel?.kind === 'new') notes.add(panel.start, panel.end, body)
      else if (panel?.kind === 'edit') notes.update(panel.id, body)
      setPanel(null)
    },
    [panel, notes],
  )
  const removePanel = useCallback(() => {
    if (panel?.kind === 'edit') notes.remove(panel.id)
    setPanel(null)
  }, [panel, notes])

  const onCopy = (e: ClipboardEvent<HTMLElement>) => {
    const sel = window.getSelection()
    const el = bodyRef.current
    if (!sel || !el) return
    const texts = selectedBlockTexts(el, sel)
    if (!texts || texts.length === 0) return
    try {
      e.clipboardData.setData('text/plain', joinBlocks(texts))
      e.preventDefault()
    } catch (err) {
      console.warn('[pdf2md] 選択コピーに失敗', err)
      notify('コピーできませんでした')
    }
  }

  const copyAll = useCallback(async () => {
    try {
      await writeClipboard(
        joinBlocks(p.blocks.filter((b) => b.kind !== 'image').map((b) => b.text)),
      )
    } catch (err) {
      console.warn('[pdf2md] 全文コピーに失敗', err)
      notify('コピーできませんでした')
      return
    }
    setCopied(true)
    window.clearTimeout(copiedTimer.current)
    copiedTimer.current = window.setTimeout(() => setCopied(false), 1500)
  }, [p.blocks, notify])

  return (
    <div className="min-h-screen bg-gray-50">
      <div ref={barRef} className="pdf2md-bar sticky z-20">
        <Toolbar
          fileName={p.fileName}
          query={query}
          onQueryChange={setQuery}
          searchCount={search.count}
          searchCurrent={search.current}
          onNext={search.next}
          onPrev={search.prev}
          onCopyAll={copyAll}
          onReset={p.onReset}
          copied={copied}
          notice={notice}
          warnings={p.warnings}
        />
      </div>
      <div className="container-jupiter py-6 flex flex-col lg:flex-row gap-6">
        <TocSidebar blocks={p.blocks} notes={notes.views} onOpenNote={openNote} onRemoveNote={notes.remove} onClearNotes={notes.clear} />
        <div className="flex-1 min-w-0 flex gap-4">
          <article
            ref={bodyRef}
            onCopy={onCopy}
            className="flex-1 min-w-0 max-w-3xl bg-white rounded-xl shadow-sm p-6 sm:p-10 text-gray-800 leading-relaxed break-words"
          >
            {p.blocks.map((b, i) => {
              const id = blockDomId(i)
              if (b.kind === 'image') {
                const url = b.imageId ? p.imageUrls[b.imageId] : undefined
                if (!url) return null
                return (
                  <figure key={i} className="pdf2md-ui my-4 flex justify-center">
                    <img
                      src={url}
                      loading="lazy"
                      alt=""
                      style={{ width: `${Math.max(b.displayWidth ?? 0, 0.3) * 100}%` }}
                      className="max-w-full h-auto rounded"
                    />
                  </figure>
                )
              }
              if (b.kind === 'heading') {
                const Tag = headingTag(b.level ?? 1)
                return (
                  <Tag key={i} id={id} {...BLOCK_PROPS} className={HEADING_STYLE[Tag]}>
                    {renderText(b)}
                  </Tag>
                )
              }
              return (
                <p key={i} id={id} {...BLOCK_PROPS} className="mb-3">
                  {renderText(b)}
                </p>
              )
            })}
          </article>
          <NoteMargin
            wide={wide}
            articleRef={bodyRef}
            views={notes.views}
            ranges={noteRanges}
            panel={panel}
            setPanel={setPanel}
            onHover={setHoverId}
            onSave={savePanel}
            onRemove={removePanel}
            onClose={closePanel}
          />
        </div>
        <NoteLayer
          containerRef={bodyRef}
          views={notes.views}
          ranges={noteRanges}
          wide={wide}
          panel={panel}
          setPanel={setPanel}
          onSave={savePanel}
          onRemove={removePanel}
          onClose={closePanel}
        />
      </div>
    </div>
  )
}
