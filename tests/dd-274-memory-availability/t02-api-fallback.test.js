// DD-274 — API-Fallback behaviour.
//
// When sqlite-vec is missing (e.g. inside the NAS container) the underlying
// memoryDb calls throw. The /api/memories routes MUST catch that and return
// a structured 503 — NOT a 500 with a stack trace. The frontend keys off the
// 503 to render the "not available" banner instead of a generic error toast.
//
// We test this by building a tiny throw-only Express stack that mirrors the
// memory-route's try/catch contract. This stays the route's behaviour close
// to the actual file without dragging the full server/api.js into the test.

import { describe, it, expect } from 'vitest'
import express from 'express'
import http from 'node:http'

function memoryUnavailableResponse(res, err) {
  return res.status(503).json({
    error: 'memory_unavailable',
    message:
      'Memory-Backend nicht verfügbar — sqlite-vec oder Ollama fehlt auf diesem Host. ' +
      'Memory-Feature ist nur in der lokalen DevDashboard-Instanz nutzbar.',
  })
}

function buildAppWithThrowingDb() {
  const app = express()
  app.use(express.json())

  const throwingListMemories = () => {
    throw new Error('vec0: no such module')
  }
  const throwingGetMemory = () => {
    throw new Error('vec0: no such module')
  }

  app.get('/api/memories', (req, res) => {
    try {
      const result = throwingListMemories()
      res.json(result)
    } catch (err) {
      return memoryUnavailableResponse(res, err)
    }
  })

  app.get('/api/memories/:id', (req, res) => {
    try {
      const m = throwingGetMemory()
      if (!m) return res.status(404).json({ error: 'Memory nicht gefunden' })
      res.json(m)
    } catch (err) {
      return memoryUnavailableResponse(res, err)
    }
  })

  // Final JSON error handler — exists in real api.js. If our try/catch leaks
  // an error here, the test below catches it as a 500 (which we explicitly
  // assert is NOT what happens).
  app.use('/api', (err, _req, res, _next) => {
    res.status(500).json({ error: err.message || 'Internal Server Error' })
  })

  return app
}

function listen(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({ server, port })
    })
  })
}

async function fetchJson(port, path) {
  const url = `http://127.0.0.1:${port}${path}`
  const res = await fetch(url)
  let body = null
  try {
    body = await res.json()
  } catch {
    /* may be empty (204) */
  }
  return { status: res.status, body }
}

describe('memory routes — backend unavailable fallback', () => {
  it('GET /api/memories returns 503 + memory_unavailable JSON when the DB throws', async () => {
    const app = buildAppWithThrowingDb()
    const { server, port } = await listen(app)
    try {
      const { status, body } = await fetchJson(port, '/api/memories')
      expect(status).toBe(503)
      expect(body).toMatchObject({ error: 'memory_unavailable' })
      expect(body.message).toMatch(/sqlite-vec|Ollama/)
    } finally {
      server.close()
    }
  })

  it('GET /api/memories/:id returns 503 (not 500) when the DB throws', async () => {
    const app = buildAppWithThrowingDb()
    const { server, port } = await listen(app)
    try {
      const { status, body } = await fetchJson(port, '/api/memories/abc')
      expect(status).toBe(503)
      expect(status).not.toBe(500)
      expect(body.error).toBe('memory_unavailable')
    } finally {
      server.close()
    }
  })

  it('never falls through to the generic /api error handler (no 500 leak)', async () => {
    const app = buildAppWithThrowingDb()
    const { server, port } = await listen(app)
    try {
      const list = await fetchJson(port, '/api/memories')
      const single = await fetchJson(port, '/api/memories/xyz')
      for (const r of [list, single]) {
        expect(r.status).not.toBe(500)
        expect(r.body).not.toHaveProperty('error', 'Internal Server Error')
      }
    } finally {
      server.close()
    }
  })
})
