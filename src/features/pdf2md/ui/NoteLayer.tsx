import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { autoUpdate, computePosition, flip, inline, offset, shift, type Placement } from '@floating-ui/dom'
import type { NotePanelState } from '../lib/notePanel'
import type { NoteView } from '../model/useNotes'
import { NoteForm } from './NoteForm'
import { stickyTopHeight } from '../lib/stickyOffset'
import { findNoteAt, readSelection } from '../lib/selection'

interface Props {
  containerRef: RefObject<HTMLElement | null>
  views: readonly NoteView[]
  ranges: Map<string, Range>
  /** 幅が広くメモ列にカードで出せるとき true（入力パネルは出さない） */
  wide: boolean
  panel: NotePanelState
  setPanel: (p: NotePanelState) => void
  /** 開いているパネルの内容を保存して閉じる */
  onSave: (body: string) => void
  /** 開いているパネルのメモを削除して閉じる（新規なら閉じるだけ） */
  onRemove: () => void
  onClose: () => void
}

type SelInfo = Extract<NotePanelState, { kind: 'new' }>

function pointerPlacement(): Placement {
  return window.matchMedia('(pointer: fine)').matches ? 'top-end' : 'bottom'
}

/** Range を仮想要素にして Floating UI で位置を出す */
function useAnchor(range: Range | null, container: HTMLElement | null, placement: Placement) {
  const [floating, setFloating] = useState<HTMLElement | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useLayoutEffect(() => {
    if (!range || !floating) return
    const ref = {
      getBoundingClientRect: () => range.getBoundingClientRect(),
      getClientRects: () => range.getClientRects(),
      contextElement: container ?? undefined,
    }
    const update = () => {
      const top = stickyTopHeight() + 8
      void computePosition(ref, floating, {
        placement,
        strategy: 'fixed',
        middleware: [offset(8), inline(), flip(), shift({ padding: { top, left: 8, right: 8, bottom: 8 } })],
      }).then((r) => setPos({ x: r.x, y: r.y }))
    }
    return autoUpdate(ref, floating, update)
  }, [range, floating, container, placement])

  const style = {
    position: 'fixed' as const,
    left: 0,
    top: 0,
    transform: pos ? `translate(${Math.round(pos.x)}px, ${Math.round(pos.y)}px)` : undefined,
    visibility: pos ? ('visible' as const) : ('hidden' as const),
  }
  return { setFloating, style }
}

function AddButton({ sel, container, onOpen }: { sel: SelInfo; container: HTMLElement | null; onOpen: () => void }) {
  const { setFloating, style } = useAnchor(sel.range, container, pointerPlacement())
  return createPortal(
    <button
      ref={setFloating}
      type="button"
      data-note-button
      style={style}
      // 選択を崩さず、タッチでは選択解除でボタンが消える前に開く
      onPointerDown={(e) => {
        e.preventDefault()
        onOpen()
      }}
      onClick={(e) => {
        if (e.detail === 0) onOpen()
      }}
      className="pdf2md-ui z-50 rounded-full bg-jupiter-600 px-3 py-1 text-xs font-semibold text-white shadow-lg hover:bg-jupiter-700"
    >
      メモ
    </button>,
    document.body,
  )
}

interface PanelProps {
  range: Range
  container: HTMLElement | null
  initial: string
  canDelete: boolean
  onSave: (body: string) => void
  onDelete: () => void
  onClose: () => void
}

function NoteEditor({ range, container, initial, canDelete, onSave, onDelete, onClose }: PanelProps) {
  const { setFloating, style } = useAnchor(range, container, pointerPlacement())
  return createPortal(
    <div
      ref={setFloating}
      style={style}
      className="pdf2md-ui z-50 w-72 max-w-[calc(100vw-1rem)] rounded-lg border border-gray-200 bg-white p-2 shadow-xl"
    >
      <NoteForm initial={initial} canDelete={canDelete} onSave={onSave} onDelete={onDelete} onClose={onClose} />
    </div>,
    document.body,
  )
}

export function NoteLayer(p: Props) {
  const [sel, setSel] = useState<SelInfo | null>(null)
  const [container, setContainer] = useState<HTMLElement | null>(null)
  // render 中に ref を読まず、マウント後に container を state へ取り込む
  useLayoutEffect(() => setContainer(p.containerRef.current), [p.containerRef])

  useEffect(() => {
    let raf = 0
    const read = () => {
      raf = 0
      const el = p.containerRef.current
      setSel(el ? readSelection(el) : null)
    }
    const onChange = () => {
      if (!raf) raf = requestAnimationFrame(read)
    }
    document.addEventListener('selectionchange', onChange)
    return () => {
      document.removeEventListener('selectionchange', onChange)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [p.containerRef])

  const { setPanel } = p
  // ハイライトのクリック（選択なし）でメモを開く
  useEffect(() => {
    const el = p.containerRef.current
    if (!el) return
    const onClick = (e: MouseEvent) => {
      const s = window.getSelection()
      if (s && !s.isCollapsed) return
      const id = findNoteAt(p.ranges, e.clientX, e.clientY)
      if (id) setPanel({ kind: 'edit', id })
    }
    el.addEventListener('click', onClick)
    return () => el.removeEventListener('click', onClick)
  }, [p.containerRef, p.ranges, setPanel])

  const { panel } = p
  if (p.wide && panel) return null

  if (panel?.kind === 'new') {
    return (
      <NoteEditor
        key="new"
        range={panel.range}
        container={container}
        initial=""
        canDelete={false}
        onSave={p.onSave}
        onDelete={p.onRemove}
        onClose={p.onClose}
      />
    )
  }

  if (panel?.kind === 'edit') {
    const view = p.views.find((v) => v.note.id === panel.id)
    const range = p.ranges.get(panel.id)
    if (!view || !range) return null
    return (
      <NoteEditor
        key={panel.id}
        range={range}
        container={container}
        initial={view.note.body}
        canDelete
        onSave={p.onSave}
        onDelete={p.onRemove}
        onClose={p.onClose}
      />
    )
  }

  if (!sel) return null
  return (
    <AddButton
      sel={sel}
      container={container}
      onOpen={() => p.setPanel(sel)}
    />
  )
}
