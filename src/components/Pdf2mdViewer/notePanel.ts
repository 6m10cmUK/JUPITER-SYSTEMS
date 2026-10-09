import type { NotePoint } from './notes'

/** 選択範囲から新規メモを書くパネル。range は DOM の Range（notes.ts には置かない） */
export interface NewNotePanel {
  kind: 'new'
  start: NotePoint
  end: NotePoint
  range: Range
}

interface EditNotePanel {
  kind: 'edit'
  id: string
}

/** メモの入力パネルの状態。new = 選択範囲から新規、edit = 既存メモの編集、null = 閉じている */
export type NotePanelState = NewNotePanel | EditNotePanel | null
