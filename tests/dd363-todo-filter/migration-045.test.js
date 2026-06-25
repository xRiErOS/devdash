// DD-363: Migration 045 — project_todos.completed_at + Backfill erledigter ToDos.
// Pattern aus tests/m03-s01/t01-migration-037.test.js: Snapshot @028, applyMigration aus migrations/.

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')

const MIG_037 = '037_v3_project_todos.sql'
const MIG_045 = '045_v3_project_todos_completed_at.sql'
const DOWN_SQL = resolve(ROOT, 'migrations/_down/045_v3_project_todos_completed_at_down.sql')

describe('DD-363 — Migration 045 project_todos.completed_at', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-m045-'))
    applyMigration(db, MIG_037, { logDir })
    // Seed-Daten VOR 045 anlegen, um Backfill zu prüfen.
    db.prepare(`INSERT INTO project_todos (project_id, label, status, position, updated_at)
                VALUES (?, ?, ?, ?, ?)`).run(2, 'alt erledigt', 'done', 1, '2026-05-01 12:00:00')
    db.prepare(`INSERT INTO project_todos (project_id, label, status, position)
                VALUES (?, ?, ?, ?)`).run(2, 'offen', 'open', 2)
    applyMigration(db, MIG_045, { logDir })
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('completed_at-Spalte existiert', () => {
    const cols = db.prepare(`PRAGMA table_info(project_todos)`).all().map(c => c.name)
    expect(cols).toContain('completed_at')
  })

  test('Backfill: bestehendes erledigtes ToDo bekommt completed_at = updated_at', () => {
    const row = db.prepare(`SELECT completed_at, updated_at FROM project_todos WHERE label = ?`).get('alt erledigt')
    expect(row.completed_at).toBe('2026-05-01 12:00:00')
    expect(row.completed_at).toBe(row.updated_at)
  })

  test('Backfill berührt offene ToDos nicht (completed_at bleibt NULL)', () => {
    const row = db.prepare(`SELECT completed_at FROM project_todos WHERE label = ?`).get('offen')
    expect(row.completed_at).toBeNull()
  })

  test('neues offenes ToDo nach Migration hat completed_at NULL', () => {
    db.prepare(`INSERT INTO project_todos (project_id, label, status, position)
                VALUES (?, ?, ?, ?)`).run(2, 'frisch', 'open', 3)
    const row = db.prepare(`SELECT completed_at FROM project_todos WHERE label = ?`).get('frisch')
    expect(row.completed_at).toBeNull()
  })

  test('Down-Migration entfernt completed_at-Spalte wieder', () => {
    const downSql = readFileSync(DOWN_SQL, 'utf8')
    db.exec(downSql)
    const cols = db.prepare(`PRAGMA table_info(project_todos)`).all().map(c => c.name)
    expect(cols).not.toContain('completed_at')
  })

  test('foreign_key_check ist leer (Integrität intakt)', () => {
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([])
  })
})
