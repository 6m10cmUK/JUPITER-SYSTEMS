/** CSS Custom Highlight API の薄いラッパー（未対応ブラウザでは何もしない）。 */

interface HighlightRegistry {
  set(name: string, value: unknown): void
  delete(name: string): void
}
type HighlightCtor = new (...ranges: Range[]) => unknown

function getHighlightApi(): { registry: HighlightRegistry; Highlight: HighlightCtor } | null {
  const registry = (CSS as unknown as { highlights?: HighlightRegistry }).highlights
  const Highlight = (globalThis as unknown as { Highlight?: HighlightCtor }).Highlight
  return registry && Highlight ? { registry, Highlight } : null
}

/** name に ranges を登録する。ranges が空なら解除する。priority が大きいほど上に塗られる */
export function setHighlight(name: string, ranges: readonly Range[], priority?: number): void {
  const api = getHighlightApi()
  if (!api) return
  if (ranges.length === 0) {
    api.registry.delete(name)
    return
  }
  const h = new api.Highlight(...ranges) as { priority?: number }
  if (priority !== undefined) h.priority = priority
  api.registry.set(name, h)
}

export function clearHighlight(name: string): void {
  getHighlightApi()?.registry.delete(name)
}
