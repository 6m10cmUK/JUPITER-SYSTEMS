import { useEffect, type RefObject } from 'react'

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
