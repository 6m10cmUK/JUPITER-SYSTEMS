import type { ResolvedRange } from './notes'
import { BLOCK_SELECTOR, blockIndexOf, buildTextMap, pointAt, type TextMap } from './textMap'

/** 解決済みの範囲を Range に変換する。ブロックごとの対応表は使い回す */
export function resolveNoteRanges(
  container: HTMLElement,
  items: readonly { id: string; range: ResolvedRange }[],
): Map<string, Range> {
  const maps = new Map<number, TextMap>()
  const els = new Map<number, HTMLElement>()
  container.querySelectorAll<HTMLElement>(BLOCK_SELECTOR).forEach((el) => els.set(blockIndexOf(el), el))
  const mapOf = (b: number): TextMap | null => {
    const hit = maps.get(b)
    if (hit) return hit
    const el = els.get(b)
    if (!el) return null
    const m = buildTextMap(el)
    maps.set(b, m)
    return m
  }
  const out = new Map<string, Range>()
  for (const it of items) {
    const { start, end } = it.range
    const sm = mapOf(start.block)
    const em = mapOf(end.block)
    if (!sm || !em) continue
    const s = pointAt(sm, start.offset, false)
    const e = pointAt(em, end.offset, true)
    if (!s || !e) continue
    const r = document.createRange()
    r.setStart(s.node, s.offset)
    r.setEnd(e.node, e.offset)
    out.set(it.id, r)
  }
  return out
}
