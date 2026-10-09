import { useEffect, useState } from 'react'
import type { NoteView } from './useNotes'

interface Props {
  notes: readonly NoteView[]
  /** 狭い画面での開閉。lg 以上では常に出す */
  open: boolean
  onOpenNote: (id: string) => void
  onRemoveNote: (id: string) => void
  onClearNotes: () => void
}

/** サイドバーのメモ一覧タブ。一覧・個別削除・2段階の全削除・保存先の注記 */
export function NotesPanel({ notes, open, onOpenNote, onRemoveNote, onClearNotes }: Props) {
  // 全削除は2段階。1回目で確認表示に変わり、時間切れか他の操作で戻る
  const [confirmClear, setConfirmClear] = useState(false)
  useEffect(() => {
    if (!confirmClear) return
    const t = window.setTimeout(() => setConfirmClear(false), 4000)
    return () => window.clearTimeout(t)
  }, [confirmClear])
  // どの操作でも全削除の確認表示は解除する
  const withReset =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      setConfirmClear(false)
      fn(...args)
    }

  return (
    <>
      <ul className={`${open ? 'block' : 'hidden'} lg:block mt-2 space-y-1`}>
        {notes.length === 0 && <li className="text-xs text-gray-500">本文を選択してメモを付けられます</li>}
        {notes.map(({ note, range }) => (
          <li key={note.id} className="rounded border border-gray-200 p-2 text-sm">
            {range ? (
              <button type="button" onClick={withReset(() => onOpenNote(note.id))} className="block w-full text-left">
                <div className="text-xs text-gray-500 line-clamp-1">{note.quote}</div>
                <div className="text-gray-800 line-clamp-2 break-words">{note.body}</div>
              </button>
            ) : (
              <div>
                <span className="mb-1 inline-block rounded bg-gray-100 px-1.5 text-xs text-gray-600">位置不明</span>
                <span className="block text-gray-800 break-words whitespace-pre-wrap">{note.body}</span>
                <button
                  type="button"
                  onClick={withReset(() => onRemoveNote(note.id))}
                  className="mt-1 rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  削除
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className={`${open ? 'block' : 'hidden'} lg:block mt-2 space-y-2`}>
        {notes.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirmClear) withReset(onClearNotes)()
              else setConfirmClear(true)
            }}
            onBlur={() => setConfirmClear(false)}
            className={`rounded border px-2 py-0.5 text-xs ${
              confirmClear
                ? 'border-gray-700 bg-gray-700 text-white hover:bg-gray-800'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {confirmClear ? '本当に全部消しますか？' : 'メモを全削除'}
          </button>
        )}
        <p className="text-xs text-gray-500">メモと抜粋はこのブラウザにだけ保存されます</p>
      </div>
    </>
  )
}
