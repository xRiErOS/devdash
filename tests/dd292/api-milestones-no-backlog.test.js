// DD-292 — Backend: GET /api/milestones liefert KEINE Backlog-Items mehr.
//
// Acceptance:
// - Response-Buckets enthalten kein items[]-Array (Backlog-Items).
// - Issues OHNE assigned_sprint (klassische Backlog-Items) erscheinen
//   nicht im Response — weder in einer Milestone-Card noch in einem
//   noneBucket-items[].
// - Issues MIT assigned_sprint schlagen ausschließlich über die
//   Sprint-Subquery (issue_total/issue_done/issue_cancelled) durch und
//   werden auf Bucket-Ebene aufsummiert (bucket.total/done/cancelled).
// - noneBucket bleibt als Drag-Source für Sprints ohne milestone_id
//   erhalten, transportiert aber KEINE items.
//
// Hinweis: Die Tests simulieren die Endpoint-Logik direkt gegen eine
// In-Memory-DB (analog zu tests/dd290/api-milestones-sprints.test.js),
// um den Express-Boot zu vermeiden.

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'

// Reproduziert die produktive /api/milestones-Handler-Logik aus
// server/api.js (Stand DD-292). Eine 1:1-Spiegelung — Änderungen am
// Endpoint MÜSSEN hier nachgezogen werden.
function fetchMilestonesEndpoint(db, projectId, statusFilter = 'open') {
  const statusClause = statusFilter === 'all' ? '' : "AND status = 'open'"
  const milestones = db.prepare(`
    SELECT id, name, description, target_date, status, created_at, position
    FROM milestones
    WHERE project_id = ? ${statusClause}
    ORDER BY position IS NULL, position ASC, status = 'open' DESC, target_date IS NULL, target_date ASC, id ASC
  `).all(projectId)

  const allSprints = db.prepare(`
    SELECT s.id, s.name, s.goal, s.status, s.milestone_id, s.position,
           s.project_number, s.start_date, s.end_date,
           p.prefix AS project_prefix,
           (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status != 'cancelled') AS issue_total,
           (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status IN ('done','passed')) AS issue_done,
           (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status = 'cancelled') AS issue_cancelled
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

  const sprintsByMilestone = new Map()
  for (const s of allSprints) {
    if (s.milestone_id == null) continue
    if (!sprintsByMilestone.has(s.milestone_id)) sprintsByMilestone.set(s.milestone_id, [])
    sprintsByMilestone.get(s.milestone_id).push(s)
  }

  const sprintsWithoutMilestone = allSprints.filter(s =>
    s.milestone_id == null && (s.status === 'planning' || s.status === 'active')
  )

  const aggregateFromSprints = (sprints) => {
    let total = 0, done = 0, cancelled = 0
    for (const sp of sprints) {
      total += sp.issue_total || 0
      done += sp.issue_done || 0
      cancelled += sp.issue_cancelled || 0
    }
    return { total, done, cancelled, terminal_count: done + cancelled }
  }

  const newBucket = (milestone) => {
    const sprints = milestone?.id
      ? (sprintsByMilestone.get(milestone.id) || [])
      : sprintsWithoutMilestone
    const counts = milestone?.id
      ? aggregateFromSprints(sprints)
      : { total: 0, done: 0, cancelled: 0, terminal_count: 0 }
    return { ...milestone, sprints, ...counts }
  }

  const buckets = new Map(milestones.map(m => [m.id, newBucket(m)]))
  const noneBucket = newBucket(null)
  const list = [...buckets.values()]
  if (noneBucket.sprints.length > 0) list.push(noneBucket)
  return list
}

describe('DD-292 — /api/milestones liefert keine Backlog-Items', () => {
  let db
  let projectId
  let milestoneId
  let sprintId

  beforeAll(() => {
    db = createTestDb()
    // Minimal-Seed: 1 Projekt + 1 Milestone + 1 Sprint mit milestone_id.
    const proj = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('test-dd292','Test DD-292','TT')").run()
    projectId = Number(proj.lastInsertRowid)
    const ms = db.prepare(`
      INSERT INTO milestones (project_id, name, status, target_date, position)
      VALUES (?, 'M1', 'open', '2026-12-01', 1)
    `).run(projectId)
    milestoneId = Number(ms.lastInsertRowid)
    const sp = db.prepare(`
      INSERT INTO sprints (project_id, project_number, name, status, milestone_id, position)
      VALUES (?, 1, 'Sprint-1', 'planning', ?, 1)
    `).run(projectId, milestoneId)
    sprintId = Number(sp.lastInsertRowid)

    // 1 Issue OHNE assigned_sprint (klassisches Backlog-Item, soll NICHT erscheinen)
    db.prepare(`
      INSERT INTO backlog (project_id, project_number, title, status, type, priority, assigned_sprint)
      VALUES (?, 1, 'Backlog-Item ohne Sprint', 'refined', 'feature', 3, NULL)
    `).run(projectId)
    // 1 Issue MIT assigned_sprint (in done → schlägt über Sprint-Subquery durch)
    db.prepare(`
      INSERT INTO backlog (project_id, project_number, title, status, type, priority, assigned_sprint)
      VALUES (?, 2, 'Sprint-Item done', 'done', 'feature', 3, ?)
    `).run(projectId, sprintId)
  })

  afterAll(() => {
    db.close()
  })

  test('Kein Bucket enthält ein items[]-Array (Backlog-Items entfernt)', () => {
    const list = fetchMilestonesEndpoint(db, projectId)
    expect(list.length).toBeGreaterThan(0)
    for (const bucket of list) {
      expect(bucket.items).toBeUndefined()
    }
  })

  test('Backlog-Item (assigned_sprint=NULL) erscheint nicht im Response', () => {
    const list = fetchMilestonesEndpoint(db, projectId)
    // Falls irgendwo doch ein items[] auftaucht, wäre das ein Regressions-Smoke.
    const allTitles = list.flatMap(b => Array.isArray(b.items) ? b.items.map(i => i.title) : [])
    expect(allTitles).not.toContain('Backlog-Item ohne Sprint')
  })

  test('Sprint-Issue zählt auf Bucket-Ebene (total/done aus Sprint-Subquery)', () => {
    const list = fetchMilestonesEndpoint(db, projectId)
    const milestoneBucket = list.find(b => b.id === milestoneId)
    expect(milestoneBucket).toBeDefined()
    expect(milestoneBucket.total).toBe(1)
    expect(milestoneBucket.done).toBe(1)
    expect(milestoneBucket.terminal_count).toBe(1)
  })

  test('Milestone-Bucket enthält Sprint-Subquery-Eintrag (sprints[])', () => {
    const list = fetchMilestonesEndpoint(db, projectId)
    const milestoneBucket = list.find(b => b.id === milestoneId)
    expect(Array.isArray(milestoneBucket.sprints)).toBe(true)
    expect(milestoneBucket.sprints).toHaveLength(1)
    expect(milestoneBucket.sprints[0].id).toBe(sprintId)
    expect(milestoneBucket.sprints[0].issue_total).toBe(1)
    expect(milestoneBucket.sprints[0].issue_done).toBe(1)
  })

  test('noneBucket erscheint nur, wenn Sprints ohne milestone_id existieren', () => {
    // Aktueller Seed: alle Sprints haben milestone_id → kein noneBucket.
    const listBefore = fetchMilestonesEndpoint(db, projectId)
    expect(listBefore.find(b => b.id == null)).toBeUndefined()

    // Sprint ohne milestone_id ergänzen → noneBucket muss erscheinen,
    // darf aber kein items[] tragen.
    const sp2 = db.prepare(`
      INSERT INTO sprints (project_id, project_number, name, status, milestone_id, position)
      VALUES (?, 2, 'Sprint-orphan', 'planning', NULL, 2)
    `).run(projectId)
    const orphanSprintId = Number(sp2.lastInsertRowid)

    const listAfter = fetchMilestonesEndpoint(db, projectId)
    const none = listAfter.find(b => b.id == null)
    expect(none).toBeDefined()
    expect(none.items).toBeUndefined()
    expect(none.sprints.map(s => s.id)).toContain(orphanSprintId)

    // Cleanup für deterministische Folge-Tests.
    db.prepare('DELETE FROM sprints WHERE id = ?').run(orphanSprintId)
  })

  test('Backlog-Item mit assigned_sprint=NULL erhöht KEINE Bucket-Counts', () => {
    // Zusätzliches Backlog-Item zur Schärfung der Acceptance.
    db.prepare(`
      INSERT INTO backlog (project_id, project_number, title, status, type, priority, assigned_sprint)
      VALUES (?, 3, 'Noch ein Backlog-Item', 'new', 'feature', 3, NULL)
    `).run(projectId)

    const list = fetchMilestonesEndpoint(db, projectId)
    const milestoneBucket = list.find(b => b.id === milestoneId)
    // total/done unverändert — Sprint hat weiterhin nur das 1 Done-Issue.
    expect(milestoneBucket.total).toBe(1)
    expect(milestoneBucket.done).toBe(1)

    // Cleanup
    db.prepare("DELETE FROM backlog WHERE title = 'Noch ein Backlog-Item'").run()
  })
})
