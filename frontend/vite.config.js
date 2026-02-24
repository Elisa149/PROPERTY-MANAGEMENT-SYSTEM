import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    // No proxy needed — frontend talks directly to Firebase, not Express
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
