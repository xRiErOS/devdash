// DD-293 R2 — Backend: GET /api/milestones liefert Sprints OHNE Milestone-
// Zuordnung in abgeschlossenem Status als `backfill_sprints[]` im noneBucket.
//
// Acceptance:
// 1. noneBucket existiert wenn ≥1 Sprint mit milestone_id IS NULL und
//    status IN ('completed','closed','review') vorhanden ist — auch wenn
//    KEIN planning/active-Sprint ohne Milestone vorliegt.
// 2. noneBucket.backfill_sprints[] enthält genau diese Sprints, mit
//    project_prefix + project_number + name + status + key.
// 3. noneBucket.sprints[] bleibt unverändert auf planning/active gefiltert
//    (Drag-Source-Pattern aus DD-172 nicht brechen).
// 4. Real-Milestone-Buckets (mit ID) bekommen KEIN backfill_sprints[]-Feld
//    (Backfill ist konzeptuell ein noneBucket-Konstrukt).
//
// Pattern wie tests/dd292: Endpoint-Handler-Spiegel direkt gegen In-Memory-DB.

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_030 = '030_v3_milestone_dependencies.sql'
const MIG_031 = '031_v3_milestone_dod_items.sql'
const MIG_032 = '032_v3_api_keys.sql'
const MIG_033 = '033_v3_milestone_deferred.sql'

function applyAllMigrations(db) {
  const logDir = mkdtempSync(join(tmpdir(), 'dd293r2-'))
  applyMigration(db, MIG_029, { logDir })
  applyMigration(db, MIG_030, { logDir })
  applyMigration(db, MIG_031, { logDir })
  applyMigration(db, MIG_032, { logDir })
  applyMigration(db, MIG_033, { logDir })
  return logDir
}

// 1:1-Spiegelung der produktiven /api/milestones-Handler-Logik (server/api.js
// Stand DD-293 R2). Änderungen am Endpoint MÜSSEN hier nachgezogen werden.
function fetchMilestonesEndpoint(db, projectId, statusFilter = 'open') {
  const statusClause = statusFilter === 'all' ? '' : "AND status = 'open'"
  const milestones = db.prepare(`
    SELECT id, name, description, target_date, status, created_at, position, deferred
    FROM milestones
    WHERE project_id = ? ${statusClause} AND deferred = 0
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
  // DD-293 R2: abgeschlossene Sprints ohne milestone_id als separates Feld.
  const backfillSprintsWithoutMilestone = allSprints.filter(s =>
    s.milestone_id == null && (s.status === 'completed' || s.status === 'closed' || s.status === 'review')
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
    const bucket = { ...milestone, sprints, ...counts }
    if (!milestone?.id) {
      bucket.backfill_sprints = backfillSprintsWithoutMilestone
    }
    return bucket
  }

  const buckets = new Map(milestones.map(m => [m.id, newBucket(m)]))
  const noneBucket = newBucket(null)
  const list = [...buckets.values()]
  if (noneBucket.sprints.length > 0 || (noneBucket.backfill_sprints && noneBucket.backfill_sprints.length > 0)) {
    list.push(noneBucket)
  }
  return list
}

describe('DD-293 R2 — /api/milestones liefert backfill_sprints[] im noneBucket', () => {
  let db
  let projectId
  let milestoneId
  let logDir

  beforeAll(() => {
    db = createTestDb()
    logDir = applyAllMigrations(db)
    const proj = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('test-dd293r2','Test DD-293 R2','TT')").run()
    projectId = Number(proj.lastInsertRowid)
    const ms = db.prepare(`
      INSERT INTO milestones (project_id, name, status, position, deferred, target_date)
      VALUES (?, 'M1', 'open', 1, 0, '2099-12-31')
    `).run(projectId)
    milestoneId = Number(ms.lastInsertRowid)

    // Sprints:
    //  - 1× planning, milestone_id=NULL  → noneBucket.sprints
    //  - 1× completed, milestone_id=NULL → noneBucket.backfill_sprints
    //  - 1× closed,    milestone_id=NULL → noneBucket.backfill_sprints
    //  - 1× review,    milestone_id=NULL → noneBucket.backfill_sprints
    //  - 1× cancelled, milestone_id=NULL → wird IGNORIERT (kein Backfill)
    //  - 1× completed, milestone_id=M1   → erscheint nur in M1.sprints
    const insSprint = db.prepare(`
      INSERT INTO sprints (project_id, project_number, name, status, milestone_id, position)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    insSprint.run(projectId, 1, 'Sprint Planning A', 'planning', null, 1)
    insSprint.run(projectId, 2, 'Sprint Completed B', 'completed', null, 2)
    insSprint.run(projectId, 3, 'Sprint Closed C', 'closed', null, 3)
    insSprint.run(projectId, 4, 'Sprint Review D', 'review', null, 4)
    insSprint.run(projectId, 5, 'Sprint Cancelled E', 'cancelled', null, 5)
    insSprint.run(projectId, 6, 'Sprint Completed Assigned', 'completed', milestoneId, 6)
  })

  afterAll(() => {
    db.close()
    try { rmSync(logDir, { recursive: true, force: true }) } catch { /* noop */ }
  })

  test('noneBucket existiert und enthält backfill_sprints[] mit completed+closed+review', () => {
    const list = fetchMilestonesEndpoint(db, projectId, 'open')
    const noneBucket = list.find(b => !b.id)
    expect(noneBucket).toBeTruthy()
    expect(Array.isArray(noneBucket.backfill_sprints)).toBe(true)
    expect(noneBucket.backfill_sprints).toHaveLength(3)
    const statuses = noneBucket.backfill_sprints.map(s => s.status).sort()
    expect(statuses).toEqual(['closed', 'completed', 'review'])
  })

  test('backfill_sprints[] enthält key, name, project_number', () => {
    const list = fetchMilestonesEndpoint(db, projectId, 'open')
    const noneBucket = list.find(b => !b.id)
    const completed = noneBucket.backfill_sprints.find(s => s.status === 'completed')
    expect(completed.name).toBe('Sprint Completed B')
    expect(completed.project_number).toBe(2)
    expect(completed.key).toBe('TT#2')
    expect(completed.milestone_id).toBe(null)
  })

  test('noneBucket.sprints[] bleibt auf planning/active gefiltert (kein Backfill-Leakage)', () => {
    const list = fetchMilestonesEndpoint(db, projectId, 'open')
    const noneBucket = list.find(b => !b.id)
    expect(noneBucket.sprints).toHaveLength(1)
    expect(noneBucket.sprints[0].status).toBe('planning')
  })

  test('cancelled-Sprints ohne Milestone werden NICHT in backfill_sprints[] gelistet', () => {
    const list = fetchMilestonesEndpoint(db, projectId, 'open')
    const noneBucket = list.find(b => !b.id)
    const cancelled = noneBucket.backfill_sprints.find(s => s.status === 'cancelled')
    expect(cancelled).toBeUndefined()
  })

  test('Real-Milestone-Bucket bekommt KEIN backfill_sprints[] Feld', () => {
    const list = fetchMilestonesEndpoint(db, projectId, 'open')
    const realBucket = list.find(b => b.id === milestoneId)
    expect(realBucket).toBeTruthy()
    expect(realBucket.backfill_sprints).toBeUndefined()
  })

  test('Sprints mit milestone_id erscheinen NICHT im noneBucket.backfill_sprints[]', () => {
    const list = fetchMilestonesEndpoint(db, projectId, 'open')
    const noneBucket = list.find(b => !b.id)
    const assigned = noneBucket.backfill_sprints.find(s => s.project_number === 6)
    expect(assigned).toBeUndefined()
  })

  test('noneBucket erscheint AUCH wenn nur backfill_sprints vorhanden sind (kein planning/active)', () => {
    // Eigene Test-DB: nur ein completed Sprint ohne Milestone.
    const db2 = createTestDb()
    applyAllMigrations(db2)
    const proj = db2.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('test2','T2','XX')").run()
    const pid = Number(proj.lastInsertRowid)
    db2.prepare(`
      INSERT INTO sprints (project_id, project_number, name, status, milestone_id, position)
      VALUES (?, 1, 'Only Completed', 'completed', NULL, 1)
    `).run(pid)
    const list = fetchMilestonesEndpoint(db2, pid, 'open')
    const noneBucket = list.find(b => !b.id)
    expect(noneBucket).toBeTruthy()
    expect(noneBucket.sprints).toHaveLength(0)
    expect(noneBucket.backfill_sprints).toHaveLength(1)
    db2.close()
  })

  test('Kein noneBucket, wenn weder planning/active noch backfill-Sprints existieren', () => {
    const db3 = createTestDb()
    applyAllMigrations(db3)
    const proj = db3.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('test3','T3','YY')").run()
    const pid = Number(proj.lastInsertRowid)
    const ms = db3.prepare(`
      INSERT INTO milestones (project_id, name, status, position, deferred, target_date)
      VALUES (?, 'Only M', 'open', 1, 0, '2099-12-31')
    `).run(pid)
    const mid = Number(ms.lastInsertRowid)
    db3.prepare(`
      INSERT INTO sprints (project_id, project_number, name, status, milestone_id, position)
      VALUES (?, 1, 'Assigned', 'planning', ?, 1)
    `).run(pid, mid)
    const list = fetchMilestonesEndpoint(db3, pid, 'open')
    const noneBucket = list.find(b => !b.id)
    expect(noneBucket).toBeUndefined()
    db3.close()
  })
})
