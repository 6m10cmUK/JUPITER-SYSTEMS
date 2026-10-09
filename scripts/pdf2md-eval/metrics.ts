import DiffMatchPatch from 'diff-match-patch'
import type { Gold } from './gold.ts'

export const norm = (s: string): string => s.normalize('NFKC').replace(/\s+/g, '')

/** 各行頭の箇条記号と直後の空白を除く */
export const stripBullets = (s: string): string => s.normalize('NFKC').replace(/^[ \t\u3000]*[・■□◆◇●○▼▽▲△★☆◎►▶➤]+[ \t\u3000]*/gm, '')

type Para = { text: string; heading?: { level: number } }

/** Markdown を段落列へ。空行で区切り、# 行は単独の段落。見出しマーカーは落とす */
function parseMarkdown(md: string): { paras: Para[]; headings: { level: number; text: string }[]; innerNewlines: number } {
  const paras: Para[] = []
  const headings: { level: number; text: string }[] = []
  let innerNewlines = 0
  let buf: string[] = []
  const flush = () => {
    if (buf.length) {
      innerNewlines += buf.length - 1
      paras.push({ text: buf.join('\n') })
      buf = []
    }
  }
  for (const line of md.replace(/\r\n?/g, '\n').split('\n')) {
    const h = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line)
    if (h) {
      flush()
      paras.push({ text: h[2], heading: { level: h[1].length } })
      headings.push({ level: h[1].length, text: h[2] })
    } else if (line.trim() === '') flush()
    else buf.push(line)
  }
  flush()
  return { paras, headings, innerNewlines }
}

export function flatten(paragraphs: string[]): { text: string; bounds: number[]; softBounds: number[] } {
  // softBounds: 段落内改行（docx の Shift+Enter 等）。PDF 上は段落区切りと見分けられないので、採点ではどちらでも可とする
  let text = ''
  const bounds: number[] = []
  const softBounds: number[] = []
  for (const p of paragraphs) {
    const pieces = p.split('\n').map(norm).filter(Boolean)
    if (!pieces.length) continue
    if (text) bounds.push(text.length)
    pieces.forEach((piece, i) => {
      if (i > 0) softBounds.push(text.length)
      text += piece
    })
  }
  return { text, bounds, softBounds }
}

export function ngramCoverage(a: string, b: string): number {
  // a の 3-gram のうち b に含まれる割合
  if (a.length < 3) return 0
  const setB = new Set<string>()
  for (let i = 0; i + 3 <= b.length; i++) setB.add(b.substr(i, 3))
  const setA = new Set<string>()
  for (let i = 0; i + 3 <= a.length; i++) setA.add(a.substr(i, 3))
  let hit = 0
  for (const g of setA) if (setB.has(g)) hit++
  return hit / setA.size
}

type Op = [number, string]

function diffOps(a: string, b: string): Op[] {
  const dmp = new DiffMatchPatch()
  dmp.Diff_Timeout = 10
  return dmp.diff_main(a, b, false) as Op[]
}

/** 出力位置 -> 正解位置 */
function mapOutToGold(ops: Op[], lenO: number): Int32Array {
  const map = new Int32Array(lenO + 1)
  let gi = 0
  let oi = 0
  for (const [op, s] of ops) {
    const n = s.length
    if (op === 0) {
      for (let k = 0; k < n; k++) map[oi + k] = gi + k
      gi += n
      oi += n
    } else if (op === 1) {
      for (let k = 0; k < n; k++) map[oi + k] = gi
      oi += n
    } else gi += n
  }
  map[lenO] = gi
  return map
}

function f1(tp: number, nG: number, nO: number): number {
  if (nG === 0 && nO === 0) return 1
  return nG + nO === 0 ? 0 : (2 * tp) / (nG + nO)
}

function matchBounds(g: number[], o: number[], tol: number): number {
  const gs = [...new Set(g)].sort((x, y) => x - y)
  const os = [...new Set(o)].sort((x, y) => x - y)
  let i = 0
  let j = 0
  let tp = 0
  while (i < gs.length && j < os.length) {
    const d = os[j] - gs[i]
    if (Math.abs(d) <= tol) {
      tp++
      i++
      j++
    } else if (d < 0) j++
    else i++
  }
  return tp
}

const CJK = '[\\p{sc=Han}\\p{sc=Hiragana}\\p{sc=Katakana}ー々〆〇、。，．！？「」『』（）…・]'
const SPACE_RE = new RegExp(`(?<=${CJK})[ \\u3000]+(?=${CJK})`, 'gu')

export type PairMetrics = {
  goldChars: number
  outChars: number
  charMatch: number
  paraP: number | null
  paraR: number | null
  paraF1: number | null
  goldParas: number
  outParas: number
  headingTextF1: number | null
  headingLevelF1: number | null
  goldHeadings: number
  outHeadings: number
  residueSpaces: number
  residueNewlines: number
  diffText: string
}

function renderDiff(ops: Op[]): string {
  const out: string[] = []
  ops.forEach(([op, s], idx) => {
    if (op === 0) {
      if (s.length <= 30) out.push(`  ${s}`)
      else out.push(idx === 0 ? `  …${s.slice(-15)}` : idx === ops.length - 1 ? `  ${s.slice(0, 15)}…` : `  ${s.slice(0, 15)} … ${s.slice(-15)}`)
    } else out.push(op === 1 ? `+ ${s}` : `- ${s}`)
  })
  return out.join('\n')
}

export function scorePair(gold: Gold, markdown: string, opts: { skipPara?: boolean } = {}): PairMetrics {
  const g = flatten(gold.paragraphs.map(stripBullets))
  const md = parseMarkdown(markdown)
  const o = flatten(md.paras.map((p) => stripBullets(p.text)))
  const ops = diffOps(g.text, o.text)
  let equal = 0
  for (const [op, s] of ops) if (op === 0) equal += s.length
  const charMatch = g.text.length + o.text.length === 0 ? 1 : (2 * equal) / (g.text.length + o.text.length)

  const map = mapOutToGold(ops, o.text.length)
  const mapped = o.bounds.map((b) => map[b])
  const tp = matchBounds(g.bounds, mapped, 2)
  const tpLoose = matchBounds([...g.bounds, ...g.softBounds], mapped, 2)
  const nG = new Set(g.bounds).size
  const nO = new Set(mapped).size
  const paraP = nO ? tpLoose / nO : 0
  const paraR = nG ? tp / nG : 0

  let headingTextF1: number | null = null
  let headingLevelF1: number | null = null
  if (gold.source === 'docx') {
    const gh = gold.headings.map((h) => ({ level: h.level, text: norm(stripBullets(h.text)) })).filter((h) => h.text)
    const oh = md.headings.map((h) => ({ level: h.level, text: norm(stripBullets(h.text)) })).filter((h) => h.text)
    // テキストで対応づけ、レベルは最上位の深さの違い（一定のずれ）を差し引いて比べる。
    // Markdown の最上位を # から始めるか ## から始めるかは任意なので、階層の形だけを見る
    const used = new Set<number>()
    const pairs: [number, number][] = []
    for (const h of gh) {
      const k = oh.findIndex((o, i) => !used.has(i) && o.text === h.text)
      if (k < 0) continue
      used.add(k)
      pairs.push([h.level, oh[k].level])
    }
    const shifts = new Map<number, number>()
    for (const [gl, ol] of pairs) shifts.set(gl - ol, (shifts.get(gl - ol) ?? 0) + 1)
    let shift = 0
    let best = -1
    for (const [d, n] of shifts) if (n > best || (n === best && Math.abs(d) < Math.abs(shift))) [shift, best] = [d, n]
    const tpText = pairs.length
    const tpLevel = pairs.filter(([gl, ol]) => ol + shift === gl).length
    if (gh.length > 0) {
      headingTextF1 = f1(tpText, gh.length, oh.length)
      headingLevelF1 = f1(tpLevel, gh.length, oh.length)
    }
  }

  let residueSpaces = 0
  for (const p of md.paras) if (!p.heading) residueSpaces += (p.text.match(SPACE_RE) ?? []).length

  return {
    goldChars: g.text.length,
    outChars: o.text.length,
    charMatch,
    paraP: opts.skipPara ? null : paraP,
    paraR: opts.skipPara ? null : paraR,
    paraF1: opts.skipPara ? null : paraP + paraR ? (2 * paraP * paraR) / (paraP + paraR) : 0,
    goldParas: nG + 1,
    outParas: nO + 1,
    headingTextF1,
    headingLevelF1,
    goldHeadings: gold.headings.length,
    outHeadings: md.headings.length,
    residueSpaces,
    residueNewlines: md.innerNewlines,
    diffText: renderDiff(ops),
  }
}
