// DD2-28 — PO-getriggerte Cascade-Complete: Meilenstein schließen setzt offene
// Sprints → completed und ihre offenen Issues → completed. Gegen echte In-Memory-DB.

import { describe, test, expect, beforeEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { cascadeCompleteMilestone, milestoneCompletePreview } from '../../apps/backend/src/lib/milestoneLifecycle.js'

function seed(db) {
  const pid = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('cc-test','CC','CC')").run().lastInsertRowid
  const ms = (name, status) =>
    db.prepare("INSERT INTO milestones (project_id, name, status, position) VALUES (?, ?, ?, 1)").run(pid, name, status).lastInsertRowid
  const m1 = ms('M1', 'in_progress')
  const m2 = ms('M2-control', 'in_progress')

  let num = 0
  const sprint = (mid, status) => {
    num++
    return db.prepare("INSERT INTO sprints (project_id, project_number, name, status, milestone_id, position) VALUES (?, ?, ?, ?, ?, 1)")
      .run(pid, num, 'S' + num, status, mid).lastInsertRowid
  }
  const s1 = sprint(m1, 'in_progress')
  const s2 = sprint(m1, 'to_review')
  const sDone = sprint(m1, 'completed') // bereits terminal → unberührt
  const sCtrl = sprint(m2, 'in_progress')

  let inum = 0
  const issue = (sid, status) => {
    inum++
    return db.prepare("INSERT INTO backlog (project_id, project_number, title, status, type, priority, assigned_sprint) VALUES (?, ?, ?, ?, 'feature', 3, ?)")
      .run(pid, inum, 'I' + inum, status, sid).lastInsertRowid
  }
  const a = issue(s1, 'in_progress')
  const b = issue(s1, 'to_review')
  const cDone = issue(s1, 'completed')      // schon completed → bleibt
  const d = issue(s2, 'planned')
  const ctrl = issue(sCtrl, 'in_progress')

  return { pid, m1, m2, s1, s2, sDone, sCtrl, a, b, cDone, d, ctrl }
}

describe('DD2-28 — Cascade-Complete Milestone', () => {
  let db, ids
  beforeEach(() => { db = createTestDb(); ids = seed(db) })

  const get = (sql, ...a) => db.prepare(sql).get(...a)

  test('Preview zählt offene Sprints + offene Issues', () => {
    const p = milestoneCompletePreview(db, ids.m1)
    expect(p.openSprints).toBe(2) // s1, s2 (sDone terminal)
    expect(p.issues).toBe(3)      // a, b (s1 ohne cDone) + d (s2)
  })

  test('Cascade setzt offene Sprints completed + offene Issues completed', () => {
    cascadeCompleteMilestone(db, ids.m1)
    expect(get('SELECT status FROM milestones WHERE id=?', ids.m1).status).toBe('completed')
    expect(get('SELECT status FROM sprints WHERE id=?', ids.s1).status).toBe('completed')
    expect(get('SELECT status FROM sprints WHERE id=?', ids.s2).status).toBe('completed')
    expect(get('SELECT status FROM backlog WHERE id=?', ids.a).status).toBe('completed')
    expect(get('SELECT status FROM backlog WHERE id=?', ids.b).status).toBe('completed')
    expect(get('SELECT completed_at FROM backlog WHERE id=?', ids.a).completed_at).not.toBeNull()
    expect(get('SELECT status FROM backlog WHERE id=?', ids.cDone).status).toBe('completed')
  })

  test('Control-Meilenstein bleibt unberührt', () => {
    cascadeCompleteMilestone(db, ids.m1)
    expect(get('SELECT status FROM milestones WHERE id=?', ids.m2).status).toBe('in_progress')
    expect(get('SELECT status FROM sprints WHERE id=?', ids.sCtrl).status).toBe('in_progress')
    expect(get('SELECT status FROM backlog WHERE id=?', ids.ctrl).status).toBe('in_progress')
  })

  test('Cascade nur aus in_progress', () => {
    db.prepare("UPDATE milestones SET status='new' WHERE id=?").run(ids.m1)
    expect(() => cascadeCompleteMilestone(db, ids.m1)).toThrow()
  })
})
