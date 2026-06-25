// DD-289 — GET /api/milestones/:id liefert sprints[], dependencies_in/out,
// dod_items[] und Aggregate (total/done/cancelled/terminal_count).
//
// Pattern wie dd290/api-milestones-sprints.test.js: SQL gegen In-Memory-DB
// direkt prüfen, ohne den vollen Express-App-Boot. Tests verifizieren das
// Schema der Subqueries unabhängig vom Routing-Layer.

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'
import { getDependenciesForMilestone } from '../../server/lib/milestoneDependencies.js'
import { listDodItems } from '../../server/lib/milestoneDodItems.js'

// Migrations 029–031 müssen explizit eingespielt werden — die Test-Baseline
// (Snapshot) endet bei 028, vor milestone_dependencies + milestone_dod_items.
const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_030 = '030_v3_milestone_dependencies.sql'
const MIG_031 = '031_v3_milestone_dod_items.sql'
// 054 ergänzt die details-Spalte (DoD-Schema-Erweiterung) — listDodItems SELECTet sie.
const MIG_054 = '054_v3_milestone_dod_items_details.sql'

// Replikat der DD-289-Sprint-Subquery aus server/api.js (GET /api/milestones/:id).
// Wenn die Query in api.js geändert wird, MUSS dieser Test mitziehen.
function fetchSprintsForMilestone(db, milestoneId) {
  const sprints = db.prepare(`
    SELECT s.id, s.name, s.goal, s.status, s.milestone_id, s.position,
           s.project_number, s.start_date, s.end_date,
           p.prefix AS project_prefix,
           (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status != 'cancelled') AS issue_total,
           (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status IN ('done','passed')) AS issue_done,
           (SELECT COUNT(*) FROM backlog b WHERE b.assigned_sprint = s.id AND b.status = 'cancelled') AS issue_cancelled
    FROM sprints s
    LEFT JOIN projects p ON p.id = s.project_id
    WHERE s.milestone_id = ?
    ORDER BY s.position IS NULL, s.position ASC, s.id ASC
  `).all(milestoneId)
  for (const s of sprints) {
    if (s.project_prefix && s.project_number != null) {
      s.key = `${s.project_prefix}#${s.project_number}`
    }
  }
  return sprints
}

function aggregate(sprints) {
  let total = 0, done = 0, cancelled = 0
  for (const sp of sprints) {
    total += sp.issue_total || 0
    done += sp.issue_done || 0
    cancelled += sp.issue_cancelled || 0
  }
  return { total, done, cancelled, terminal_count: done + cancelled }
}

describe('DD-289 — GET /api/milestones/:id Subqueries', () => {
  let db
  let logDir
  let projectId
  let milestoneA   // hat 2 Sprints, 4 Issues (2 done, 1 cancelled, 1 in_progress)
  let milestoneB   // predecessor von A
  let milestoneC   // successor von A
  let dodItemIds = []

  beforeAll(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    logDir = mkdtempSync(join(tmpdir(), 'devd-dd289-'))
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_030, { logDir })
    applyMigration(db, MIG_031, { logDir })
    applyMigration(db, MIG_054, { logDir })
    const proj = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('dd', 'DD', 'DD')").run()
    projectId = proj.lastInsertRowid

    // 3 Milestones: A (Hauptobjekt), B (predecessor), C (successor).
    const mA = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, status, position, description, created_at)
      VALUES (?, 'M-A', '2026-08-15', 'open', 2, 'Beschreibung A', '2026-04-01')
    `).run(projectId)
    milestoneA = mA.lastInsertRowid
    const mB = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, status, position)
      VALUES (?, 'M-B', '2026-06-01', 'reached', 1)
    `).run(projectId)
    milestoneB = mB.lastInsertRowid
    const mC = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, status, position)
      VALUES (?, 'M-C', '2026-10-01', 'open', 3)
    `).run(projectId)
    milestoneC = mC.lastInsertRowid

    // Dependencies: B → A → C.
    db.prepare(`
      INSERT INTO milestone_dependencies (predecessor_id, successor_id) VALUES (?, ?)
    `).run(milestoneB, milestoneA)
    db.prepare(`
      INSERT INTO milestone_dependencies (predecessor_id, successor_id) VALUES (?, ?)
    `).run(milestoneA, milestoneC)

    // 2 Sprints für Milestone A.
    const sp1 = db.prepare(`
      INSERT INTO sprints (project_id, project_number, name, goal, status, milestone_id, position, start_date, end_date)
      VALUES (?, 41, 'Sprint Alpha', 'Goal Alpha', 'completed', ?, 1, '2026-05-01', '2026-05-14')
    `).run(projectId, milestoneA)
    const sp2 = db.prepare(`
      INSERT INTO sprints (project_id, project_number, name, goal, status, milestone_id, position, start_date, end_date)
      VALUES (?, 42, 'Sprint Beta', 'Goal Beta', 'planning', ?, 2, '2026-05-15', '2026-05-28')
    `).run(projectId, milestoneA)

    // 4 Issues verteilt auf die zwei Sprints: 2 done, 1 cancelled, 1 in_progress.
    const issueIns = db.prepare(`
      INSERT INTO backlog (project_id, project_number, title, status, type, priority, assigned_sprint)
      VALUES (?, ?, ?, ?, 'feature', 3, ?)
    `)
    issueIns.run(projectId, 1, 'I1 done', 'done', sp1.lastInsertRowid)
    issueIns.run(projectId, 2, 'I2 passed', 'passed', sp1.lastInsertRowid)
    issueIns.run(projectId, 3, 'I3 cancelled', 'cancelled', sp1.lastInsertRowid)
    issueIns.run(projectId, 4, 'I4 in_progress', 'in_progress', sp2.lastInsertRowid)

    // DoD-Items für Milestone A (2 done, 1 offen).
    const dodIns = db.prepare(`
      INSERT INTO milestone_dod_items (milestone_id, label, done, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `)
    dodItemIds.push(Number(dodIns.run(milestoneA, 'DoD eins', 1, 1).lastInsertRowid))
    dodItemIds.push(Number(dodIns.run(milestoneA, 'DoD zwei', 1, 2).lastInsertRowid))
    dodItemIds.push(Number(dodIns.run(milestoneA, 'DoD drei offen', 0, 3).lastInsertRowid))
  })

  afterAll(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('Sprint-Liste liefert key + name + goal + position', () => {
    const sprints = fetchSprintsForMilestone(db, milestoneA)
    expect(sprints).toHaveLength(2)
    expect(sprints[0].key).toBe('DD#41')
    expect(sprints[0].name).toBe('Sprint Alpha')
    expect(sprints[0].goal).toBe('Goal Alpha')
    expect(sprints[0].position).toBe(1)
    expect(sprints[1].key).toBe('DD#42')
    expect(sprints[1].position).toBe(2)
  })

  test('Sprint-Liste liefert start_date + end_date + status', () => {
    const sprints = fetchSprintsForMilestone(db, milestoneA)
    expect(sprints[0].start_date).toBe('2026-05-01')
    expect(sprints[0].end_date).toBe('2026-05-14')
    expect(sprints[0].status).toBe('completed')
    expect(sprints[1].status).toBe('planning')
  })

  test('Sprint-Liste zählt issue_total/issue_done/issue_cancelled pro Sprint', () => {
    const sprints = fetchSprintsForMilestone(db, milestoneA)
    // DD-524: issue_total zählt non-cancelled (status != 'cancelled').
    // Sprint Alpha: 3 Issues (1 done, 1 passed, 1 cancelled) → total=2.
    expect(sprints[0].issue_total).toBe(2)
    expect(sprints[0].issue_done).toBe(2)
    expect(sprints[0].issue_cancelled).toBe(1)
    // Sprint Beta: 1 Issue (in_progress).
    expect(sprints[1].issue_total).toBe(1)
    expect(sprints[1].issue_done).toBe(0)
    expect(sprints[1].issue_cancelled).toBe(0)
  })

  test('Aggregat über Sprints: total=3, done=2, cancelled=1, terminal_count=3 (DD-524)', () => {
    const sprints = fetchSprintsForMilestone(db, milestoneA)
    const agg = aggregate(sprints)
    // total = non-cancelled (4 - 1 cancelled) = 3.
    expect(agg.total).toBe(3)
    expect(agg.done).toBe(2)
    expect(agg.cancelled).toBe(1)
    expect(agg.terminal_count).toBe(3)
  })

  test('dependencies_in (predecessors): M-B → M-A', () => {
    const { predecessors, successors } = getDependenciesForMilestone(db, milestoneA)
    expect(predecessors).toHaveLength(1)
    expect(predecessors[0].id).toBe(milestoneB)
    expect(predecessors[0].name).toBe('M-B')
    // Sanity: successors getrennt
    expect(successors).toHaveLength(1)
  })

  test('dependencies_out (successors): M-A → M-C', () => {
    const { successors } = getDependenciesForMilestone(db, milestoneA)
    expect(successors).toHaveLength(1)
    expect(successors[0].id).toBe(milestoneC)
    expect(successors[0].name).toBe('M-C')
  })

  test('Dependencies-Status-Lookup (separater SELECT) liefert status pro Referenz', () => {
    // DD-289 macht einen JOIN über milestones um den status mitzuliefern —
    // hier reproduziert.
    const { predecessors, successors } = getDependenciesForMilestone(db, milestoneA)
    const depIds = [...predecessors.map(p => p.id), ...successors.map(s => s.id)]
    const placeholders = depIds.map(() => '?').join(',')
    const rows = db.prepare(
      `SELECT id, status FROM milestones WHERE id IN (${placeholders})`
    ).all(...depIds)
    const map = new Map(rows.map(r => [r.id, r.status]))
    expect(map.get(milestoneB)).toBe('reached')
    expect(map.get(milestoneC)).toBe('open')
  })

  test('DoD-Items werden geordnet (position ASC) geliefert', () => {
    const items = listDodItems(db, milestoneA)
    expect(items).toHaveLength(3)
    expect(items[0].label).toBe('DoD eins')
    expect(items[0].done).toBe(1)
    expect(items[2].label).toBe('DoD drei offen')
    expect(items[2].done).toBe(0)
  })

  test('cancelled Backlog-Items zählen nicht in total/done (DD-524)', () => {
    db.prepare("UPDATE backlog SET status = 'cancelled' WHERE title = 'I1 done'").run()
    const sprints = fetchSprintsForMilestone(db, milestoneA)
    const agg = aggregate(sprints)
    // I1 done → cancelled: total = non-cancelled = 4 - 2 (das ursprüngliche
    // I3 cancelled + jetzt I1) = 2; done = 2 - 1 = 1; cancelled = 2.
    expect(agg.total).toBe(2)
    expect(agg.done).toBe(1)
    expect(agg.cancelled).toBe(2)
    // Restore
    db.prepare("UPDATE backlog SET status = 'done' WHERE title = 'I1 done'").run()
  })
})
