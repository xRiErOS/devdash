// DD-537 — Zentrale Auth-Fehler-Erkennung.
//
// Hintergrund (Prod-Vorfall 2026-06-10): Bei abgelaufener Authelia-Session
// beantwortet der NPM/Authelia-auth_request einen /api-XHR mit 302/401 statt
// des echten Backend-200. apiClient + ProjectScope unterschieden das nicht von
// einem echten Ladefehler → irrefuehrende „Projekt konnte nicht geladen werden".
//
// Dieses Modul klassifiziert Auth-Fehler zentral (pure Funktionen, unit-testbar)
// und meldet sie ueber ein globales Event, auf das ein Overlay reagiert.

import { HOST_PATTERNS } from './hostnameRouter.js'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', ''])

/**
 * Ist der Host hinter Authelia (Auth-gegatet)? Nur dann darf ein 401/Redirect als
 * „Session abgelaufen" interpretiert werden.
 *
 * Ausgeschlossen: localhost/127.0.0.1 (lokal, kein Authelia), Capture-Host
 * `issues.*` (oeffentlich, ohne Authelia), Tailnet-IPs (100.64–127.x, direkter
 * Zugriff ohne Authelia).
 *
 * @param {string} [hostname=window.location.hostname]
 * @returns {boolean}
 */
export function isAuthGatedHost(hostname) {
  // DD-537: Test-Seam. e2e laeuft auf localhost (sonst ausgeschlossen); ein
  // explizit gesetztes window-Flag erzwingt das Gate, damit der Auth-Flow
  // behavioral (Playwright) testbar ist. Die Prod-App setzt das Flag nie.
  if (typeof window !== 'undefined' && window.__devdForceAuthGate) return true
  let h = hostname
  if (h == null && typeof window !== 'undefined') h = window.location.hostname
  h = String(h || '').toLowerCase().split(':')[0]
  if (LOCAL_HOSTS.has(h)) return false
  if (h.startsWith('issues.')) return false
  if (HOST_PATTERNS.some((p) => p.pattern.test(h))) return false
  return true
}

/**
 * Klassifiziert eine fetch-Response als Auth-Fehler. Trennt sauber von echten
 * Backend-Fehlern (500/404 → false).
 *
 * @param {Response|{status?:number,type?:string,redirected?:boolean,url?:string}} res
 * @param {string} [currentOrigin=window.location.origin]
 * @returns {boolean}
 */
export function isAuthFailureResponse(res, currentOrigin) {
  if (!res) return false
  if (res.status === 401) return true
  // redirect:'manual' → Cross-Origin-Redirect (Authelia-Login) wird opak.
  if (res.type === 'opaqueredirect') return true
  // redirect:'follow' folgte einer 302 auf die Authelia-Login-Domain.
  if (res.redirected && res.url) {
    let origin = currentOrigin
    if (origin == null && typeof window !== 'undefined') origin = window.location.origin
    if (!origin) return false
    try {
      return new URL(res.url).origin !== origin
    } catch {
      return false
    }
  }
  return false
}

let _authRequired = false

/** Wurde im aktuellen Tab bereits ein Auth-Fehler erkannt? */
export function isAuthRequired() {
  return _authRequired
}

function makeAuthEvent() {
  if (typeof CustomEvent === 'function') return new CustomEvent('devd-auth-required')
  return { type: 'devd-auth-required' }
}

/**
 * Markiert den Tab als „nicht (mehr) angemeldet" und feuert genau einmal das
 * globale `devd-auth-required`-Event (idempotent), auf das AuthExpiredOverlay
 * und ProjectScope reagieren.
 */
export function notifyAuthRequired() {
  if (_authRequired) return
  _authRequired = true
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(makeAuthEvent())
  }
}

/** Nur fuer Tests: Modul-Flag zuruecksetzen. */
export function __resetAuthGuard() {
  _authRequired = false
}
