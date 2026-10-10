import { useEffect, type RefObject } from 'react'

/** アプリ共通ヘッダーの高さ（Layout が設定する CSS 変数）。Pdf2mdViewer.css が同名を直書きで参照している */
export const APP_HEADER_H_VAR = '--app-header-h'
/** ビューアのツールバーの高さ（Pdf2mdViewer が設定する CSS 変数）。Pdf2mdViewer.css が同名を直書きで参照している */
export const TOOLBAR_H_VAR = '--pdf2md-toolbar-h'

/** 要素の高さを :root の CSS 変数に流し込む。sticky を重ねるときの top 計算用 */
export function useHeightVar(ref: RefObject<HTMLElement | null>, name: string) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const ro = new ResizeObserver(() => root.style.setProperty(name, `${el.offsetHeight}px`))
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.removeProperty(name)
    }
  }, [ref, name])
}
