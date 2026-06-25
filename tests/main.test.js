// DD-248: Hostname→View-Auflösung in main.jsx.
// Pure-Funktion-Tests gegen src/lib/hostnameRouter.js — kein DOM, kein React.

import { describe, test, expect } from 'vitest'
import {
  resolveView,
  HOST_VIEW_MAP,
  HOST_PATTERNS,
  VIEW_APP_SHELL,
  VIEW_CAPTURE,
  VIEW_UNKNOWN,
  UNKNOWN_HOST_FALLBACK,
} from '../apps/frontend/src/lib/hostnameRouter.js'

describe('DD-248 resolveView — Whitelist exact match', () => {
  test('devdash.familie-riedel.org → app-shell', () => {
    const r = resolveView('devdash.familie-riedel.org')
    expect(r.view).toBe(VIEW_APP_SHELL)
    expect(r.source).toBe('whitelist-exact')
    expect(r.hostname).toBe('devdash.familie-riedel.org')
  })

  test('issues.familie-riedel.org → capture-view', () => {
    const r = resolveView('issues.familie-riedel.org')
    expect(r.view).toBe(VIEW_CAPTURE)
    expect(r.source).toBe('whitelist-exact')
  })

  test('localhost → app-shell', () => {
    const r = resolveView('localhost')
    expect(r.view).toBe(VIEW_APP_SHELL)
    expect(r.source).toBe('whitelist-exact')
  })

  test('127.0.0.1 → app-shell', () => {
    const r = resolveView('127.0.0.1')
    expect(r.view).toBe(VIEW_APP_SHELL)
  })

  test('case-insensitive: DEVDASH.FAMILIE-RIEDEL.ORG → app-shell', () => {
    const r = resolveView('DEVDASH.FAMILIE-RIEDEL.ORG')
    expect(r.view).toBe(VIEW_APP_SHELL)
  })
})

describe('DD-248 resolveView — Tailnet pattern match (100.64.0.0/10)', () => {
  test('100.64.0.1 (CGNAT low) → app-shell', () => {
    const r = resolveView('100.64.0.1')
    expect(r.view).toBe(VIEW_APP_SHELL)
    expect(r.source).toBe('whitelist-pattern:tailnet-cgnat')
  })

  test('100.100.50.42 (typische Tailscale-IP) → app-shell', () => {
    const r = resolveView('100.100.50.42')
    expect(r.view).toBe(VIEW_APP_SHELL)
    expect(r.source).toBe('whitelist-pattern:tailnet-cgnat')
  })

  test('100.127.255.254 (CGNAT high) → app-shell', () => {
    const r = resolveView('100.127.255.254')
    expect(r.view).toBe(VIEW_APP_SHELL)
    expect(r.source).toBe('whitelist-pattern:tailnet-cgnat')
  })

  test('100.63.0.1 (knapp unter CGNAT) → unknown', () => {
    // 100.63.x.x liegt in 100.0.0.0/8 aber AUSSERHALB des CGNAT-Blocks.
    const r = resolveView('100.63.0.1')
    expect(r.view).toBe(VIEW_UNKNOWN)
  })

  test('100.128.0.1 (knapp über CGNAT) → unknown', () => {
    const r = resolveView('100.128.0.1')
    expect(r.view).toBe(VIEW_UNKNOWN)
  })

  test('200.64.0.1 (kein CGNAT-Prefix) → unknown', () => {
    const r = resolveView('200.64.0.1')
    expect(r.view).toBe(VIEW_UNKNOWN)
  })
})

describe('DD-248 resolveView — Forced override via ?capture=1', () => {
  test('localhost + ?capture=1 → capture-view (override schlägt Whitelist)', () => {
    const r = resolveView('localhost', '?capture=1')
    expect(r.view).toBe(VIEW_CAPTURE)
    expect(r.source).toBe('query-override')
  })

  test('devdash.familie-riedel.org + ?capture=1 → capture-view', () => {
    const r = resolveView('devdash.familie-riedel.org', '?capture=1')
    expect(r.view).toBe(VIEW_CAPTURE)
    expect(r.source).toBe('query-override')
  })

  test('unbekannter Host + ?capture=1 → capture-view (Override greift auch hier)', () => {
    const r = resolveView('random.example.com', '?capture=1')
    expect(r.view).toBe(VIEW_CAPTURE)
    expect(r.source).toBe('query-override')
  })

  test('?capture=1 als Substring (z.B. ?other=x&capture=1) → capture-view', () => {
    const r = resolveView('localhost', '?other=foo&capture=1')
    expect(r.view).toBe(VIEW_CAPTURE)
  })

  test('?capture=0 → KEIN Override (Whitelist gewinnt)', () => {
    // Strikt: nur 'capture=1' triggert den Override; alles andere wird ignoriert.
    // capture=0 enthält NICHT 'capture=1', also normaler Lookup.
    const r = resolveView('localhost', '?capture=0')
    expect(r.view).toBe(VIEW_APP_SHELL)
    expect(r.source).toBe('whitelist-exact')
  })
})

describe('DD-248 resolveView — Unbekannte Hostnames', () => {
  test('random.example.com → unknown (kein impliziter Default)', () => {
    const r = resolveView('random.example.com')
    expect(r.view).toBe(VIEW_UNKNOWN)
    expect(r.source).toBe('unknown-host')
    expect(r.hostname).toBe('random.example.com')
  })

  test('leerer Hostname → unknown', () => {
    const r = resolveView('')
    expect(r.view).toBe(VIEW_UNKNOWN)
  })

  test('null hostname → unknown', () => {
    const r = resolveView(null)
    expect(r.view).toBe(VIEW_UNKNOWN)
  })

  test('undefined hostname → unknown', () => {
    const r = resolveView(undefined)
    expect(r.view).toBe(VIEW_UNKNOWN)
  })

  test('fast-Treffer: dashdev.familie-riedel.org → unknown', () => {
    // Typo / Phishing-ähnlicher Host darf NICHT still in AppShell fallen.
    const r = resolveView('dashdev.familie-riedel.org')
    expect(r.view).toBe(VIEW_UNKNOWN)
  })

  test('Subdomain von whitelisted Domain → unknown (kein Wildcard)', () => {
    const r = resolveView('foo.devdash.familie-riedel.org')
    expect(r.view).toBe(VIEW_UNKNOWN)
  })
})

describe('DD-248 Konfigurations-Invarianten', () => {
  test('HOST_VIEW_MAP enthält alle vier Pflicht-Hosts aus DD-248', () => {
    expect(HOST_VIEW_MAP).toHaveProperty('devdash.familie-riedel.org', VIEW_APP_SHELL)
    expect(HOST_VIEW_MAP).toHaveProperty('issues.familie-riedel.org', VIEW_CAPTURE)
    expect(HOST_VIEW_MAP).toHaveProperty('localhost', VIEW_APP_SHELL)
  })

  test('HOST_PATTERNS enthält Tailnet-CGNAT-Pattern', () => {
    const tailnet = HOST_PATTERNS.find((p) => p.name === 'tailnet-cgnat')
    expect(tailnet).toBeDefined()
    expect(tailnet.view).toBe(VIEW_APP_SHELL)
    expect(tailnet.pattern).toBeInstanceOf(RegExp)
  })

  test('UNKNOWN_HOST_FALLBACK ist eine der bekannten Views', () => {
    expect([VIEW_APP_SHELL, VIEW_CAPTURE]).toContain(UNKNOWN_HOST_FALLBACK)
  })

  test('jeder HOST_VIEW_MAP-Wert ist eine bekannte View', () => {
    for (const [host, view] of Object.entries(HOST_VIEW_MAP)) {
      expect([VIEW_APP_SHELL, VIEW_CAPTURE], `host ${host} mapped to unknown view`).toContain(view)
    }
  })
})
