import { useCallback, useEffect, useRef, useState } from 'react'
import type { Block, ConvertIssues, WorkerMessage, WorkerRequest } from '../../../lib/pdf2md/types'

type ConvertState = 'idle' | 'converting' | 'done' | 'error'

interface ConvertView {
  state: ConvertState
  progress: { done: number; total: number } | null
  blocks: Block[]
  issues: ConvertIssues | null
  imageUrls: Record<string, string>
  fileId: string | null
  error: string | null
}

const INITIAL: ConvertView = {
  state: 'idle',
  progress: null,
  blocks: [],
  issues: null,
  imageUrls: {},
  fileId: null,
  error: null,
}

export function useConvertPdf(): ConvertView & {
  convert: (file: File) => void
  reset: () => void
} {
  const [view, setView] = useState<ConvertView>(INITIAL)
  const urlsRef = useRef<string[]>([])
  const workerRef = useRef<Worker | null>(null)
  const runRef = useRef(0)

  const terminate = useCallback(() => {
    runRef.current += 1
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  /** 作った画像 URL を解放する。state は触らない（呼び出し側が結果を差し替える） */
  const revokeUrls = useCallback(() => {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    urlsRef.current = []
  }, [])

  useEffect(
    () => () => {
      terminate()
      revokeUrls()
    },
    [terminate, revokeUrls],
  )

  const convert = useCallback(
    (file: File) => {
      terminate()
      revokeUrls()
      const run = runRef.current
      setView({ ...INITIAL, state: 'converting' })

      const worker = new Worker(new URL('../../../lib/pdf2md/convert.worker.ts', import.meta.url), { type: 'module' })
      workerRef.current = worker

      const finish = () => {
        worker.terminate()
        if (workerRef.current === worker) workerRef.current = null
      }
      const fail = (message: string) => {
        if (runRef.current !== run) return
        finish()
        setView({ ...INITIAL, state: 'error', error: message })
      }

      worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        if (runRef.current !== run) return
        const msg = e.data
        if (msg.type === 'progress') {
          setView((v) => ({ ...v, progress: { done: msg.done, total: msg.total } }))
        } else if (msg.type === 'done') {
          finish()
          const imageUrls: Record<string, string> = {}
          for (const img of msg.images) {
            const u = URL.createObjectURL(img.blob)
            urlsRef.current.push(u)
            imageUrls[img.id] = u
          }
          setView({ ...INITIAL, state: 'done', blocks: msg.blocks, issues: msg.issues, imageUrls, fileId: msg.fileId })
        } else {
          fail(msg.message)
        }
      }
      worker.onerror = (e) => fail(e.message || '変換中にエラーが起きました')
      worker.onmessageerror = () => fail('変換結果を受け取れませんでした')

      file
        .arrayBuffer()
        .then((data) => {
          if (runRef.current !== run) return
          const req: WorkerRequest = { type: 'convert', data }
          worker.postMessage(req, [data])
        })
        .catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)))
    },
    [terminate, revokeUrls],
  )

  const reset = useCallback(() => {
    terminate()
    revokeUrls()
    setView(INITIAL)
  }, [terminate, revokeUrls])

  return { ...view, convert, reset }
}
