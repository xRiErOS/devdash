// GF-2 Wave D / D4 (T03, D-L): Sprint-Completeness — computed (issues-only, keine Points).
// Lib-Compute (createTestDb-Snapshot) + Source-Presence-Wiring.
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { computeSprintCompleteness } from '../../apps/backend/src/lib/sprintCompleteness.js'

function seedSprintWithIssues(db, statuses) {
  const pid = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('c','C','C')").run().lastInsertRowid
  const sid = db.prepare("INSERT INTO sprints (project_id, name, status) VALUES (?, 'S', 'in_progress')").run(pid).lastInsertRowid
  let n = 0
  for (const st of statuses) {
    db.prepare("INSERT INTO backlog (project_id, title, type, status, assigned_sprint) VALUES (?, ?, 'task', ?, ?)")
      .run(pid, `I${n++}`, st, sid)
  }
  return { pid, sid }
}

describe('D4 — computeSprintCompleteness (issues-only, DD-524)', () => {
  test('2 completed + 1 passed + 1 in_progress + 1 cancelled → total=4, done=3, 75%', () => {
    const db = createTestDb()
    const { sid } = seedSprintWithIssues(db, ['completed', 'completed', 'passed', 'in_progress', 'cancelled'])
    const c = computeSprintCompleteness(db, sid)
    expect(c.issues_total).toBe(4) // cancelled excluded (DD-524)
    expect(c.issues_done).toBe(3) // completed + passed
    expect(c.issues_open).toBe(1)
    expect(c.issues_cancelled).toBe(1)
    expect(c.percent_complete).toBe(75)
    expect(c.points).toBeNull() // Story-Points existieren nicht im Datenmodell
  })

  test('leerer Sprint → total=0, percent=0 (kein Division-by-zero)', () => {
    const db = createTestDb()
    const { sid } = seedSprintWithIssues(db, [])
    const c = computeSprintCompleteness(db, sid)
    expect(c.issues_total).toBe(0)
    expect(c.percent_complete).toBe(0)
  })

  test('alle done → 100%', () => {
    const db = createTestDb()
    const { sid } = seedSprintWithIssues(db, ['completed', 'passed'])
    expect(computeSprintCompleteness(db, sid).percent_complete).toBe(100)
  })
})

describe('D4 — Wiring (REST + CLI + MCP)', () => {
  const api = readFileSync('apps/backend/src/api.js', 'utf8')
  const cli = readFileSync('apps/cli/bin/devd-cli.js', 'utf8')
  const mcp = readFileSync('apps/cli/mcp/devd-mcp.js', 'utf8')

  test('REST: GET /api/sprints/:id/completeness (eigener Endpoint, D-L)', () => {
    expect(api).toContain("app.get('/api/sprints/:id/completeness'")
    expect(api).toContain('computeSprintCompleteness')
  })
  test('CLI: sprint completeness', () => {
    expect(cli).toContain("'sprint:completeness'")
  })
  test('MCP: devd_sprint_completeness', () => {
    expect(mcp).toContain('devd_sprint_completeness')
  })
})
