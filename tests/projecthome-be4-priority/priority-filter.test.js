// ProjectPages T-be4 (Backend-I06/D01): Backlog priority-Filter.
// GET /api/backlog filterte search/status/sprint_id/type, aber nicht priority.
// Prio-1-Backlog (ProjectHome ChildrenWidget) braucht ?priority=1.
// Reine Filter-Logik in server/lib/backlogFilters.js — unit-testbar, Route wired sie
// (kein Query-Reproduktions-Drift auf der neuen Logik).
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { priorityFilter } from '../../apps/backend/src/lib/backlogFilters.js'

describe('T-be4 — priorityFilter (pure)', () => {
  test('einzelner Wert → Gleichheits-Klausel', () => {
    expect(priorityFilter('1')).toEqual({ clause: 'b.priority = ?', params: [1] })
  })
  test('Komma-Liste → IN-Klausel (analog status)', () => {
    expect(priorityFilter('1,2')).toEqual({ clause: 'b.priority IN (?,?)', params: [1, 2] })
  })
  test('numerischer Input erlaubt', () => {
    expect(priorityFilter(1)).toEqual({ clause: 'b.priority = ?', params: [1] })
  })
  test('außerhalb 1–5 wird verworfen', () => {
    expect(priorityFilter('9')).toBeNull()
    expect(priorityFilter('0')).toBeNull()
    expect(priorityFilter('1,99')).toEqual({ clause: 'b.priority = ?', params: [1] })
  })
  test('leer/undefined/nicht-numerisch → null (kein Filter)', () => {
    expect(priorityFilter(undefined)).toBeNull()
    expect(priorityFilter(null)).toBeNull()
    expect(priorityFilter('')).toBeNull()
    expect(priorityFilter('foo')).toBeNull()
  })
})

describe('T-be4 — Filter angewandt auf DB (Integration)', () => {
  let db
  beforeEach(() => {
    db = createTestDb({ upToVersion: '059_v3_drop_acceptance_test_instruction.sql' })
    seedProject(db) // id=2
    const ins = db.prepare("INSERT INTO backlog (project_id, title, type, status, priority) VALUES (2, ?, 'task', 'new', ?)")
    ins.run('crit', 1); ins.run('crit2', 1); ins.run('high', 2); ins.run('med', 3)
  })
  afterEach(() => db.close())

  test('?priority=1 liefert nur Prio-1-Issues', () => {
    const f = priorityFilter('1')
    const rows = db.prepare(`SELECT title FROM backlog b WHERE b.project_id = 2 AND ${f.clause}`).all(...f.params)
    expect(rows.map(r => r.title).sort()).toEqual(['crit', 'crit2'])
  })
  test('?priority=1,2 liefert Prio-1+2', () => {
    const f = priorityFilter('1,2')
    const rows = db.prepare(`SELECT title FROM backlog b WHERE b.project_id = 2 AND ${f.clause}`).all(...f.params)
    expect(rows.length).toBe(3)
  })
})
