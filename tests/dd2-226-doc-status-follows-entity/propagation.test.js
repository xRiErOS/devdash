// DD2-226 (DD2#41): Doc-Status folgt automatisch dem Entity-Status; Entity-Delete
// kaskadiert auf die Docs. Migration 071 (Trigger + Backfill) + FK ON DELETE CASCADE (067).
//
// PO-Mapping: completed|cancelled -> archived; new -> draft; planned|in_progress|to_review -> active.

import { describe, test, expect, beforeEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { createDocument } from '../../apps/backend/src/lib/documents.js'

const UP_TO = '071_v3_dd2_226_doc_status_follows_entity.sql'

function docStatus(db, id) {
  return db.prepare('SELECT status FROM documents WHERE id = ?').get(id)?.status ?? null
}
function setSprintStatus(db, id, status) {
  db.prepare('UPDATE sprints SET status = ? WHERE id = ?').run(status, id)
}
function setMilestoneStatus(db, id, status) {
  db.prepare('UPDATE milestones SET status = ? WHERE id = ?').run(status, id)
}

function setupDb() {
  const db = createTestDb({ upToVersion: UP_TO })
  const project = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('dd2226', 'DD2-226', 'DD2')").run()
  const projectId = Number(project.lastInsertRowid)
  const ms = db.prepare("INSERT INTO milestones (project_id, name, status, target_date) VALUES (?, 'M', 'in_progress', '2026-12-31')").run(projectId)
  const milestoneId = Number(ms.lastInsertRowid)
  const sp = db.prepare(
    "INSERT INTO sprints (name, status, position, project_id, milestone_id, project_number) VALUES ('S', 'in_progress', 1, ?, ?, 1)",
  ).run(projectId, milestoneId)
  const sprintId = Number(sp.lastInsertRowid)
  return { db, projectId, milestoneId, sprintId }
}

describe('DD2-226 — Doc-Status folgt Entity-Status', () => {
  let db, milestoneId, sprintId

  beforeEach(() => {
    ;({ db, milestoneId, sprintId } = setupDb())
  })

  test('Sprint completed -> Sprint-Docs archived', () => {
    const doc = createDocument(db, { type: 'sprint', id: sprintId }, { title: 'Sprint-Doc' })
    expect(doc.status).toBe('active') // Create-Default unter in_progress
    setSprintStatus(db, sprintId, 'completed')
    expect(docStatus(db, doc.id)).toBe('archived')
  })

  test('Sprint cancelled -> Sprint-Docs archived', () => {
    const doc = createDocument(db, { type: 'sprint', id: sprintId }, { title: 'Sprint-Doc' })
    setSprintStatus(db, sprintId, 'cancelled')
    expect(docStatus(db, doc.id)).toBe('archived')
  })

  test('Reopen completed -> in_progress bringt Doc von archived auf active zurueck', () => {
    const doc = createDocument(db, { type: 'sprint', id: sprintId }, { title: 'Sprint-Doc' })
    setSprintStatus(db, sprintId, 'completed')
    expect(docStatus(db, doc.id)).toBe('archived')
    setSprintStatus(db, sprintId, 'in_progress')
    expect(docStatus(db, doc.id)).toBe('active')
  })

  test('Sprint new -> Doc draft', () => {
    const doc = createDocument(db, { type: 'sprint', id: sprintId }, { title: 'Sprint-Doc' })
    setSprintStatus(db, sprintId, 'new')
    expect(docStatus(db, doc.id)).toBe('draft')
  })

  test('Milestone completed -> Milestone-Docs archived', () => {
    const doc = createDocument(db, { type: 'milestone', id: milestoneId }, { title: 'MS-Doc' })
    setMilestoneStatus(db, milestoneId, 'completed')
    expect(docStatus(db, doc.id)).toBe('archived')
  })

  test('Status unveraendert -> kein Trigger-Effekt (WHEN-Guard)', () => {
    const doc = createDocument(db, { type: 'sprint', id: sprintId }, { title: 'Sprint-Doc' })
    // manueller Override, dann gleiche Status-Schreibung (kein Wechsel)
    db.prepare("UPDATE documents SET status = 'draft' WHERE id = ?").run(doc.id)
    setSprintStatus(db, sprintId, 'in_progress') // OLD == NEW
    expect(docStatus(db, doc.id)).toBe('draft') // unberührt
  })

  test('Sprint-Delete kaskadiert auf seine Docs (FK ON DELETE CASCADE)', () => {
    const doc = createDocument(db, { type: 'sprint', id: sprintId }, { title: 'Sprint-Doc' })
    db.prepare('DELETE FROM sprints WHERE id = ?').run(sprintId)
    expect(docStatus(db, doc.id)).toBeNull()
  })

  test('Milestone-Delete kaskadiert auf seine Docs (FK ON DELETE CASCADE)', () => {
    const doc = createDocument(db, { type: 'milestone', id: milestoneId }, { title: 'MS-Doc' })
    db.prepare('DELETE FROM milestones WHERE id = ?').run(milestoneId)
    expect(docStatus(db, doc.id)).toBeNull()
  })

  test('Backfill richtet bestehende Docs am Owner-Status aus (Migration-Re-Apply-Probe)', () => {
    // Doc unter completed Sprint anlegen, Status künstlich auf active zwingen,
    // dann Trigger via Status-Roundtrip prüfen (Backfill selbst lief beim Migrate).
    const doc = createDocument(db, { type: 'sprint', id: sprintId }, { title: 'Sprint-Doc' })
    setSprintStatus(db, sprintId, 'completed')
    db.prepare("UPDATE documents SET status = 'active' WHERE id = ?").run(doc.id)
    // erneuter Wechsel completed->cancelled triggert Re-Sync auf archived
    setSprintStatus(db, sprintId, 'cancelled')
    expect(docStatus(db, doc.id)).toBe('archived')
  })
})
