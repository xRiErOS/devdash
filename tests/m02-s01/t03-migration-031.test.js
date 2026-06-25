import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb, appliedMigrations } from '../_fixtures/in-memory-db.js'
import { seedProject, seedMilestones } from '../_fixtures/seed.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_030 = '030_v3_milestone_dependencies.sql'
const MIG_031 = '031_v3_milestone_dod_items.sql'

describe('T03 — Migration 031 milestone_dod_items', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-m031-'))
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_030, { logDir })
    applyMigration(db, MIG_031, { logDir })
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('Tabelle + Compound-Index vorhanden, schema_migrations enthält 031', () => {
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='milestone_dod_items'`).all()
    expect(tables).toHaveLength(1)

    const indexes = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='milestone_dod_items' AND name NOT LIKE 'sqlite_%'`).all().map(r => r.name)
    expect(indexes).toContain('idx_dod_items_milestone')

    expect(appliedMigrations(db)).toContain(MIG_031)
  })

  test('INSERT mit done=2 → CHECK-Constraint-Error', () => {
    const [m1] = seedMilestones(db, [{ name: 'M-1', target_date: '2026-06-01' }])
    expect(() => {
      db.prepare(`INSERT INTO milestone_dod_items (milestone_id, label, done, position) VALUES (?, ?, ?, ?)`).run(m1, 'Test', 2, 1)
    }).toThrow(/CHECK constraint failed/)
  })

  test('INSERT ohne position → NOT-NULL-Fehler', () => {
    const [m1] = seedMilestones(db, [{ name: 'M-1', target_date: '2026-06-01' }])
    expect(() => {
      db.prepare(`INSERT INTO milestone_dod_items (milestone_id, label) VALUES (?, ?)`).run(m1, 'Test')
    }).toThrow(/NOT NULL constraint failed: milestone_dod_items\.position/)
  })

  test('DELETE FROM milestones cascadiert auf milestone_dod_items', () => {
    const [m1, m2] = seedMilestones(db, [
      { name: 'M-A', target_date: '2026-06-01' },
      { name: 'M-B', target_date: '2026-07-01' },
    ])
    const ins = db.prepare(`INSERT INTO milestone_dod_items (milestone_id, label, position) VALUES (?, ?, ?)`)
    ins.run(m1, 'A-item-1', 1)
    ins.run(m1, 'A-item-2', 2)
    ins.run(m2, 'B-item-1', 1)

    expect(db.prepare(`SELECT COUNT(*) AS c FROM milestone_dod_items`).get().c).toBe(3)

    db.prepare(`DELETE FROM milestones WHERE id = ?`).run(m1)

    const remaining = db.prepare(`SELECT label FROM milestone_dod_items`).all().map(r => r.label)
    expect(remaining).toEqual(['B-item-1'])
  })

  test('done default = 0, created_at + updated_at default = datetime(now)', () => {
    const [m1] = seedMilestones(db, [{ name: 'M-default', target_date: '2026-06-01' }])
    db.prepare(`INSERT INTO milestone_dod_items (milestone_id, label, position) VALUES (?, ?, ?)`).run(m1, 'Default-Item', 1)
    const row = db.prepare(`SELECT done, created_at, updated_at FROM milestone_dod_items WHERE label = 'Default-Item'`).get()
    expect(row.done).toBe(0)
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    expect(row.updated_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  test('Re-Run der Migration wird verhindert (Tabelle existiert)', () => {
    expect(() => applyMigration(db, MIG_031, { logDir })).toThrow(/(table milestone_dod_items already exists|UNIQUE constraint failed.*schema_migrations)/)
  })
})
