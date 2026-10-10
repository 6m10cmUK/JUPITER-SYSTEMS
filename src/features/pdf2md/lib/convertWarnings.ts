import type { ConvertIssues } from '../core/types'

/** 変換で起きた問題を、利用者向けの文言にする（ビューアが表示する） */
export function warningsOf(issues: ConvertIssues | null): string[] {
  if (!issues) return []
  const out: string[] = []
  if (issues.failedPages.length > 0) out.push(`${issues.failedPages.length}ページを読めませんでした`)
  if (issues.pagesWithoutText.length > 0) out.push(`${issues.pagesWithoutText.length}ページは文字も画像も取り出せないため表示していません`)
  if (issues.stylelessPages.length > 0) out.push(`${issues.stylelessPages.length}ページは画像・文字の色・太字を取得できませんでした`)
  if (issues.imageFailures > 0) out.push(`画像${issues.imageFailures}枚を表示できませんでした`)
  if (issues.outlineUnreadable) out.push('PDFのしおりを読めなかったため、見出しは本文から推定しています')
  return out
}
