import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // DD-225: PWA-Manifest + Service Worker. autoUpdate weil Single-User-Heimnetz —
    // kein Update-Prompt-Friction. devOptions.enabled=false: Dev-Server braucht keinen
    // SW (verhindert "stale chunk"-Bugs während HMR).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'DevD Issues',
        short_name: 'DD Issues',
        description: 'Schnelle Issue-Erfassung für DevDashboard via PWA-Capture.',
        theme_color: '#89b4fa',
        background_color: '#1e1e2e',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // DD-327 (Bug "Reload Page = Empty Page"): drei Workbox-Optionen
        // zusammen lösen das Stale-Shell-Problem nach einem Deploy.
        //
        // Symptom: F5 zeigte leere Seite, Strg+F5 funktionierte.
        // Ursache: alter SW serviert gecachte index.html, die auf
        //   alte main-<hash>.js-Bundles verweist → 404 → blank.
        //
        // Fix:
        //   skipWaiting:true        — neuer SW geht direkt in "active"
        //   clientsClaim:true       — übernimmt offene Tabs sofort
        //   cleanupOutdatedCaches:true — löscht Workbox-Precaches vorheriger Builds
        //
        // Damit kann ein normales F5 nach Deploy nicht mehr auf einen
        // alten Cache treffen, der zu einem neuen index.html-Hash gehört.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Authelia-Redirects auf auth.* DÜRFEN nicht gecached werden — sonst blockiert
        // ein in-Cache 302 den frischen Login-Flow nach Session-Ablauf.
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
        runtimeCaching: [
          {
            // API: erst Netz (3s Timeout), dann Cache. Offline-Resilience.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'devd-api-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Bilder: Cache-First, 30-Tage TTL.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'devd-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Authelia-Subdomain: NIEMALS cachen.
            urlPattern: ({ url }) => url.hostname.startsWith('auth.'),
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 6106,
    host: true, // an alle Interfaces binden, damit DevD via Tailscale-IP erreichbar ist
    // DD-547: Tailscale-Serve-Review-Zugang (https://<machine>.ts.net) — Vite 8 blockt
    // sonst fremde Host-Header trotz host:true. Nur Tailnet-intern (.ts.net), kein Public-Funnel.
    allowedHosts: ['.ts.net'],
    // DD-D05-A: dev:nas / dev:wt1 / dev:wt2 setzen DEVD_PROXY_TARGET (NAS-API), sonst lokaler Server :5556.
    proxy: {
      '/api': { target: process.env.DEVD_PROXY_TARGET || 'http://localhost:5556', changeOrigin: true },
      '/uploads': { target: process.env.DEVD_PROXY_TARGET || 'http://localhost:5556', changeOrigin: true },
      '/ws': { target: (process.env.DEVD_PROXY_TARGET || 'http://localhost:5556').replace(/^http/, 'ws'), ws: true },
    },
  },
})
