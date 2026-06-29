// DD2-160 — Hard-Delete + kaskadierendes Löschen unter dem aktuellen Schema
// (Migration 065, DD2-155-Vokabular). Spiegelt die Endpoint-Transaktionen
// (DELETE /api/milestones/:id?cascade=1, DELETE /api/sprints/:id?cascade=1,
// DELETE /api/backlog/:id?force=1) auf Lib-Ebene gegen eine echte In-Memory-DB.
//
// Ergänzt tests/dd2-cascade-delete (Snapshot-028) um die Absicherung, dass die
// Kaskade auch mit den neuen Status-Triggern/CHECK greift und keine Dangling-Rows
// hinterlässt. cancelled bleibt als Soft-State erhalten (≠ Hard-Delete).

import { describe, test, expect, beforeEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { cascadeDeleteSprints, cascadeDeleteIssues, milestoneDeletePreview } from '../../apps/backend/src/lib/cascadeDelete.js'

const AT_065 = '065_v3_dd2_155_status_unify.sql'

function seed(db) {
  db.exec('CREATE TABLE IF NOT EXISTS archon_runs (id INTEGER PRIMARY KEY, sprint_id INTEGER)')
  const pid = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('c160','C','C')").run().lastInsertRowid
  const milestone = (name, status) =>
    db.prepare("INSERT INTO milestones (project_id, name, target_date, status, position) VALUES (?, ?, '2026-12-31', ?, 1)")
      .run(pid, name, status).lastInsertRowid
  // Neues Vokabular: in_progress (war active), planned, completed (war done).
  const m1 = milestone('M1', 'in_progress')
  const m2 = milestone('M2-control', 'new')

  let num = 0
  const sprint = (mid, status) => {
    num++
    return db.prepare("INSERT INTO sprints (project_id, project_number, name, status, milestone_id, position) VALUES (?, ?, ?, ?, ?, 1)")
      .run(pid, num, 'S' + num, status, mid).lastInsertRowid
  }
  const s1 = sprint(m1, 'in_progress')
  const s2 = sprint(m1, 'to_review')
  const sControl = sprint(m2, 'new')

  let inum = 0
  const issue = (sid, status) => {
    inum++
    return db.prepare("INSERT INTO backlog (project_id, project_number, title, status, type, priority, assigned_sprint) VALUES (?, ?, ?, ?, 'feature', 3, ?)")
      .run(pid, inum, 'I' + inum, status, sid).lastInsertRowid
  }
  const a = issue(s1, 'in_progress'), b = issue(s1, 'completed'), c = issue(s1, 'cancelled')
  const d = issue(s2, 'completed'), e = issue(s2, 'passed')
  const ctrlIssue = issue(sControl, 'planned')

  db.prepare('INSERT INTO review_feedback (backlog_id) VALUES (?)').run(a)
  db.prepare('INSERT INTO issue_dependencies (issue_id, depends_on_id) VALUES (?, ?)').run(a, b)

  return { pid, m1, m2, s1, s2, sControl, ctrlIssue, a, b, c, d, e }
}

describe('DD2-160 — Hard-Delete + Cascade (Schema 065 / neues Vokabular)', () => {
  let db, ids
  beforeEach(() => {
    db = createTestDb({ upToVersion: AT_065 })
    ids = seed(db)
  })

  // US-152
  test('Milestone-Delete kaskadiert über Sprints + Issues + Kinder, Control überlebt', () => {
    const p = milestoneDeletePreview(db, ids.m1)
    expect(p.sprints).toBe(2)
    expect(p.issues).toBe(5)

    db.transaction(() => {
      cascadeDeleteSprints(db, p.sprintIds)
      db.prepare('DELETE FROM milestones WHERE id = ?').run(ids.m1)
    })()

    const c = (sql, ...a) => db.prepare(sql).get(...a).c
    expect(c('SELECT COUNT(*) c FROM milestones WHERE id = ?', ids.m1)).toBe(0)
    expect(c('SELECT COUNT(*) c FROM sprints WHERE milestone_id = ?', ids.m1)).toBe(0)
    expect(c('SELECT COUNT(*) c FROM backlog WHERE assigned_sprint IN (?,?)', ids.s1, ids.s2)).toBe(0)
    // Keine Dangling-Kinder
    expect(c('SELECT COUNT(*) c FROM review_feedback')).toBe(0)
    expect(c('SELECT COUNT(*) c FROM issue_dependencies')).toBe(0)
    // Control-Meilenstein + dessen Issue bleiben
    expect(c('SELECT COUNT(*) c FROM milestones WHERE id = ?', ids.m2)).toBe(1)
    expect(c('SELECT COUNT(*) c FROM backlog WHERE id = ?', ids.ctrlIssue)).toBe(1)
  })

  // US-153
  test('Sprint-Delete kaskadiert nur dessen Issues', () => {
    cascadeDeleteSprints(db, [ids.s1])
    const c = (sql, ...a) => db.prepare(sql).get(...a).c
    expect(c('SELECT COUNT(*) c FROM sprints WHERE id = ?', ids.s1)).toBe(0)
    expect(c('SELECT COUNT(*) c FROM backlog WHERE assigned_sprint = ?', ids.s1)).toBe(0)
    expect(c('SELECT COUNT(*) c FROM backlog WHERE assigned_sprint = ?', ids.s2)).toBe(2)
  })

  // US-153
  test('Issue-Delete (force) entfernt Issue + nicht-kaskadierende Kinder', () => {
    cascadeDeleteIssues(db, [ids.a])
    const c = (sql, ...a) => db.prepare(sql).get(...a).c
    expect(c('SELECT COUNT(*) c FROM backlog WHERE id = ?', ids.a)).toBe(0)
    expect(c('SELECT COUNT(*) c FROM review_feedback WHERE backlog_id = ?', ids.a)).toBe(0)
    expect(c('SELECT COUNT(*) c FROM issue_dependencies WHERE issue_id = ? OR depends_on_id = ?', ids.a, ids.a)).toBe(0)
  })

  // US-153: cancelled ist Soft-State — bleibt in DB, ≠ Hard-Delete
  test('cancelled-Issue bleibt erhalten (Soft-State ≠ Hard-Delete)', () => {
    const c = (sql, ...a) => db.prepare(sql).get(...a).c
    expect(c('SELECT COUNT(*) c FROM backlog WHERE id = ? AND status = \'cancelled\'', ids.c)).toBe(1)
  })
})
