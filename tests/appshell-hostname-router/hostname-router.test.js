// AppShell-Boot (DD2) — resolveView pure-fn. Port der Backup-Fälle
// (tests/dd269/hostname-router-deeplink.test.js) auf die neue Monorepo-Infra
// apps/frontend/src/lib/hostnameRouter.js. Node-env, kein Render.
import { describe, test, expect } from 'vitest'
import {
  resolveView,
  isKnownHost,
  VIEW_APP_SHELL,
  VIEW_CAPTURE,
  VIEW_CAPTURE_PINNED,
  VIEW_UNKNOWN,
} from '../../apps/frontend/src/lib/hostnameRouter.js'

describe('resolveView — Exact-Whitelist + Unknown', () => {
  test('devdash.* → VIEW_APP_SHELL (whitelist-exact)', () => {
    const r = resolveView('devdash.familie-riedel.org')
    expect(r.view).toBe(VIEW_APP_SHELL)
    expect(r.source).toBe('whitelist-exact')
  })

  test('localhost → VIEW_APP_SHELL', () => {
    expect(resolveView('localhost').view).toBe(VIEW_APP_SHELL)
  })

  test('issues.* → VIEW_CAPTURE', () => {
    expect(resolveView('issues.familie-riedel.org').view).toBe(VIEW_CAPTURE)
  })

  test('unbekannter Host → VIEW_UNKNOWN (kein stiller Default)', () => {
    const r = resolveView('weird.example.com')
    expect(r.view).toBe(VIEW_UNKNOWN)
    expect(r.source).toBe('unknown-host')
  })

  test('Tailnet-CGNAT-IP → VIEW_APP_SHELL (pattern)', () => {
    const r = resolveView('100.71.39.53')
    expect(r.view).toBe(VIEW_APP_SHELL)
    expect(r.source).toBe('whitelist-pattern:tailnet-cgnat')
  })
})

describe('resolveView — /capture Pfad (DD-456)', () => {
  test('devdash.* + /capture → VIEW_CAPTURE (path-capture)', () => {
    const r = resolveView('devdash.familie-riedel.org', '', '/capture')
    expect(r.view).toBe(VIEW_CAPTURE)
    expect(r.source).toBe('path-capture')
  })

  test('unbekannter Host + /capture → VIEW_UNKNOWN', () => {
    expect(resolveView('weird.example.com', '', '/capture').view).toBe(VIEW_UNKNOWN)
  })

  test('/capturexyz (kein exakter Match) → VIEW_APP_SHELL', () => {
    expect(resolveView('devdash.familie-riedel.org', '', '/capturexyz').view).toBe(VIEW_APP_SHELL)
  })
})

describe('resolveView — /catch/<slug> Deeplink (DD-269)', () => {
  test('issues.* + /catch/devd → VIEW_CAPTURE_PINNED, slug=devd', () => {
    const r = resolveView('issues.familie-riedel.org', '', '/catch/devd')
    expect(r.view).toBe(VIEW_CAPTURE_PINNED)
    expect(r.slug).toBe('devd')
    expect(r.source).toBe('deeplink-catch-slug')
  })

  test('uppercase slug → lowercase normalisiert', () => {
    expect(resolveView('issues.familie-riedel.org', '', '/catch/DevD').slug).toBe('devd')
  })

  test('Bindestrich-Slug akzeptiert', () => {
    expect(resolveView('issues.familie-riedel.org', '', '/catch/home-lab').slug).toBe('home-lab')
  })

  test('Underscore-Slug abgelehnt (regex)', () => {
    expect(resolveView('issues.familie-riedel.org', '', '/catch/bad_slug').view).toBe(VIEW_CAPTURE)
  })

  test('unbekannter Host + /catch/devd → VIEW_UNKNOWN (kein Pinning)', () => {
    expect(resolveView('weird.example.com', '', '/catch/devd').view).toBe(VIEW_UNKNOWN)
  })
})

describe('resolveView — Query-Override + BC', () => {
  test('?capture=1 schlägt /catch-Pfad (query-override)', () => {
    const r = resolveView('devdash.familie-riedel.org', '?capture=1', '/catch/devd')
    expect(r.view).toBe(VIEW_CAPTURE)
    expect(r.source).toBe('query-override')
  })

  test('Single-Arg-Aufruf funktioniert (BC)', () => {
    expect(resolveView('devdash.familie-riedel.org').view).toBe(VIEW_APP_SHELL)
  })
})

describe('isKnownHost', () => {
  test('exact + pattern bekannt, Fremdhost unbekannt', () => {
    expect(isKnownHost('localhost')).toBe(true)
    expect(isKnownHost('100.71.39.53')).toBe(true)
    expect(isKnownHost('weird.example.com')).toBe(false)
  })
})
