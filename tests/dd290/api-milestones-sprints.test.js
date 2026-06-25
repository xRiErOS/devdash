// DD-290 — Backend: GET /api/milestones nested sprints[] mit
// key/goal/status/issue_total/issue_done + position.
// DD-292 — Backlog-Items werden weiterhin im Bucket geliefert (Backwards-Compat
// für noneBucket-Render), aber DD-292-Acceptance lebt im Frontend: die
// Milestone-Card rendert keine items[] mehr. Hier testen wir nur die
// Sprint-Subquery — keine Re-Definition von DD-292 als API-Constraint.

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import Database from 'better-sqlite3'

// Hilfsfunktion: simuliert die DD-290-Sprint-Subquery direkt gegen eine
// Test-DB. Damit testen wir das SQL ohne den vollen Express-App-Boot.
function fetchMilestoneSprints(db, projectId) {
  const allSprints = db.prepare(`
    SELECT s.id, s.name, s.goal, s.status, s.milestone_id, s.position,
           s.project_number, s.start_date, s.end_date,
           p.prefix AS project_prefix,
           (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status != 'cancelled') AS issue_total,
           (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status IN ('done','passed')) AS issue_done
    FROM sprints s
    LEFT JOIN projects p ON p.id = s.project_id
    WHERE s.project_id = ?
    ORDER BY s.position IS NULL, s.position ASC, s.id ASC
  `).all(projectId)
  for (const s of allSprints) {
    if (s.project_prefix && s.project_number != null) {
      s.key = `${s.project_prefix}#${s.project_number}`
    }
  }
  return allSprints
}

describe('DD-290 — Sprint-Subquery für /api/milestones', () => {
  let db
  let projectId
  let milestoneId
  let sprintId

  beforeAll(() => {
    db = createTestDb()
    // Minimal-Seed: Projekt + Milestone + Sprint + 3 Issues (1 done, 1 passed, 1 in_progress).
    const proj = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('dd-test', 'DD-Test', 'DD')").run()
    projectId = proj.lastInsertRowid
    const ms = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, status, position)
      VALUES (?, 'M-X', '2026-12-31', 'open', 1)
    `).run(projectId)
    milestoneId = ms.lastInsertRowid
    const sp = db.prepare(`
      INSERT INTO sprints (project_id, project_number, name, goal, status, milestone_id, position, start_date, end_date)
      VALUES (?, 42, 'S-Test', 'Goal text', 'planning', ?, 1, '2026-05-01', '2026-05-14')
    `).run(projectId, milestoneId)
    sprintId = sp.lastInsertRowid

    // 3 Issues: 1 done, 1 passed, 1 in_progress.
    const issueIns = db.prepare(`
      INSERT INTO backlog (project_id, project_number, title, status, type, priority, assigned_sprint)
      VALUES (?, ?, ?, ?, 'feature', 3, ?)
    `)
    issueIns.run(projectId, 1, 'I1', 'done', sprintId)
    issueIns.run(projectId, 2, 'I2', 'passed', sprintId)
    issueIns.run(projectId, 3, 'I3', 'in_progress', sprintId)
  })

  afterAll(() => { db.close() })

  test('Sprint-Subquery liefert key=DD#42', () => {
    const sprints = fetchMilestoneSprints(db, projectId)
    expect(sprints).toHaveLength(1)
    expect(sprints[0].key).toBe('DD#42')
  })

  test('Sprint-Subquery liefert goal + status + milestone_id + position', () => {
    const sprints = fetchMilestoneSprints(db, projectId)
    expect(sprints[0].goal).toBe('Goal text')
    expect(sprints[0].status).toBe('planning')
    expect(sprints[0].milestone_id).toBe(milestoneId)
    expect(sprints[0].position).toBe(1)
  })

  test('Sprint-Subquery liefert start_date + end_date', () => {
    const sprints = fetchMilestoneSprints(db, projectId)
    expect(sprints[0].start_date).toBe('2026-05-01')
    expect(sprints[0].end_date).toBe('2026-05-14')
  })

  test('Sprint-Subquery zählt issue_total korrekt (3)', () => {
    const sprints = fetchMilestoneSprints(db, projectId)
    expect(sprints[0].issue_total).toBe(3)
  })

  test('Sprint-Subquery zählt issue_done korrekt (2: done + passed)', () => {
    const sprints = fetchMilestoneSprints(db, projectId)
    expect(sprints[0].issue_done).toBe(2)
  })

  test('Sprint-Subquery ignoriert cancelled Items (DD-524)', () => {
    // Cancel eines Done-Items → issue_done sinkt um 1, issue_total um 1.
    db.prepare("UPDATE backlog SET status = 'cancelled' WHERE title = 'I1'").run()
    const sprints = fetchMilestoneSprints(db, projectId)
    expect(sprints[0].issue_done).toBe(1)
    expect(sprints[0].issue_total).toBe(2)
    // Restore für Folge-Tests.
    db.prepare("UPDATE backlog SET status = 'done' WHERE title = 'I1'").run()
  })
})
