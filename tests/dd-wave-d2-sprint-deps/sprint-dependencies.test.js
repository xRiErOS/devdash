// GF-2 Wave D / D2 (T01): sprint_dependencies — 1:1-Mirror milestone_dependencies.
// Lib-Cycle-Cases (mirror t05) + Contract + Migration-Round-Trip + Source-Presence-Wiring.
import { describe, test, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import {
  detectCycle, findCyclePath, insertDependency, getDependenciesForSprint, hasPreExistingCycle,
} from '../../apps/backend/src/lib/sprintDependencies.js'
import { sprintDependencyContract } from '@devd/api-types/milestone-sprint.contracts.js'

const MIG = '056_v3_sprint_dependencies.sql'

let seedSeq = 0
function seed(db, n = 4, projectId) {
  const s = `t${seedSeq++}`
  const pid = projectId ?? db.prepare("INSERT INTO projects (slug, name, prefix) VALUES (?, ?, ?)").run(s, s.toUpperCase(), s.toUpperCase()).lastInsertRowid
  const ids = []
  for (let i = 1; i <= n; i++) {
    ids.push(db.prepare("INSERT INTO sprints (project_id, name, status) VALUES (?, ?, 'planning')").run(pid, `S${i}`).lastInsertRowid)
  }
  return { pid, ids }
}

describe('D2 — Contract', () => {
  test('sprintDependencyContract: predecessor/successor positive int (coerce)', () => {
    expect(sprintDependencyContract.safeParse({ predecessor_id: '1', successor_id: '2' }).success).toBe(true)
    expect(sprintDependencyContract.safeParse({ predecessor_id: 0, successor_id: 2 }).success).toBe(false)
  })
})

describe('D2 — Migration 056 + Lib (cycle topology, mirror t05)', () => {
  let db
  beforeEach(() => { db = createTestDb({ upToVersion: MIG }) })

  test('sprint_dependencies Tabelle existiert', () => {
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sprint_dependencies'").get()).toBeTruthy()
  })

  test('linear S1→S2→S3, +S3→S4 ok (kein Zyklus)', () => {
    const { pid, ids } = seed(db)
    insertDependency(db, { predecessor_id: ids[0], successor_id: ids[1], projectId: pid })
    insertDependency(db, { predecessor_id: ids[1], successor_id: ids[2], projectId: pid })
    const depId = insertDependency(db, { predecessor_id: ids[2], successor_id: ids[3], projectId: pid })
    expect(depId).toBeGreaterThan(0)
  })

  test('Zyklus S1→S2→S3→S1 → 409 CYCLE_DETECTED + path', () => {
    const { pid, ids } = seed(db, 3)
    insertDependency(db, { predecessor_id: ids[0], successor_id: ids[1], projectId: pid })
    insertDependency(db, { predecessor_id: ids[1], successor_id: ids[2], projectId: pid })
    expect(detectCycle(db, { predecessor_id: ids[2], successor_id: ids[0] })).toBe(true)
    expect(findCyclePath(db, { predecessor_id: ids[2], successor_id: ids[0] })).toContain(ids[0])
    try { insertDependency(db, { predecessor_id: ids[2], successor_id: ids[0], projectId: pid }); throw new Error('should throw') }
    catch (e) { expect(e.statusCode).toBe(409); expect(e.code).toBe('CYCLE_DETECTED') }
  })

  test('Self-Loop S1→S1 → 400 SELF_LOOP', () => {
    const { pid, ids } = seed(db, 1)
    try { insertDependency(db, { predecessor_id: ids[0], successor_id: ids[0], projectId: pid }); throw new Error('x') }
    catch (e) { expect(e.statusCode).toBe(400); expect(e.code).toBe('SELF_LOOP') }
  })

  test('Missing FK → 400 MISSING_FK', () => {
    const { pid, ids } = seed(db, 1)
    try { insertDependency(db, { predecessor_id: ids[0], successor_id: 99999, projectId: pid }); throw new Error('x') }
    catch (e) { expect(e.statusCode).toBe(400); expect(e.code).toBe('MISSING_FK') }
  })

  test('Cross-Project → 422 CROSS_PROJECT', () => {
    const a = seed(db, 1)
    const b = seed(db, 1)
    try { insertDependency(db, { predecessor_id: a.ids[0], successor_id: b.ids[0], projectId: a.pid }); throw new Error('x') }
    catch (e) { expect(e.statusCode).toBe(422); expect(e.code).toBe('CROSS_PROJECT') }
  })

  test('Duplikat → 409 DUPLICATE', () => {
    const { pid, ids } = seed(db, 2)
    insertDependency(db, { predecessor_id: ids[0], successor_id: ids[1], projectId: pid })
    try { insertDependency(db, { predecessor_id: ids[0], successor_id: ids[1], projectId: pid }); throw new Error('x') }
    catch (e) { expect(e.statusCode).toBe(409); expect(e.code).toBe('DUPLICATE') }
  })

  test('getDependenciesForSprint liefert predecessors + successors', () => {
    const { pid, ids } = seed(db, 3)
    insertDependency(db, { predecessor_id: ids[0], successor_id: ids[1], projectId: pid })
    insertDependency(db, { predecessor_id: ids[1], successor_id: ids[2], projectId: pid })
    const dep = getDependenciesForSprint(db, ids[1])
    expect(dep.predecessors.map(p => p.id)).toEqual([ids[0]])
    expect(dep.successors.map(s => s.id)).toEqual([ids[2]])
  })

  test('Cascade: Sprint löschen → Edges weg', () => {
    const { pid, ids } = seed(db, 2)
    insertDependency(db, { predecessor_id: ids[0], successor_id: ids[1], projectId: pid })
    db.prepare('DELETE FROM sprints WHERE id = ?').run(ids[0])
    expect(db.prepare('SELECT COUNT(*) c FROM sprint_dependencies').get().c).toBe(0)
  })

  test('hasPreExistingCycle: leerer Graph → false', () => {
    expect(hasPreExistingCycle(db)).toBe(false)
  })
})

describe('D2 — Wiring (REST + CLI + MCP)', () => {
  const api = readFileSync('apps/backend/src/api.js', 'utf8')
  const cli = readFileSync('apps/cli/bin/devd-cli.js', 'utf8')
  const mcp = readFileSync('apps/cli/mcp/devd-mcp.js', 'utf8')

  test('REST: sprint-dependencies endpoints', () => {
    expect(api).toContain("app.get('/api/sprints/:id/dependencies'")
    expect(api).toContain("app.post('/api/sprint-dependencies'")
    expect(api).toContain("app.delete('/api/sprint-dependencies/:id'")
    expect(api).toContain('sprintDependencies.js')
  })
  test('CLI: sprint dep-add/dep-list/dep-remove', () => {
    for (const v of ['sprint:dep-add', 'sprint:dep-list', 'sprint:dep-remove']) expect(cli).toContain(`'${v}'`)
  })
  test('MCP: devd_sprint_dep_add/list/remove', () => {
    for (const t of ['devd_sprint_dep_add', 'devd_sprint_dep_list', 'devd_sprint_dep_remove']) expect(mcp).toContain(t)
  })
})
