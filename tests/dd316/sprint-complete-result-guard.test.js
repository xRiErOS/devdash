// DD-316 — Sprint complete requires result for done/passed issues.

import { describe, expect, test, beforeEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { listSprintIssuesMissingResult } from '../../apps/backend/src/lib/sprintCompleteGuards.js'

describe('DD-316 — sprint complete result guard', () => {
  let db
  let sprintId

  beforeEach(() => {
    db = createTestDb()
    const project = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('dd316', 'DD-316', 'DD')").run()
    sprintId = Number(db.prepare(`
      INSERT INTO sprints (project_id, project_number, name, status)
      VALUES (?, 44, 'Result Guard Sprint', 'to_review')
    `).run(project.lastInsertRowid).lastInsertRowid)

    const insertIssue = db.prepare(`
      INSERT INTO backlog (project_id, project_number, title, type, status, assigned_sprint, result)
      VALUES (?, ?, ?, 'feature', ?, ?, ?)
    `)
    insertIssue.run(project.lastInsertRowid, 123, 'Passed without result', 'passed', sprintId, null)
    insertIssue.run(project.lastInsertRowid, 124, 'Done blank result', 'completed', sprintId, '   ')
    insertIssue.run(project.lastInsertRowid, 125, 'Passed with result', 'passed', sprintId, 'Implemented')
    insertIssue.run(project.lastInsertRowid, 126, 'Cancelled no result', 'cancelled', sprintId, null)
    insertIssue.run(project.lastInsertRowid, 127, 'Rejected no result', 'rejected', sprintId, null)
  })

  test('returns done/passed issues missing result with display keys', () => {
    const missing = listSprintIssuesMissingResult(db, sprintId)
    expect(missing.map(i => i.key)).toEqual(['DD-123', 'DD-124'])
    expect(missing.map(i => i.status)).toEqual(['passed', 'completed'])
  })

  test('returns empty list once all done/passed issues have result', () => {
    db.prepare("UPDATE backlog SET result = 'Documented outcome' WHERE status IN ('completed', 'passed')").run()
    expect(listSprintIssuesMissingResult(db, sprintId)).toEqual([])
  })
})
