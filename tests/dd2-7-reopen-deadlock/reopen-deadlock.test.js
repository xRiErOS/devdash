import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject, TEST_PROJECT_ID } from '../_fixtures/seed.js'
import {
  submitSprintReview,
  isSprintReviewSubmitted,
  assertReviewEditable,
  reopenReviewRound,
  canReopenReview,
  REOPENABLE_STATUSES,
  ReviewEditLockedError,
} from '../../apps/backend/src/lib/reviewMarker.js'

// DD2-7 — Review-Deadlock: Issue mit Status=passed + letztem Verdikt not_passed auf
// einem submitted Sprint war nur über den Mehrschritt-Status-Tanz re-reviewbar, weil
// der review/reopen-Endpoint strikt status=to_review verlangte. Fix: Endpoint-Guard
// auf REOPENABLE_STATUSES (to_review/passed/rejected) geweitet. Dieser Guard pinnt
// (1) die Eligibility-Logik und (2) das End-to-End-Verhalten der reopenReviewRound-
// Funktion aus dem passed-Deadlock heraus.

const UP_TO = '053_v3_sprint_review_submitted_marker.sql'

function makeDb() {
  return createTestDb({ upToVersion: UP_TO })
}

function seedSprint(db) {
  seedProject(db)
  const sp = db.prepare(
    'INSERT INTO sprints (project_id, project_number, name, status, position) VALUES (?, ?, ?, ?, ?)',
  ).run(TEST_PROJECT_ID, 9991, 'DD2-7-Deadlock-Sprint', 'review', 1)
  return Number(sp.lastInsertRowid)
}

function seedIssue(db, sprintId, status) {
  seedProject(db)
  const ins = db.prepare(
    'INSERT INTO backlog (project_id, project_number, title, type, status, assigned_sprint) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(TEST_PROJECT_ID, 9991, 'DD2-7 Deadlock Issue', 'bug', status, sprintId)
  return Number(ins.lastInsertRowid)
}

function addRound(db, backlogId, status, roundNumber) {
  db.prepare(
    'INSERT INTO review_feedback (backlog_id, round_number, review_status, notes) VALUES (?, ?, ?, NULL)',
  ).run(backlogId, roundNumber, status)
}

describe('DD2-7 · reopen-Eligibility', () => {
  test('canReopenReview erlaubt nur post-Review-Status', () => {
    expect([...REOPENABLE_STATUSES].sort()).toEqual(['passed', 'rejected', 'to_review'])
    for (const s of ['to_review', 'passed', 'rejected']) {
      expect(canReopenReview(s)).toBe(true)
    }
    for (const s of ['new', 'refined', 'planned', 'in_progress', 'done', 'cancelled', '']) {
      expect(canReopenReview(s)).toBe(false)
    }
  })
})

describe('DD2-7 · Deadlock passed + not_passed + submitted', () => {
  let db
  beforeEach(() => { db = makeDb() })
  afterEach(() => { db.close() })

  test('reopen aus passed öffnet frische Runde + entsperrt den Edit-Gate ohne Status-Tanz', () => {
    const sprintId = seedSprint(db)
    // Deadlock-Zustand: Status=passed, Runden r1 passed / r2 not_passed, Sprint submitted.
    const backlogId = seedIssue(db, sprintId, 'passed')
    addRound(db, backlogId, 'passed', 1)
    addRound(db, backlogId, 'not_passed', 2)
    submitSprintReview(db, sprintId, null)

    // Vorher: gesperrt (letzte Runde decided + Sprint submitted).
    expect(isSprintReviewSubmitted(db, sprintId)).toBe(true)
    expect(() => assertReviewEditable(db, backlogId)).toThrow(ReviewEditLockedError)
    // Der Endpoint-Guard hätte das Issue (status=passed) vorher abgewiesen — jetzt zulässig:
    const issue = db.prepare('SELECT status FROM backlog WHERE id = ?').get(backlogId)
    expect(canReopenReview(issue.status)).toBe(true)

    // Direkter Reopen (das, was der Endpoint nun durchlässt).
    const result = reopenReviewRound(db, backlogId, null)
    expect(result.opened).toBe(true)
    expect(result.roundNumber).toBe(3)
    expect(result.reopenedSprintId).toBe(sprintId)

    // Frische pending-Runde + Marker zurückgesetzt → Edit-Gate lässt wieder durch.
    const latest = db.prepare(
      'SELECT review_status, round_number FROM review_feedback WHERE backlog_id = ? ORDER BY round_number DESC, id DESC LIMIT 1',
    ).get(backlogId)
    expect(latest.review_status).toBe('pending')
    expect(latest.round_number).toBe(3)
    expect(isSprintReviewSubmitted(db, sprintId)).toBe(false)
    expect(() => assertReviewEditable(db, backlogId)).not.toThrow()
  })
})
