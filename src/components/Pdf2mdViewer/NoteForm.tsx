import { useEffect, useRef, useState } from 'react'

interface Props {
  initial: string
  canDelete: boolean
  onSave: (body: string) => void
  onDelete: () => void
  onClose: () => void
}

/** メモ入力欄（textarea ＋ 保存・削除・閉じる）。Floating パネルとメモ列のカードで共用 */
export function NoteForm({ initial, canDelete, onSave, onDelete, onClose }: Props) {
  const [body, setBody] = useState(initial)
  const taRef = useRef<HTMLTextAreaElement>(null)
  // 空の本文は保存させない（既存メモを消すときは削除ボタンを使う）
  const empty = body.trim() === ''

  useEffect(() => {
    taRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <textarea
        ref={taRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            if (!empty) onSave(body)
          }
        }}
        rows={4}
        placeholder="メモ"
        className="w-full resize-y rounded border border-gray-300 bg-white p-2 text-sm text-gray-800 focus:border-jupiter-500 focus:outline-none"
      />
      <div className="mt-2 flex items-center gap-2 text-xs">
        <button
          type="button"
          disabled={empty}
          onClick={() => onSave(body)}
          className="rounded bg-jupiter-600 px-3 py-1 font-semibold text-white hover:bg-jupiter-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-jupiter-600"
        >
          保存
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded border border-gray-300 px-3 py-1 text-gray-700 hover:bg-gray-50"
          >
            削除
          </button>
        )}
        <button type="button" onClick={onClose} className="ml-auto px-2 py-1 text-gray-500 hover:text-gray-700">
          閉じる
        </button>
      </div>
    </>
  )
}
