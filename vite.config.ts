import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 6100,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  optimizeDeps: {
    include: ['pdfjs-dist', 'bcdice'],
    exclude: ['@jsquash/webp'],
    esbuildOptions: {
      loader: { '.map': 'empty' },
    },
  },
})
