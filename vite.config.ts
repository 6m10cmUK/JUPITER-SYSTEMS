import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { withRouteOgp, type RouteOgp } from './scripts/route-ogp/routeOgp.ts'

// リンクカードをトップと変えたいページ。vercel.json の rewrites にも同じ path を足す
const ROUTE_OGP: RouteOgp[] = [
  { path: '/pdf2md', title: 'Scenario PDF Reader | JUPITER SYSTEMS', description: 'シナリオPDFを読みやすく。' },
]

function routeOgpPages(): Plugin {
  let outDir = 'dist'
  return {
    name: 'route-ogp-pages',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    writeBundle() {
      const html = readFileSync(join(outDir, 'index.html'), 'utf8')
      for (const route of ROUTE_OGP) {
        const dir = join(outDir, route.path)
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'index.html'), withRouteOgp(html, route))
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), routeOgpPages()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
})
