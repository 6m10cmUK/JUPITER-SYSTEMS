import { APP_HEADER_H_VAR, TOOLBAR_H_VAR } from '../../hooks/useHeightVar'

/** 画面上端に固定されるヘッダー＋ツールバーの高さの合計（px） */
export function stickyTopHeight(): number {
  const css = getComputedStyle(document.documentElement)
  return (
    (parseFloat(css.getPropertyValue(APP_HEADER_H_VAR)) || 0) +
    (parseFloat(css.getPropertyValue(TOOLBAR_H_VAR)) || 0)
  )
}
