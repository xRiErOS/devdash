import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb, appliedMigrations } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_033 = '033_v3_milestone_deferred.sql'
const MIG_038 = '038_v3_milestones_status_lifecycle.sql'

// DD-306 — T08 Milestone-Lifecycle planning|active|completed|cancelled.
// Vorbedingung: 029 (target_date NOT NULL) + 033 (deferred-Spalte) müssen vor 038 laufen.
// 038 ist ALTER-TABLE-Recreate mit Wert-Backfill open→planning, reached→completed.

describe('T08 — Migration 038 milestones.status Lifecycle', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-m038-'))
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_033, { logDir })
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('Vor Migration 038: status hat den alten Wert-Bereich open|reached|cancelled', () => {
    // Seed mit alten Werten möglich
    db.prepare(`INSERT INTO milestones (project_id, name, target_date, status) VALUES (?, ?, ?, ?)`)
      .run(2, 'M0-Old', '2025-01-01', 'reached')
    db.prepare(`INSERT INTO milestones (project_id, name, target_date, status) VALUES (?, ?, ?, ?)`)
      .run(2, 'M3-Old', '2026-08-12', 'open')
    const rows = db.prepare(`SELECT name, status FROM milestones ORDER BY name`).all()
    expect(rows).toEqual([
      { name: 'M0-Old', status: 'reached' },
      { name: 'M3-Old', status: 'open' },
    ])
  })

  test('Backfill: open→planning, reached→completed, cancelled→cancelled', () => {
    db.prepare(`INSERT INTO milestones (project_id, name, target_date, status) VALUES (?, ?, ?, ?)`)
      .run(2, 'M0', '2025-01-01', 'reached')
    db.prepare(`INSERT INTO milestones (project_id, name, target_date, status) VALUES (?, ?, ?, ?)`)
      .run(2, 'M1', '2025-04-01', 'reached')
    db.prepare(`INSERT INTO milestones (project_id, name, target_date, status) VALUES (?, ?, ?, ?)`)
      .run(2, 'M3', '2026-08-12', 'open')
    db.prepare(`INSERT INTO milestones (project_id, name, target_date, status) VALUES (?, ?, ?, ?)`)
      .run(2, 'M-cancelled', '2026-09-01', 'cancelled')

    applyMigration(db, MIG_038, { logDir })

    const rows = db.prepare(`SELECT name, status FROM milestones ORDER BY name`).all()
    expect(rows).toEqual([
      { name: 'M-cancelled', status: 'cancelled' },
      { name: 'M0', status: 'completed' },
      { name: 'M1', status: 'completed' },
      { name: 'M3', status: 'planning' },
    ])
  })

  test('CHECK-Constraint: status="invalid" wird abgelehnt', () => {
    applyMigration(db, MIG_038, { logDir })
    expect(() => {
      db.prepare(`INSERT INTO milestones (project_id, name, target_date, status) VALUES (?, ?, ?, ?)`)
        .run(2, 'X', '2026-08-12', 'invalid')
    }).toThrow(/CHECK constraint failed/i)
  })

  test('Alle 4 neuen Status-Werte sind erlaubt', () => {
    applyMigration(db, MIG_038, { logDir })
    const stmt = db.prepare(`INSERT INTO milestones (project_id, name, target_date, status) VALUES (?, ?, ?, ?)`)
    expect(() => stmt.run(2, 'MA', '2026-08-12', 'planning')).not.toThrow()
    expect(() => stmt.run(2, 'MB', '2026-08-12', 'active')).not.toThrow()
    expect(() => stmt.run(2, 'MC', '2026-08-12', 'completed')).not.toThrow()
    expect(() => stmt.run(2, 'MD', '2026-08-12', 'cancelled')).not.toThrow()
  })

  test('DEFAULT="planning" greift bei INSERT ohne status', () => {
    applyMigration(db, MIG_038, { logDir })
    const { lastInsertRowid: id } = db.prepare(
      `INSERT INTO milestones (project_id, name, target_date) VALUES (?, ?, ?)`
    ).run(2, 'MX', '2026-08-12')
    const row = db.prepare(`SELECT status FROM milestones WHERE id = ?`).get(id)
    expect(row.status).toBe('planning')
  })

  test('Index idx_milestones_status existiert und ist partial WHERE status IN active/planning', () => {
    applyMigration(db, MIG_038, { logDir })
    const indices = db.prepare(
      `SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='milestones'`
    ).all()
    const statusIdx = indices.find(i => i.name === 'idx_milestones_status')
    expect(statusIdx).toBeDefined()
    expect(statusIdx.sql).toMatch(/WHERE\s+status\s+IN\s*\(\s*'active'\s*,\s*'planning'\s*\)/i)
  })

  test('Bestehende Indices bleiben erhalten (project, position, deferred)', () => {
    applyMigration(db, MIG_038, { logDir })
    const indices = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='milestones' AND name NOT LIKE 'sqlite_%'`
    ).all().map(r => r.name).sort()
    expect(indices).toContain('idx_milestones_project')
    expect(indices).toContain('idx_milestones_project_position')
    expect(indices).toContain('idx_milestones_deferred')
    expect(indices).toContain('idx_milestones_status')
  })

  test('deferred-Spalte bleibt nach Recreate erhalten + funktional', () => {
    db.prepare(`INSERT INTO milestones (project_id, name, target_date, status, deferred) VALUES (?, ?, ?, ?, ?)`)
      .run(2, 'M-def', '2026-08-12', 'open', 1)
    applyMigration(db, MIG_038, { logDir })
    const row = db.prepare(`SELECT name, status, deferred FROM milestones WHERE name = ?`).get('M-def')
    expect(row).toEqual({ name: 'M-def', status: 'planning', deferred: 1 })
  })

  test('UNIQUE(project_id, name) bleibt nach Recreate erhalten', () => {
    applyMigration(db, MIG_038, { logDir })
    db.prepare(`INSERT INTO milestones (project_id, name, target_date) VALUES (?, ?, ?)`)
      .run(2, 'M-unique', '2026-08-12')
    expect(() => {
      db.prepare(`INSERT INTO milestones (project_id, name, target_date) VALUES (?, ?, ?)`)
        .run(2, 'M-unique', '2026-09-12')
    }).toThrow(/UNIQUE constraint failed/i)
  })

  test('foreign_key_check ist leer (FK-Integrität intakt nach Recreate)', () => {
    db.prepare(`INSERT INTO milestones (project_id, name, target_date, status) VALUES (?, ?, ?, ?)`)
      .run(2, 'M0', '2025-01-01', 'reached')
    applyMigration(db, MIG_038, { logDir })
    const violations = db.prepare('PRAGMA foreign_key_check').all()
    expect(violations).toEqual([])
  })

  test('schema_migrations enthält 038 nach Apply', () => {
    applyMigration(db, MIG_038, { logDir })
    expect(appliedMigrations(db)).toContain(MIG_038)
  })

  test('IDs bleiben nach Recreate stabil (AUTOINCREMENT-Werte unverändert)', () => {
    const { lastInsertRowid: m0Id } = db.prepare(
      `INSERT INTO milestones (project_id, name, target_date, status) VALUES (?, ?, ?, ?)`
    ).run(2, 'M0', '2025-01-01', 'reached')
    const { lastInsertRowid: m3Id } = db.prepare(
      `INSERT INTO milestones (project_id, name, target_date, status) VALUES (?, ?, ?, ?)`
    ).run(2, 'M3', '2026-08-12', 'open')
    applyMigration(db, MIG_038, { logDir })
    const rows = db.prepare(`SELECT id, name, status FROM milestones ORDER BY id`).all()
    expect(rows.find(r => r.id === Number(m0Id))).toMatchObject({ name: 'M0', status: 'completed' })
    expect(rows.find(r => r.id === Number(m3Id))).toMatchObject({ name: 'M3', status: 'planning' })
  })
})
