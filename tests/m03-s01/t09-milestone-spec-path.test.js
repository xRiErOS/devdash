import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb, appliedMigrations } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'
import { validateSpecPath, MilestoneSpecPathError, buildSpecLink } from '../../server/lib/milestoneSpecPath.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_033 = '033_v3_milestone_deferred.sql'
const MIG_038 = '038_v3_milestones_status_lifecycle.sql'
const MIG_039 = '039_v3_milestones_spec_path.sql'

describe('T09 — Migration 039 milestones.spec_path', () => {
  let db, logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-m039-'))
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_033, { logDir })
    applyMigration(db, MIG_038, { logDir })
    applyMigration(db, MIG_039, { logDir })
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('spec_path-Spalte existiert nullable nach Migration', () => {
    const cols = db.prepare(`PRAGMA table_info(milestones)`).all().map(c => c.name)
    expect(cols).toContain('spec_path')
    expect(appliedMigrations(db)).toContain(MIG_039)
  })

  test('INSERT mit spec_path persistiert; ohne defaultet auf NULL', () => {
    const m1 = db.prepare(`INSERT INTO milestones (project_id, name, target_date, spec_path) VALUES (?, ?, ?, ?)`)
      .run(2, 'M-with-spec', '2026-08-12', 'specs/foo.md')
    const m2 = db.prepare(`INSERT INTO milestones (project_id, name, target_date) VALUES (?, ?, ?)`)
      .run(2, 'M-no-spec', '2026-09-01')
    const row1 = db.prepare(`SELECT spec_path FROM milestones WHERE id = ?`).get(m1.lastInsertRowid)
    const row2 = db.prepare(`SELECT spec_path FROM milestones WHERE id = ?`).get(m2.lastInsertRowid)
    expect(row1.spec_path).toBe('specs/foo.md')
    expect(row2.spec_path).toBeNull()
  })

  test('Partial-Index idx_milestones_spec_path existiert', () => {
    const idx = db.prepare(`SELECT name, sql FROM sqlite_master WHERE type='index' AND name='idx_milestones_spec_path'`).get()
    expect(idx).toBeDefined()
    expect(idx.sql).toMatch(/WHERE spec_path IS NOT NULL/i)
  })
})

describe('T09 — validateSpecPath', () => {
  test('null/leer/undefined → null (clear-intent)', () => {
    expect(validateSpecPath(null)).toBeNull()
    expect(validateSpecPath(undefined)).toBeNull()
    expect(validateSpecPath('')).toBeNull()
    expect(validateSpecPath('   ')).toBeNull()
  })

  test('absoluter Pfad → 400 SPEC_PATH_OUTSIDE_REPO', () => {
    expect(() => validateSpecPath('/etc/passwd')).toThrow(/relativ zum repo_path/)
  })

  test('".." → 400 SPEC_PATH_OUTSIDE_REPO', () => {
    expect(() => validateSpecPath('../etc/passwd')).toThrow(/path-traversal/)
    expect(() => validateSpecPath('foo/../bar.md')).toThrow(/path-traversal/)
  })

  test('relativer Pfad ohne repoPath → akzeptiert', () => {
    expect(validateSpecPath('specs/M3.md')).toBe('specs/M3.md')
  })

  test('relativer Pfad mit repoPath: innerhalb → ok, außerhalb → 400', () => {
    expect(validateSpecPath('specs/M3.md', { repoPath: '/repo' })).toBe('specs/M3.md')
  })

  test('Non-String → 400 SPEC_PATH_INVALID', () => {
    expect(() => validateSpecPath({ x: 1 })).toThrow(/String/)
    expect(() => validateSpecPath(42)).toThrow(/String/)
  })

  test('Whitespace getrimmt', () => {
    expect(validateSpecPath('  specs/M3.md  ')).toBe('specs/M3.md')
  })
})

describe('T09 — buildSpecLink', () => {
  test('null specPath → null', () => {
    expect(buildSpecLink(null)).toBeNull()
    expect(buildSpecLink('')).toBeNull()
  })

  test('mit repoPath → file://-URL', () => {
    const link = buildSpecLink('specs/M3.md', { repoPath: '/repo' })
    expect(link).toEqual({ spec_path: 'specs/M3.md', spec_url: 'file:///repo/specs/M3.md' })
  })

  test('ohne repoPath → file://-URL relativ zur cwd', () => {
    const link = buildSpecLink('specs/M3.md')
    expect(link.spec_path).toBe('specs/M3.md')
    expect(link.spec_url).toMatch(/^file:\/\//)
  })
})
