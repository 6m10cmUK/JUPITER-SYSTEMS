import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import mammoth from 'mammoth'

export type Gold = {
  source: 'docx' | 'txt'
  paragraphs: string[]
  headings: { level: number; text: string }[]
}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(n) ? String.fromCodePoint(n) : m
    }
    return ENT[e.toLowerCase()] ?? m
  })
}

function walk(html: string, out: Gold): void {
  const re = /<(h[1-6]|p|li)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const tag = m[1]
    const inner = m[2]
    if (/<(h[1-6]|p|li)[\s>]/.test(inner)) {
      walk(inner, out)
      continue
    }
    const text = decode(inner.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '')).trim()
    if (!text) continue
    out.paragraphs.push(text)
    if (tag[0] === 'h') out.headings.push({ level: Number(tag[1]), text })
  }
}

async function docxGold(file: string): Promise<Gold> {
  const { value } = await mammoth.convertToHtml({ path: file })
  const g: Gold = { source: 'docx', paragraphs: [], headings: [] }
  walk(value, g)
  return g
}

function decodeText(buf: Buffer): string {
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return new TextDecoder('utf-8').decode(buf.subarray(3))
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf.subarray(2))
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder('utf-16be').decode(buf.subarray(2))
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder('shift_jis').decode(buf)
  }
}

async function txtGold(file: string): Promise<Gold> {
  const text = decodeText(await readFile(file)).replace(/\r\n?/g, '\n')
  const lines = text.split('\n')
  const byBlank = text.split(/\n[ \t\u3000]*\n+/).map((s) => s.trim()).filter(Boolean)
  const nonEmptyLines = lines.map((s) => s.trim()).filter(Boolean)
  // シナリオの txt は 1 行 = 1 段落（空行はまとまりの区切り）。固定幅で折り返した txt だけ空行で段落を切る
  const lens = nonEmptyLines.map((s) => s.length)
  const counts = new Map<number, number>()
  for (const n of lens) counts.set(n, (counts.get(n) ?? 0) + 1)
  const modeShare = lens.length ? Math.max(...counts.values()) / lens.length : 0
  const hardWrapped = modeShare >= 0.3
  const paragraphs = hardWrapped ? byBlank : nonEmptyLines
  return { source: 'txt', paragraphs, headings: [] }
}

/** 正解ファイル群から1つ選ぶ（docx 優先）。キャッシュは cacheDir/<id>.v2.json（正解の作り方を変えたら版を上げる） */
export async function loadGold(id: string, dir: string, names: string[], cacheDir: string): Promise<Gold> {
  const cache = path.join(cacheDir, `${id}.v2.json`)
  if (existsSync(cache)) return JSON.parse(await readFile(cache, 'utf8')) as Gold
  const pick = names.find((n) => /\.docx$/i.test(n)) ?? names[0]
  const file = path.join(dir, pick)
  const g = /\.docx$/i.test(pick) ? await docxGold(file) : await txtGold(file)
  await mkdir(cacheDir, { recursive: true })
  await writeFile(cache, JSON.stringify(g))
  return g
}
