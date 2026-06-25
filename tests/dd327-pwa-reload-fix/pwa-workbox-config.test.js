import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// DD-327: PWA-Service-Worker servierte stale index.html nach Deploy →
// F5 leere Seite, Strg+F5 ok. Fix: skipWaiting + clientsClaim +
// cleanupOutdatedCaches in workbox-Config.

const ROOT = resolve(import.meta.dirname, '../..')
const viteConfig = readFileSync(resolve(ROOT, 'vite.config.js'), 'utf8')

describe('DD-327 — Vite-PWA Workbox-Config (Reload-Fix)', () => {
  test('skipWaiting: true gesetzt', () => {
    expect(viteConfig).toMatch(/skipWaiting:\s*true/)
  })

  test('clientsClaim: true gesetzt', () => {
    expect(viteConfig).toMatch(/clientsClaim:\s*true/)
  })

  test('cleanupOutdatedCaches: true gesetzt', () => {
    expect(viteConfig).toMatch(/cleanupOutdatedCaches:\s*true/)
  })

  test('Doc-Kommentar referenziert DD-327', () => {
    expect(viteConfig).toMatch(/DD-327/)
  })

  test('registerType bleibt autoUpdate (kein User-Prompt)', () => {
    expect(viteConfig).toMatch(/registerType:\s*'autoUpdate'/)
  })

  test('navigateFallbackDenylist deckt /api + /auth (bestehend)', () => {
    expect(viteConfig).toMatch(/navigateFallbackDenylist/)
    expect(viteConfig).toMatch(/\^\\\/api/)
    expect(viteConfig).toMatch(/\^\\\/auth/)
  })
})
