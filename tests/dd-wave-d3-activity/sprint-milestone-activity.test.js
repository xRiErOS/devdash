// GF-2 Wave D / D3 (T04): Activity-Read für Sprint + Milestone. Write existiert (auditLog).
// Gap = READ-Endpoint + table_name-Reconcile (Sprint-Drift 'sprint' UND 'sprints'). Test:
// audit_log Round-Trip mit Drift + Reconcile-Filter (mirror Endpoint-Query) + Wiring.
import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { createTestDb } from '../_fixtures/in-memory-db.js'

// Spiegelt die Endpoint-Query (entityActivity) — Reconcile via IN (...).
function readActivity(db, tableNames, recordId, limit = 100) {
  const placeholders = tableNames.map(() => '?').join(',')
  return db.prepare(`
    SELECT id, timestamp, agent_id, action, old_value, new_value
    FROM audit_log
    WHERE table_name IN (${placeholders}) AND record_id = ?
    ORDER BY id DESC LIMIT ?
  `).all(...tableNames, recordId, limit)
}

function logEvt(db, table_name, record_id, action) {
  db.prepare("INSERT INTO audit_log (table_name, record_id, action, agent_id) VALUES (?, ?, ?, 'test')")
    .run(table_name, record_id, action)
}

describe('D3 — Activity-Read + table_name-Reconcile', () => {
  test('Sprint-Drift: Events unter sprint UND sprints werden beide gelesen (IN-Reconcile)', () => {
    const db = createTestDb()
    logEvt(db, 'sprint', 42, 'status_change')   // Drift singular (api.js status_change/edit)
    logEvt(db, 'sprints', 42, 'sprint_reorder') // plural (api.js reorder)
    logEvt(db, 'sprint', 99, 'status_change')   // anderer Sprint — darf NICHT auftauchen
    const rows = readActivity(db, ['sprint', 'sprints'], 42)
    expect(rows.length).toBe(2)
    expect(rows.map(r => r.action).sort()).toEqual(['sprint_reorder', 'status_change'])
  })

  test('Milestone-Activity: milestones (+ milestone-Drift-Sicherung)', () => {
    const db = createTestDb()
    logEvt(db, 'milestones', 7, 'milestone_defer')
    logEvt(db, 'milestone', 7, 'legacy_event')
    const rows = readActivity(db, ['milestone', 'milestones'], 7)
    expect(rows.length).toBe(2)
  })

  test('newest first (ORDER BY id DESC) + limit', () => {
    const db = createTestDb()
    for (let i = 0; i < 5; i++) logEvt(db, 'sprint', 1, `evt${i}`)
    const rows = readActivity(db, ['sprint', 'sprints'], 1, 3)
    expect(rows.length).toBe(3)
    expect(rows[0].action).toBe('evt4') // newest first
  })
})

describe('D3 — Wiring (REST + CLI + MCP)', () => {
  const api = readFileSync('server/api.js', 'utf8')
  const cli = readFileSync('bin/devd-cli.js', 'utf8')
  const mcp = readFileSync('mcp/devd-mcp.js', 'utf8')

  test('REST: activity endpoints + IN-Reconcile', () => {
    expect(api).toContain("app.get('/api/sprints/:id/activity'")
    expect(api).toContain("app.get('/api/milestones/:id/activity'")
    expect(api).toContain("tableNames: ['sprint', 'sprints']")
    expect(api).toContain('table_name IN')
  })
  test('CLI: sprint/milestone activity', () => {
    expect(cli).toContain("'sprint:activity'")
    expect(cli).toContain("'milestone:activity'")
  })
  test('MCP: devd_{sprint,milestone}_activity', () => {
    expect(mcp).toContain('devd_sprint_activity')
    expect(mcp).toContain('devd_milestone_activity')
  })
})
