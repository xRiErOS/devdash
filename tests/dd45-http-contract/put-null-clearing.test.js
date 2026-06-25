// DD-45 R03 + R11 — beweist, dass PUT /api/backlog/:id mit { field: null }
// das Feld wirklich leert (vorher COALESCE-Fallback, dadurch unmoeglich).

import { describe, test, expect, beforeEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { applyBacklogUpdate, BacklogUpdateError } from '../../server/lib/backlogUpdate.js'

// E01.2/D09: acceptance_criteria + test_instruction sind gedroppt (mig 059) — der Test
// laeuft gegen das reale post-drop-Schema (upToVersion auf den Drop). Die frueheren
// AC-Clearing-Faelle entfallen (Feld existiert nicht mehr).
function setupDb() {
  const db = createTestDb({ upToVersion: '059_v3_drop_acceptance_test_instruction.sql' })
  const project = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('dd45', 'DD-45', 'DD')").run()
  const backlog = db.prepare(`
    INSERT INTO backlog (project_id, project_number, title, type, status,
                         goal, background, context_notes,
                         relevant_files, po_notes, result, description)
    VALUES (?, 1, 'Issue', 'feature', 'planned',
            'g', 'bg', 'ctx', 'rf', 'po', 'res', 'desc')
  `).run(project.lastInsertRowid)
  return { db, id: Number(backlog.lastInsertRowid) }
}

describe('DD-45 R03 — PUT /api/backlog/:id null-clearing semantics', () => {
  let db, id
  beforeEach(() => { ({ db, id } = setupDb()) })

  test('PUT body { goal: null, background: null } leert beide Felder', () => {
    const updated = applyBacklogUpdate(db, id, { goal: null, background: null })
    expect(updated.goal).toBeNull()
    expect(updated.background).toBeNull()
  })

  test('PUT ohne Feld laesst Feld unveraendert', () => {
    const updated = applyBacklogUpdate(db, id, { goal: 'neu' })
    expect(updated.goal).toBe('neu')
    expect(updated.context_notes).toBe('ctx')
    expect(updated.result).toBe('res')
  })

  test('empty string == null (UI sendet "" beim Leeren)', () => {
    const updated = applyBacklogUpdate(db, id, { po_notes: '' })
    expect(updated.po_notes).toBeNull()
  })

  test('description (soft-deprecated) bleibt leerbar und befuellbar (D30)', () => {
    expect(applyBacklogUpdate(db, id, { description: null }).description).toBeNull()
    expect(applyBacklogUpdate(db, id, { description: 'wieder befuellt' }).description).toBe('wieder befuellt')
  })

  test('type-Validation lehnt ungueltige Werte ab', () => {
    expect(() => applyBacklogUpdate(db, id, { type: 'unicorn' })).toThrow(BacklogUpdateError)
    try { applyBacklogUpdate(db, id, { type: 'unicorn' }) } catch (e) { expect(e.status).toBe(400) }
  })

  test('title wird getrimmt vor dem Persistieren (Reviewer-Finding)', () => {
    const updated = applyBacklogUpdate(db, id, { title: '  Mit Whitespace  ' })
    expect(updated.title).toBe('Mit Whitespace')
  })

  test('title leerer String wirft 400', () => {
    let caught = null
    try { applyBacklogUpdate(db, id, { title: '   ' }) } catch (e) { caught = e }
    expect(caught).toBeInstanceOf(BacklogUpdateError)
    expect(caught.status).toBe(400)
  })

  test('404 bei unbekannter id', () => {
    expect(() => applyBacklogUpdate(db, 99999, { goal: 'x' })).toThrow(/Item not found/)
    try { applyBacklogUpdate(db, 99999, { goal: 'x' }) } catch (e) { expect(e.status).toBe(404) }
  })
})
