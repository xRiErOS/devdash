import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { patchIssueStatus } from '../../apps/frontend/src/lib/issueStatusApi.js'

describe('T04 — issueStatusApi.patchIssueStatus', () => {
  beforeEach(() => { globalThis.fetch = vi.fn() })
  afterEach(() => { delete globalThis.fetch })

  test('PATCH ohne notes — Body nur {status}', async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 5, status: 'in_progress' }) })
    await patchIssueStatus(5, 'in_progress')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/backlog/5/status',
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      })
    )
  })

  test('PATCH mit notes — Body {status, notes}', async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 5, status: 'cancelled' }) })
    await patchIssueStatus(5, 'cancelled', 'duplicate')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/backlog/5/status',
      expect.objectContaining({
        body: JSON.stringify({ status: 'cancelled', notes: 'duplicate' }),
      })
    )
  })

  test('204-Response → null', async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: true, status: 204 })
    const r = await patchIssueStatus(5, 'planned')
    expect(r).toBeNull()
  })

  test('400-Response wirft Error mit code + status', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Übergang nicht erlaubt', code: 'INVALID_TRANSITION' }),
    })
    await expect(patchIssueStatus(5, 'done')).rejects.toMatchObject({
      message: 'Übergang nicht erlaubt',
      code: 'INVALID_TRANSITION',
      status: 400,
    })
  })

  test('ok+malformed-JSON wirft MALFORMED_JSON', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => { throw new Error('Unexpected token') },
    })
    await expect(patchIssueStatus(5, 'in_progress')).rejects.toMatchObject({
      code: 'MALFORMED_JSON',
    })
  })
})
