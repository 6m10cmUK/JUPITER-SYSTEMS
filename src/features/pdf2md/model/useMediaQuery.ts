import { useCallback, useSyncExternalStore } from 'react'

/** Tailwind の lg。Pdf2mdViewer.css の @media (min-width: 1024px) と対応 */
export const BREAKPOINT_LG = 1024
/** Tailwind の xl 相当（メモ列を出す幅） */
export const BREAKPOINT_XL = 1280

/** 画面幅が minWidth(px) 以上かどうか。変化に追従する */
export function useMediaQuery(minWidth: number): boolean {
  const query = `(min-width: ${minWidth}px)`
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
