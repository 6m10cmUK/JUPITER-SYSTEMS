// pdfjs-dist の cmaps / standard_fonts を public/pdfjs/ にコピーする（predev / prebuild で実行）
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'node_modules/pdfjs-dist')
const dest = resolve(root, 'public/pdfjs')

for (const name of ['cmaps', 'standard_fonts']) {
  const to = resolve(dest, name)
  rmSync(to, { recursive: true, force: true })
  mkdirSync(dirname(to), { recursive: true })
  cpSync(resolve(src, name), to, { recursive: true })
}
console.log('pdfjs assets copied to public/pdfjs/')
