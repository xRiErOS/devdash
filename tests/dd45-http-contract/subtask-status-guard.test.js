// DD-45 R11 — beweist, dass PATCH /api/subtasks/:id/status ohne qa_criteria
// einen 422-Fehler produziert (Status + Message strukturiert).

import { describe, test, expect, beforeEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'
import { createSubtask, setSubtaskStatus, SubtaskValidationError } from '../../server/lib/subtasks.js'

function setupDb() {
  const db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
  applyMigration(db, '034_v3_backlog_acceptance_criteria.sql')
  applyMigration(db, '035_v3_subtasks.sql')
  const project = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('dd45', 'DD-45', 'DD')").run()
  const backlog = db.prepare(`
    INSERT INTO backlog (project_id, project_number, title, type, status)
    VALUES (?, 1, 'Issue', 'feature', 'planned')
  `).run(project.lastInsertRowid)
  return { db, id: Number(backlog.lastInsertRowid) }
}

describe('DD-45 R11 — subtask status guard (PATCH /api/subtasks/:id/status)', () => {
  let db, id
  beforeEach(() => { ({ db, id } = setupDb()) })

  test('Status done ohne qa_criteria → 422 mit lesbarem Fehlertext', () => {
    const sub = createSubtask(db, id, { title: 'Needs QA' })
    let caught = null
    try { setSubtaskStatus(db, sub.id, 'done') } catch (e) { caught = e }
    expect(caught).toBeInstanceOf(SubtaskValidationError)
    expect(caught.status).toBe(422)
    expect(caught.message).toMatch(/qa_criteria ist Pflicht/)
  })

  test('Ungueltiger status → 400', () => {
    const sub = createSubtask(db, id, { title: 'Foo' })
    let caught = null
    try { setSubtaskStatus(db, sub.id, 'wishful') } catch (e) { caught = e }
    expect(caught).toBeInstanceOf(SubtaskValidationError)
    expect(caught.status).toBe(400)
  })

  test('done mit qa_criteria → ok, completed_at gesetzt', () => {
    const sub = createSubtask(db, id, { title: 'Hat QA', qa_criteria: 'fertig wenn x' })
    const done = setSubtaskStatus(db, sub.id, 'done')
    expect(done.status).toBe('done')
    expect(done.completed_at).toBeTruthy()
  })
})
