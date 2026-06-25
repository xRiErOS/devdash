import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
import { createTestDb, appliedMigrations } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')

const MIG_051 = '051_v3_project_summary_fields.sql'
const DOWN_SQL = resolve(ROOT, 'apps/backend/migrations/_down/051_v3_project_summary_fields_down.sql')

const NEW_COLS = ['summary_achieved', 'summary_next', 'vision', 'goals']

function projectColumns(db) {
  return db.prepare('PRAGMA table_info(projects)').all().map(r => r.name)
}

describe('DD-490 — Migration 051 project summary/vision/goals fields', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '050_v3_cancelled_unification.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-m051-'))
    applyMigration(db, MIG_051, { logDir })
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('adds the 4 new TEXT columns, schema_migrations enthält 051', () => {
    const cols = projectColumns(db)
    for (const c of NEW_COLS) expect(cols).toContain(c)
    expect(appliedMigrations(db)).toContain(MIG_051)
  })

  test('the 4 columns are nullable TEXT (no NOT NULL, no default)', () => {
    const info = db.prepare('PRAGMA table_info(projects)').all()
    for (const c of NEW_COLS) {
      const col = info.find(r => r.name === c)
      expect(col).toBeTruthy()
      expect(col.type).toBe('TEXT')
      expect(col.notnull).toBe(0)
      expect(col.dflt_value).toBeNull()
    }
  })

  test('existing project rows survive (additive, no backfill → NULL)', () => {
    const row = db.prepare(
      'SELECT summary_achieved, summary_next, vision, goals FROM projects WHERE id = ?'
    ).get(2)
    expect(row).toEqual({ summary_achieved: null, summary_next: null, vision: null, goals: null })
  })

  test('round-trip: write + read back all 4 fields (goals newline-delimited)', () => {
    db.prepare(`
      UPDATE projects
      SET summary_achieved = ?, summary_next = ?, vision = ?, goals = ?
      WHERE id = ?
    `).run('did A', 'do B', 'the vision', 'goal one\ngoal two', 2)

    const row = db.prepare(
      'SELECT summary_achieved, summary_next, vision, goals FROM projects WHERE id = ?'
    ).get(2)
    expect(row).toEqual({
      summary_achieved: 'did A',
      summary_next: 'do B',
      vision: 'the vision',
      goals: 'goal one\ngoal two',
    })
    expect(row.goals.split('\n')).toEqual(['goal one', 'goal two'])
  })

  test('foreign_key_check ist leer (FK-Integrität intakt)', () => {
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([])
  })

  test('Down-Migration entfernt alle 4 Spalten wieder', () => {
    const downSql = readFileSync(DOWN_SQL, 'utf8')
    db.exec(downSql)
    const cols = projectColumns(db)
    for (const c of NEW_COLS) expect(cols).not.toContain(c)
  })
})
