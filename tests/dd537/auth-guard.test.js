import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  isAuthGatedHost,
  isAuthFailureResponse,
  notifyAuthRequired,
  isAuthRequired,
  __resetAuthGuard,
} from '../../src/lib/authGuard.js'

// DD-537 — Zentrale Auth-Fehler-Erkennung.
//
// Prod-Vorfall 2026-06-10: abgelaufene Authelia-Session → /api/projects-XHR bekam
// ein 302/401 (Auth-Redirect) statt 200. apiClient/ProjectScope unterschieden den
// Auth-Fehler nicht vom echten Ladefehler → irrefuehrendes „Projekt konnte nicht
// geladen werden". Diese pure Klassifizierer trennen Auth-Fehler von echten
// Backend-Fehlern (500/404) und gaten auf auth-gegatete Hosts (devdash.*).

describe('DD-537 · isAuthGatedHost', () => {
  test('devdash.* ist auth-gated (hinter Authelia)', () => {
    expect(isAuthGatedHost('devdash.familie-riedel.org')).toBe(true)
  })
  test('localhost / 127.0.0.1 NICHT (kein Authelia lokal)', () => {
    expect(isAuthGatedHost('localhost')).toBe(false)
    expect(isAuthGatedHost('127.0.0.1')).toBe(false)
  })
  test('Capture-Host issues.* NICHT (oeffentlich, ohne Authelia)', () => {
    expect(isAuthGatedHost('issues.familie-riedel.org')).toBe(false)
  })
  test('Tailnet-IP NICHT (direkter Zugriff, kein Authelia)', () => {
    expect(isAuthGatedHost('100.71.39.53')).toBe(false)
  })
  test('Host mit Port wird normalisiert', () => {
    expect(isAuthGatedHost('localhost:5555')).toBe(false)
    expect(isAuthGatedHost('devdash.familie-riedel.org:443')).toBe(true)
  })
  test('leer / undefined → false', () => {
    expect(isAuthGatedHost('')).toBe(false)
    expect(isAuthGatedHost(undefined)).toBe(false)
  })
})

describe('DD-537 · isAuthFailureResponse', () => {
  const origin = 'https://devdash.familie-riedel.org'

  test('HTTP 401 → Auth-Fehler', () => {
    expect(isAuthFailureResponse({ status: 401 }, origin)).toBe(true)
  })
  test('opaqueredirect → Auth-Fehler', () => {
    expect(isAuthFailureResponse({ status: 0, type: 'opaqueredirect' }, origin)).toBe(true)
  })
  test('Redirect auf fremde Origin (Authelia-Login) → Auth-Fehler', () => {
    expect(isAuthFailureResponse(
      { status: 200, redirected: true, url: 'https://login.familie-riedel.org/?rd=…' },
      origin,
    )).toBe(true)
  })
  test('200 same-origin → kein Auth-Fehler', () => {
    expect(isAuthFailureResponse(
      { status: 200, redirected: false, url: origin + '/api/projects' },
      origin,
    )).toBe(false)
  })
  test('500 → kein Auth-Fehler (echter Backend-Fehler, spezifische Meldung)', () => {
    expect(isAuthFailureResponse({ status: 500 }, origin)).toBe(false)
  })
  test('404 → kein Auth-Fehler', () => {
    expect(isAuthFailureResponse({ status: 404 }, origin)).toBe(false)
  })
  test('null/undefined → false', () => {
    expect(isAuthFailureResponse(null, origin)).toBe(false)
  })
})

describe('DD-537 · notifyAuthRequired', () => {
  let realWin
  beforeEach(() => {
    __resetAuthGuard()
    realWin = globalThis.window
  })
  afterEach(() => { globalThis.window = realWin })

  test('setzt Flag und feuert Event genau einmal (idempotent)', () => {
    let fired = 0
    let lastType = null
    globalThis.window = { dispatchEvent: (ev) => { fired++; lastType = ev?.type ?? ev; return true } }

    notifyAuthRequired()
    notifyAuthRequired()

    expect(isAuthRequired()).toBe(true)
    expect(fired).toBe(1)
    expect(lastType).toBe('devd-auth-required')
  })
})
