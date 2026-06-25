// DD-393 — abuse guards for the public capture host.
//
// Pure helpers (resolveCaptureClientIp, captureCapRejection) are unit-tested; the
// per-project/global daily count SQL the handler runs is reproduced against an
// in-memory DB (server/api.js does not export its Express app).

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  resolveCaptureClientIp,
  captureCapRejection,
  PUBLIC_CAPTURE_DAILY_CAP,
  PUBLIC_CAPTURE_GLOBAL_DAILY_CAP,
  PUBLIC_CAPTURE_MAX_FILE_BYTES,
} from '../../apps/backend/src/lib/captureAbuseGuard.js'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'

describe('resolveCaptureClientIp', () => {
  test('prefers CF-Connecting-IP (real client behind Cloudflare)', () => {
    expect(resolveCaptureClientIp({ cfConnectingIp: '203.0.113.7', fallbackIp: '172.71.0.1' })).toBe('203.0.113.7')
  })

  test('takes the first IP if CF sends a list', () => {
    expect(resolveCaptureClientIp({ cfConnectingIp: '203.0.113.7, 172.71.0.1', fallbackIp: 'x' })).toBe('203.0.113.7')
  })

  test('handles IPv6 client', () => {
    expect(resolveCaptureClientIp({ cfConnectingIp: '2001:db8::1', fallbackIp: '10.0.0.1' })).toBe('2001:db8::1')
  })

  test('falls back to req.ip when no CF header (direct Tailscale/LAN)', () => {
    expect(resolveCaptureClientIp({ cfConnectingIp: undefined, fallbackIp: '100.71.39.53' })).toBe('100.71.39.53')
    expect(resolveCaptureClientIp({ cfConnectingIp: '', fallbackIp: '100.71.39.53' })).toBe('100.71.39.53')
  })

  test('rejects junk/tampered CF header and falls back', () => {
    expect(resolveCaptureClientIp({ cfConnectingIp: 'not an ip; drop table', fallbackIp: '10.0.0.1' })).toBe('10.0.0.1')
    expect(resolveCaptureClientIp({ cfConnectingIp: '<script>', fallbackIp: '10.0.0.1' })).toBe('10.0.0.1')
  })
})

describe('captureCapRejection', () => {
  test('allows below both caps', () => {
    expect(captureCapRejection({ projectCount: 0, globalCount: 0 })).toBeNull()
    expect(captureCapRejection({ projectCount: PUBLIC_CAPTURE_DAILY_CAP - 1, globalCount: 0 })).toBeNull()
  })

  test('rejects at the per-project cap', () => {
    const r = captureCapRejection({ projectCount: PUBLIC_CAPTURE_DAILY_CAP, globalCount: 0 })
    expect(r).toMatchObject({ code: 'PUBLIC_CAPTURE_DAILY_LIMIT', cap: PUBLIC_CAPTURE_DAILY_CAP })
  })

  test('global circuit-breaker takes precedence', () => {
    const r = captureCapRejection({ projectCount: 0, globalCount: PUBLIC_CAPTURE_GLOBAL_DAILY_CAP })
    expect(r).toMatchObject({ code: 'PUBLIC_CAPTURE_GLOBAL_LIMIT', cap: PUBLIC_CAPTURE_GLOBAL_DAILY_CAP })
  })

  test('respects custom caps', () => {
    expect(captureCapRejection({ projectCount: 2, globalCount: 2, projectCap: 3, globalCap: 10 })).toBeNull()
    expect(captureCapRejection({ projectCount: 3, globalCount: 2, projectCap: 3, globalCap: 10 }))
      .toMatchObject({ code: 'PUBLIC_CAPTURE_DAILY_LIMIT' })
  })

  test('default caps + upload limit are sane', () => {
    expect(PUBLIC_CAPTURE_DAILY_CAP).toBeGreaterThan(0)
    expect(PUBLIC_CAPTURE_GLOBAL_DAILY_CAP).toBeGreaterThanOrEqual(PUBLIC_CAPTURE_DAILY_CAP)
    expect(PUBLIC_CAPTURE_MAX_FILE_BYTES).toBeLessThan(8 * 1024 * 1024) // tighter than the authed catcher
  })
})

describe('daily-count SQL (reproduces POST /api/issues caps)', () => {
  let db
  const insert = (db, { projectId, n, by = null, at = null }) =>
    db.prepare(`
      INSERT INTO backlog (project_id, project_number, title, type, status, created_by_user, created_at)
      VALUES (?, ?, ?, 'feature', 'new', ?, COALESCE(?, CURRENT_TIMESTAMP))
    `).run(projectId, n, `t${n}`, by, at)

  const projectCount = (db, projectId) => db.prepare(`
    SELECT COUNT(*) AS c FROM backlog
    WHERE project_id = ? AND created_by_user IS NULL AND status != 'cancelled'
      AND created_at >= datetime('now', 'start of day')
  `).get(projectId).c

  const globalCount = (db) => db.prepare(`
    SELECT COUNT(*) AS c FROM backlog
    WHERE created_by_user IS NULL AND status != 'cancelled'
      AND created_at >= datetime('now', 'start of day')
  `).get().c

  beforeEach(() => {
    db = createTestDb({ upToVersion: '999' })
    seedProject(db, { id: 2, slug: 'devd', name: 'DevD', prefix: 'DD' })
    seedProject(db, { id: 9, slug: 'spf', name: 'Sproutling', prefix: 'SPF' })
  })
  afterEach(() => db?.close())

  test('counts today anonymous captures per project', () => {
    insert(db, { projectId: 9, n: 1 })
    insert(db, { projectId: 9, n: 2 })
    insert(db, { projectId: 2, n: 1 })
    expect(projectCount(db, 9)).toBe(2)
    expect(projectCount(db, 2)).toBe(1)
    expect(globalCount(db)).toBe(3)
  })

  test('excludes authenticated (created_by_user) captures', () => {
    insert(db, { projectId: 9, n: 1, by: 'erik' })
    insert(db, { projectId: 9, n: 2 })
    expect(projectCount(db, 9)).toBe(1)
  })

  test('excludes rows from previous days', () => {
    insert(db, { projectId: 9, n: 1, at: '2020-01-01 10:00:00' })
    insert(db, { projectId: 9, n: 2 })
    expect(projectCount(db, 9)).toBe(1)
  })
})
