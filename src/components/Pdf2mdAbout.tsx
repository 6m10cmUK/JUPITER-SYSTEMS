import { useRef } from 'react'

const ITEMS = [
  'PDFの文字を読み取り、段落や見出しを整えて、読みやすい本文として表示します。文字の情報を持たない、画像だけのPDFは読めません。',
  '処理はすべてお使いのブラウザの中で行います。開いたPDFやその中身を、外部のサーバーへ送ることはありません。',
  'メモはこのブラウザの中にだけ保存されます。ブラウザのデータを消すとメモも消え、ほかの端末やブラウザには引き継がれません。',
  '表示する本文は自動で組み直したもので、元のPDFと文字や順番が違うことがあります。遊ぶときやルールを確かめるときは、元のPDFもあわせて見てください。このツールの表示によって生じた損害について、作者は責任を負いません。',
  '読み込んだシナリオの権利は、それぞれの作者・権利者にあります。表示した本文を、権利者の許可なく公開・配布しないでください。',
]

/** PDF を開く前の画面の下寄り中央に置くボタンと、押すと開くツールの説明（Esc・背景クリックで閉じる） */
export function Pdf2mdAbout() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const close = () => dialogRef.current?.close()

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 shadow-sm"
      >
        このツールについて
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="pdf2md-about-title"
        // 背景（dialog 自身）をクリックしたら閉じる。中身のクリックは子要素が target になる
        onClick={(e) => e.target === e.currentTarget && close()}
        className="m-auto w-[min(600px,calc(100vw-2rem))] max-h-[85dvh] rounded-2xl p-0 shadow-2xl backdrop:bg-black/50"
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 id="pdf2md-about-title" className="text-lg font-bold text-gray-900">
              このツールについて
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
            {ITEMS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  )
}
