// DD-285 — Defense-in-Depth Token-Middleware Tests.
//
// Verifiziert die Acceptance-Kriterien aus Issue DD-285:
// 1. POST ohne Token bei gesetzter ENV → 401
// 2. POST mit korrektem Token bei gesetzter ENV → next() (kein Status)
// 3. GET bleibt offen unabhaengig vom Token-Stand
// 4. POST ohne ENV-Token → next() (Backwards-Compat) + Warn-Log einmalig

import { describe, it, expect, vi } from 'vitest'
import { createDevdTokenAuth } from '../../server/middleware/devdToken.js'

function makeReq({ method = 'POST', path = '/api/backlog', token } = {}) {
  const headers = {}
  if (token !== undefined) headers['x-devd-token'] = token
  return {
    method,
    path,
    headers,
    header(name) {
      return this.headers[name.toLowerCase()]
    },
  }
}

function makeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

describe('DD-285 devdToken middleware', () => {
  it('rejects mutating /api/ request without token (401)', () => {
    const mw = createDevdTokenAuth({ envGetter: () => 'secret-token-abc', logger: { warn: vi.fn() } })
    const req = makeReq({ method: 'POST', path: '/api/backlog' })
    const res = makeRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'MISSING_DEVD_TOKEN' })
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects mutating /api/ request with wrong token (401)', () => {
    const mw = createDevdTokenAuth({ envGetter: () => 'secret-token-abc', logger: { warn: vi.fn() } })
    const req = makeReq({ method: 'POST', path: '/api/backlog', token: 'wrong' })
    const res = makeRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'INVALID_DEVD_TOKEN' })
    expect(next).not.toHaveBeenCalled()
  })

  it('accepts mutating /api/ request with correct token', () => {
    const mw = createDevdTokenAuth({ envGetter: () => 'secret-token-abc', logger: { warn: vi.fn() } })
    const req = makeReq({ method: 'POST', path: '/api/backlog', token: 'secret-token-abc' })
    const res = makeRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(res.statusCode).toBeNull()
    expect(next).toHaveBeenCalledOnce()
  })

  it('lets GET pass even without token when ENV is set', () => {
    const mw = createDevdTokenAuth({ envGetter: () => 'secret-token-abc', logger: { warn: vi.fn() } })
    const req = makeReq({ method: 'GET', path: '/api/projects' })
    const res = makeRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(res.statusCode).toBeNull()
    expect(next).toHaveBeenCalledOnce()
  })

  it('lets HEAD pass even without token when ENV is set', () => {
    const mw = createDevdTokenAuth({ envGetter: () => 'secret-token-abc', logger: { warn: vi.fn() } })
    const req = makeReq({ method: 'HEAD', path: '/api/projects' })
    const res = makeRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('ignores non-/api/ paths', () => {
    const mw = createDevdTokenAuth({ envGetter: () => 'secret-token-abc', logger: { warn: vi.fn() } })
    const req = makeReq({ method: 'POST', path: '/uploads/x' })
    const res = makeRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })

  it('bypasses + warns when ENV token is empty (backwards-compat)', () => {
    const warn = vi.fn()
    const mw = createDevdTokenAuth({ envGetter: () => undefined, logger: { warn } })
    const req = makeReq({ method: 'POST', path: '/api/backlog' })
    const res = makeRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(res.statusCode).toBeNull()
    expect(next).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toMatch(/DEVD_API_TOKEN not set/)
  })

  it('warns only once across many bypassed requests', () => {
    const warn = vi.fn()
    const mw = createDevdTokenAuth({ envGetter: () => undefined, logger: { warn } })
    for (let i = 0; i < 5; i++) {
      mw(makeReq({ method: 'POST', path: '/api/backlog' }), makeRes(), vi.fn())
    }
    expect(warn).toHaveBeenCalledOnce()
  })

  it('treats empty string token as missing (401, not bypass)', () => {
    const mw = createDevdTokenAuth({ envGetter: () => 'secret', logger: { warn: vi.fn() } })
    const req = makeReq({ method: 'POST', path: '/api/backlog', token: '' })
    const res = makeRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'MISSING_DEVD_TOKEN' })
  })

  it('rejects shorter-length token via length-mismatch path (401)', () => {
    const mw = createDevdTokenAuth({ envGetter: () => 'long-secret-token', logger: { warn: vi.fn() } })
    const req = makeReq({ method: 'POST', path: '/api/backlog', token: 'short' })
    const res = makeRes()
    const next = vi.fn()
    mw(req, res, next)
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'INVALID_DEVD_TOKEN' })
  })

  it('handles PUT/PATCH/DELETE just like POST', () => {
    const mw = createDevdTokenAuth({ envGetter: () => 'secret', logger: { warn: vi.fn() } })
    for (const method of ['PUT', 'PATCH', 'DELETE']) {
      const res = makeRes()
      mw(makeReq({ method, path: '/api/backlog/1' }), res, vi.fn())
      expect(res.statusCode).toBe(401)
    }
  })

  // DD-285-Followup: Bypass-Pfade fuer Authelia (req.user) und LAN/Tailscale.
  describe('bypassIf', () => {
    it('lets request through when bypassIf returns true (Authelia-authenticated)', () => {
      const mw = createDevdTokenAuth({
        envGetter: () => 'secret',
        logger: { warn: vi.fn() },
        bypassIf: (req) => Boolean(req.user),
      })
      const req = makeReq({ method: 'POST', path: '/api/sprints/1/status' })
      req.user = { username: 'erik' }
      const res = makeRes()
      const next = vi.fn()
      mw(req, res, next)
      expect(res.statusCode).toBeNull()
      expect(next).toHaveBeenCalledOnce()
    })

    it('still requires token when bypassIf returns false (untrusted source)', () => {
      const mw = createDevdTokenAuth({
        envGetter: () => 'secret',
        logger: { warn: vi.fn() },
        bypassIf: (_req) => false,
      })
      const res = makeRes()
      mw(makeReq({ method: 'POST', path: '/api/backlog' }), res, vi.fn())
      expect(res.statusCode).toBe(401)
    })

    it('bypassIf takes precedence over wrong token', () => {
      const mw = createDevdTokenAuth({
        envGetter: () => 'secret',
        logger: { warn: vi.fn() },
        bypassIf: () => true,
      })
      const req = makeReq({ method: 'POST', path: '/api/backlog', token: 'totally-wrong' })
      const res = makeRes()
      const next = vi.fn()
      mw(req, res, next)
      expect(res.statusCode).toBeNull()
      expect(next).toHaveBeenCalledOnce()
    })

    it('does not invoke bypassIf for GETs (already short-circuited)', () => {
      const bypass = vi.fn().mockReturnValue(true)
      const mw = createDevdTokenAuth({
        envGetter: () => 'secret',
        logger: { warn: vi.fn() },
        bypassIf: bypass,
      })
      mw(makeReq({ method: 'GET', path: '/api/projects' }), makeRes(), vi.fn())
      expect(bypass).not.toHaveBeenCalled()
    })
  })
})
