// DD-275 — Smoke-Test für /dependencies-Page-Backend.
//
// Test-Strategie:
//   /dependencies-Page in React (DependencyGraph.jsx) fetched `/api/dependencies/graph`.
//   Echter HTTP-Roundtrip ist im Repo schwierig — server/api.js exportiert die Express-app
//   nicht (`server.listen` läuft direkt beim Import). Stattdessen reproduzieren wir die
//   Route-Handler-Logik 1:1 als reine SQL-Calls gegen eine in-memory-DB (Pattern wie
//   tests/m02-s01/t05-api-dependencies-cycle.test.js).
//
// Gedeckte Routen:
//   - GET /api/dependencies/graph     (issue_dependencies + backlog JOIN, project-scoped)
//   - GET /api/milestones/:id/dependencies (milestoneDependencies-Lib)
//   - POST /api/milestone-dependencies     (insertDependency Lib)
//
// Hard-Constraint aus DD-275 Spec:
//   - Migrationen 029 + 030 + 031 müssen sauber laufen
//   - Routes liefern 200 + JSON-Array (auch leer ist OK; nichts 404/500)

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from './_fixtures/in-memory-db.js'
import { seedProject, seedMilestones } from './_fixtures/seed.js'
import { applyMigration } from '../apps/backend/src/lib/migrationRunner.js'
import {
  insertDependency,
  getDependenciesForMilestone,
} from '../apps/backend/src/lib/milestoneDependencies.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_030 = '030_v3_milestone_dependencies.sql'
const MIG_031 = '031_v3_milestone_dod_items.sql'

const PROJECT_ID = 2 // matches TEST_PROJECT_ID from seed.js (DevD)

/**
 * Reproduziert die SQL-Logik von app.get('/api/dependencies/graph') aus server/api.js
 * (Stand 2026-05-22, Zeilen 2086-2116). Wenn dieser Test bricht, ist entweder die
 * Tabellen-Struktur kaputt oder die Route-SQL drift'd ab vom DB-Schema.
 */
function fetchDependencyGraph(db, projectId, { sprintId = null } = {}) {
  const params = [projectId]
  let where = 'b.project_id = ?'
  if (sprintId) { where += ' AND b.assigned_sprint = ?'; params.push(sprintId) }

  const items = db.prepare(`
    SELECT b.id, b.project_number, b.title, b.status, b.type, b.priority, p.prefix AS project_prefix
    FROM backlog b
    JOIN projects p ON p.id = b.project_id
    WHERE ${where}
  `).all(...params)
  const itemIds = new Set(items.map(i => i.id))

  const edges = db.prepare(`
    SELECT d.id, d.issue_id AS "from", d.depends_on_id AS "to", d.note
    FROM issue_dependencies d
    JOIN backlog a ON a.id = d.issue_id AND a.project_id = ?
    JOIN backlog b ON b.id = d.depends_on_id AND b.project_id = ?
  `).all(projectId, projectId).filter(e => itemIds.has(e.from) && itemIds.has(e.to))

  const involved = new Set()
  for (const e of edges) { involved.add(e.from); involved.add(e.to) }
  const nodes = items.filter(i => involved.has(i.id))
  return { nodes, edges }
}

/** Reproduziert die Schema-Checks von app.get('/api/milestones/:id/dependencies'). */
function fetchMilestoneDeps(db, milestoneId) {
  const id = Number(milestoneId)
  if (!Number.isFinite(id) || id <= 0) return { status: 400, body: { error: 'Invalid milestone id' } }
  const exists = db.prepare('SELECT 1 FROM milestones WHERE id = ?').get(id)
  if (!exists) return { status: 404, body: { error: 'Milestone not found' } }
  return { status: 200, body: getDependenciesForMilestone(db, id) }
}

function seedIssue(db, { projectId = PROJECT_ID, title, status = 'open', type = 'feature', priority = 2 }) {
  // Seed minimal backlog row. project_number ist UNIQUE pro project_id → MAX+1.
  const nextNum = (db.prepare(
    'SELECT COALESCE(MAX(project_number), 0) AS n FROM backlog WHERE project_id = ?'
  ).get(projectId).n) + 1
  const result = db.prepare(`
    INSERT INTO backlog (project_id, project_number, title, status, type, priority)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(projectId, nextNum, title, status, type, priority)
  return Number(result.lastInsertRowid)
}

function seedIssueDep(db, { issueId, dependsOnId, note = null }) {
  const result = db.prepare(
    'INSERT INTO issue_dependencies (issue_id, depends_on_id, note) VALUES (?, ?, ?)'
  ).run(issueId, dependsOnId, note)
  return Number(result.lastInsertRowid)
}

describe('DD-275 — /dependencies API smoke (issue + milestone routes)', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db, { id: PROJECT_ID })
    logDir = mkdtempSync(join(tmpdir(), 'devd-dd275-'))
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_030, { logDir })
    applyMigration(db, MIG_031, { logDir })
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('Migrationen 029 + 030 + 031 laufen sauber → erwartete Tabellen existieren', () => {
    const tables = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('issue_dependencies','milestone_dependencies','milestone_dod_items','milestones','backlog')`
    ).all().map(r => r.name).sort()
    expect(tables).toEqual([
      'backlog',
      'issue_dependencies',
      'milestone_dependencies',
      'milestone_dod_items',
      'milestones',
    ])
  })

  test('GET /api/dependencies/graph (leer) → {nodes:[], edges:[]} (kein 404/500)', () => {
    const result = fetchDependencyGraph(db, PROJECT_ID)
    expect(Array.isArray(result.nodes)).toBe(true)
    expect(Array.isArray(result.edges)).toBe(true)
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
  })

  test('GET /api/dependencies/graph (mit Edges) → nodes + edges populated, project-scoped', () => {
    const i1 = seedIssue(db, { title: 'Issue 1' })
    const i2 = seedIssue(db, { title: 'Issue 2' })
    const i3 = seedIssue(db, { title: 'Issue 3 (isoliert)' })
    seedIssueDep(db, { issueId: i1, dependsOnId: i2, note: 'blocked by i2' })

    const result = fetchDependencyGraph(db, PROJECT_ID)
    // Nur Items mit Edges, i3 (isoliert) wird gefiltert.
    expect(result.nodes.map(n => n.id).sort()).toEqual([i1, i2].sort())
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0]).toMatchObject({ from: i1, to: i2, note: 'blocked by i2' })
    // Schema-Pflichtfelder für UI (DependencyGraph.jsx erwartet diese).
    for (const n of result.nodes) {
      expect(n).toHaveProperty('project_number')
      expect(n).toHaveProperty('title')
      expect(n).toHaveProperty('status')
      expect(n).toHaveProperty('project_prefix')
    }
  })

  test('GET /api/dependencies/graph project-scoped: Other-Project-Edges leaken nicht', () => {
    seedProject(db, { id: 99, slug: 'other', name: 'Other', prefix: 'OT' })
    const a = seedIssue(db, { projectId: PROJECT_ID, title: 'DD-A' })
    const b = seedIssue(db, { projectId: PROJECT_ID, title: 'DD-B' })
    const x = seedIssue(db, { projectId: 99, title: 'OT-X' })
    const y = seedIssue(db, { projectId: 99, title: 'OT-Y' })
    seedIssueDep(db, { issueId: a, dependsOnId: b })
    seedIssueDep(db, { issueId: x, dependsOnId: y })

    const dd = fetchDependencyGraph(db, PROJECT_ID)
    expect(dd.nodes.map(n => n.id).sort()).toEqual([a, b].sort())
    expect(dd.edges).toHaveLength(1)

    const other = fetchDependencyGraph(db, 99)
    expect(other.nodes.map(n => n.id).sort()).toEqual([x, y].sort())
    expect(other.edges).toHaveLength(1)
  })

  test('GET /api/dependencies/graph liefert cancelled-Items mit (DD-524, UI filtert)', () => {
    const i1 = seedIssue(db, { title: 'Live' })
    const i2 = seedIssue(db, { title: 'Cancelled' })
    seedIssueDep(db, { issueId: i1, dependsOnId: i2 })
    db.prepare("UPDATE backlog SET status = 'cancelled' WHERE id = ?").run(i2)

    const result = fetchDependencyGraph(db, PROJECT_ID)
    // DD-524: Soft-Delete abgelöst durch cancelled-Status. Der Graph-Endpoint
    // liefert cancelled-Items zurück (das UI blendet sie per Toggle aus),
    // damit bleiben i1, i2 und die Kante erhalten.
    const ids = result.nodes.map(n => n.id).sort((a, b) => a - b)
    expect(ids).toEqual([i1, i2].sort((a, b) => a - b))
    expect(result.edges).toHaveLength(1)
  })

  test('GET /api/milestones/:id/dependencies (leer) → 200 mit {predecessors:[],successors:[]}', () => {
    const [m1] = seedMilestones(db, [{ name: 'M-A', target_date: '2026-06-01' }])
    const res = fetchMilestoneDeps(db, m1)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ predecessors: [], successors: [] })
  })

  test('GET /api/milestones/:id/dependencies (populated) → liefert pred/succ', () => {
    const [m1, m2, m3] = seedMilestones(db, [
      { name: 'M-1', target_date: '2026-06-01' },
      { name: 'M-2', target_date: '2026-07-01' },
      { name: 'M-3', target_date: '2026-08-01' },
    ])
    insertDependency(db, { predecessor_id: m1, successor_id: m2 })
    insertDependency(db, { predecessor_id: m2, successor_id: m3 })

    const res = fetchMilestoneDeps(db, m2)
    expect(res.status).toBe(200)
    expect(res.body.predecessors.map(p => p.name)).toEqual(['M-1'])
    expect(res.body.successors.map(s => s.name)).toEqual(['M-3'])
  })

  test('GET /api/milestones/:id/dependencies (unknown id) → 404 (nicht 500)', () => {
    const res = fetchMilestoneDeps(db, 99999)
    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/not found/i)
  })

  test('GET /api/milestones/:id/dependencies (invalid id) → 400 (nicht 500)', () => {
    expect(fetchMilestoneDeps(db, 0).status).toBe(400)
    expect(fetchMilestoneDeps(db, -1).status).toBe(400)
    expect(fetchMilestoneDeps(db, NaN).status).toBe(400)
  })
})
