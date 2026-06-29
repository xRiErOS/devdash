// DD2-155 (US-142) — DB-Integrität: nach Migration 065 lehnt die DB ungültige
// (alt-vokabulare) Status-Werte hart ab. Milestone via CHECK-Constraint,
// Sprint + Backlog via BEFORE INSERT/UPDATE-Trigger (RAISE ABORT).
// Stellt sicher, dass genau die Drift-Ursache geschlossen ist, die diesen
// Sprint ausgelöst hat (z.B. totes 'closed', 'active' vs 'in_progress').

import { describe, test, expect, beforeEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { MILESTONE_STATUSES, SPRINT_STATUSES } from '../../packages/api-types/milestone-sprint.contracts.js'
import { ISSUE_STATUSES as BACKLOG_ISSUE_STATUSES } from '../../packages/api-types/backlog.contracts.js'

const AT_069 = '069_v3_dd2_155_status_unify.sql'

describe('DD2-155 — Status-Integrität (Migration 069)', () => {
  let db, pid
  beforeEach(() => {
    db = createTestDb({ upToVersion: AT_069 })
    pid = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('c155','C','C')").run().lastInsertRowid
  })

  const insMilestone = (status) =>
    db.prepare("INSERT INTO milestones (project_id, name, target_date, status, position) VALUES (?, 'M', '2026-12-31', ?, 1)").run(pid, status)
  const insSprint = (status) =>
    db.prepare("INSERT INTO sprints (project_id, project_number, name, status, position) VALUES (?, 1, 'S', ?, 1)").run(pid, status)
  const insIssue = (status) =>
    db.prepare("INSERT INTO backlog (project_id, project_number, title, status, type, priority) VALUES (?, 1, 'I', ?, 'feature', 3)").run(pid, status)

  test('Milestone: neue Werte ok, alte Werte (CHECK) abgelehnt', () => {
    for (const s of ['new', 'planned', 'in_progress', 'completed', 'cancelled']) {
      expect(() => insMilestone(s)).not.toThrow()
      db.prepare("DELETE FROM milestones").run()
    }
    for (const bad of ['planning', 'active', 'review', 'closed', 'done']) {
      expect(() => insMilestone(bad), `milestone '${bad}' muss abgelehnt werden`).toThrow()
    }
  })

  test('Sprint: neue Werte ok, alte Werte (Trigger) bei INSERT abgelehnt', () => {
    for (const s of ['new', 'planned', 'in_progress', 'to_review', 'completed', 'cancelled']) {
      expect(() => insSprint(s)).not.toThrow()
      db.prepare("DELETE FROM sprints").run()
    }
    for (const bad of ['planning', 'active', 'review', 'closed']) {
      expect(() => insSprint(bad), `sprint '${bad}' muss abgelehnt werden`).toThrow()
    }
  })

  test('Sprint: UPDATE auf alten Wert (Trigger) abgelehnt', () => {
    insSprint('new')
    expect(() => db.prepare("UPDATE sprints SET status = 'active' WHERE project_id = ?").run(pid)).toThrow()
    expect(() => db.prepare("UPDATE sprints SET status = 'in_progress' WHERE project_id = ?").run(pid)).not.toThrow()
  })

  test('Issue: neue Werte ok, alte Werte (Trigger) bei INSERT/UPDATE abgelehnt', () => {
    for (const s of ['new', 'refined', 'planned', 'in_progress', 'to_review', 'passed', 'rejected', 'completed', 'cancelled']) {
      expect(() => insIssue(s)).not.toThrow()
      db.prepare("DELETE FROM backlog").run()
    }
    expect(() => insIssue('done'), "issue 'done' muss abgelehnt werden").toThrow()
    insIssue('in_progress')
    expect(() => db.prepare("UPDATE backlog SET status = 'done' WHERE project_id = ?").run(pid)).toThrow()
  })

  test('Contract-Enums spiegeln das vereinheitlichte Vokabular', () => {
    expect([...MILESTONE_STATUSES].sort()).toEqual(['cancelled', 'completed', 'in_progress', 'new', 'planned'])
    expect([...SPRINT_STATUSES].sort()).toEqual(['cancelled', 'completed', 'in_progress', 'new', 'planned', 'to_review'])
    expect([...BACKLOG_ISSUE_STATUSES].sort()).toEqual(
      ['cancelled', 'completed', 'in_progress', 'new', 'passed', 'planned', 'refined', 'rejected', 'to_review']
    )
  })
})
