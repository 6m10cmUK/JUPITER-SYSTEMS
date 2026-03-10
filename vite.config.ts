import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 6100,
    host: true, // LAN内の他デバイス（スマホ等）からアクセス可能にする
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist'],
    exclude: ['@jsquash/webp'],
    esbuildOptions: {
      loader: { '.map': 'empty' },
    },
  },
})
