/// <reference lib="webworker" />
import * as pdfjs from 'pdfjs-dist'
import { convertDocument } from '../core/index'
import { encodeImage } from '../core/encodeImage'
import { fileIdOf } from '../core/fileId'
import type { WorkerMessage, WorkerRequest } from '../core/types'

function post(msg: WorkerMessage) {
  self.postMessage(msg)
}

/** pdf.js の例外を利用者向けの日本語にする。該当しなければ元のメッセージ */
function messageOf(err: unknown): string {
  const name = typeof err === 'object' && err !== null && 'name' in err ? String((err as { name: unknown }).name) : ''
  if (name === 'PasswordException') return 'パスワード付きのPDFは開けません'
  if (name === 'InvalidPDFException') return 'PDFとして読めないファイルです'
  return err instanceof Error ? err.message : String(err)
}

pdfjs.GlobalWorkerOptions.workerPort = new Worker(
  new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url),
  { type: 'module' },
)

const base = import.meta.env.BASE_URL

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  if (e.data.type !== 'convert') return
  const { data } = e.data
  // pdf.js に渡すと buffer が使えなくなる可能性があるので先に計算する
  const fileId = fileIdOf(data)
  const loadingTask = pdfjs.getDocument({
    data,
    cMapUrl: `${base}pdfjs/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${base}pdfjs/standard_fonts/`,
    fontExtraProperties: true,
  })
  try {
    const doc = await loadingTask.promise
    const { blocks, images, issues } = await convertDocument(doc, {
      encodeImage,
      onProgress: (done, total) => post({ type: 'progress', done, total }),
    })
    post({ type: 'done', blocks, images, issues, fileId })
  } catch (err) {
    post({ type: 'error', message: messageOf(err) })
  } finally {
    void loadingTask.destroy()
  }
}
