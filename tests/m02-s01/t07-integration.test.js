import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb, appliedMigrations } from '../_fixtures/in-memory-db.js'
import { seedProject, seedMilestones } from '../_fixtures/seed.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'
import { insertDependency } from '../../server/lib/milestoneDependencies.js'
import { insertDodItem, listDodItems } from '../../server/lib/milestoneDodItems.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_030 = '030_v3_milestone_dependencies.sql'
const MIG_031 = '031_v3_milestone_dod_items.sql'
// 054 ergänzt details — insertDodItem/listDodItems (Production-Code) referenzieren die Spalte.
const MIG_054 = '054_v3_milestone_dod_items_details.sql'

describe('T07 — Cross-Cutting Integration M02-S01', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-m07-'))
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('Migration 029-031 sequenziell, alle in schema_migrations', () => {
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_030, { logDir })
    applyMigration(db, MIG_031, { logDir })
    const applied = appliedMigrations(db)
    expect(applied).toContain(MIG_029)
    expect(applied).toContain(MIG_030)
    expect(applied).toContain(MIG_031)
  })

  test('R01-Backfill-Verifikation: Pre-Dump + Post-Diff Artefakte mit korrekten Counts', () => {
    db.prepare(`INSERT INTO milestones (project_id, name, target_date, created_at) VALUES (?, ?, NULL, '2026-01-01')`).run(2, 'M-1')
    db.prepare(`INSERT INTO milestones (project_id, name, target_date, created_at) VALUES (?, ?, NULL, '2026-02-01')`).run(2, 'M-2')
    db.prepare(`INSERT INTO milestones (project_id, name, target_date, created_at) VALUES (?, ?, '2026-12-31', '2026-01-01')`).run(2, 'M-set')

    applyMigration(db, MIG_029, { logDir })

    const prePath = join(logDir, '029-pre-backfill-dump.json')
    const postPath = join(logDir, '029-post-backfill-diff.json')
    expect(existsSync(prePath)).toBe(true)
    expect(existsSync(postPath)).toBe(true)

    const pre = JSON.parse(readFileSync(prePath, 'utf8'))
    const post = JSON.parse(readFileSync(postPath, 'utf8'))
    expect(pre.count).toBe(2)
    expect(post.count).toBe(2)
    expect(post.rows.every(r => r.target_date === '2026-04-01' || r.target_date === '2026-05-02')).toBe(true)
  })

  test('Cascade-Delete cross-table: Milestone löschen → deps + dod-items weg, sprints.milestone_id=null', () => {
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_030, { logDir })
    applyMigration(db, MIG_031, { logDir })
    applyMigration(db, MIG_054, { logDir })
    const [m1, m2] = seedMilestones(db, [
      { name: 'M-A', target_date: '2026-06-01' },
      { name: 'M-B', target_date: '2026-07-01' },
    ])

    db.prepare(`INSERT INTO sprints (project_id, project_number, name, status, milestone_id) VALUES (?, ?, ?, 'planning', ?)`).run(2, 1, 'Sprint-A', m1)
    insertDependency(db, { predecessor_id: m1, successor_id: m2 })
    insertDodItem(db, m1, { label: 'DoD-A1' })
    insertDodItem(db, m1, { label: 'DoD-A2' })

    db.prepare('DELETE FROM milestones WHERE id = ?').run(m1)

    expect(db.prepare('SELECT COUNT(*) AS c FROM milestone_dependencies').get().c).toBe(0)
    expect(listDodItems(db, m1)).toEqual([])
    const sprint = db.prepare('SELECT milestone_id FROM sprints WHERE name = ?').get('Sprint-A')
    expect(sprint.milestone_id).toBe(null)
  })

  test('Migration-Re-Run blockiert (Idempotenz via schema_migrations + Tabellen-Existenz)', () => {
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_030, { logDir })
    applyMigration(db, MIG_031, { logDir })

    expect(() => applyMigration(db, MIG_030, { logDir })).toThrow(/(already exists|UNIQUE constraint failed.*schema_migrations)/)
    expect(() => applyMigration(db, MIG_031, { logDir })).toThrow(/(already exists|UNIQUE constraint failed.*schema_migrations)/)
  })

  test('End-to-End: 3 Milestones + 2 deps + 4 DoD-Items über alle Migrations konsistent', () => {
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_030, { logDir })
    applyMigration(db, MIG_031, { logDir })
    applyMigration(db, MIG_054, { logDir })
    const [m1, m2, m3] = seedMilestones(db, [
      { name: 'M-1', target_date: '2026-06-01' },
      { name: 'M-2', target_date: '2026-07-01' },
      { name: 'M-3', target_date: '2026-08-01' },
    ])

    insertDependency(db, { predecessor_id: m1, successor_id: m2 })
    insertDependency(db, { predecessor_id: m2, successor_id: m3 })

    insertDodItem(db, m1, { label: 'M1-T1' })
    insertDodItem(db, m1, { label: 'M1-T2' })
    insertDodItem(db, m2, { label: 'M2-T1' })
    insertDodItem(db, m3, { label: 'M3-T1' })

    expect(db.prepare(`SELECT COUNT(*) AS c FROM milestones`).get().c).toBe(3)
    expect(db.prepare(`SELECT COUNT(*) AS c FROM milestone_dependencies`).get().c).toBe(2)
    expect(db.prepare(`SELECT COUNT(*) AS c FROM milestone_dod_items`).get().c).toBe(4)
    expect(db.prepare(`SELECT COUNT(*) AS c FROM milestones WHERE target_date IS NULL`).get().c).toBe(0)
  })
})
