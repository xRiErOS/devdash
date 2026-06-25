import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'
import { createApiKeyAuth, hashApiKey, generateApiKey } from '../../apps/backend/src/middleware/apiKeyAuth.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_030 = '030_v3_milestone_dependencies.sql'
const MIG_031 = '031_v3_milestone_dod_items.sql'
const MIG_032 = '032_v3_api_keys.sql'

describe('DD-251 apiKeyAuth middleware', () => {
  let db
  let middleware
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    logDir = mkdtempSync(join(tmpdir(), 'devd-dd251-'))
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_030, { logDir })
    applyMigration(db, MIG_031, { logDir })
    applyMigration(db, MIG_032, { logDir })
    middleware = createApiKeyAuth(db)
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  function mockReq(headers = {}) {
    const normalized = {}
    for (const [k, v] of Object.entries(headers)) normalized[k.toLowerCase()] = v
    return {
      headers: normalized,
      header(name) { return normalized[name.toLowerCase()] },
    }
  }

  function mockRes() {
    const res = { statusCode: undefined, body: undefined }
    res.status = (code) => { res.statusCode = code; return res }
    res.json = (body) => { res.body = body; return res }
    return res
  }

  test('Migration 032 — api_keys table + indexes present', () => {
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='api_keys'`).all()
    expect(tables).toHaveLength(1)
    const indexes = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='api_keys' AND name NOT LIKE 'sqlite_%'`).all().map(r => r.name).sort()
    expect(indexes).toEqual(['idx_api_keys_hash', 'idx_api_keys_user'])
  })

  test('no X-API-Key header → next() called, req.user undefined, no 401', () => {
    const req = mockReq()
    const res = mockRes()
    let nextCalls = 0
    middleware(req, res, () => { nextCalls++ })
    expect(nextCalls).toBe(1)
    expect(req.user).toBeUndefined()
    expect(res.statusCode).toBeUndefined()
  })

  test('valid X-API-Key → req.user populated, next() called', () => {
    const plainKey = generateApiKey()
    const hash = hashApiKey(plainKey)
    db.prepare('INSERT INTO api_keys (user_id, key_hash, label) VALUES (?, ?, ?)').run('alice', hash, 'test-key')

    const req = mockReq({ 'X-API-Key': plainKey })
    const res = mockRes()
    let nextCalls = 0
    middleware(req, res, () => { nextCalls++ })

    expect(nextCalls).toBe(1)
    expect(req.user).toEqual({ username: 'alice', source: 'api-key' })
    expect(res.statusCode).toBeUndefined()
  })

  test('invalid prefix → 401 INVALID_API_KEY_FORMAT', () => {
    const req = mockReq({ 'X-API-Key': 'wrong_format_abc' })
    const res = mockRes()
    middleware(req, res, () => {})
    expect(res.statusCode).toBe(401)
    expect(res.body.error).toBe('INVALID_API_KEY_FORMAT')
  })

  test('unknown key (correct prefix, no DB row) → 401 INVALID_API_KEY', () => {
    const req = mockReq({ 'X-API-Key': 'dd_pat_' + 'f'.repeat(64) })
    const res = mockRes()
    middleware(req, res, () => {})
    expect(res.statusCode).toBe(401)
    expect(res.body.error).toBe('INVALID_API_KEY')
  })

  test('revoked key → 401 REVOKED_API_KEY', () => {
    const plainKey = generateApiKey()
    const hash = hashApiKey(plainKey)
    db.prepare(
      `INSERT INTO api_keys (user_id, key_hash, revoked_at) VALUES (?, ?, CURRENT_TIMESTAMP)`
    ).run('bob', hash)

    const req = mockReq({ 'X-API-Key': plainKey })
    const res = mockRes()
    middleware(req, res, () => {})
    expect(res.statusCode).toBe(401)
    expect(res.body.error).toBe('REVOKED_API_KEY')
  })

  test('valid key updates last_used_at', () => {
    const plainKey = generateApiKey()
    const hash = hashApiKey(plainKey)
    db.prepare('INSERT INTO api_keys (user_id, key_hash) VALUES (?, ?)').run('carol', hash)
    expect(db.prepare('SELECT last_used_at FROM api_keys WHERE key_hash = ?').get(hash).last_used_at).toBeNull()

    middleware(mockReq({ 'X-API-Key': plainKey }), mockRes(), () => {})

    const after = db.prepare('SELECT last_used_at FROM api_keys WHERE key_hash = ?').get(hash)
    expect(after.last_used_at).not.toBeNull()
  })

  test('generateApiKey produces dd_pat_ prefix + 64 hex chars', () => {
    const key = generateApiKey()
    expect(key).toMatch(/^dd_pat_[0-9a-f]{64}$/)
  })

  test('hashApiKey is deterministic SHA-256 hex', () => {
    const h1 = hashApiKey('dd_pat_abc')
    const h2 = hashApiKey('dd_pat_abc')
    expect(h1).toBe(h2)
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
  })
})
