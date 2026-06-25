// DD-285 — Defense-in-Depth Token-Middleware fuer Write-Endpoints.
//
// Prueft optionalen X-Devd-Token-Header gegen ENV DEVD_API_TOKEN bei
// mutierenden Methoden (POST/PUT/PATCH/DELETE) auf /api/-Pfaden.
// Read-Endpoints (GET/HEAD/OPTIONS) bleiben offen.
//
// Backwards-Compat: Wenn DEVD_API_TOKEN nicht gesetzt ist, wird die
// Middleware zum No-Op und loggt einmalig einen Warn-Hinweis. So bricht
// das Dev-Setup ohne Token nicht zusammen.
//
// Token-Vergleich: timingSafeEqual (Length-Mismatch ist sofort-fail).
//
// Architektur-Kontext (Issue-Referenz):
// LAN/Tailscale erreicht DevD ohne Authelia. Diese Middleware schliesst
// Write-Endpoints fuer kompromittierte LAN-Clients (IoT, Gast-WLAN) ab,
// ohne den LAN-Komfort fuer Read-Zugriffe wegzunehmen.

import crypto from 'crypto'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Liefert die Express-Middleware. envGetter erlaubt Test-Injection.
 *
 * @param {Object} [opts]
 * @param {Function} [opts.envGetter] - () => string|undefined, default process.env.DEVD_API_TOKEN
 * @param {Function} [opts.logger]    - { warn, info } default console
 * @param {Function} [opts.bypassIf]  - optional (req) => boolean. true => Token-Pruefung
 *                                       wird uebersprungen. Verwendet, um bereits via
 *                                       Authelia authentifizierte Browser-UI-Requests
 *                                       (req.user gesetzt) und LAN/Tailscale-Quellen
 *                                       (isTrustedProxySource) durchzulassen.
 * @returns {Function} Express-Middleware (req, res, next)
 */
export function createDevdTokenAuth({ envGetter, logger = console, bypassIf } = {}) {
  const getToken = envGetter || (() => process.env.DEVD_API_TOKEN)
  let warned = false

  return function devdTokenAuth(req, res, next) {
    if (!MUTATING_METHODS.has(req.method)) return next()
    if (!req.path.startsWith('/api/')) return next()

    // DD-285-Followup: Bypass fuer authentifizierte / trusted Quellen — Browser-UI
    // im LAN (ohne Authelia) und via Authelia (req.user) sollen UI-Writes ausfuehren.
    if (typeof bypassIf === 'function' && bypassIf(req)) return next()

    const expected = getToken()
    if (!expected) {
      if (!warned) {
        logger.warn('[devd-token] DEVD_API_TOKEN not set — write-endpoint auth bypassed (Defense-in-Depth disabled). Set the env var in production.')
        warned = true
      }
      return next()
    }

    const header = req.header ? req.header('X-Devd-Token') : (req.headers && req.headers['x-devd-token'])
    if (!header || typeof header !== 'string') {
      return res.status(401).json({ error: 'MISSING_DEVD_TOKEN' })
    }

    const expectedBuf = Buffer.from(expected, 'utf8')
    const actualBuf = Buffer.from(header, 'utf8')
    if (expectedBuf.length !== actualBuf.length) {
      return res.status(401).json({ error: 'INVALID_DEVD_TOKEN' })
    }
    if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return res.status(401).json({ error: 'INVALID_DEVD_TOKEN' })
    }
    next()
  }
}
