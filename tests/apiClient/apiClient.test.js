import { describe, it, expect, vi } from 'vitest'
import { createApiClient } from '../../apps/cli/lib/apiClient.js'

function mockFetch(status, payload) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'X',
    text: async () => JSON.stringify(payload),
  }))
}

describe('createApiClient', () => {
  it('sends Content-Type + X-Project-Id and parses JSON', async () => {
    const fetchImpl = mockFetch(200, { id: 7 })
    const c = createApiClient({ baseUrl: 'http://h:3001', projectId: 2, fetchImpl })
    const data = await c.get('/api/backlog')
    expect(data).toEqual({ id: 7 })
    const [url, opts] = fetchImpl.mock.calls[0]
    expect(url).toBe('http://h:3001/api/backlog')
    expect(opts.headers['X-Project-Id']).toBe('2')
    expect(opts.headers['Content-Type']).toBe('application/json')
  })

  it('per-call projectId overrides the default header', async () => {
    const fetchImpl = mockFetch(200, {})
    const c = createApiClient({ baseUrl: 'http://h', projectId: 2, fetchImpl })
    await c.get('/api/x', { projectId: 9 })
    expect(fetchImpl.mock.calls[0][1].headers['X-Project-Id']).toBe('9')
  })

  it('throws a formatted error on non-2xx', async () => {
    const fetchImpl = mockFetch(422, { error: 'SPRINTS_NOT_DONE' })
    const c = createApiClient({ baseUrl: 'http://h', fetchImpl })
    await expect(c.post('/api/sprints/1/complete', {})).rejects.toThrow(
      'POST /api/sprints/1/complete → 422: SPRINTS_NOT_DONE'
    )
  })

  it('adds X-Devd-Token only when set', async () => {
    const fetchImpl = mockFetch(200, {})
    const c = createApiClient({ baseUrl: 'http://h', token: 't', fetchImpl })
    await c.get('/api/x')
    const h = fetchImpl.mock.calls[0][1].headers
    expect(h['X-Devd-Token']).toBe('t')
    expect(h['X-Archon-Token']).toBeUndefined()
  })

  describe('upload()', () => {
    it('sends formData as body via POST without Content-Type but with X-Project-Id', async () => {
      const fetchImpl = mockFetch(200, { ok: true })
      const c = createApiClient({ baseUrl: 'http://h:3001', projectId: 3, fetchImpl })
      const fd = { _fake: 'formdata' }
      const data = await c.upload('/api/reviews/1/screenshots', fd)
      expect(data).toEqual({ ok: true })
      const [url, opts] = fetchImpl.mock.calls[0]
      expect(url).toBe('http://h:3001/api/reviews/1/screenshots')
      expect(opts.method).toBe('POST')
      expect(opts.body).toBe(fd)
      expect(opts.headers['Content-Type']).toBeUndefined()
      expect(opts.headers['X-Project-Id']).toBe('3')
    })

    it('per-call projectId override works for upload()', async () => {
      const fetchImpl = mockFetch(200, {})
      const c = createApiClient({ baseUrl: 'http://h', projectId: 1, fetchImpl })
      const fd = { _fake: 'formdata' }
      await c.upload('/api/x', fd, { projectId: 7 })
      expect(fetchImpl.mock.calls[0][1].headers['X-Project-Id']).toBe('7')
    })

    it('throws formatted error on non-2xx (413)', async () => {
      const fetchImpl = mockFetch(413, { error: 'FILE_TOO_LARGE' })
      const c = createApiClient({ baseUrl: 'http://h', fetchImpl })
      const fd = { _fake: 'formdata' }
      await expect(c.upload('/api/reviews/1/screenshots', fd)).rejects.toThrow(
        'POST /api/reviews/1/screenshots → 413: FILE_TOO_LARGE'
      )
    })

    it('throws formatted error on non-2xx (422)', async () => {
      const fetchImpl = mockFetch(422, { message: 'INVALID_MIME' })
      const c = createApiClient({ baseUrl: 'http://h', fetchImpl })
      const fd = { _fake: 'formdata' }
      await expect(c.upload('/api/reviews/2/screenshots', fd)).rejects.toThrow(
        'POST /api/reviews/2/screenshots → 422: INVALID_MIME'
      )
    })
  })
})
