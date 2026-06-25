// DD-267: dedizierte Vite-Konfiguration für Playwright-E2E.
// Eigene Ports (Vite 5567, API 5568), damit ein parallel laufender
// Production-Dev-Server (5555/5556) ungestört bleibt. Nimmt die
// Default-Config und überschreibt nur Port + Proxy-Targets.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_PORT = Number(process.env.E2E_API_PORT || 5568)
const VITE_PORT = Number(process.env.E2E_VITE_PORT || 5567)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: VITE_PORT,
    strictPort: true,
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
      '/uploads': `http://localhost:${API_PORT}`,
      '/ws': { target: `ws://localhost:${API_PORT}`, ws: true },
    },
  },
})
