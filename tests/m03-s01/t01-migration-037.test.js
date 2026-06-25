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

const MIG_037 = '037_v3_project_todos.sql'
const DOWN_SQL = resolve(ROOT, 'apps/backend/migrations/_down/037_v3_project_todos_down.sql')

describe('T01 — Migration 037 project_todos + todo_links', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-m037-'))
    applyMigration(db, MIG_037, { logDir })
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('project_todos + todo_links existieren mit Indices, schema_migrations enthält 037', () => {
    const tables = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('project_todos','todo_links')`
    ).all().map(r => r.name).sort()
    expect(tables).toEqual(['project_todos', 'todo_links'])

    const indexes = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' AND tbl_name IN ('project_todos','todo_links')`
    ).all().map(r => r.name).sort()
    expect(indexes).toEqual(['idx_project_todos_open', 'idx_project_todos_project', 'idx_todo_links_todo'])

    expect(appliedMigrations(db)).toContain(MIG_037)
  })

  test('foreign_key_check ist leer (FK-Integrität intakt)', () => {
    const violations = db.prepare('PRAGMA foreign_key_check').all()
    expect(violations).toEqual([])
  })

  test('INSERT project_todos mit status=\"invalid\" wird via CHECK abgelehnt', () => {
    expect(() => {
      db.prepare(
        `INSERT INTO project_todos (project_id, label, status, position) VALUES (?, ?, ?, ?)`
      ).run(2, 'broken', 'invalid', 1)
    }).toThrow(/CHECK constraint failed/i)
  })

  test('INSERT project_todos ohne position wird via NOT NULL abgelehnt', () => {
    expect(() => {
      db.prepare(
        `INSERT INTO project_todos (project_id, label) VALUES (?, ?)`
      ).run(2, 'no position')
    }).toThrow(/NOT NULL constraint failed: project_todos.position/i)
  })

  test('INSERT todo_links mit type=\"blog\" wird via CHECK abgelehnt', () => {
    const { lastInsertRowid: todoId } = db.prepare(
      `INSERT INTO project_todos (project_id, label, position) VALUES (?, ?, ?)`
    ).run(2, 'parent', 1)

    expect(() => {
      db.prepare(
        `INSERT INTO todo_links (todo_id, type, target, position) VALUES (?, ?, ?, ?)`
      ).run(todoId, 'blog', 'https://example.org', 1)
    }).toThrow(/CHECK constraint failed/i)
  })

  test('INSERT todo_links für nicht-existenten todo_id wird via FK abgelehnt', () => {
    expect(() => {
      db.prepare(
        `INSERT INTO todo_links (todo_id, type, target, position) VALUES (?, ?, ?, ?)`
      ).run(99999, 'url', 'https://example.org', 1)
    }).toThrow(/FOREIGN KEY constraint failed/i)
  })

  test('Happy-Path: 1 ToDo + 4 Links (alle 4 Typen) inseriert sauber, JOIN liefert komplette Sicht', () => {
    const { lastInsertRowid: todoId } = db.prepare(
      `INSERT INTO project_todos (project_id, label, details, position) VALUES (?, ?, ?, ?)`
    ).run(2, 'Migration ausrollen', 'Auf NAS prüfen', 1)

    const insertLink = db.prepare(
      `INSERT INTO todo_links (todo_id, type, target, position) VALUES (?, ?, ?, ?)`
    )
    insertLink.run(todoId, 'spec', 'specs/2026-05-22-m3-project-home-tab-layout.md', 1)
    insertLink.run(todoId, 'issue', 'DD-278', 2)
    insertLink.run(todoId, 'vault', 'SOP - Sprint Durchfuehrung', 3)
    insertLink.run(todoId, 'url', 'https://example.org/docs', 4)

    const links = db.prepare(
      `SELECT type, target, position FROM todo_links WHERE todo_id = ? ORDER BY position`
    ).all(todoId)
    expect(links).toEqual([
      { type: 'spec', target: 'specs/2026-05-22-m3-project-home-tab-layout.md', position: 1 },
      { type: 'issue', target: 'DD-278', position: 2 },
      { type: 'vault', target: 'SOP - Sprint Durchfuehrung', position: 3 },
      { type: 'url', target: 'https://example.org/docs', position: 4 },
    ])

    const todo = db.prepare(`SELECT label, details, status FROM project_todos WHERE id = ?`).get(todoId)
    expect(todo).toEqual({ label: 'Migration ausrollen', details: 'Auf NAS prüfen', status: 'open' })
  })

  test('Zwei-Stufen-CASCADE: DELETE projects löscht todos UND deren links', () => {
    db.prepare(`INSERT INTO projects (id, slug, name, prefix) VALUES (?, ?, ?, ?)`)
      .run(900, 'tmp', 'TempProj', 'TMP')
    const { lastInsertRowid: todoId } = db.prepare(
      `INSERT INTO project_todos (project_id, label, position) VALUES (?, ?, ?)`
    ).run(900, 'A', 1)
    db.prepare(
      `INSERT INTO todo_links (todo_id, type, target, position) VALUES (?, ?, ?, ?)`
    ).run(todoId, 'url', 'https://a.test', 1)
    db.prepare(
      `INSERT INTO todo_links (todo_id, type, target, position) VALUES (?, ?, ?, ?)`
    ).run(todoId, 'issue', 'DD-1', 2)

    db.prepare(`DELETE FROM projects WHERE id = ?`).run(900)

    expect(db.prepare(`SELECT COUNT(*) AS c FROM project_todos WHERE project_id = ?`).get(900).c).toBe(0)
    expect(db.prepare(`SELECT COUNT(*) AS c FROM todo_links WHERE todo_id = ?`).get(todoId).c).toBe(0)
  })

  test('Einzel-CASCADE: DELETE einzelnes project_todo löscht nur dessen Links, andere bleiben', () => {
    const todoA = db.prepare(
      `INSERT INTO project_todos (project_id, label, position) VALUES (?, ?, ?)`
    ).run(2, 'keep-me', 1).lastInsertRowid
    const todoB = db.prepare(
      `INSERT INTO project_todos (project_id, label, position) VALUES (?, ?, ?)`
    ).run(2, 'drop-me', 2).lastInsertRowid

    const insertLink = db.prepare(
      `INSERT INTO todo_links (todo_id, type, target, position) VALUES (?, ?, ?, ?)`
    )
    insertLink.run(todoA, 'url', 'https://keep.test', 1)
    insertLink.run(todoB, 'url', 'https://drop.test', 1)
    insertLink.run(todoB, 'issue', 'DD-9', 2)

    db.prepare(`DELETE FROM project_todos WHERE id = ?`).run(todoB)

    expect(db.prepare(`SELECT COUNT(*) AS c FROM todo_links WHERE todo_id = ?`).get(todoB).c).toBe(0)
    expect(db.prepare(`SELECT COUNT(*) AS c FROM todo_links WHERE todo_id = ?`).get(todoA).c).toBe(1)
    expect(db.prepare(`SELECT label FROM project_todos WHERE id = ?`).get(todoA).label).toBe('keep-me')
  })

  test('Down-Migration entfernt beide Tabellen + Indices vollständig', () => {
    const downSql = readFileSync(DOWN_SQL, 'utf8')
    db.exec(downSql)

    const tables = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('project_todos','todo_links')`
    ).all()
    expect(tables).toEqual([])

    const indexes = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_project_todos%' OR name LIKE 'idx_todo_links%'`
    ).all()
    expect(indexes).toEqual([])
  })
})
