import { inspectNotes, notesBackupKey, notesKey, serializeNotes, type Note } from './notes'

interface LoadedNotes {
  notes: Note[]
  /** 読めない部分があったときの保存文字列（退避対象）。問題なければ null */
  damagedRaw: string | null
}

/** 読むだけ。副作用（退避・通知）は reportDamaged で行う */
export function loadNotes(fileId: string | null): LoadedNotes {
  if (!fileId) return { notes: [], damagedRaw: null }
  try {
    const raw = localStorage.getItem(notesKey(fileId))
    const { notes, damaged } = inspectNotes(raw)
    return { notes, damagedRaw: damaged ? raw : null }
  } catch (e) {
    console.warn('[pdf2md] メモを読めなかった', e)
    return { notes: [], damagedRaw: null }
  }
}

/** 壊れた元データを退避する。成功したら true */
function backupRaw(fileId: string, raw: string): boolean {
  try {
    localStorage.setItem(notesBackupKey(fileId), raw)
    return true
  } catch (e) {
    console.warn('[pdf2md] 壊れたメモの退避に失敗', e)
    return false
  }
}

/** 壊れた元データを退避し、退避先を示して通知する。次の保存で上書きされる前に呼ぶ */
export function reportDamaged(fileId: string, raw: string, notify: (message: string) => void): void {
  if (backupRaw(fileId, raw)) {
    notify(`保存されたメモの一部を読めませんでした（元データは ${notesBackupKey(fileId)} に退避済みです）`)
  } else {
    notify('保存されたメモの一部を読めず、元データも退避できませんでした')
  }
}

/**
 * 別タブの変更を取り込むためのマージ（純粋関数）。
 * latest = 保存先の最新、mine = このタブの state、removed = このタブで削除した id、
 * base = 最後に同期した時点の id 集合。
 * base にあって latest に無い mine だけのメモは、別タブでの削除とみなして落とす（base に無い mine の新規は残す）。
 * id 単位で、latest にあって removed に無いものを残し、mine は updatedAt が新しければ（同じなら mine を）採る。
 * 並びは latest を先に、mine だけにあるものを後ろに。
 */
export function mergeNotes(
  latest: readonly Note[],
  mine: readonly Note[],
  removed: ReadonlySet<string>,
  base: ReadonlySet<string> = new Set(),
): Note[] {
  const mineById = new Map(mine.map((n) => [n.id, n]))
  const latestIds = new Set(latest.map((n) => n.id))
  const out: Note[] = []
  const seen = new Set<string>()
  for (const n of latest) {
    if (removed.has(n.id) || seen.has(n.id)) continue
    seen.add(n.id)
    const m = mineById.get(n.id)
    out.push(m && m.updatedAt >= n.updatedAt ? m : n)
  }
  for (const n of mine) {
    if (removed.has(n.id) || seen.has(n.id)) continue
    if (base.has(n.id) && !latestIds.has(n.id)) continue
    seen.add(n.id)
    out.push(n)
  }
  return out
}

/**
 * 保存直前に最新を読み、マージして書く。マージ結果（state に反映する値）と保存の成否を返す。
 * 読めない部分があるまま上書きする場合は先に退避する。
 */
export function saveMerged(
  fileId: string | null,
  mine: readonly Note[],
  removed: ReadonlySet<string>,
  base: ReadonlySet<string>,
): { notes: Note[]; ok: boolean } {
  if (!fileId) return { notes: mergeNotes([], mine, removed), ok: true }
  const latest = loadNotes(fileId)
  if (latest.damagedRaw !== null) backupRaw(fileId, latest.damagedRaw)
  const notes = mergeNotes(latest.notes, mine, removed, base)
  try {
    if (notes.length === 0) localStorage.removeItem(notesKey(fileId))
    else localStorage.setItem(notesKey(fileId), serializeNotes(notes))
    return { notes, ok: true }
  } catch (e) {
    console.warn('[pdf2md] メモを保存できなかった（容量超過の可能性）', e)
    return { notes, ok: false }
  }
}

/** 全削除。マージせず保存先のキーごと消す（別タブで足されたメモも消える）。成功なら true */
export function clearNotes(fileId: string | null): boolean {
  if (!fileId) return true
  try {
    localStorage.removeItem(notesKey(fileId))
    return true
  } catch (e) {
    console.warn('[pdf2md] メモを削除できなかった', e)
    return false
  }
}
