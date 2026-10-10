/**
 * SPA は全ルートで同じ index.html を返すため、リンクカード（JS を動かさないクローラーが読む OGP）が
 * トップと同じになる。ビルド時に index.html から OGP だけ差し替えたページ別 HTML を作る。
 */
export interface RouteOgp {
  /** 先頭スラッシュ付き。出力先は dist{path}/index.html */
  path: string
  title: string
  description: string
}

const SITE_ORIGIN = 'https://jupiter-systems.vercel.app'

const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const metaRe = (attr: 'property' | 'name', key: string) =>
  new RegExp(`[ \\t]*<meta ${attr}="${key.replace(/[.:]/g, '\\$&')}" content="[^"]*"\\s*/?>\\n?`)

/** 置換対象が見つからなければ投げる（index.html の書式が変わったのに黙って素通りしない） */
// 置換は関数で渡す（値に $ が入っても置換パターンとして解釈させない）
function replaceOnce(html: string, re: RegExp, to: (m: string) => string, label: string): string {
  if (!re.test(html)) throw new Error(`routeOgp: ${label} が index.html に見つからない`)
  return html.replace(re, to)
}

function setMeta(html: string, attr: 'property' | 'name', key: string, value: string): string {
  const re = metaRe(attr, key)
  return replaceOnce(html, re, (m: string) => m.replace(/content="[^"]*"/, () => `content="${escapeAttr(value)}"`), key)
}

/** 画像は出さない（カードは文字だけ）。画像系のタグを消し、twitter:card を summary にする */
export function withRouteOgp(html: string, route: RouteOgp): string {
  const title = escapeAttr(route.title)
  let out = replaceOnce(html, /<title>[^<]*<\/title>/, () => `<title>${title}</title>`, '<title>')
  for (const [attr, key, value] of [
    ['property', 'og:title', route.title],
    ['property', 'og:description', route.description],
    ['property', 'og:url', `${SITE_ORIGIN}${route.path}`],
    ['name', 'twitter:card', 'summary'],
    ['name', 'twitter:title', route.title],
    ['name', 'twitter:description', route.description],
    ['name', 'description', route.description],
  ] as const) {
    out = setMeta(out, attr, key, value)
  }
  for (const [attr, key] of [
    ['property', 'og:image'],
    ['property', 'og:image:width'],
    ['property', 'og:image:height'],
    ['name', 'twitter:image'],
  ] as const) {
    out = replaceOnce(out, metaRe(attr, key), () => '', key)
  }
  return out
}
