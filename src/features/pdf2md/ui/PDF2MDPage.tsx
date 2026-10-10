import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { PDFUploader } from './PDFUploader'
import { Pdf2mdViewer } from './Pdf2mdViewer'
import { InfoDialogButton } from './InfoDialog'
import { PDF2MD_ABOUT, PDF2MD_HOWTO } from './infoTexts'
import { useConvertPdf } from '../model/useConvertPdf'
import type { ConvertIssues } from '../../../lib/pdf2md/types'

/** 変換で起きた問題を、利用者向けの文言にする（ビューアが表示する） */
function warningsOf(issues: ConvertIssues | null): string[] {
  if (!issues) return []
  const out: string[] = []
  if (issues.failedPages.length > 0) out.push(`${issues.failedPages.length}ページを読めませんでした`)
  if (issues.pagesWithoutText.length > 0) out.push(`${issues.pagesWithoutText.length}ページは文字も画像も取り出せないため表示していません`)
  if (issues.stylelessPages.length > 0) out.push(`${issues.stylelessPages.length}ページは画像・文字の色・太字を取得できませんでした`)
  if (issues.imageFailures > 0) out.push(`画像${issues.imageFailures}枚を表示できませんでした`)
  if (issues.outlineUnreadable) out.push('PDFのしおりを読めなかったため、見出しは本文から推定しています')
  return out
}

const infoBtn =
  'px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-50 shadow-sm whitespace-nowrap'

/** 画面中央に寄せる共通の外枠 */
function CenteredScreen({ children }: { children: ReactNode }) {
  return <div className="min-h-[calc(100dvh-var(--app-header-h,0px))] flex items-center bg-gray-50">{children}</div>
}

export function PDF2MD() {
  useEffect(() => {
    document.title = 'JUPITER SYSTEMS / Scenario PDF Reader'
  }, [])

  const [file, setFile] = useState<File | null>(null)
  const { state, progress, blocks, issues, imageUrls, fileId, error, convert, reset } = useConvertPdf()

  const handleFileSelect = (f: File) => {
    setFile(f)
    convert(f)
  }

  const handleReset = () => {
    reset()
    setFile(null)
    window.scrollTo(0, 0)
  }

  if (!file) {
    return (
      <CenteredScreen>
        <div className="container-jupiter py-12 w-full">
          <PDFUploader
            onFileSelect={handleFileSelect}
            notice={
              <>
                <br />
                ファイルはこの端末から外に送信されません
                <br />
                PC表示にのみ対応しています
              </>
            }
          />
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
            <InfoDialogButton label="使い方" items={PDF2MD_HOWTO} buttonClassName={infoBtn} />
            <InfoDialogButton label="このツールについて" items={PDF2MD_ABOUT} buttonClassName={infoBtn} />
          </div>
        </div>
      </CenteredScreen>
    )
  }

  if (state === 'error') {
    return (
      <CenteredScreen>
        <div className="container-jupiter py-12 w-full text-center">
          <p className="text-error-600 mb-4">{error ?? '変換に失敗しました'}</p>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            別のファイルを開く
          </button>
        </div>
      </CenteredScreen>
    )
  }

  if (state !== 'done') {
    const pct = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0
    return (
      <CenteredScreen>
        <div className="container-jupiter py-12 w-full max-w-md mx-auto text-center">
          <p className="text-gray-700 mb-3">
            変換しています{progress ? `（${progress.done}/${progress.total} ページ）` : ''}
          </p>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full bg-jupiter-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </CenteredScreen>
    )
  }

  return (
    <Pdf2mdViewer
      key={fileId ?? ''}
      fileId={fileId}
      fileName={file.name}
      blocks={blocks}
      imageUrls={imageUrls}
      warnings={warningsOf(issues)}
      onReset={handleReset}
    />
  )
}
