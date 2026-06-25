// DD-287 R2 (2026-05-23): Active-Sprint ist NICHT mehr position-fix.
// PO-Feedback: "Auch den aktiven Sprint verschieben können."
//
// Dieser Test repliziert die Reorder-Logic aus
// PATCH /api/sprints/reorder (server/api.js) gegen eine in-memory DB
// und verifiziert:
//   1) Ein `active` Sprint kann seine Position aendern (kein 409 mehr).
//   2) Reorder-UPDATE wird tatsaechlich ausgefuehrt, auch fuer active.
//   3) Project-Scope-Check bleibt intakt.

import { describe, test, expect, beforeEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'

// Replikat: pure Reorder-Logic nach DD-287 R2.
// Spiegelt server/api.js PATCH /api/sprints/reorder ohne Express-Boot.
function reorderSprints(db, projectId, body) {
  const { ordered_ids, items } = body
  let pairs = null
  if (Array.isArray(items) && items.length > 0) {
    pairs = items.map(it => ({ id: Number(it.id), position: Number(it.position) }))
    if (pairs.some(p => !Number.isFinite(p.id) || !Number.isFinite(p.position))) {
      return { status: 400, body: { error: 'items[].id und items[].position muessen Zahlen sein' } }
    }
  } else if (Array.isArray(ordered_ids)) {
    pairs = ordered_ids.map((id, idx) => ({ id: Number(id), position: idx }))
    if (pairs.some(p => !Number.isFinite(p.id))) {
      return { status: 400, body: { error: 'ordered_ids muessen Zahlen sein' } }
    }
  } else {
    return { status: 400, body: { error: 'Body muss items[] oder ordered_ids[] enthalten' } }
  }

  if (pairs.length === 0) return { status: 200, body: { success: true, sprints: [] } }

  const ids = pairs.map(p => p.id)
  const placeholders = ids.map(() => '?').join(',')
  const existing = db.prepare(
    `SELECT id, project_id, status, position FROM sprints WHERE id IN (${placeholders})`
  ).all(...ids)

  if (existing.length !== ids.length) {
    return { status: 404, body: { error: 'Mindestens eine Sprint-ID existiert nicht' } }
  }
  const wrongProject = existing.find(s => s.project_id !== projectId)
  if (wrongProject) {
    return { status: 403, body: { error: 'Sprint gehoert nicht zum aktuellen Projekt', sprint_id: wrongProject.id } }
  }

  // DD-287 R2: KEIN active-Sprint-Position-Fix mehr. Alle Sprints duerfen
  // umsortiert werden.

  const reorderTx = db.transaction(() => {
    const upd = db.prepare('UPDATE sprints SET position = ? WHERE id = ? AND project_id = ?')
    for (const p of pairs) {
      const before = existing.find(e => e.id === p.id)
      if (!before) continue
      if (before.position === p.position) continue
      upd.run(p.position, p.id, projectId)
    }
  })
  reorderTx()

  const sprints = db.prepare(
    'SELECT id, name, status, position FROM sprints WHERE project_id = ? ORDER BY position, id'
  ).all(projectId)
  return { status: 200, body: { success: true, sprints } }
}

describe('DD-287 R2 — Active-Sprint Reorder', () => {
  let db
  let projectId
  let sprintA, sprintB, sprintC

  beforeEach(() => {
    db = createTestDb()
    const proj = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('dd-r2', 'DD-R2-Test', 'DD')").run()
    projectId = proj.lastInsertRowid
    // 3 Sprints: A=planning(pos 1), B=active(pos 2), C=planning(pos 3)
    sprintA = db.prepare(
      "INSERT INTO sprints (project_id, name, status, position) VALUES (?, 'DD#A', 'planning', 1)"
    ).run(projectId).lastInsertRowid
    sprintB = db.prepare(
      "INSERT INTO sprints (project_id, name, status, position) VALUES (?, 'DD#B', 'active', 2)"
    ).run(projectId).lastInsertRowid
    sprintC = db.prepare(
      "INSERT INTO sprints (project_id, name, status, position) VALUES (?, 'DD#C', 'planning', 3)"
    ).run(projectId).lastInsertRowid
  })

  test('active Sprint darf Position aendern (kein 409 mehr)', () => {
    // Verschiebe active-Sprint B von pos 2 nach pos 3 (tausche mit C)
    const result = reorderSprints(db, projectId, {
      items: [
        { id: sprintA, position: 1 },
        { id: sprintC, position: 2 },
        { id: sprintB, position: 3 },
      ],
    })
    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
    // Verifiziere persistierte Reihenfolge: A, C, B (active jetzt am Ende)
    const order = result.body.sprints.map(s => s.name)
    expect(order).toEqual(['DD#A', 'DD#C', 'DD#B'])
    // Active-Sprint hat tatsaechlich position=3
    const b = result.body.sprints.find(s => s.id === sprintB)
    expect(b.status).toBe('active')
    expect(b.position).toBe(3)
  })

  test('active Sprint kann nach vorn verschoben werden', () => {
    // Verschiebe active-Sprint B von pos 2 nach pos 1 (vor A)
    const result = reorderSprints(db, projectId, {
      ordered_ids: [sprintB, sprintA, sprintC],
    })
    expect(result.status).toBe(200)
    const order = result.body.sprints.map(s => s.name)
    expect(order).toEqual(['DD#B', 'DD#A', 'DD#C'])
  })

  test('Reorder mehrerer Sprints inkl. active in einer Transaktion', () => {
    const result = reorderSprints(db, projectId, {
      ordered_ids: [sprintC, sprintB, sprintA],
    })
    expect(result.status).toBe(200)
    const order = result.body.sprints.map(s => s.name)
    expect(order).toEqual(['DD#C', 'DD#B', 'DD#A'])
  })

  test('Project-Scope-Check bleibt intakt (fremder Sprint -> 403)', () => {
    // Lege zweites Projekt + Sprint an
    const otherProj = db.prepare(
      "INSERT INTO projects (slug, name, prefix) VALUES ('other', 'Other', 'OT')"
    ).run().lastInsertRowid
    const otherSprint = db.prepare(
      "INSERT INTO sprints (project_id, name, status, position) VALUES (?, 'OT#1', 'planning', 1)"
    ).run(otherProj).lastInsertRowid

    const result = reorderSprints(db, projectId, {
      items: [{ id: otherSprint, position: 1 }],
    })
    expect(result.status).toBe(403)
    expect(result.body.sprint_id).toBe(otherSprint)
  })
})
