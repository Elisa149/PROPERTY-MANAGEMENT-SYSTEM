import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // On Vercel, output to repo root public/ so static assets are served by CDN
    outDir: process.env.VERCEL ? '../public' : 'dist',
    sourcemap: true,
  },
})
