// DD2-231 — Regression: createSubtask muss qa_criteria SOFORT beim Anlegen
// persistieren (kein nachgelagertes updateSubtask/subtask_edit nötig).
// Symptom (Memory dd2-subtask-add-drops-qa): devd_subtask_add lieferte qa_criteria=null.
// Diese Tests schließen die Lücke aus tests/dd314 (legte mit qa an, prüfte qa-Persistenz
// beim Create aber nie).

import { describe, test, expect, beforeEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'
import { createSubtask, getSubtask, listSubtasks } from '../../apps/backend/src/lib/subtasks.js'

const MIG_034 = '034_v3_backlog_acceptance_criteria.sql'
const MIG_035 = '035_v3_subtasks.sql'

function setupDb() {
  const db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
  applyMigration(db, MIG_034)
  applyMigration(db, MIG_035)
  const project = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('dd2231', 'DD2-231', 'DD2')").run()
  const backlog = db.prepare(`
    INSERT INTO backlog (project_id, project_number, title, type, status)
    VALUES (?, 1, 'Parent issue', 'feature', 'planned')
  `).run(project.lastInsertRowid)
  return { db, backlogId: Number(backlog.lastInsertRowid) }
}

describe('DD2-231 — qa_criteria wird beim Anlegen persistiert', () => {
  let db
  let backlogId

  beforeEach(() => {
    ;({ db, backlogId } = setupDb())
  })

  test('createSubtask gibt qa_criteria im Rückgabewert zurück (nicht null)', () => {
    const created = createSubtask(db, backlogId, {
      title: 'Mit QA',
      qa_criteria: 'Aktion X → erwartetes Y',
    })
    expect(created.qa_criteria).toBe('Aktion X → erwartetes Y')
  })

  test('qa_criteria ist sofort aus der DB lesbar — kein nachträgliches Edit nötig', () => {
    const created = createSubtask(db, backlogId, {
      title: 'Persistenz-Check',
      qa_criteria: 'Direkt in der DB',
    })
    const fromDb = getSubtask(db, created.id)
    expect(fromDb.qa_criteria).toBe('Direkt in der DB')
    expect(listSubtasks(db, backlogId)[0].qa_criteria).toBe('Direkt in der DB')
  })

  test('ohne qa_criteria bleibt das Feld null (keine Regression der Optionalität)', () => {
    const created = createSubtask(db, backlogId, { title: 'Ohne QA' })
    expect(created.qa_criteria).toBeNull()
  })
})
