// DD2 T02a — kaskadierendes Löschen: Meilenstein → Sprints → Issues + Kinder.
// Verifiziert milestoneDeletePreview (Counts) + cascadeDeleteSprints (transaktional
// im Route-Handler) gegen eine echte In-Memory-DB (Snapshot-Schema, FK=ON).

import { describe, test, expect, beforeEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { cascadeDeleteSprints, milestoneDeletePreview } from '../../apps/backend/src/lib/cascadeDelete.js'

function seed(db) {
  // archon_runs wird erst nach dem Baseline-Snapshot (028) angelegt — in Prod
  // vorhanden, hier als Stub, damit cascadeDeleteSprints es räumen kann.
  db.exec('CREATE TABLE IF NOT EXISTS archon_runs (id INTEGER PRIMARY KEY, sprint_id INTEGER)')
  // DD2-21: documents-Tabelle (Migration 067) — als Stub, damit milestoneDeletePreview
  // sie zählen kann (Snapshot ist 028, vor 067). Genau ein Owner via CHECK.
  db.exec(`CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE,
    sprint_id INTEGER REFERENCES sprints(id) ON DELETE CASCADE,
    title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', file_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    CHECK ((milestone_id IS NOT NULL) + (sprint_id IS NOT NULL) = 1)
  )`)
  const pid = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('c-test','C','C')").run().lastInsertRowid
  const milestone = (name) =>
    db.prepare("INSERT INTO milestones (project_id, name, status, position) VALUES (?, ?, 'planning', 1)").run(pid, name).lastInsertRowid
  const m1 = milestone('M1')
  const m2 = milestone('M2-control')

  let num = 0
  const sprint = (mid) => {
    num++
    return db.prepare("INSERT INTO sprints (project_id, project_number, name, status, milestone_id, position) VALUES (?, ?, ?, 'planning', ?, 1)")
      .run(pid, num, 'S' + num, mid).lastInsertRowid
  }
  const s1 = sprint(m1)
  const s2 = sprint(m1)
  const sControl = sprint(m2)

  let inum = 0
  const issue = (sid) => {
    inum++
    return db.prepare("INSERT INTO backlog (project_id, project_number, title, status, type, priority, assigned_sprint) VALUES (?, ?, ?, 'planned', 'feature', 3, ?)")
      .run(pid, inum, 'I' + inum, sid).lastInsertRowid
  }
  const a = issue(s1), b = issue(s1), c = issue(s1) // 3 in s1
  const d = issue(s2), e = issue(s2)                // 2 in s2
  const ctrlIssue = issue(sControl)                 // unter m2 → muss überleben
  inum++
  const orphan = db.prepare("INSERT INTO backlog (project_id, project_number, title, status, type, priority, assigned_sprint) VALUES (?, ?, 'orphan', 'new', 'feature', 3, NULL)")
    .run(pid, inum).lastInsertRowid

  // Kinder an Issues von m1
  db.prepare('INSERT INTO review_feedback (backlog_id) VALUES (?)').run(a)
  db.prepare('INSERT INTO review_feedback (backlog_id) VALUES (?)').run(b)
  db.prepare('INSERT INTO issue_dependencies (issue_id, depends_on_id) VALUES (?, ?)').run(a, b)

  return { pid, m1, m2, s1, s2, sControl, ctrlIssue, orphan, a, b, c, d, e }
}

describe('DD2 T02a — Cascade-Delete', () => {
  let db, ids
  beforeEach(() => {
    db = createTestDb()
    ids = seed(db)
  })

  test('Preview zählt Sprints + Issues des Meilensteins', () => {
    const p = milestoneDeletePreview(db, ids.m1)
    expect(p.sprints).toBe(2)
    expect(p.issues).toBe(5)
    expect(p.documents).toBe(0)
    expect(p.sprintIds.sort()).toEqual([ids.s1, ids.s2].sort())
  })

  test('cascadeDeleteSprints + Meilenstein-Delete räumt die ganze Kette', () => {
    const p = milestoneDeletePreview(db, ids.m1)
    db.transaction(() => {
      cascadeDeleteSprints(db, p.sprintIds)
      db.prepare('DELETE FROM milestones WHERE id = ?').run(ids.m1)
    })()

    const count = (sql, ...args) => db.prepare(sql).get(...args).c

    // Sprints des m1 weg, Control-Sprint bleibt
    expect(count('SELECT COUNT(*) c FROM sprints WHERE id IN (?,?)', ids.s1, ids.s2)).toBe(0)
    expect(count('SELECT COUNT(*) c FROM sprints WHERE id = ?', ids.sControl)).toBe(1)

    // Issues des m1 weg, Control + Orphan bleiben
    expect(count('SELECT COUNT(*) c FROM backlog WHERE assigned_sprint IN (?,?)', ids.s1, ids.s2)).toBe(0)
    expect(count('SELECT COUNT(*) c FROM backlog WHERE id IN (?,?)', ids.ctrlIssue, ids.orphan)).toBe(2)

    // Nicht-kaskadierende Kinder explizit weg
    expect(count('SELECT COUNT(*) c FROM review_feedback')).toBe(0)
    expect(count('SELECT COUNT(*) c FROM issue_dependencies')).toBe(0)

    // Meilenstein selbst weg, Control-Meilenstein bleibt
    expect(count('SELECT COUNT(*) c FROM milestones WHERE id = ?', ids.m1)).toBe(0)
    expect(count('SELECT COUNT(*) c FROM milestones WHERE id = ?', ids.m2)).toBe(1)
  })

  test('Sprint-Cascade einzeln räumt nur dessen Issues', () => {
    cascadeDeleteSprints(db, [ids.s1])
    const count = (sql, ...args) => db.prepare(sql).get(...args).c
    expect(count('SELECT COUNT(*) c FROM sprints WHERE id = ?', ids.s1)).toBe(0)
    expect(count('SELECT COUNT(*) c FROM backlog WHERE assigned_sprint = ?', ids.s1)).toBe(0)
    // s2 unberührt
    expect(count('SELECT COUNT(*) c FROM backlog WHERE assigned_sprint = ?', ids.s2)).toBe(2)
    expect(count('SELECT COUNT(*) c FROM sprints WHERE id = ?', ids.s2)).toBe(1)
  })
})
