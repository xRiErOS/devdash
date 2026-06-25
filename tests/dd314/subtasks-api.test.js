// DD-314 — Subtasks backend foundation.
// Tests the DB-backed operations used by the REST endpoints without booting
// server/api.js, which binds a real listener on import in this codebase.

import { describe, test, expect, beforeEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'
import {
  createSubtask,
  deleteSubtask,
  listSubtasks,
  setSubtaskStatus,
  updateSubtask,
  reorderSubtasks,
} from '../../apps/backend/src/lib/subtasks.js'

const MIG_034 = '034_v3_backlog_acceptance_criteria.sql'
const MIG_035 = '035_v3_subtasks.sql'

function setupDb() {
  const db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
  applyMigration(db, MIG_034)
  applyMigration(db, MIG_035)
  const project = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('dd314', 'DD-314', 'DD')").run()
  const backlog = db.prepare(`
    INSERT INTO backlog (project_id, project_number, title, type, status)
    VALUES (?, 1, 'Parent issue', 'feature', 'planned')
  `).run(project.lastInsertRowid)
  return { db, backlogId: Number(backlog.lastInsertRowid) }
}

describe('DD-314 — subtask CRUD helpers used by REST endpoints', () => {
  let db
  let backlogId

  beforeEach(() => {
    ;({ db, backlogId } = setupDb())
  })

  test('creates and lists subtasks ordered by position', () => {
    const second = createSubtask(db, backlogId, { title: 'Second', position: 20 })
    const first = createSubtask(db, backlogId, { title: 'First', qa_criteria: 'Visible in API', position: 10 })

    expect(second.status).toBe('open')
    expect(listSubtasks(db, backlogId).map(s => s.id)).toEqual([first.id, second.id])
  })

  test('updates title, qa_criteria, and position', () => {
    const subtask = createSubtask(db, backlogId, { title: 'Draft', position: 1 })
    const updated = updateSubtask(db, subtask.id, {
      title: 'Updated',
      qa_criteria: 'QA documented',
      position: 5,
    })

    expect(updated).toMatchObject({
      title: 'Updated',
      qa_criteria: 'QA documented',
      position: 5,
      status: 'open',
    })
  })

  test('blocks done transition until qa_criteria is present', () => {
    const subtask = createSubtask(db, backlogId, { title: 'Needs QA' })
    expect(() => setSubtaskStatus(db, subtask.id, 'done')).toThrow(/qa_criteria ist Pflicht für done/)

    updateSubtask(db, subtask.id, { qa_criteria: 'Expected result exists' })
    const done = setSubtaskStatus(db, subtask.id, 'done')
    expect(done.status).toBe('done')
    expect(done.completed_at).toBeTruthy()
  })

  // DD-45 R04: Batch-Reorder.
  test('reorderSubtasks sets normalized positions (10, 20, 30) in given order', () => {
    const a = createSubtask(db, backlogId, { title: 'A' })
    const b = createSubtask(db, backlogId, { title: 'B' })
    const c = createSubtask(db, backlogId, { title: 'C' })
    const result = reorderSubtasks(db, backlogId, [c.id, a.id, b.id])
    expect(result.map(s => s.id)).toEqual([c.id, a.id, b.id])
    expect(result.map(s => s.position)).toEqual([10, 20, 30])
    expect(listSubtasks(db, backlogId).map(s => s.id)).toEqual([c.id, a.id, b.id])
  })

  test('reorderSubtasks rejects mismatched id set', () => {
    const a = createSubtask(db, backlogId, { title: 'A' })
    createSubtask(db, backlogId, { title: 'B' })
    expect(() => reorderSubtasks(db, backlogId, [a.id])).toThrow(/alle Subtask-ids/)
  })

  test('reorderSubtasks rejects duplicates', () => {
    const a = createSubtask(db, backlogId, { title: 'A' })
    const b = createSubtask(db, backlogId, { title: 'B' })
    expect(() => reorderSubtasks(db, backlogId, [a.id, a.id])).toThrow(/Duplikate/)
    expect(() => reorderSubtasks(db, backlogId, [a.id, b.id, 99999])).toThrow(/alle Subtask-ids/)
  })

  test('deletes subtasks and parent cascade removes children', () => {
    const subtask = createSubtask(db, backlogId, { title: 'Delete me', qa_criteria: 'Can be removed' })
    expect(deleteSubtask(db, subtask.id)).toEqual({ ok: true, deleted_id: subtask.id })
    expect(listSubtasks(db, backlogId)).toEqual([])

    createSubtask(db, backlogId, { title: 'Cascade child', qa_criteria: 'Parent delete removes it' })
    db.prepare('DELETE FROM backlog WHERE id = ?').run(backlogId)
    expect(db.prepare('SELECT COUNT(*) AS c FROM subtasks').get().c).toBe(0)
  })
})
