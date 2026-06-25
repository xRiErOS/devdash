import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject, TEST_PROJECT_ID } from '../_fixtures/seed.js'
import {
  submitSprintReview,
  isSprintReviewSubmitted,
  assertReviewEditable,
  reopenReviewRound,
  ReviewEditLockedError,
} from '../../server/lib/reviewMarker.js'

// GF-2 T-reopen — Backend-Verifikation für den V2-Review-Re-Review-Pfad (D04, UI-Anker
// review-flow(.mobile)…re-review / Variant_ReReview). Der Befund (BE-Q01): reReviewPassed
// mid-active-round ist NICHT der Auto-Pfad (maybeAutoOpenReworkRound feuert nur bei
// not_passed), sondern der MANUELLE reopenReviewRound (DD-662). Dieser GF-2-Guard pinnt
// das exakte Cutover-relevante Szenario: ein bereits passed Issue in einer übermittelten
// Runde → manueller Reopen → frische pending-Runde + review_submitted_at zurückgesetzt.
// Bestätigt durch die Bestands-Coverage tests/dd507-review-marker (DD-662); hier als
// eigenständiger, T13-Datengrenze-benannter Regressionsguard.

const UP_TO = '053_v3_sprint_review_submitted_marker.sql'

function makeDb() {
  return createTestDb({ upToVersion: UP_TO })
}

function seedSprint(db) {
  seedProject(db)
  const sp = db.prepare(
    'INSERT INTO sprints (project_id, project_number, name, status, position) VALUES (?, ?, ?, ?, ?)',
  ).run(TEST_PROJECT_ID, 9990, 'GF2-Reopen-Sprint', 'review', 1)
  return Number(sp.lastInsertRowid)
}

function seedIssue(db, sprintId) {
  seedProject(db)
  const ins = db.prepare(
    'INSERT INTO backlog (project_id, project_number, title, type, status, assigned_sprint) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(TEST_PROJECT_ID, 9990, 'GF2 Re-Review Issue', 'feature', 'to_review', sprintId)
  return Number(ins.lastInsertRowid)
}

function addRound(db, backlogId, status, roundNumber) {
  db.prepare(
    'INSERT INTO review_feedback (backlog_id, round_number, review_status, notes) VALUES (?, ?, ?, NULL)',
  ).run(backlogId, roundNumber, status)
}

describe('GF-2 T-reopen · re-review a passed issue mid-active-round', () => {
  let db
  beforeEach(() => { db = makeDb() })
  afterEach(() => { db.close() })

  test('passed + submitted → manueller Reopen öffnet frische pending-Runde + Marker reset', () => {
    const sprintId = seedSprint(db)
    const backlogId = seedIssue(db, sprintId)
    addRound(db, backlogId, 'passed', 1)          // Runde 1 abgenommen
    submitSprintReview(db, sprintId, null)         // Runde übermittelt → Edits gesperrt

    expect(isSprintReviewSubmitted(db, sprintId)).toBe(true)
    expect(() => assertReviewEditable(db, backlogId)).toThrow(ReviewEditLockedError)

    const result = reopenReviewRound(db, backlogId, null)

    // frische pending-Runde 2, kein Verdict
    expect(result.opened).toBe(true)
    expect(result.alreadyOpen).toBe(false)
    expect(result.roundNumber).toBe(2)
    expect(result.reopenedSprintId).toBe(sprintId)

    const latest = db.prepare(
      'SELECT review_status, round_number, notes FROM review_feedback WHERE backlog_id = ? ORDER BY round_number DESC, id DESC LIMIT 1',
    ).get(backlogId)
    expect(latest.review_status).toBe('pending')
    expect(latest.round_number).toBe(2)
    expect(latest.notes).toBe(null)

    // review_submitted_at zurückgesetzt → Edit-Gate lässt wieder durch
    expect(isSprintReviewSubmitted(db, sprintId)).toBe(false)
    expect(() => assertReviewEditable(db, backlogId)).not.toThrow()
  })
})
