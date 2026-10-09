/** メモの保存形式と位置合わせ（純粋ロジック。DOM・localStorage に触らない）。 */

export interface NotePoint {
  block: number
  offset: number
}

export interface Note {
  id: string
  start: NotePoint
  end: NotePoint
  quote: string
  prefix: string
  suffix: string
  body: string
  createdAt: number
  updatedAt: number
}

interface StoredNotes {
  v: 1
  notes: readonly Note[]
}

export interface ResolvedRange {
  start: NotePoint
  end: NotePoint
}

const CONTEXT = 16

export const notesKey = (fileId: string) => `pdf2md.notes.${fileId}`
/** 壊れた保存データの退避先 */
export const notesBackupKey = (fileId: string) => `${notesKey(fileId)}.bak`

/** texts[i] = ブロック i の本文。[start, end) の文字列。ブロックをまたぐ場合は '\n' で連結 */
function quoteAt(texts: readonly string[], start: NotePoint, end: NotePoint): string | null {
  if (start.block < 0 || end.block >= texts.length || start.block > end.block) return null
  if (start.block === end.block) {
    const t = texts[start.block]
    if (start.offset < 0 || end.offset > t.length || start.offset > end.offset) return null
    return t.slice(start.offset, end.offset)
  }
  const first = texts[start.block]
  const last = texts[end.block]
  if (start.offset < 0 || start.offset > first.length) return null
  if (end.offset < 0 || end.offset > last.length) return null
  const parts = [first.slice(start.offset)]
  for (let b = start.block + 1; b < end.block; b++) parts.push(texts[b])
  parts.push(last.slice(0, end.offset))
  return parts.join('\n')
}

export function createNote(
  texts: readonly string[],
  start: NotePoint,
  end: NotePoint,
  body: string,
  id: string,
  now: number,
): Note | null {
  const quote = quoteAt(texts, start, end)
  if (quote === null || quote.trim() === '') return null
  const prefix = texts[start.block].slice(Math.max(0, start.offset - CONTEXT), start.offset)
  const suffix = texts[end.block].slice(end.offset, end.offset + CONTEXT)
  return { id, start, end, quote, prefix, suffix, body, createdAt: now, updatedAt: now }
}

function commonSuffixLen(a: string, b: string): number {
  let n = 0
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++
  return n
}

function commonPrefixLen(a: string, b: string): number {
  let n = 0
  while (n < a.length && n < b.length && a[n] === b[n]) n++
  return n
}

/**
 * 保存位置を現在の本文に合わせ直す。
 * (a) 保存位置の文字列が quote と一致すればそのまま。
 * (b) 単一ブロックのメモは全ブロックから quote を探し、前後文脈の一致度と元の block からの近さで最良を採る。
 * (c) 見つからなければ null（呼び出し側が orphan 扱いにする。メモは消さない）。
 */
export function resolveNote(note: Note, texts: readonly string[]): ResolvedRange | null {
  if (note.quote === '') return null
  if (quoteAt(texts, note.start, note.end) === note.quote) return { start: note.start, end: note.end }
  if (note.start.block !== note.end.block) return null

  let best: { score: number; block: number; offset: number } | null = null
  for (let b = 0; b < texts.length; b++) {
    const t = texts[b]
    for (let idx = t.indexOf(note.quote); idx >= 0; idx = t.indexOf(note.quote, idx + 1)) {
      const before = t.slice(Math.max(0, idx - CONTEXT), idx)
      const after = t.slice(idx + note.quote.length, idx + note.quote.length + CONTEXT)
      const ctx = commonSuffixLen(before, note.prefix) + commonPrefixLen(after, note.suffix)
      const near = Math.abs(b - note.start.block)
      const dOff = near === 0 ? Math.abs(idx - note.start.offset) : 0
      // 文脈の一致を最優先、同点なら block の近さ、さらに offset の近さ
      const score = ctx * 1e6 - near * 1e3 - Math.min(dOff, 999)
      if (!best || score > best.score) best = { score, block: b, offset: idx }
    }
  }
  if (!best) return null
  return {
    start: { block: best.block, offset: best.offset },
    end: { block: best.block, offset: best.offset + note.quote.length },
  }
}

function isPoint(p: unknown): p is NotePoint {
  const o = p as NotePoint
  return !!o && Number.isInteger(o.block) && Number.isInteger(o.offset)
}

function isNote(n: unknown): n is Note {
  const o = n as Note
  return (
    !!o &&
    typeof o.id === 'string' &&
    isPoint(o.start) &&
    isPoint(o.end) &&
    typeof o.quote === 'string' &&
    typeof o.prefix === 'string' &&
    typeof o.suffix === 'string' &&
    typeof o.body === 'string' &&
    typeof o.createdAt === 'number' &&
    typeof o.updatedAt === 'number'
  )
}

/**
 * 保存文字列 → メモ配列。壊れていたら警告して読めた分だけ返す（呼び出し側は画面を落とさない）。
 * damaged = 全体が読めない、または一部のメモが形式不正（この状態で保存すると元データが失われる）。
 */
export function inspectNotes(raw: string | null): { notes: Note[]; damaged: boolean } {
  if (raw === null) return { notes: [], damaged: false }
  try {
    const data = JSON.parse(raw) as StoredNotes
    if (!data || data.v !== 1 || !Array.isArray(data.notes)) {
      console.warn('[pdf2md] メモの保存形式が不正なため読み込みを見送った')
      return { notes: [], damaged: true }
    }
    const ok = data.notes.filter(isNote)
    const damaged = ok.length !== data.notes.length
    if (damaged) console.warn('[pdf2md] 形式の不正なメモを読み飛ばした')
    return { notes: ok, damaged }
  } catch (e) {
    console.warn('[pdf2md] メモの JSON を読めなかった', e)
    return { notes: [], damaged: true }
  }
}

export function serializeNotes(notes: readonly Note[]): string {
  return JSON.stringify({ v: 1, notes } satisfies StoredNotes)
}
