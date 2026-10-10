import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { convertDocument } from '../../src/features/pdf2md/core/index.ts'
import { renderMarkdown } from '../../src/features/pdf2md/core/render.ts'
import { loadPdf, rawText, closePdf } from './loadPdf.ts'
import { loadGold } from './gold.ts'
import { baselineConvert } from './baseline.ts'
import { norm, ngramCoverage, scorePair, flatten, stripBullets } from './metrics.ts'
import type { PairMetrics } from './metrics.ts'

const CORPUS = process.env.PDF2MD_CORPUS ?? path.join(os.homedir(), 'pdf2md-corpus')
const MIN_COVERAGE = 0.9
const MIN_REVERSE = 0.95

type Engine = (doc: PDFDocumentProxy) => Promise<{ markdown: string }>

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function getEngine(name: string): Engine {
  if (name === 'baseline') return baselineConvert
  if (name === 'core') {
    // アプリは Markdown を使わない。採点は Markdown 前提なので、ここでブロックから組み立てる
    return async (doc) => ({ markdown: renderMarkdown((await convertDocument(doc)).blocks) })
  }
  console.error(`未知の engine: ${name} (baseline|core)`)
  process.exit(2)
}

type Row = { idx: number; id: string; scenario: string; dir: string; pdf: string; golds: string[] }

async function readManifest(): Promise<Row[]> {
  const text = (await readFile(path.join(CORPUS, 'manifest.tsv'), 'utf8')).replace(/^\uFEFF/, '')
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l, i) => {
      const [dir, pdf, golds] = l.split('\t')
      const rel = dir.split('\\').join('/')
      return {
        idx: i + 1,
        id: String(i + 1).padStart(3, '0'),
        scenario: rel.split('/')[0],
        dir: rel,
        pdf,
        golds: golds.split('|'),
      }
    })
}

async function loadSplit(scenarios: string[]): Promise<Record<string, 'dev' | 'test'>> {
  const file = path.join(CORPUS, 'split.json')
  const cur: Record<string, 'dev' | 'test'> = existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : {}
  let changed = false
  for (const s of scenarios) {
    if (cur[s]) continue
    const h = createHash('sha1').update(s).digest().readUInt32BE(0)
    cur[s] = h % 10 < 7 ? 'dev' : 'test'
    changed = true
  }
  if (changed) await writeFile(file, JSON.stringify(cur, null, 2))
  return cur
}

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN)
const pct = (x: number | null | undefined): string => (x == null || Number.isNaN(x) ? '-' : (x * 100).toFixed(1))
function width(s: string): number {
  let w = 0
  for (const ch of s) w += /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/.test(ch) ? 2 : 1
  return w
}
function pad(s: string, n: number, right = false): string {
  let t = s
  while (width(t) > n) t = t.slice(0, -1)
  const sp = ' '.repeat(Math.max(0, n - width(t)))
  return right ? sp + t : t + sp
}

type Result = {
  id: string
  scenario: string
  pdf: string
  status: 'ok' | 'excluded' | 'error'
  reason?: string
  coverage?: number
  reverseCoverage?: number
  skipPara?: string
  goldSource?: string
  metrics?: Omit<PairMetrics, 'diffText'>
  seconds?: number
}

type Override = { skipPara?: boolean; reason?: string; excludePdfs?: Record<string, string> }

async function loadOverrides(): Promise<Record<string, Override>> {
  const file = path.join(CORPUS, 'overrides.json')
  return existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : {}
}

async function main(): Promise<void> {
  const engineName = arg('engine') ?? 'baseline'
  const splitSel = arg('split') ?? 'all'
  const filter = arg('scenario')
  const engine = getEngine(engineName)
  const t0 = Date.now()

  const overrides = await loadOverrides()
  const rows = await readManifest()
  const split = await loadSplit([...new Set(rows.map((r) => r.scenario))])
  const targets = rows.filter((r) => (splitSel === 'all' || split[r.scenario] === splitSel) && (!filter || r.scenario.includes(filter)))

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
  const outDir = path.join(CORPUS, '.results', stamp)
  await mkdir(outDir, { recursive: true })
  const goldCache = path.join(CORPUS, '.cache', 'gold')

  console.log(`engine=${engineName} split=${splitSel} pairs=${targets.length} corpus=${CORPUS}`)
  const results: Result[] = []
  for (const r of targets) {
    const t1 = Date.now()
    const base: Result = { id: r.id, scenario: r.scenario, pdf: r.pdf, status: 'ok' }
    const excluded = overrides[r.scenario]?.excludePdfs?.[r.pdf]
    if (excluded) {
      results.push({ ...base, status: 'excluded', reason: `overrides: ${excluded}` })
      continue
    }
    try {
      const dir = path.join(CORPUS, r.dir)
      const gold = await loadGold(r.id, dir, r.golds, goldCache)
      let markdown: string
      const doc = await loadPdf(path.join(dir, r.pdf))
      try {
        const raw = await rawText(doc)
        const gt = flatten(gold.paragraphs.map(stripBullets)).text
        const cov = ngramCoverage(gt, norm(raw))
        base.coverage = cov
        base.reverseCoverage = ngramCoverage(norm(raw), gt)
        base.goldSource = gold.source
        if (!gt) {
          results.push({ ...base, status: 'excluded', reason: '正解が空' })
          continue
        }
        if (cov < MIN_COVERAGE) {
          results.push({ ...base, status: 'excluded', reason: `版ズレ/テキスト層不足: 3-gram包含率 ${cov.toFixed(3)} < ${MIN_COVERAGE} (PDF文字数 ${norm(raw).length}, 正解 ${gt.length})` })
          continue
        }
        markdown = (await engine(doc)).markdown
      } finally {
        await closePdf(doc)
      }
      const { diffText, ...m } = scorePair(gold, markdown, { skipPara: overrides[r.scenario]?.skipPara })
      base.metrics = m
      if (overrides[r.scenario]?.skipPara) base.skipPara = overrides[r.scenario].reason ?? 'skipPara'
      base.seconds = (Date.now() - t1) / 1000
      results.push(base)
      const pd = path.join(outDir, r.id)
      await mkdir(pd, { recursive: true })
      await writeFile(path.join(pd, 'out.md'), markdown)
      await writeFile(path.join(pd, 'gold.txt'), gold.paragraphs.join('\n\n'))
      await writeFile(path.join(pd, 'diff.txt'), diffText)
      process.stdout.write('.')
    } catch (e) {
      results.push({ ...base, status: 'error', reason: e instanceof Error ? e.message : String(e) })
      process.stdout.write('x')
    }
  }
  console.log('')

  const ok = results.filter((r) => r.status === 'ok' && r.metrics)
  const bad = results.filter((r) => r.status !== 'ok')

  console.log(`\n== 除外/エラー ${bad.length}件 ==`)
  for (const b of bad) console.log(`${b.id} ${b.scenario} / ${b.pdf} [${b.status}] ${b.reason}`)

  const header = ['scenario', 'n', 'char%', 'paraP', 'paraR', 'paraF1', 'hTxt', 'hLvl', 'sp', 'nl', 'warn']
  const line = (cells: string[]): string =>
    [pad(cells[0], 34), pad(cells[1], 3, true), ...cells.slice(2, 8).map((c) => pad(c, 7, true)), pad(cells[8], 7, true), pad(cells[9], 8, true), cells[10] ?? ''].join(' ').trimEnd()
  const agg = (rs: Result[]): string[] => {
    const ms = rs.map((r) => r.metrics!)
    const hs = ms.filter((m) => m.headingTextF1 != null)
    const ps = ms.filter((m) => m.paraF1 != null)
    const warn = rs.some((x) => (x.reverseCoverage ?? 1) < MIN_REVERSE) ? 'PDF>正解' : ''
    return [
      '',
      String(rs.length),
      pct(mean(ms.map((m) => m.charMatch))),
      ps.length ? pct(mean(ps.map((m) => m.paraP!))) : '-',
      ps.length ? pct(mean(ps.map((m) => m.paraR!))) : '-',
      ps.length ? pct(mean(ps.map((m) => m.paraF1!))) : '-',
      hs.length ? pct(mean(hs.map((m) => m.headingTextF1!))) : '-',
      hs.length ? pct(mean(hs.map((m) => m.headingLevelF1!))) : '-',
      String(ms.reduce((a, m) => a + m.residueSpaces, 0)),
      String(ms.reduce((a, m) => a + m.residueNewlines, 0)),
      warn,
    ]
  }
  console.log(`\n== シナリオ別 (組の平均。sp=和文間スペース合計, nl=段落内改行合計) ==`)
  console.log(line(header))
  const byScenario = new Map<string, Result[]>()
  for (const r of ok) byScenario.set(r.scenario, [...(byScenario.get(r.scenario) ?? []), r])
  for (const [s, rs] of byScenario) {
    const c = agg(rs)
    c[0] = `${split[s]} ${s}`
    console.log(line(c))
  }
  if (ok.length) {
    const c = agg(ok)
    c[0] = 'ALL (組平均)'
    console.log(line(c))
  }

  const total = (Date.now() - t0) / 1000
  console.log(`\n採点 ${ok.length}組 / 除外・エラー ${bad.length}組 / 所要 ${total.toFixed(1)}秒`)
  await writeFile(path.join(outDir, 'result.json'), JSON.stringify({ engine: engineName, split: splitSel, seconds: total, results }, null, 2))
  console.log(`詳細: ${outDir}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
