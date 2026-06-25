import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vitest-Konfiguration:
// - Node-Environment fuer JS-Suiten (migrations, api, hostname-router)
// - React-Plugin fuer SSR-Rendering von JSX-Komponenten (DD-267 MilestonePill u.a.)
export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    environment: 'node',
    // TZ pinnen: Datums-Snapshots (toLocaleString) müssen lokal (Europe/Berlin)
    // und CI (UTC) identisch rendern — sonst Snapshot-Drift (PR #34, 2026-06-07).
    env: { TZ: 'UTC' },
    include: ['tests/**/*.test.{js,jsx,mjs}'],
    exclude: ['node_modules', 'dist', 'e2e', '.git'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    reporters: ['default'],
  },
})
