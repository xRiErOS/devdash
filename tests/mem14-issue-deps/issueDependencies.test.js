// MEM-14 (MEM#5): issue_dependencies Lib — shared helper für REST-Routen +
// additive Anzeige in issue_show (GET /api/backlog/:id) und sprint_show.
// issue_dependencies + backlog liegen im Baseline-Snapshot (≤028) → keine Migration nötig.

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import {
  listIssueDependencies,
  countIssueDependencies,
  findDependencyEdge,
} from '../../server/lib/issueDependencies.js'

const PROJECT_ID = 7

function seedIssue(db, { projectId = PROJECT_ID, title, status = 'refined', type = 'feature', priority = 2 }) {
  const { n } = db.prepare('SELECT COALESCE(MAX(project_number), 0) + 1 AS n FROM backlog WHERE project_id = ?').get(projectId)
  const r = db.prepare(
    'INSERT INTO backlog (project_id, project_number, title, status, type, priority) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(projectId, n, title, status, type, priority)
  return Number(r.lastInsertRowid)
}

function seedDep(db, issueId, dependsOnId, note = null) {
  return Number(db.prepare(
    'INSERT INTO issue_dependencies (issue_id, depends_on_id, note) VALUES (?, ?, ?)'
  ).run(issueId, dependsOnId, note).lastInsertRowid)
}

describe('MEM-14 — issue_dependencies helper', () => {
  let db

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db, { id: PROJECT_ID, slug: 'memory-system', name: 'Memory System', prefix: 'MEM' })
  })

  afterEach(() => db.close())

  test('listIssueDependencies trennt blockers (depends-on) von blocked_by', () => {
    const i1 = seedIssue(db, { title: 'Issue 1' })
    const i2 = seedIssue(db, { title: 'Issue 2' })
    seedDep(db, i1, i2, 'i1 wartet auf i2')

    const d1 = listIssueDependencies(db, i1)
    expect(d1.blockers).toHaveLength(1)
    expect(d1.blockers[0].id).toBe(i2)
    expect(d1.blockers[0].note).toBe('i1 wartet auf i2')
    expect(d1.blocked_by).toHaveLength(0)

    const d2 = listIssueDependencies(db, i2)
    expect(d2.blockers).toHaveLength(0)
    expect(d2.blocked_by).toHaveLength(1)
    expect(d2.blocked_by[0].id).toBe(i1)
  })

  test('countIssueDependencies liefert blockers + blocked_by Zähler', () => {
    const i1 = seedIssue(db, { title: 'A' })
    const i2 = seedIssue(db, { title: 'B' })
    const i3 = seedIssue(db, { title: 'C' })
    seedDep(db, i1, i2)
    seedDep(db, i1, i3)

    expect(countIssueDependencies(db, i1)).toEqual({ blockers: 2, blocked_by: 0 })
    expect(countIssueDependencies(db, i2)).toEqual({ blockers: 0, blocked_by: 1 })
  })

  test('findDependencyEdge findet exakte Kante, sonst null', () => {
    const i1 = seedIssue(db, { title: 'A' })
    const i2 = seedIssue(db, { title: 'B' })
    const i3 = seedIssue(db, { title: 'C' })
    const depId = seedDep(db, i1, i2)

    expect(findDependencyEdge(db, i1, i2)?.id).toBe(depId)
    expect(findDependencyEdge(db, i1, i3)).toBeNull()
  })

  test('listIssueDependencies leer → leere Arrays (kein Throw)', () => {
    const i1 = seedIssue(db, { title: 'solo' })
    expect(listIssueDependencies(db, i1)).toEqual({ blockers: [], blocked_by: [] })
  })
})

describe('MEM-14 — CLI + MCP wiring (source-presence)', () => {
  const cli = readFileSync('bin/devd-cli.js', 'utf8')
  const mcp = readFileSync('mcp/devd-mcp.js', 'utf8')
  const api = readFileSync('server/api.js', 'utf8')

  test('CLI exposes issue dep add/list/rm', () => {
    expect(cli).toMatch(/'issue:dep'/)
    expect(cli).toMatch(/sub === 'add'/)
    expect(cli).toMatch(/sub === 'list'/)
    expect(cli).toMatch(/sub === 'rm'/)
  })

  test('MCP registers dep add/list/remove tools', () => {
    expect(mcp).toMatch(/'devd_issue_dep_add'/)
    expect(mcp).toMatch(/'devd_issue_dep_list'/)
    expect(mcp).toMatch(/'devd_issue_dep_remove'/)
  })

  test('CLI + MCP reuse existing dependency REST routes', () => {
    expect(cli).toMatch(/\/api\/backlog\/\$\{issueId\}\/dependencies/)
    expect(mcp).toMatch(/\/api\/backlog\/\$\{issueId\}\/dependencies/)
  })

  test('issue_show + sprint_show expose dependencies (MEM-14 acceptance)', () => {
    expect(api).toMatch(/tags, files, dependencies/)
    expect(api).toMatch(/i\.deps = countIssueDependencies/)
  })
})
