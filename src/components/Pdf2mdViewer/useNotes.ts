import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Block } from '../../lib/pdf2md/types'
import { createNote, notesKey, resolveNote, type Note, type NotePoint, type ResolvedRange } from './notes'
import { clearNotes, loadNotes, mergeNotes, reportDamaged, saveMerged } from './notesStorage'

export interface NoteView {
  note: Note
  /** null = 位置不明（orphan） */
  range: ResolvedRange | null
}

type Notify = (message: string) => void

const newId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

const idsOf = (list: readonly Note[]) => new Set(list.map((n) => n.id))

/**
 * fileId が変わるときは、呼び出し側が key で再マウントする前提（state・base・保存失敗の保持を fileId ごとに作り直さない）。
 */
export function useNotes(fileId: string | null, blocks: Block[], notify: Notify) {
  const [loaded] = useState(() => loadNotes(fileId))
  const [notes, setNotes] = useState<Note[]>(loaded.notes)
  const notesRef = useRef(notes)
  // 最後に同期した（読んだ・保存できた）時点の id 集合。別タブでの削除の判定に使う
  const baseRef = useRef<Set<string>>(idsOf(loaded.notes))
  // 保存に失敗して未保存のままの状態を持っているか。持っている間の削除 id も覚えておく
  const failedRef = useRef(false)
  const failedRemovedRef = useRef<Set<string>>(new Set())
  const apply = useCallback((next: Note[]) => {
    notesRef.current = next
    setNotes(next)
  }, [])

  // 次の保存で上書きされる前に、壊れた元データを退避して知らせる（StrictMode の二重実行でも1回）
  // 同じ壊れ方は1回だけ知らせる（storage イベントのたびに退避・通知を繰り返さない）
  const reportedRaw = useRef<string | null>(null)
  const reportOnce = useCallback(
    (id: string, raw: string) => {
      if (reportedRaw.current === raw) return
      reportedRaw.current = raw
      reportDamaged(id, raw, notify)
    },
    [notify],
  )
  useEffect(() => {
    if (!fileId || loaded.damagedRaw === null) return
    reportOnce(fileId, loaded.damagedRaw)
  }, [fileId, loaded, reportOnce])

  // 別タブでの変更を取り込む（storage は他タブの書き込みでだけ発火する）
  useEffect(() => {
    if (!fileId) return
    const key = notesKey(fileId)
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== key) return
      const latest = loadNotes(fileId)
      if (latest.damagedRaw !== null) reportOnce(fileId, latest.damagedRaw)
      if (!failedRef.current) {
        baseRef.current = idsOf(latest.notes)
        apply(latest.notes)
        return
      }
      // 保存に失敗して未保存のメモがある間は、最新とマージして黙って消さない。そのうえで再保存を試みる
      const merged = mergeNotes(latest.notes, notesRef.current, failedRemovedRef.current, baseRef.current)
      baseRef.current = idsOf(latest.notes)
      const r = saveMerged(fileId, merged, failedRemovedRef.current, baseRef.current)
      apply(r.notes)
      if (r.ok) {
        failedRef.current = false
        failedRemovedRef.current = new Set()
        baseRef.current = idsOf(r.notes)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [fileId, apply, reportOnce])

  const texts = useMemo(() => blocks.map((b) => (b.kind === 'image' ? '' : b.text)), [blocks])

  const views = useMemo<NoteView[]>(
    () => notes.map((note) => ({ note, range: resolveNote(note, texts) })),
    [notes, texts],
  )

  /** next = このタブでの変更後の一覧、removed = このタブで消した id。保存直前の最新とマージして書く */
  const commit = useCallback(
    (next: Note[], removed: readonly string[] = []) => {
      const removedSet = new Set([...failedRemovedRef.current, ...removed])
      const { notes: merged, ok } = saveMerged(fileId, next, removedSet, baseRef.current)
      apply(merged)
      if (ok) {
        baseRef.current = idsOf(merged)
        failedRef.current = false
        failedRemovedRef.current = new Set()
      } else {
        failedRef.current = true
        failedRemovedRef.current = removedSet
        notify('メモを保存できませんでした（ブラウザの保存容量を確認してください）')
      }
    },
    [fileId, notify, apply],
  )

  const add = useCallback(
    (start: NotePoint, end: NotePoint, body: string): string | null => {
      if (body.trim() === '') return null
      const n = createNote(texts, start, end, body, newId(), Date.now())
      if (!n) {
        notify('メモを追加できませんでした（選択範囲を確認してください）')
        return null
      }
      commit([...notes, n])
      return n.id
    },
    [texts, notes, commit, notify],
  )

  // 本文を空にする保存は呼び出し側（NoteForm）が止める。削除は remove に一本化
  const update = useCallback(
    (id: string, body: string) => {
      if (body.trim() === '') return
      commit(notes.map((n) => (n.id === id ? { ...n, body, updatedAt: Date.now() } : n)))
    },
    [notes, commit],
  )

  const remove = useCallback(
    (id: string) =>
      commit(
        notes.filter((n) => n.id !== id),
        [id],
      ),
    [notes, commit],
  )

  // 全削除はマージしない。保存先のキーごと消す（別タブで足されたメモも消える）
  const clear = useCallback(() => {
    // 消せなかったときは画面も変えない（画面だけ空にすると次の保存のマージで戻ってくる）
    if (!clearNotes(fileId)) {
      notify('メモを削除できませんでした')
      return
    }
    apply([])
    baseRef.current = new Set()
    failedRef.current = false
    failedRemovedRef.current = new Set()
  }, [fileId, notify, apply])

  return { views, add, update, remove, clear }
}
