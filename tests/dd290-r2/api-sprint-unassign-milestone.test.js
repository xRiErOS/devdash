// DD-290 R2 — Backend: PUT /api/sprints/:id mit milestone_id=null entzieht
// dem Sprint die Milestone-Zuordnung. Audit-Log-Eintrag
// sprint_milestone_assign mit {milestone_id: <alt>} → {milestone_id: null}.
//
// Der Endpoint existiert seit DD-67 und wurde in DD-293 R1 explizit für
// nachträgliches Zuordnen erweitert. DD-290 R2 nutzt denselben Endpoint
// für das Drop-Auf-Backfill-UX. Hier sichern wir das null-Verhalten.
//
// Pattern wie tests/dd293-r2/api-milestones-backfill.test.js — Spiegel
// der Endpoint-Logik direkt gegen In-Memory-DB.

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
  const logDir = mkdtempSync(join(tmpdir(), 'dd290r2-'))
  applyMigration(db, MIG_029, { logDir })
  applyMigration(db, MIG_030, { logDir })
  applyMigration(db, MIG_031, { logDir })
  applyMigration(db, MIG_032, { logDir })
  applyMigration(db, MIG_033, { logDir })
  return logDir
}

// 1:1-Spiegelung der relevanten Teile aus PUT /api/sprints/:id (server/api.js).
// Fokus: milestone_id-Branch + Validation + Audit-Log.
function putSprintMilestone(db, sprintId, milestoneId) {
  const sprint = db.prepare('SELECT * FROM sprints WHERE id = ?').get(sprintId)
  if (!sprint) return { ok: false, status: 404 }

  // milestone_id-Validation (gleiche Reihenfolge wie im Endpoint).
  if (milestoneId != null && milestoneId !== '') {
    const ms = db.prepare('SELECT project_id, status FROM milestones WHERE id = ?').get(milestoneId)
    if (!ms || ms.project_id !== sprint.project_id) {
      return { ok: false, status: 400, error: 'milestone_id gehört nicht zum gleichen Projekt wie der Sprint' }
    }
    if (ms.status === 'reached') {
      return { ok: false, status: 422, error: 'Milestone ist abgeschlossen — keine weiteren Sprints zuweisbar' }
    }
  }

  const value = milestoneId === '' ? null : milestoneId
  db.prepare('UPDATE sprints SET milestone_id = ? WHERE id = ?').run(value, sprintId)

  const oldMid = sprint.milestone_id ?? null
  const newMid = value == null ? null : Number(value)
  if (oldMid !== newMid) {
    db.prepare(`
      INSERT INTO audit_log (agent_id, action, table_name, record_id, old_value, new_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'devd-ui',
      'sprint_milestone_assign',
      'sprints',
      sprintId,
      JSON.stringify({ milestone_id: oldMid }),
      JSON.stringify({ milestone_id: newMid }),
    )
  }
  const updated = db.prepare('SELECT * FROM sprints WHERE id = ?').get(sprintId)
  return { ok: true, status: 200, sprint: updated }
}

describe('DD-290 R2 — Sprint-Milestone-Unassign via Drop auf Backfill', () => {
  let db, logDir
  let projectId, milestoneAId, milestoneBId, milestoneReachedId, sprintAId

  beforeAll(() => {
    db = createTestDb()
    logDir = applyAllMigrations(db)
    const p = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('dd290r2', 'DD290 R2', 'DDR')").run()
    projectId = p.lastInsertRowid

    const insMs = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, status, position, deferred)
      VALUES (?, ?, ?, ?, ?, 0)
    `)
    milestoneAId = insMs.run(projectId, 'M-A', '2026-12-31', 'open', 1).lastInsertRowid
    milestoneBId = insMs.run(projectId, 'M-B', '2026-12-31', 'open', 2).lastInsertRowid
    milestoneReachedId = insMs.run(projectId, 'M-Reached', '2026-12-31', 'reached', 3).lastInsertRowid

    const insSp = db.prepare(`
      INSERT INTO sprints (project_id, project_number, name, status, position, milestone_id, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, '2026-05-01', '2026-05-14')
    `)
    sprintAId = insSp.run(projectId, 1, 'S-A', 'completed', 1, milestoneAId).lastInsertRowid
  })

  afterAll(() => {
    db.close()
    try { rmSync(logDir, { recursive: true, force: true }) } catch { /* ignore */ }
  })

  test('PUT milestone_id=null entfernt die Zuordnung', () => {
    // Pre-Condition: sprint hat milestoneAId
    const before = db.prepare('SELECT milestone_id FROM sprints WHERE id = ?').get(sprintAId)
    expect(before.milestone_id).toBe(milestoneAId)

    const res = putSprintMilestone(db, sprintAId, null)
    expect(res.ok).toBe(true)
    expect(res.sprint.milestone_id).toBeNull()
  })

  test('Audit-Log-Eintrag sprint_milestone_assign mit {old: A} → {new: null}', () => {
    const row = db.prepare(`
      SELECT old_value, new_value FROM audit_log
      WHERE table_name = 'sprints' AND record_id = ? AND action = 'sprint_milestone_assign'
      ORDER BY id DESC LIMIT 1
    `).get(sprintAId)
    expect(row).toBeTruthy()
    expect(JSON.parse(row.old_value)).toEqual({ milestone_id: milestoneAId })
    expect(JSON.parse(row.new_value)).toEqual({ milestone_id: null })
  })

  test('PUT milestone_id=B verschiebt den Sprint zwischen Milestones', () => {
    // Setup: erstmal wieder zurück auf A.
    db.prepare('UPDATE sprints SET milestone_id = ? WHERE id = ?').run(milestoneAId, sprintAId)
    const res = putSprintMilestone(db, sprintAId, milestoneBId)
    expect(res.ok).toBe(true)
    expect(res.sprint.milestone_id).toBe(milestoneBId)
  })

  test('PUT milestone_id auf reached Milestone wird mit 422 abgelehnt', () => {
    db.prepare('UPDATE sprints SET milestone_id = NULL WHERE id = ?').run(sprintAId)
    const res = putSprintMilestone(db, sprintAId, milestoneReachedId)
    expect(res.ok).toBe(false)
    expect(res.status).toBe(422)
    // Sprint-Stand unverändert (milestone_id bleibt null).
    const after = db.prepare('SELECT milestone_id FROM sprints WHERE id = ?').get(sprintAId)
    expect(after.milestone_id).toBeNull()
  })

  test('Idempotenz: doppelter unset-Call erzeugt keinen zusätzlichen Audit-Eintrag', () => {
    db.prepare('UPDATE sprints SET milestone_id = NULL WHERE id = ?').run(sprintAId)
    // Pre-Count
    const before = db.prepare(`
      SELECT COUNT(*) AS c FROM audit_log
      WHERE table_name = 'sprints' AND record_id = ? AND action = 'sprint_milestone_assign'
    `).get(sprintAId).c
    putSprintMilestone(db, sprintAId, null)
    const after = db.prepare(`
      SELECT COUNT(*) AS c FROM audit_log
      WHERE table_name = 'sprints' AND record_id = ? AND action = 'sprint_milestone_assign'
    `).get(sprintAId).c
    expect(after).toBe(before)
  })
})
