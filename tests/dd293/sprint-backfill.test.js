// DD-293 — Sprint-Backfill: nachträgliche Milestone-Zuordnung für Sprints.
//
// Acceptance:
//  1. PUT /api/sprints/:id akzeptiert milestone_id im Body (existiert
//     bereits seit DD-67, hier nochmals abgesichert).
//  2. PUT /api/sprints/:id mit milestone_id=null setzt die Zuordnung zurück.
//  3. Bei Änderung wird ein audit_log-Eintrag mit
//     action='sprint_milestone_assign' geschrieben (old_value/new_value als
//     JSON-Diff `{milestone_id: ...}`).
//  4. Wenn milestone_id unverändert bleibt, entsteht KEIN
//     sprint_milestone_assign-Audit-Eintrag (Spam-Schutz).
//  5. backlog.milestone (denormalisierter Cache) wird nach
//     Sprint-Milestone-Assign nachgezogen (Konsistenz mit DD-67-Logik).
//
// Pattern wie dd290/dd291/dd292: Endpoint-Logik direkt gegen In-Memory-DB
// nachgebildet — kein Express-Boot. Spiegelung MUSS bei Änderungen in
// server/api.js (PUT /api/sprints/:id) hier nachgezogen werden.

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject, seedMilestones } from '../_fixtures/seed.js'

// ---------- Handler-Spiegel ----------
// Repliziert PUT /api/sprints/:id incl. DD-293-Audit-Log. 1:1 mit
// server/api.js (Stand DD-293).

function auditLog(db, tableNameVal, recordId, action, oldValue, newValue, changedBy) {
  try {
    db.prepare(
      `INSERT INTO audit_log (table_name, record_id, action, old_value, new_value, agent_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      tableNameVal,
      recordId,
      action,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      changedBy,
    )
  } catch (_) {
    // tolerant
  }
}

function syncBacklogMilestoneForSprint(db, sprintId) {
  if (!sprintId) return
  const milestone = db.prepare(`
    SELECT m.name FROM sprints s
    LEFT JOIN milestones m ON m.id = s.milestone_id
    WHERE s.id = ?
  `).get(sprintId)
  const name = milestone?.name || null
  db.prepare('UPDATE backlog SET milestone = ? WHERE assigned_sprint = ?').run(name, sprintId)
}

function putSprint(db, sprintId, body) {
  const sprint = db.prepare('SELECT * FROM sprints WHERE id = ?').get(sprintId)
  if (!sprint) return { status: 404, body: { error: 'Sprint not found' } }

  const writable = ['name', 'start_date', 'end_date', 'capacity', 'notes', 'goal', 'status', 'milestone_id', 'wip_limit']
  const sets = []
  const vals = []
  let milestoneChanged = false
  for (const key of writable) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue
    const value = body[key]
    if (key === 'name' && (value == null || String(value).trim() === '')) {
      return { status: 400, body: { error: 'name darf nicht leer sein' } }
    }
    if (key === 'milestone_id' && value != null && value !== '') {
      const ms = db.prepare('SELECT project_id, status FROM milestones WHERE id = ?').get(value)
      if (!ms || ms.project_id !== sprint.project_id) {
        return { status: 400, body: { error: 'milestone_id gehört nicht zum gleichen Projekt wie der Sprint' } }
      }
      if (ms.status === 'reached') {
        return { status: 422, body: { error: 'Milestone abgeschlossen' } }
      }
    }
    if (key === 'milestone_id') milestoneChanged = true
    sets.push(`${key} = ?`)
    vals.push(value === '' ? null : value)
  }
  if (sets.length === 0) return { status: 200, body: sprint }

  vals.push(sprintId)
  db.prepare(`UPDATE sprints SET ${sets.join(', ')} WHERE id = ?`).run(...vals)

  if (milestoneChanged) {
    syncBacklogMilestoneForSprint(db, sprintId)
    // DD-293: Audit-Log-Diff
    const oldMid = sprint.milestone_id ?? null
    const newMidRaw = body.milestone_id
    const newMid = newMidRaw === '' || newMidRaw == null ? null : Number(newMidRaw)
    if (oldMid !== newMid) {
      auditLog(db, 'sprints', Number(sprintId), 'sprint_milestone_assign',
        { milestone_id: oldMid }, { milestone_id: newMid }, 'devd-ui')
    }
  }

  const updated = db.prepare('SELECT * FROM sprints WHERE id = ?').get(sprintId)
  return { status: 200, body: updated }
}

// ---------- Tests ----------

describe('DD-293 — Sprint-Backfill via PUT /api/sprints/:id', () => {
  let db
  let projectId
  let m1
  let m2
  let sprintId

  beforeEach(() => {
    db = createTestDb()
    projectId = seedProject(db)
    const ids = seedMilestones(db, [
      { name: 'M-1', target_date: '2026-06-01', position: 1 },
      { name: 'M-2', target_date: '2026-07-01', position: 2 },
    ])
    m1 = ids[0]
    m2 = ids[1]
    // Sprint ohne milestone_id, Status 'completed' (klassischer Backfill-Kandidat).
    const sp = db.prepare(`
      INSERT INTO sprints (project_id, name, status, position, milestone_id, project_number)
      VALUES (?, 'Sprint A', 'completed', 1, NULL, 1)
    `).run(projectId)
    sprintId = Number(sp.lastInsertRowid)
  })

  afterEach(() => {
    db.close()
  })

  test('AC1 — PUT akzeptiert milestone_id und schreibt in DB', () => {
    const res = putSprint(db, sprintId, { milestone_id: m1 })
    expect(res.status).toBe(200)
    const row = db.prepare('SELECT milestone_id FROM sprints WHERE id = ?').get(sprintId)
    expect(row.milestone_id).toBe(m1)
  })

  test('AC2 — PUT mit milestone_id=null setzt Zuordnung zurück (Unset)', () => {
    // Schritt 1: zuweisen
    putSprint(db, sprintId, { milestone_id: m1 })
    expect(db.prepare('SELECT milestone_id FROM sprints WHERE id = ?').get(sprintId).milestone_id).toBe(m1)

    // Schritt 2: zurücksetzen
    const res = putSprint(db, sprintId, { milestone_id: null })
    expect(res.status).toBe(200)
    expect(db.prepare('SELECT milestone_id FROM sprints WHERE id = ?').get(sprintId).milestone_id).toBeNull()
  })

  test('AC3 — Audit-Log: sprint_milestone_assign mit korrekten Diff-Daten', () => {
    putSprint(db, sprintId, { milestone_id: m1 })

    const entries = db.prepare(`
      SELECT action, table_name, record_id, old_value, new_value, agent_id
      FROM audit_log
      WHERE action = 'sprint_milestone_assign' AND record_id = ?
      ORDER BY id ASC
    `).all(sprintId)

    expect(entries).toHaveLength(1)
    const e = entries[0]
    expect(e.table_name).toBe('sprints')
    expect(e.agent_id).toBe('devd-ui')
    expect(JSON.parse(e.old_value)).toEqual({ milestone_id: null })
    expect(JSON.parse(e.new_value)).toEqual({ milestone_id: m1 })
  })

  test('AC3b — Audit-Log: Re-Assign m1 → m2 erzeugt zweiten Eintrag mit korrektem Diff', () => {
    putSprint(db, sprintId, { milestone_id: m1 })
    putSprint(db, sprintId, { milestone_id: m2 })

    const entries = db.prepare(`
      SELECT old_value, new_value FROM audit_log
      WHERE action = 'sprint_milestone_assign' AND record_id = ?
      ORDER BY id ASC
    `).all(sprintId)

    expect(entries).toHaveLength(2)
    expect(JSON.parse(entries[0].new_value)).toEqual({ milestone_id: m1 })
    expect(JSON.parse(entries[1].old_value)).toEqual({ milestone_id: m1 })
    expect(JSON.parse(entries[1].new_value)).toEqual({ milestone_id: m2 })
  })

  test('AC3c — Audit-Log: Unset m1 → null wird mit new_value={milestone_id:null} erfasst', () => {
    // Hinweis: auditLog() schreibt new_value=null wenn das Argument falsy ist —
    // bei {milestone_id: null} ist das Objekt selbst truthy, also wird JSON.stringify
    // ausgeführt und das Feld bleibt vorhanden.
    putSprint(db, sprintId, { milestone_id: m1 })
    putSprint(db, sprintId, { milestone_id: null })

    const entries = db.prepare(`
      SELECT old_value, new_value FROM audit_log
      WHERE action = 'sprint_milestone_assign' AND record_id = ?
      ORDER BY id ASC
    `).all(sprintId)

    expect(entries).toHaveLength(2)
    expect(JSON.parse(entries[1].old_value)).toEqual({ milestone_id: m1 })
    expect(JSON.parse(entries[1].new_value)).toEqual({ milestone_id: null })
  })

  test('AC4 — kein Audit-Eintrag wenn milestone_id unverändert bleibt', () => {
    // Erstaufruf setzt m1 — erzeugt einen Eintrag.
    putSprint(db, sprintId, { milestone_id: m1 })
    // Re-Aufruf mit identischem Wert — sollte KEINEN neuen Audit-Eintrag erzeugen.
    putSprint(db, sprintId, { milestone_id: m1 })

    const count = db.prepare(`
      SELECT COUNT(*) AS c FROM audit_log
      WHERE action = 'sprint_milestone_assign' AND record_id = ?
    `).get(sprintId).c
    expect(count).toBe(1)
  })

  test('AC5 — Backlog.milestone wird nachgezogen (denormalisierter Cache)', () => {
    // Backlog-Issue dem Sprint zuweisen
    const ins = db.prepare(`
      INSERT INTO backlog (project_id, title, status, type, priority, assigned_sprint, milestone, project_number)
      VALUES (?, 'Issue X', 'done', 'feature', 3, ?, NULL, 1)
    `).run(projectId, sprintId)
    const issueId = Number(ins.lastInsertRowid)

    putSprint(db, sprintId, { milestone_id: m1 })

    const row = db.prepare('SELECT milestone FROM backlog WHERE id = ?').get(issueId)
    expect(row.milestone).toBe('M-1')

    // Unset: backlog.milestone soll auf NULL zurückfallen.
    putSprint(db, sprintId, { milestone_id: null })
    const row2 = db.prepare('SELECT milestone FROM backlog WHERE id = ?').get(issueId)
    expect(row2.milestone).toBeNull()
  })

  test('AC6 — fremder Projekt-Milestone wird abgelehnt (400)', () => {
    // Neues Projekt + Milestone
    const otherProj = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('other', 'Other', 'OT')").run()
    const otherProjectId = Number(otherProj.lastInsertRowid)
    const otherMs = db.prepare(`
      INSERT INTO milestones (project_id, name, target_date, status, position)
      VALUES (?, 'Other-M', '2026-12-31', 'open', 1)
    `).run(otherProjectId)
    const otherMid = Number(otherMs.lastInsertRowid)

    const res = putSprint(db, sprintId, { milestone_id: otherMid })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Projekt/i)

    // Sprint bleibt unverändert
    const row = db.prepare('SELECT milestone_id FROM sprints WHERE id = ?').get(sprintId)
    expect(row.milestone_id).toBeNull()
  })
})
