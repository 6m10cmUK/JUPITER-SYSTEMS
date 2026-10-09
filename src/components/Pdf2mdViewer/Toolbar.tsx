import { useEffect, useRef, type KeyboardEvent } from 'react'

interface Props {
  fileName: string
  query: string
  onQueryChange: (q: string) => void
  searchCount: number
  searchCurrent: number
  onNext: () => void
  onPrev: () => void
  onCopyAll: () => void
  onReset: () => void
  copied: boolean
  /** 失敗などの短い通知。null なら出さない */
  notice: string | null
  /** 変換時の警告。空でなければ常時表示する（notice とは別枠） */
  warnings: readonly string[]
}

const btn =
  'px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 whitespace-nowrap'

export function Toolbar(p: Props) {
  const searchRef = useRef<HTMLInputElement>(null)
  // Ctrl/Cmd+F はブラウザ標準の検索ではなくこの検索窓へ
  useEffect(() => {
    const onFind = (e: globalThis.KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'f') return
      e.preventDefault()
      searchRef.current?.focus()
      searchRef.current?.select()
    }
    window.addEventListener('keydown', onFind)
    return () => window.removeEventListener('keydown', onFind)
  }, [])

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      // type=search の Esc は既定で入力を消すので止め、検索語とハイライトは残したまま本文へ戻る
      e.preventDefault()
      e.currentTarget.blur()
      return
    }
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
    e.preventDefault()
    if (e.shiftKey) p.onPrev()
    else p.onNext()
  }
  return (
    <div className="pdf2md-ui bg-white border-b border-gray-200 shadow-sm">
      <div className="container-jupiter py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          className="hidden lg:inline text-sm font-semibold text-gray-800 max-w-xs truncate"
          title={p.fileName}
        >
          {p.fileName}
        </span>
        <div className="flex items-center gap-2">
          <input
            ref={searchRef}
            type="search"
            value={p.query}
            onChange={(e) => p.onQueryChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="検索"
            className="w-44 px-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:border-jupiter-500"
          />
          <span className="text-xs text-gray-500 w-14 tabular-nums">
            {p.query ? `${p.searchCount ? p.searchCurrent + 1 : 0}/${p.searchCount}` : ''}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <button type="button" className={btn} onClick={p.onCopyAll}>
            {p.copied ? 'コピーしました' : '全文コピー'}
          </button>
          <button type="button" className={btn} onClick={p.onReset}>
            別のファイル
          </button>
        </div>
      </div>
      {p.notice && (
        <div role="alert" className="border-t border-gray-100 bg-gray-50 py-1.5 text-gray-700">
          <p className="container-jupiter text-xs">{p.notice}</p>
        </div>
      )}
      {p.warnings.length > 0 && (
        <div role="status" className="border-t border-gray-100 bg-gray-50 py-1.5 text-gray-700">
          <div className="container-jupiter text-xs">
            {p.warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
