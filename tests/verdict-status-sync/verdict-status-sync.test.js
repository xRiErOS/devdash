import { describe, test, expect, beforeEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject, TEST_PROJECT_ID } from '../_fixtures/seed.js'
import {
  autoSetPassedOnReviewPass,
  autoSetRejectedOnReviewFail,
} from '../../apps/backend/src/lib/reviewMarker.js'

// Verdict↔Status-Invariante (Root-Fix DD#81-Trap-Rest, 2026-06-23).
//
// Defekt: autoSetRejectedOnReviewFail zog nur to_review→rejected, NICHT
// passed→rejected. Folge: kippt das letzte Verdict eines bereits-passed Issues
// auf not_passed (PATCH der Runde / neue not_passed-Runde, solange der Sprint
// noch nicht submitted ist), bleibt backlog.status='passed' stehen, während die
// jüngste Runde 'not_passed' ist → dauerhafte, via MCP nicht reparierbare
// Divergenz (SPF-161). Fix: das letzte Verdict führt — not_passed ⇒ Status nie
// passed.

const UP_TO = '059_v3_drop_acceptance_test_instruction.sql'

let n = 9100
function makeDb() {
  return createTestDb({ upToVersion: UP_TO })
}

function seedIssue(db, { status = 'to_review' } = {}) {
  seedProject(db)
  const number = ++n
  const ins = db.prepare(`
    INSERT INTO backlog (project_id, project_number, title, type, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(TEST_PROJECT_ID, number, 'Issue ' + number, 'feature', status)
  return Number(ins.lastInsertRowid)
}

function seedRound(db, backlogId, reviewStatus, roundNumber) {
  const ins = db.prepare(`
    INSERT INTO review_feedback (backlog_id, round_number, review_status, comment)
    VALUES (?, ?, ?, ?)
  `).run(backlogId, roundNumber, reviewStatus, reviewStatus === 'not_passed' ? 'x' : null)
  return Number(ins.lastInsertRowid)
}

function statusOf(db, backlogId) {
  return db.prepare('SELECT status FROM backlog WHERE id = ?').get(backlogId).status
}

describe('Verdict→Status-Sync — not_passed darf passed nicht stehen lassen', () => {
  let db
  beforeEach(() => { db = makeDb() })

  test('passed-Issue mit jüngstem not_passed-Verdict → Status wird rejected (nicht stuck passed)', () => {
    const id = seedIssue(db, { status: 'passed' }) // war via Runde 1 passed abgenommen
    seedRound(db, id, 'passed', 1)
    seedRound(db, id, 'not_passed', 2) // Verdict gekippt / neue not_passed-Runde

    autoSetRejectedOnReviewFail(db, id, null)

    expect(statusOf(db, id)).toBe('rejected')
  })

  test('done bleibt von not_passed unberührt (final)', () => {
    const id = seedIssue(db, { status: 'done' })
    seedRound(db, id, 'not_passed', 1)
    autoSetRejectedOnReviewFail(db, id, null)
    expect(statusOf(db, id)).toBe('done')
  })

  test('cancelled bleibt von not_passed unberührt (final)', () => {
    const id = seedIssue(db, { status: 'cancelled' })
    seedRound(db, id, 'not_passed', 1)
    autoSetRejectedOnReviewFail(db, id, null)
    expect(statusOf(db, id)).toBe('cancelled')
  })

  test('to_review + not_passed → rejected (unverändertes Bein)', () => {
    const id = seedIssue(db, { status: 'to_review' })
    seedRound(db, id, 'not_passed', 1)
    autoSetRejectedOnReviewFail(db, id, null)
    expect(statusOf(db, id)).toBe('rejected')
  })

  test('passed-Bein: rejected + passed-Verdict → passed (Symmetrie)', () => {
    const id = seedIssue(db, { status: 'rejected' })
    seedRound(db, id, 'not_passed', 1)
    seedRound(db, id, 'passed', 2)
    autoSetPassedOnReviewPass(db, id, null)
    expect(statusOf(db, id)).toBe('passed')
  })
})

// Invariant-Matrix: für jeden Start-Status × jedes Verdict den passenden Sync
// fahren und sicherstellen, dass danach NIE die verbotene Kombination
// (status=passed ∧ latest=not_passed) bzw. (status=rejected ∧ latest=passed)
// entsteht. Fängt künftige Asymmetrie-Regressionen über alle Pfade.
describe('Verdict→Status-Invariante hält über alle Start-Status × Verdicts', () => {
  const START_STATES = ['to_review', 'passed', 'rejected', 'in_progress', 'done', 'cancelled']
  const VERDICTS = ['passed', 'not_passed']

  for (const start of START_STATES) {
    for (const verdict of VERDICTS) {
      test(`${start} + ${verdict}-Verdict → Status kollidiert nicht mit Verdict`, () => {
        const db = makeDb()
        const id = seedIssue(db, { status: start })
        seedRound(db, id, verdict, 1)

        if (verdict === 'passed') autoSetPassedOnReviewPass(db, id, null)
        else autoSetRejectedOnReviewFail(db, id, null)

        const status = statusOf(db, id)
        // Finale Zustände (done/cancelled) bleiben autoritativ — von der Invariante ausgenommen.
        if (status === 'done' || status === 'cancelled') return
        if (verdict === 'not_passed') expect(status).not.toBe('passed')
        if (verdict === 'passed') expect(status).not.toBe('rejected')
      })
    }
  }
})
