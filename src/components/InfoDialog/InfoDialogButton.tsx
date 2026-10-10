import { useId, useRef } from 'react'

interface Props {
  /** ボタンの文字。ダイアログの見出しにも使う */
  label: string
  items: readonly string[]
  buttonClassName: string
}

/** 押すと箇条書きの説明をダイアログで出すボタン（× ボタン・Esc・背景クリックで閉じる） */
export function InfoDialogButton({ label, items, buttonClassName }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const close = () => dialogRef.current?.close()

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className={buttonClassName}>
        {label}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        // 背景（dialog 自身）をクリックしたら閉じる。中身のクリックは子要素が target になる
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto w-[min(600px,calc(100vw-2rem))] max-h-[85dvh] rounded-2xl p-0 shadow-2xl backdrop:bg-black/50"
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 id={titleId} className="text-lg font-bold text-gray-900">
              {label}
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="閉じる"
              className="-m-1 p-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ul className="space-y-3 list-disc pl-5 text-sm leading-relaxed text-gray-700">
            {items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  )
}
