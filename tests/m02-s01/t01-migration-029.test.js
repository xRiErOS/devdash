import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, readFileSync, rmSync, mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'

describe('T01 — Migration 029 target_date NOT NULL + Backfill', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-m029-'))
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('backfill: NULL target_date wird auf created_at+90d gesetzt', () => {
    const ins = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, created_at)
      VALUES (?, ?, ?, ?)
    `)
    ins.run(2, 'M-null-1', null, '2026-01-01 00:00:00')
    ins.run(2, 'M-null-2', null, '2026-02-15 00:00:00')
    ins.run(2, 'M-null-3', null, '2026-03-31 12:00:00')
    ins.run(2, 'M-set-1', '2026-12-31', '2026-01-01 00:00:00')
    ins.run(2, 'M-set-2', '2026-11-30', '2026-02-01 00:00:00')

    applyMigration(db, MIG_029, { logDir })

    const nullsLeft = db.prepare(`SELECT COUNT(*) AS c FROM milestones WHERE target_date IS NULL OR target_date = ''`).get().c
    expect(nullsLeft).toBe(0)

    const rows = db.prepare(`SELECT name, target_date FROM milestones ORDER BY name`).all()
    const byName = Object.fromEntries(rows.map(r => [r.name, r.target_date]))
    expect(byName['M-null-1']).toBe('2026-04-01')
    expect(byName['M-null-2']).toBe('2026-05-16')
    expect(byName['M-null-3']).toBe('2026-06-29')
    expect(byName['M-set-1']).toBe('2026-12-31')
    expect(byName['M-set-2']).toBe('2026-11-30')
  })

  test('pre-dump enthält NULL-Rows, post-diff zeigt befüllte Werte', () => {
    db.prepare(`INSERT INTO milestones (project_id, name, target_date, created_at) VALUES (?, ?, NULL, '2026-01-01')`).run(2, 'M-A')
    db.prepare(`INSERT INTO milestones (project_id, name, target_date, created_at) VALUES (?, ?, NULL, '2026-02-01')`).run(2, 'M-B')
    db.prepare(`INSERT INTO milestones (project_id, name, target_date, created_at) VALUES (?, ?, '2026-12-31', '2026-01-01')`).run(2, 'M-C')

    const { preResult, postResult } = applyMigration(db, MIG_029, { logDir })

    expect(preResult.ids).toHaveLength(2)
    expect(postResult.ids).toHaveLength(2)

    const prePath = join(logDir, '029-pre-backfill-dump.json')
    const postPath = join(logDir, '029-post-backfill-diff.json')
    expect(existsSync(prePath)).toBe(true)
    expect(existsSync(postPath)).toBe(true)

    const pre = JSON.parse(readFileSync(prePath, 'utf8'))
    const post = JSON.parse(readFileSync(postPath, 'utf8'))
    expect(pre.count).toBe(2)
    expect(pre.rows.every(r => r.target_date === null)).toBe(true)
    expect(post.count).toBe(2)
    expect(post.rows.every(r => r.target_date && r.target_date.length === 10)).toBe(true)
  })

  test('post-Migration verweigert INSERT ohne target_date (NOT NULL Constraint)', () => {
    applyMigration(db, MIG_029, { logDir })

    expect(() => {
      db.prepare(`INSERT INTO milestones (project_id, name) VALUES (?, ?)`).run(2, 'M-no-date')
    }).toThrow(/NOT NULL constraint failed: milestones\.target_date/)
  })

  test('Re-Run der Migration wird via schema_migrations-Check verhindert (idempotent auf Runner-Ebene)', () => {
    db.prepare(`INSERT INTO milestones (project_id, name, target_date, created_at) VALUES (?, ?, NULL, '2026-01-01')`).run(2, 'M-X')
    applyMigration(db, MIG_029, { logDir })

    const beforeReRun = db.prepare(`SELECT target_date FROM milestones WHERE name = 'M-X'`).get().target_date

    expect(() => applyMigration(db, MIG_029, { logDir })).toThrow(/UNIQUE constraint failed.*schema_migrations/)

    const afterReRun = db.prepare(`SELECT target_date FROM milestones WHERE name = 'M-X'`).get().target_date
    expect(afterReRun).toBe(beforeReRun)
  })

  test('FK-Check passes: sprints.milestone_id-Referenzen bleiben nach Tabellen-Rename intakt', () => {
    db.prepare(`INSERT INTO milestones (project_id, name, target_date, created_at) VALUES (?, ?, NULL, '2026-01-01')`).run(2, 'M-FK')
    const milestoneId = db.prepare(`SELECT id FROM milestones WHERE name = 'M-FK'`).get().id
    db.prepare(`
      INSERT INTO sprints (project_id, project_number, name, status, milestone_id)
      VALUES (?, ?, ?, 'planning', ?)
    `).run(2, 1, 'Sprint-FK', milestoneId)

    applyMigration(db, MIG_029, { logDir })

    const violations = db.prepare(`PRAGMA foreign_key_check`).all()
    expect(violations).toEqual([])

    const stillLinked = db.prepare(`SELECT milestone_id FROM sprints WHERE name = 'Sprint-FK'`).get().milestone_id
    expect(stillLinked).toBe(milestoneId)
  })
})
