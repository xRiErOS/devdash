import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'
import {
  listTodos,
  insertTodo,
  patchTodo,
  deleteTodo,
  reorderTodos,
  ProjectTodoError,
} from '../../server/lib/projectTodos.js'

const MIG_037 = '037_v3_project_todos.sql'

// DD-280 — T03 Backend ToDo CRUD + Reorder.

describe('T03 — listTodos', () => {
  let db, logDir
  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-t03-l-'))
    applyMigration(db, MIG_037, { logDir })
  })
  afterEach(() => { db.close(); rmSync(logDir, { recursive: true, force: true }) })

  test('leer initial → []', () => {
    expect(listTodos(db, 2)).toEqual([])
  })

  test('Status-Filter', () => {
    insertTodo(db, 2, { label: 'A' })
    insertTodo(db, 2, { label: 'B' })
    patchTodo(db, insertTodo(db, 2, { label: 'C' }).id, { status: 'done' })
    expect(listTodos(db, 2, { status: 'open' })).toHaveLength(2)
    expect(listTodos(db, 2, { status: 'done' })).toHaveLength(1)
  })

  test('Invalid Status-Filter → STATUS_INVALID', () => {
    expect(() => listTodos(db, 2, { status: 'wat' })).toThrow(/status muss einer von/)
  })

  test('Projekt existiert nicht → 404', () => {
    expect(() => listTodos(db, 99999)).toThrow(/Projekt existiert nicht/)
  })
})

describe('T03 — insertTodo', () => {
  let db, logDir
  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-t03-i-'))
    applyMigration(db, MIG_037, { logDir })
  })
  afterEach(() => { db.close(); rmSync(logDir, { recursive: true, force: true }) })

  test('sequenzielle Inserts: positions 1, 2, 3 atomar', () => {
    const a = insertTodo(db, 2, { label: 'A' })
    const b = insertTodo(db, 2, { label: 'B' })
    const c = insertTodo(db, 2, { label: 'C' })
    expect([a.position, b.position, c.position]).toEqual([1, 2, 3])
    expect(a.label).toBe('A')
    expect(a.status).toBe('open')
    expect(a.links).toEqual([])
  })

  test('label trimmed', () => {
    const t = insertTodo(db, 2, { label: '   Foo   ' })
    expect(t.label).toBe('Foo')
  })

  test('label leer → 400 LABEL_REQUIRED', () => {
    expect(() => insertTodo(db, 2, { label: '' })).toThrow(/label darf nicht leer/)
    expect(() => insertTodo(db, 2, { label: '   ' })).toThrow(/label darf nicht leer/)
    expect(() => insertTodo(db, 2, {})).toThrow(/label ist Pflichtfeld/)
  })

  test('label > 280 Zeichen → 400 LABEL_TOO_LONG', () => {
    expect(() => insertTodo(db, 2, { label: 'x'.repeat(281) })).toThrow(/max 280/)
  })

  test('details > 8000 Zeichen → 400 DETAILS_TOO_LONG', () => {
    expect(() => insertTodo(db, 2, { label: 'L', details: 'x'.repeat(8001) })).toThrow(/max 8000/)
  })
})

describe('T03 — patchTodo', () => {
  let db, logDir, todoId
  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-t03-p-'))
    applyMigration(db, MIG_037, { logDir })
    todoId = insertTodo(db, 2, { label: 'orig', details: 'd1' }).id
  })
  afterEach(() => { db.close(); rmSync(logDir, { recursive: true, force: true }) })

  test('label patch', () => {
    const out = patchTodo(db, todoId, { label: 'new' })
    expect(out.label).toBe('new')
  })

  test('status patch open → done', () => {
    const out = patchTodo(db, todoId, { status: 'done' })
    expect(out.status).toBe('done')
  })

  test('details auf null setzen erlaubt', () => {
    const out = patchTodo(db, todoId, { details: null })
    expect(out.details).toBeNull()
  })

  test('status invalid → STATUS_INVALID', () => {
    expect(() => patchTodo(db, todoId, { status: 'archived' })).toThrow(/status muss einer von/)
  })

  test('non-existent → 404', () => {
    expect(() => patchTodo(db, 99999, { label: 'X' })).toThrow(/not found/)
  })
})

describe('T03 — deleteTodo + CASCADE-Behavior', () => {
  let db, logDir
  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-t03-d-'))
    applyMigration(db, MIG_037, { logDir })
  })
  afterEach(() => { db.close(); rmSync(logDir, { recursive: true, force: true }) })

  test('happy path', () => {
    const id = insertTodo(db, 2, { label: 'X' }).id
    expect(deleteTodo(db, id)).toBe(true)
    expect(db.prepare('SELECT COUNT(*) as c FROM project_todos WHERE id = ?').get(id).c).toBe(0)
  })

  test('non-existent → 404', () => {
    expect(() => deleteTodo(db, 99999)).toThrow(/not found/)
  })
})

describe('T03 — reorderTodos', () => {
  let db, logDir, ids
  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-t03-r-'))
    applyMigration(db, MIG_037, { logDir })
    ids = [
      insertTodo(db, 2, { label: 'A' }).id,
      insertTodo(db, 2, { label: 'B' }).id,
      insertTodo(db, 2, { label: 'C' }).id,
    ]
  })
  afterEach(() => { db.close(); rmSync(logDir, { recursive: true, force: true }) })

  test('happy path setzt neue position 1..N', () => {
    const updated = reorderTodos(db, 2, [ids[2], ids[0], ids[1]])
    expect(updated).toBe(3)
    const ordered = listTodos(db, 2).map(t => t.label)
    expect(ordered).toEqual(['C', 'A', 'B'])
  })

  test('order mismatch (1 fehlt) → 400 ORDER_MISMATCH', () => {
    expect(() => reorderTodos(db, 2, [ids[0], ids[1]])).toThrow(/order muss alle 3/)
  })

  test('order enthält fremde ID → 400 ORDER_MISMATCH', () => {
    expect(() => reorderTodos(db, 2, [ids[0], ids[1], 99999])).toThrow(/gehört nicht zu Projekt/)
  })

  test('order kein Array → 400 ORDER_NOT_ARRAY', () => {
    expect(() => reorderTodos(db, 2, null)).toThrow(/order muss ein Array sein/)
  })
})

describe('T03 — Concurrent Insert (Position-Race-Test)', () => {
  let db, logDir
  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-t03-c-'))
    applyMigration(db, MIG_037, { logDir })
  })
  afterEach(() => { db.close(); rmSync(logDir, { recursive: true, force: true }) })

  test('5 sequenzielle Inserts → positions 1..5 ohne Duplikate', () => {
    const positions = []
    for (let i = 0; i < 5; i++) {
      positions.push(insertTodo(db, 2, { label: `Item ${i}` }).position)
    }
    expect(positions).toEqual([1, 2, 3, 4, 5])
    expect(new Set(positions).size).toBe(5)
  })
})
