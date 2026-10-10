import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { withRouteOgp } from '../routeOgp'

const indexHtml = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8')
const route = { path: '/pdf2md', title: 'Scenario PDF Reader | JUPITER SYSTEMS', description: 'シナリオPDFを読みやすく。' }

test('タイトル・説明・URL を差し替え、画像のタグを消す', () => {
  const out = withRouteOgp(indexHtml, route)
  assert.match(out, /<title>Scenario PDF Reader \| JUPITER SYSTEMS<\/title>/)
  assert.match(out, /<meta property="og:title" content="Scenario PDF Reader \| JUPITER SYSTEMS" \/>/)
  assert.match(out, /<meta property="og:description" content="シナリオPDFを読みやすく。" \/>/)
  assert.match(out, /<meta property="og:url" content="https:\/\/jupiter-systems\.vercel\.app\/pdf2md" \/>/)
  assert.match(out, /<meta name="twitter:card" content="summary" \/>/)
  assert.match(out, /<meta name="twitter:title" content="Scenario PDF Reader \| JUPITER SYSTEMS" \/>/)
  assert.match(out, /<meta name="twitter:description" content="シナリオPDFを読みやすく。" \/>/)
  assert.match(out, /<meta name="description" content="シナリオPDFを読みやすく。" \/>/)
  assert.doesNotMatch(out, /og:image|twitter:image|木林という者について/)
  // OGP 以外（アプリの読み込み）はそのまま
  assert.match(out, /<div id="root"><\/div>/)
  assert.match(out, /<link rel="icon"/)
})

test('値は属性用にエスケープし、$ を置換パターンとして解釈しない', () => {
  const out = withRouteOgp(indexHtml, { ...route, title: 'A "B" <C> & $& $1' })
  assert.match(out, /<meta property="og:title" content="A &quot;B&quot; &lt;C&gt; &amp; \$&amp; \$1" \/>/)
})

test('置換対象が無ければ投げる', () => {
  assert.throws(() => withRouteOgp('<html><title>x</title></html>', route), /og:title/)
  assert.throws(() => withRouteOgp('<html></html>', route), /<title>/)
})
