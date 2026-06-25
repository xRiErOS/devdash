// E01.2 — server/lib/userStories.js CRUD (DB-backed, mirrors tests/dd314/subtasks-api.test.js).
// Tests the helpers used by the REST endpoints without booting server/api.js.
import { describe, test, expect, beforeEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import {
  createUserStory,
  getUserStory,
  listUserStories,
  updateUserStory,
  setUserStoryVerdict,
  deleteUserStory,
  UserStoryValidationError,
} from '../../server/lib/userStories.js'

const UP_TO = '059_v3_drop_acceptance_test_instruction.sql'

function setupDb() {
  const db = createTestDb({ upToVersion: UP_TO })
  const project = db.prepare("INSERT INTO projects (slug, name, prefix) VALUES ('e01', 'E01', 'DD')").run()
  const backlog = db.prepare(`
    INSERT INTO backlog (project_id, project_number, title, type, status)
    VALUES (?, 1, 'Parent issue', 'feature', 'planned')
  `).run(project.lastInsertRowid)
  return { db, backlogId: Number(backlog.lastInsertRowid) }
}

describe('E01.2 — user story CRUD helpers', () => {
  let db
  let backlogId
  beforeEach(() => { ;({ db, backlogId } = setupDb()) })

  test('creates with default us_verdict=open and generated key US-<id>; lists ordered by position', () => {
    const second = createUserStory(db, backlogId, { title: 'Second', position: 20 })
    const first = createUserStory(db, backlogId, { title: 'First', qa: 'Visible', position: 10 })
    expect(second.us_verdict).toBe('open')
    expect(first.key).toBe(`US-${first.id}`)
    expect(listUserStories(db, backlogId).map(s => s.id)).toEqual([first.id, second.id])
  })

  test('title is required (400)', () => {
    expect(() => createUserStory(db, backlogId, { title: '  ' })).toThrow(UserStoryValidationError)
    expect(() => createUserStory(db, backlogId, { title: '  ' })).toThrow(/title ist Pflichtfeld/)
  })

  test('parent must exist (404)', () => {
    expect(() => createUserStory(db, 999999, { title: 'X' })).toThrow(/not found/)
  })

  test('updates title, details, qa, position', () => {
    const us = createUserStory(db, backlogId, { title: 'Draft' })
    const updated = updateUserStory(db, us.id, { title: 'Updated', details: 'd', qa: 'q', position: 5 })
    expect(updated).toMatchObject({ title: 'Updated', details: 'd', qa: 'q', position: 5, us_verdict: 'open' })
  })

  test('update can set us_verdict (UserStoryForm onPatch {title, verdict})', () => {
    const us = createUserStory(db, backlogId, { title: 'T' })
    const updated = updateUserStory(db, us.id, { title: 'T2', us_verdict: 'accepted' })
    expect(updated.us_verdict).toBe('accepted')
  })

  test('update rejects invalid us_verdict', () => {
    const us = createUserStory(db, backlogId, { title: 'T' })
    expect(() => updateUserStory(db, us.id, { us_verdict: 'passed' })).toThrow(/us_verdict/)
  })

  test('setUserStoryVerdict accepts open|accepted|rejected, rejects others', () => {
    const us = createUserStory(db, backlogId, { title: 'T' })
    expect(setUserStoryVerdict(db, us.id, 'rejected').us_verdict).toBe('rejected')
    expect(setUserStoryVerdict(db, us.id, 'accepted').us_verdict).toBe('accepted')
    expect(() => setUserStoryVerdict(db, us.id, 'nope')).toThrow(/us_verdict/)
  })

  test('deletes + parent cascade removes children', () => {
    const us = createUserStory(db, backlogId, { title: 'Delete me' })
    expect(deleteUserStory(db, us.id)).toEqual({ ok: true, deleted_id: us.id })
    expect(listUserStories(db, backlogId)).toEqual([])
    createUserStory(db, backlogId, { title: 'Cascade child' })
    db.prepare('DELETE FROM backlog WHERE id = ?').run(backlogId)
    expect(db.prepare('SELECT COUNT(*) AS c FROM user_stories').get().c).toBe(0)
  })

  test('getUserStory returns row incl. key, 404-shape via null', () => {
    const us = createUserStory(db, backlogId, { title: 'T' })
    expect(getUserStory(db, us.id).key).toBe(`US-${us.id}`)
    expect(getUserStory(db, 999999)).toBeUndefined()
  })
})

describe('E01.2 — D09 drop: acceptance_criteria/test_instruction columns gone from backlog', () => {
  test('PRAGMA table_info(backlog) hat weder acceptance_criteria noch test_instruction', () => {
    const { db } = setupDb()
    const cols = db.prepare('PRAGMA table_info(backlog)').all().map(c => c.name)
    expect(cols).not.toContain('acceptance_criteria')
    expect(cols).not.toContain('test_instruction')
  })
})
