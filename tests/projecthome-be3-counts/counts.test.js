// ProjectPages T-be3 (Review Backend-I05): Project-Counts-Aggregat.
// GET /api/projects(/:id) lieferte nur sprint_count + backlog_count. ProjectHome-Meta
// braucht zusätzlich milestone_count, memory_count und den aktiven Sprint.
// Lib-Compute (server/lib/projectCounts.js) gegen createTestDb — Route wired dieselbe Lib
// (kein 1:1-Query-Reproduktions-Drift).
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject, seedMilestones } from '../_fixtures/seed.js'
import { getProjectWithCounts, listProjectsWithCounts } from '../../apps/backend/src/lib/projectCounts.js'

function seedSprint(db, projectId, name, status = 'new') {
  return Number(
    db.prepare("INSERT INTO sprints (project_id, name, status) VALUES (?, ?, ?)")
      .run(projectId, name, status).lastInsertRowid,
  )
}
function seedIssue(db, projectId, title) {
  return Number(
    db.prepare("INSERT INTO backlog (project_id, title, type, status) VALUES (?, ?, 'task', 'new')")
      .run(projectId, title).lastInsertRowid,
  )
}
function seedMemory(db, projectId, category = 'session_note') {
  return Number(
    db.prepare("INSERT INTO project_memories (project_id, category, summary) VALUES (?, ?, 'm')")
      .run(projectId, category).lastInsertRowid,
  )
}

describe('T-be3 — getProjectWithCounts', () => {
  let db
  beforeEach(() => {
    db = createTestDb({ upToVersion: '065_v3_dd2_155_status_unify.sql' })
    seedProject(db) // id=2 'devd'
  })
  afterEach(() => db.close())

  test('aggregiert sprint/backlog/milestone/memory-Counts + aktiven Sprint', () => {
    seedSprint(db, 2, 'S1', 'completed')
    const activeId = seedSprint(db, 2, 'S2 aktiv', 'in_progress')
    seedIssue(db, 2, 'I1'); seedIssue(db, 2, 'I2'); seedIssue(db, 2, 'I3')
    seedMilestones(db, [
      { name: 'M1', target_date: '2026-07-01', status: 'new' },
      { name: 'M2', target_date: '2026-08-01', status: 'in_progress' },
    ], { projectId: 2 })
    seedMemory(db, 2); seedMemory(db, 2, 'architecture_decision'); seedMemory(db, 2, 'convention'); seedMemory(db, 2)

    const row = getProjectWithCounts(db, 2)
    expect(row).not.toBeNull()
    expect(row.sprint_count).toBe(2)
    expect(row.backlog_count).toBe(3)
    expect(row.milestone_count).toBe(2)
    expect(row.memory_count).toBe(4)
    expect(row.active_sprint).toEqual({ id: activeId, name: 'S2 aktiv' })
    // Bestehende Felder bleiben (additiv, kein Bruch).
    expect(row.slug).toBe('devd')
  })

  test('kein aktiver Sprint → active_sprint = null', () => {
    seedSprint(db, 2, 'S1', 'new')
    const row = getProjectWithCounts(db, 2)
    expect(row.sprint_count).toBe(1)
    expect(row.active_sprint).toBeNull()
  })

  test('Counts sind project-scoped (Fremdprojekt zählt nicht)', () => {
    const other = seedProject(db, { id: 3, slug: 'mybaby', name: 'MBT', prefix: 'MBT' })
    seedSprint(db, other, 'X', 'in_progress')
    seedIssue(db, other, 'fremd')
    seedSprint(db, 2, 'S1', 'in_progress')
    const row = getProjectWithCounts(db, 2)
    expect(row.sprint_count).toBe(1)
    expect(row.backlog_count).toBe(0)
  })

  test('unbekannte id → null', () => {
    expect(getProjectWithCounts(db, 999)).toBeNull()
  })

  test('listProjectsWithCounts liefert alle Projekte mit denselben Count-Feldern', () => {
    seedProject(db, { id: 3, slug: 'mybaby', name: 'MBT', prefix: 'MBT' })
    seedSprint(db, 2, 'S1', 'in_progress')
    const rows = listProjectsWithCounts(db)
    expect(rows.length).toBeGreaterThanOrEqual(2)
    const devd = rows.find(r => r.slug === 'devd')
    expect(devd.sprint_count).toBe(1)
    expect(devd.active_sprint).toEqual({ id: expect.any(Number), name: 'S1' })
    expect(devd).toHaveProperty('milestone_count')
    expect(devd).toHaveProperty('memory_count')
  })
})
