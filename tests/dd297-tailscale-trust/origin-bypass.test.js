import { describe, test, expect, vi } from 'vitest'
import { createDevdTokenAuth } from '../../server/middleware/devdToken.js'
import { isTrustedSource } from '../../server/lib/trustedSource.js'

// Repliziert die Bypass-Logic aus server/api.js (DD-285 + DD-297).
function bypassIf(req) {
  if (req.user) return true
  if (isTrustedSource(req.ip || '')) return true
  const origin = req.headers?.origin
  const host = req.headers?.host
  if (origin && host) {
    try {
      const originHost = new URL(origin).host
      if (originHost === host) return true
    } catch { /* malformed */ }
  }
  return false
}

function makeMw() {
  return createDevdTokenAuth({ envGetter: () => 'secret-token', bypassIf })
}

function mkReq({ ip = '8.8.8.8', user = null, headers = {}, method = 'PATCH', path = '/api/sprints/reorder' }) {
  return {
    ip, user, method, path,
    headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])),
    header(name) { return this.headers[name.toLowerCase()] },
  }
}

function mkRes() {
  const res = { statusCode: 200, body: null }
  res.status = (c) => { res.statusCode = c; return res }
  res.json = (b) => { res.body = b; return res }
  return res
}

describe('DD-297 · Same-Origin-Bypass für Token-Middleware', () => {
  test('Origin matches Host → bypass (Browser-UI Same-Origin)', () => {
    const mw = makeMw()
    const req = mkReq({
      ip: '8.8.8.8',
      headers: { origin: 'https://devdash.familie-riedel.org', host: 'devdash.familie-riedel.org' },
    })
    const res = mkRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(next).toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
  })

  test('Origin Host mismatch → 401 MISSING_DEVD_TOKEN', () => {
    const mw = makeMw()
    const req = mkReq({
      ip: '8.8.8.8',
      headers: { origin: 'https://evil.example.com', host: 'devdash.familie-riedel.org' },
    })
    const res = mkRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'MISSING_DEVD_TOKEN' })
  })

  test('Tailscale-IP allein reicht für bypass (ohne Origin)', () => {
    const mw = makeMw()
    const req = mkReq({ ip: '100.71.39.53', headers: {} })
    const res = mkRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  test('req.user gesetzt (Authelia) → bypass', () => {
    const mw = makeMw()
    const req = mkReq({ ip: '8.8.8.8', user: { username: 'erik' }, headers: {} })
    const res = mkRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  test('Externe IP ohne Origin/User/Token → 401', () => {
    const mw = makeMw()
    const req = mkReq({ ip: '8.8.8.8', headers: { host: 'devdash.familie-riedel.org' } })
    const res = mkRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(401)
  })

  test('Malformed Origin → kein bypass', () => {
    const mw = makeMw()
    const req = mkReq({
      ip: '8.8.8.8',
      headers: { origin: 'not-a-url', host: 'devdash.familie-riedel.org' },
    })
    const res = mkRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(next).not.toHaveBeenCalled()
  })

  test('Origin mit Port match Host mit Port', () => {
    const mw = makeMw()
    const req = mkReq({
      ip: '8.8.8.8',
      headers: { origin: 'http://localhost:5555', host: 'localhost:5555' },
    })
    const res = mkRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  test('Read-Method (GET) ist immer offen', () => {
    const mw = makeMw()
    const req = mkReq({ ip: '8.8.8.8', method: 'GET', headers: {} })
    const res = mkRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})
