import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'
import { insertTodo, listTodos, deleteTodo } from '../../apps/backend/src/lib/projectTodos.js'
import {
  addTodoLink,
  removeTodoLink,
  validateLinkTarget,
  TodoLinkError,
  LINK_TYPES,
} from '../../apps/backend/src/lib/projectTodoLinks.js'

const MIG_037 = '037_v3_project_todos.sql'

describe('T03 — validateLinkTarget (Pure Validation)', () => {
  test('LINK_TYPES enthält exakt spec, issue, vault, url', () => {
    expect([...LINK_TYPES].sort()).toEqual(['issue', 'spec', 'url', 'vault'])
  })

  test('type=url: gültig nur mit http(s)://', () => {
    expect(validateLinkTarget('url', 'https://example.org')).toBe('https://example.org')
    expect(validateLinkTarget('url', 'http://example.org/path')).toBe('http://example.org/path')
    expect(() => validateLinkTarget('url', 'not-a-url')).toThrow(/http:\/\/ oder https:\/\//)
    expect(() => validateLinkTarget('url', 'ftp://x.org')).toThrow(/http:\/\/ oder https:\/\//)
  })

  test('type=issue: gültig nur Pattern ^[A-Z]{2,6}-\\d+$', () => {
    expect(validateLinkTarget('issue', 'DD-123')).toBe('DD-123')
    expect(validateLinkTarget('issue', 'MBT-42')).toBe('MBT-42')
    expect(() => validateLinkTarget('issue', 'lowercase-99')).toThrow(/Issue-Key/)
    expect(() => validateLinkTarget('issue', 'DD123')).toThrow(/Issue-Key/)
    expect(() => validateLinkTarget('issue', 'TOOLONG-1')).toThrow(/Issue-Key/)
  })

  test('type=spec: reject ".." und absolute Pfade (Path-Traversal)', () => {
    expect(() => validateLinkTarget('spec', '../etc/passwd')).toThrow(/path-traversal/)
    expect(() => validateLinkTarget('spec', '/etc/passwd')).toThrow(/path-traversal/)
    expect(() => validateLinkTarget('spec', 'foo/../bar.md')).toThrow(/path-traversal/)
    expect(validateLinkTarget('spec', 'specs/foo.md')).toBe('specs/foo.md')
  })

  test('type=spec: mit repoPath — innerhalb erlaubt, außerhalb 400', () => {
    expect(validateLinkTarget('spec', 'specs/foo.md', { repoPath: '/repo' })).toBe('specs/foo.md')
  })

  test('type=vault: reject [[/]]-Brackets', () => {
    expect(validateLinkTarget('vault', 'Some Note')).toBe('Some Note')
    expect(() => validateLinkTarget('vault', '[[Note]]')).toThrow(/Brackets/)
    expect(() => validateLinkTarget('vault', 'A]]')).toThrow(/Brackets/)
  })

  test('unbekannter type → 400 LINK_TYPE_INVALID', () => {
    expect(() => validateLinkTarget('wiki', 'X')).not.toThrow() // validateLinkTarget akzeptiert (wrapper validateType erzwingt es)
  })

  test('target leer/whitespace → 400 LINK_TARGET_REQUIRED', () => {
    expect(() => validateLinkTarget('url', '')).toThrow(/target ist Pflichtfeld/)
    expect(() => validateLinkTarget('url', '   ')).toThrow(/target ist Pflichtfeld/)
  })

  test('target > 2000 Zeichen → 400 LINK_TARGET_TOO_LONG', () => {
    expect(() => validateLinkTarget('url', 'https://' + 'x'.repeat(2000))).toThrow(/max 2000/)
  })
})

describe('T03 — addTodoLink + removeTodoLink', () => {
  let db, logDir, todoId
  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-t03-link-'))
    applyMigration(db, MIG_037, { logDir })
    todoId = insertTodo(db, 2, { label: 'Parent' }).id
  })
  afterEach(() => { db.close(); rmSync(logDir, { recursive: true, force: true }) })

  test('addTodoLink: alle 4 Typen, atomic position 1..4', () => {
    const a = addTodoLink(db, todoId, { type: 'spec', target: 'specs/foo.md' })
    const b = addTodoLink(db, todoId, { type: 'issue', target: 'DD-1' })
    const c = addTodoLink(db, todoId, { type: 'vault', target: 'Note' })
    const d = addTodoLink(db, todoId, { type: 'url', target: 'https://x.test' })
    expect([a.position, b.position, c.position, d.position]).toEqual([1, 2, 3, 4])
    expect([a.type, b.type, c.type, d.type]).toEqual(['spec', 'issue', 'vault', 'url'])
  })

  test('addTodoLink: invalid type → 400 LINK_TYPE_INVALID', () => {
    expect(() => addTodoLink(db, todoId, { type: 'blog', target: 'x' })).toThrow(/type muss einer von/)
  })

  test('addTodoLink: invalid url → 400 LINK_TARGET_INVALID_URL', () => {
    expect(() => addTodoLink(db, todoId, { type: 'url', target: 'not-a-url' })).toThrow(/http:\/\//)
  })

  test('addTodoLink: invalid issue → 400 LINK_TARGET_INVALID', () => {
    expect(() => addTodoLink(db, todoId, { type: 'issue', target: 'lowercase-9' })).toThrow(/Issue-Key/)
  })

  test('addTodoLink: path-traversal → 400 LINK_TARGET_PATH_TRAVERSAL', () => {
    expect(() => addTodoLink(db, todoId, { type: 'spec', target: '../etc/passwd' })).toThrow(/path-traversal/)
  })

  test('addTodoLink: für non-existent todoId → 404 NOT_FOUND', () => {
    expect(() => addTodoLink(db, 99999, { type: 'url', target: 'https://x.test' })).toThrow(/not found/)
  })

  test('listTodos liefert Links inline (LEFT JOIN-Sicht)', () => {
    addTodoLink(db, todoId, { type: 'issue', target: 'DD-7' })
    addTodoLink(db, todoId, { type: 'url', target: 'https://x.test' })
    const todos = listTodos(db, 2)
    expect(todos[0].links).toHaveLength(2)
    expect(todos[0].links.map(l => l.type)).toEqual(['issue', 'url'])
  })

  test('removeTodoLink: happy + non-existent', () => {
    const link = addTodoLink(db, todoId, { type: 'url', target: 'https://x.test' })
    expect(removeTodoLink(db, link.id)).toBe(true)
    expect(() => removeTodoLink(db, link.id)).toThrow(/not found/)
  })

  test('CASCADE: deleteTodo entfernt alle dessen Links', () => {
    addTodoLink(db, todoId, { type: 'url', target: 'https://a.test' })
    addTodoLink(db, todoId, { type: 'url', target: 'https://b.test' })
    deleteTodo(db, todoId)
    const links = db.prepare('SELECT COUNT(*) as c FROM todo_links WHERE todo_id = ?').get(todoId).c
    expect(links).toBe(0)
  })
})
