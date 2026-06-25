import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb, appliedMigrations } from '../_fixtures/in-memory-db.js'
import { seedProject, seedMilestones } from '../_fixtures/seed.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_030 = '030_v3_milestone_dependencies.sql'

describe('T02 — Migration 030 milestone_dependencies', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-m030-'))
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_030, { logDir })
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('Tabelle + Indizes existieren nach Migration', () => {
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='milestone_dependencies'`).all()
    expect(tables).toHaveLength(1)

    const indexes = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='milestone_dependencies' AND name NOT LIKE 'sqlite_%'`).all().map(r => r.name).sort()
    expect(indexes).toEqual([
      'idx_milestone_deps_predecessor',
      'idx_milestone_deps_successor',
      'sqlite_autoindex_milestone_dependencies_1',
    ].sort().filter(n => !n.startsWith('sqlite_')))

    expect(appliedMigrations(db)).toContain(MIG_030)
  })

  test('INSERT (1,2) OK; doppelter INSERT (1,2) → UNIQUE-Constraint-Error', () => {
    const [m1, m2] = seedMilestones(db, [
      { name: 'M-1', target_date: '2026-06-01' },
      { name: 'M-2', target_date: '2026-07-01' },
    ])
    const ins = db.prepare(`INSERT INTO milestone_dependencies (predecessor_id, successor_id) VALUES (?, ?)`)
    ins.run(m1, m2)

    expect(() => ins.run(m1, m2)).toThrow(/UNIQUE constraint failed: milestone_dependencies\.predecessor_id, milestone_dependencies\.successor_id/)
  })

  test('INSERT (5,5) → CHECK-Constraint-Error (Self-Loop)', () => {
    const [m1] = seedMilestones(db, [
      { name: 'M-self', target_date: '2026-06-01' },
    ])
    const ins = db.prepare(`INSERT INTO milestone_dependencies (predecessor_id, successor_id) VALUES (?, ?)`)
    expect(() => ins.run(m1, m1)).toThrow(/CHECK constraint failed/)
  })

  test('DELETE FROM milestones cascadiert auf milestone_dependencies', () => {
    const [m1, m2, m3] = seedMilestones(db, [
      { name: 'M-A', target_date: '2026-06-01' },
      { name: 'M-B', target_date: '2026-07-01' },
      { name: 'M-C', target_date: '2026-08-01' },
    ])
    const ins = db.prepare(`INSERT INTO milestone_dependencies (predecessor_id, successor_id) VALUES (?, ?)`)
    ins.run(m1, m2)
    ins.run(m1, m3)
    ins.run(m2, m3)

    expect(db.prepare(`SELECT COUNT(*) AS c FROM milestone_dependencies`).get().c).toBe(3)

    db.prepare(`DELETE FROM milestones WHERE id = ?`).run(m1)

    const remaining = db.prepare(`SELECT predecessor_id, successor_id FROM milestone_dependencies ORDER BY predecessor_id`).all()
    expect(remaining).toEqual([{ predecessor_id: m2, successor_id: m3 }])
  })

  test('created_at default = datetime(now)', () => {
    const [m1, m2] = seedMilestones(db, [
      { name: 'M-T1', target_date: '2026-06-01' },
      { name: 'M-T2', target_date: '2026-07-01' },
    ])
    db.prepare(`INSERT INTO milestone_dependencies (predecessor_id, successor_id) VALUES (?, ?)`).run(m1, m2)
    const row = db.prepare(`SELECT created_at FROM milestone_dependencies WHERE predecessor_id = ?`).get(m1)
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  test('Re-Run der Migration wird via Fehler verhindert (Tabelle existiert)', () => {
    expect(() => applyMigration(db, MIG_030, { logDir })).toThrow(/(table milestone_dependencies already exists|UNIQUE constraint failed.*schema_migrations)/)
  })
})
