import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject, TEST_PROJECT_ID } from '../_fixtures/seed.js'
import {
  submitSprintReview,
  isSprintReviewSubmitted,
  assertReviewEditable,
  maybeAutoOpenReworkRound,
  reopenReviewRound,
  ReviewEditLockedError,
} from '../../apps/backend/src/lib/reviewMarker.js'

// DD-507 — Sprint-level Review-Abschluss-Marker (sprints.review_submitted_at)
// + Auto-Runde-bei-Rework. Reine DB-Helper-Coverage (server/api.js exportiert
// die App nicht — analog DD-375/DD-277). Migrationen bis 053 angewandt.

const UP_TO = '053_v3_sprint_review_submitted_marker.sql'

function makeDb() {
  return createTestDb({ upToVersion: UP_TO })
}

function seedSprint(db, { status = 'review' } = {}) {
  seedProject(db)
  const sp = db.prepare(`
    INSERT INTO sprints (project_id, project_number, name, status, position)
    VALUES (?, ?, ?, ?, ?)
  `).run(TEST_PROJECT_ID, 507, 'DD507-Sprint', status, 1)
  return Number(sp.lastInsertRowid)
}

function seedIssue(db, { sprintId = null, status = 'to_review', number = 9001 } = {}) {
  seedProject(db)
  const ins = db.prepare(`
    INSERT INTO backlog (project_id, project_number, title, type, status, assigned_sprint)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(TEST_PROJECT_ID, number, 'Issue ' + number, 'feature', status, sprintId)
  return Number(ins.lastInsertRowid)
}

function addRound(db, backlogId, status, roundNumber) {
  const ins = db.prepare(
    'INSERT INTO review_feedback (backlog_id, round_number, review_status, notes) VALUES (?, ?, ?, NULL)'
  ).run(backlogId, roundNumber, status)
  return Number(ins.lastInsertRowid)
}

function collectAudit() {
  const calls = []
  const fn = (table, recordId, action, oldVal, newVal, agentId) => {
    calls.push({ table, recordId, action, oldVal, newVal, agentId })
  }
  return { calls, fn }
}

describe('DD-507 · migration 053 schema', () => {
  let db
  beforeEach(() => { db = makeDb() })
  afterEach(() => { db.close() })

  test('sprints carries the nullable review_submitted_at column', () => {
    const cols = db.prepare('PRAGMA table_info(sprints)').all()
    const col = cols.find(c => c.name === 'review_submitted_at')
    expect(col).toBeDefined()
    expect(col.notnull).toBe(0)        // nullable
    expect(col.dflt_value).toBe(null)  // default null
  })

  test('a fresh sprint exposes review_submitted_at = NULL via SELECT s.*', () => {
    const sprintId = seedSprint(db)
    const row = db.prepare('SELECT s.* FROM sprints s WHERE s.id = ?').get(sprintId)
    expect('review_submitted_at' in row).toBe(true)
    expect(row.review_submitted_at).toBe(null)
  })
})

describe('DD-507 · submitSprintReview', () => {
  let db
  beforeEach(() => { db = makeDb() })
  afterEach(() => { db.close() })

  test('sets the marker and reflects submitted state', () => {
    const sprintId = seedSprint(db)
    const { calls, fn } = collectAudit()
    expect(isSprintReviewSubmitted(db, sprintId)).toBe(false)

    const updated = submitSprintReview(db, sprintId, fn)
    expect(updated).not.toBeNull()
    expect(updated.review_submitted_at).not.toBeNull()
    expect(isSprintReviewSubmitted(db, sprintId)).toBe(true)

    // GET-shape (SELECT s.*) reflects submitted
    const row = db.prepare('SELECT s.* FROM sprints s WHERE s.id = ?').get(sprintId)
    expect(row.review_submitted_at).not.toBeNull()

    // audit: review_submitted, dashboard-po, old null
    const a = calls.find(c => c.action === 'review_submitted')
    expect(a).toBeDefined()
    expect(a.table).toBe('sprints')
    expect(a.recordId).toBe(sprintId)
    expect(a.agentId).toBe('dashboard-po')
    expect(a.oldVal.review_submitted_at).toBe(null)
  })

  test('returns null for an unknown sprint (404 path)', () => {
    const { fn } = collectAudit()
    expect(submitSprintReview(db, 999999, fn)).toBeNull()
  })

  test('re-submit just refreshes the timestamp (idempotent-ish)', () => {
    const sprintId = seedSprint(db)
    const { fn } = collectAudit()
    submitSprintReview(db, sprintId, fn)
    const again = submitSprintReview(db, sprintId, fn)
    expect(again.review_submitted_at).not.toBeNull()
    expect(isSprintReviewSubmitted(db, sprintId)).toBe(true)
  })
})

describe('DD-507 · edit-gate (assertReviewEditable)', () => {
  let db
  beforeEach(() => { db = makeDb() })
  afterEach(() => { db.close() })

  test('open sprint → editable (no throw)', () => {
    const sprintId = seedSprint(db)
    const backlogId = seedIssue(db, { sprintId })
    expect(() => assertReviewEditable(db, backlogId)).not.toThrow()
  })

  test('submitted sprint + DECIDED last verdict → throws ReviewEditLockedError (409)', () => {
    const sprintId = seedSprint(db)
    const backlogId = seedIssue(db, { sprintId })
    addRound(db, backlogId, 'passed', 1)   // entschiedene Runde
    submitSprintReview(db, sprintId, null)
    try {
      assertReviewEditable(db, backlogId)
      throw new Error('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ReviewEditLockedError)
      expect(err.status).toBe(409)
      expect(err.message).toMatch(/Review ist abgeschlossen/)
    }
  })

  // DD-662 (a): verdictloser Submit darf das Issue NICHT fangen.
  test('submitted sprint + NO verdict (no round) → editable (DD-662 un-trap)', () => {
    const sprintId = seedSprint(db)
    const backlogId = seedIssue(db, { sprintId })   // keine Runde
    submitSprintReview(db, sprintId, null)
    expect(isSprintReviewSubmitted(db, sprintId)).toBe(true)
    expect(() => assertReviewEditable(db, backlogId)).not.toThrow()
  })

  test('submitted sprint + PENDING last round → editable (DD-662 un-trap)', () => {
    const sprintId = seedSprint(db)
    const backlogId = seedIssue(db, { sprintId, number: 9011 })
    addRound(db, backlogId, 'pending', 1)
    submitSprintReview(db, sprintId, null)
    expect(() => assertReviewEditable(db, backlogId)).not.toThrow()
  })

  test('issue without assigned_sprint → editable', () => {
    const backlogId = seedIssue(db, { sprintId: null })
    expect(() => assertReviewEditable(db, backlogId)).not.toThrow()
  })
})

describe('DD-507 · auto-round + reopen on → to_review', () => {
  let db
  beforeEach(() => { db = makeDb() })
  afterEach(() => { db.close() })

  test('last verdict not_passed → opens a pending round + resets the marker', () => {
    const sprintId = seedSprint(db)
    const backlogId = seedIssue(db, { sprintId, status: 'to_review' })
    addRound(db, backlogId, 'not_passed', 1)
    submitSprintReview(db, sprintId, null)
    expect(isSprintReviewSubmitted(db, sprintId)).toBe(true)

    const { calls, fn } = collectAudit()
    const result = maybeAutoOpenReworkRound(db, backlogId, 'to_review', fn)

    expect(result.opened).toBe(true)
    expect(result.roundNumber).toBe(2)
    expect(result.reopenedSprintId).toBe(sprintId)

    // new pending round exists, latest verdict is pending
    const latest = db.prepare(
      'SELECT review_status, round_number FROM review_feedback WHERE backlog_id = ? ORDER BY round_number DESC, id DESC LIMIT 1'
    ).get(backlogId)
    expect(latest.review_status).toBe('pending')
    expect(latest.round_number).toBe(2)

    // marker reset → null; edits flow again
    expect(isSprintReviewSubmitted(db, sprintId)).toBe(false)
    expect(() => assertReviewEditable(db, backlogId)).not.toThrow()

    // audits: auto_round_opened (system-auto) + review_reopened (system-auto)
    const opened = calls.find(c => c.action === 'auto_round_opened')
    expect(opened).toBeDefined()
    expect(opened.table).toBe('review_feedback')
    expect(opened.agentId).toBe('system-auto')
    expect(opened.newVal.reason).toBe('rework_to_review')

    const reopened = calls.find(c => c.action === 'review_reopened')
    expect(reopened).toBeDefined()
    expect(reopened.table).toBe('sprints')
    expect(reopened.agentId).toBe('system-auto')
    expect(reopened.newVal.review_submitted_at).toBe(null)
  })

  test('fresh issue (no prior not_passed) → to_review does NOT open a round', () => {
    const sprintId = seedSprint(db)
    const backlogId = seedIssue(db, { sprintId, status: 'in_progress', number: 9002 })
    // no review rounds at all
    const { calls, fn } = collectAudit()
    const result = maybeAutoOpenReworkRound(db, backlogId, 'to_review', fn)

    expect(result.opened).toBe(false)
    const cnt = db.prepare('SELECT COUNT(*) AS n FROM review_feedback WHERE backlog_id = ?').get(backlogId)
    expect(cnt.n).toBe(0)
    expect(calls.find(c => c.action === 'auto_round_opened')).toBeUndefined()
  })

  test('last verdict passed → to_review does NOT open a round', () => {
    const sprintId = seedSprint(db)
    const backlogId = seedIssue(db, { sprintId, status: 'to_review', number: 9003 })
    addRound(db, backlogId, 'passed', 1)
    const { fn } = collectAudit()
    const result = maybeAutoOpenReworkRound(db, backlogId, 'to_review', fn)
    expect(result.opened).toBe(false)
  })

  test('non-to_review transition → no auto-round even with not_passed', () => {
    const sprintId = seedSprint(db)
    const backlogId = seedIssue(db, { sprintId, status: 'in_progress', number: 9004 })
    addRound(db, backlogId, 'not_passed', 1)
    const { fn } = collectAudit()
    const result = maybeAutoOpenReworkRound(db, backlogId, 'in_progress', fn)
    expect(result.opened).toBe(false)
  })

  test('reopen on an already-open sprint → opens round, skips reopen audit (no noise)', () => {
    const sprintId = seedSprint(db)
    const backlogId = seedIssue(db, { sprintId, status: 'to_review', number: 9005 })
    addRound(db, backlogId, 'not_passed', 1)
    // sprint NOT submitted → marker already null
    const { calls, fn } = collectAudit()
    const result = maybeAutoOpenReworkRound(db, backlogId, 'to_review', fn)

    expect(result.opened).toBe(true)
    expect(calls.find(c => c.action === 'auto_round_opened')).toBeDefined()
    // review_reopened audit skipped because the marker was already null
    expect(calls.find(c => c.action === 'review_reopened')).toBeUndefined()
    expect(isSprintReviewSubmitted(db, sprintId)).toBe(false)
  })

  test('rework on an issue without a sprint → opens round, no reopen', () => {
    const backlogId = seedIssue(db, { sprintId: null, status: 'to_review', number: 9006 })
    addRound(db, backlogId, 'not_passed', 1)
    const { calls, fn } = collectAudit()
    const result = maybeAutoOpenReworkRound(db, backlogId, 'to_review', fn)
    expect(result.opened).toBe(true)
    expect(result.reopenedSprintId).toBeUndefined()
    expect(calls.find(c => c.action === 'review_reopened')).toBeUndefined()
  })
})

describe('DD-662 · reopenReviewRound (manual reopen)', () => {
  let db
  beforeEach(() => { db = makeDb() })
  afterEach(() => { db.close() })

  // (b) reopen → passed grün: nach Reopen ist eine frische pending-Runde da,
  // der Marker ist zurückgesetzt und das Edit-Gate lässt wieder durch.
  test('decided last verdict + submitted sprint → opens fresh round + resets marker', () => {
    const sprintId = seedSprint(db)
    const backlogId = seedIssue(db, { sprintId, status: 'to_review', number: 9101 })
    addRound(db, backlogId, 'passed', 1)
    submitSprintReview(db, sprintId, null)
    expect(isSprintReviewSubmitted(db, sprintId)).toBe(true)
    // Gate sperrt jetzt (entschiedenes Verdict + submitted)
    expect(() => assertReviewEditable(db, backlogId)).toThrow(ReviewEditLockedError)

    const { calls, fn } = collectAudit()
    const result = reopenReviewRound(db, backlogId, fn)

    expect(result.opened).toBe(true)
    expect(result.alreadyOpen).toBe(false)
    expect(result.roundNumber).toBe(2)
    expect(result.reopenedSprintId).toBe(sprintId)

    const latest = db.prepare(
      'SELECT review_status, round_number FROM review_feedback WHERE backlog_id = ? ORDER BY round_number DESC, id DESC LIMIT 1'
    ).get(backlogId)
    expect(latest.review_status).toBe('pending')
    expect(latest.round_number).toBe(2)

    // Marker zurück → Edits fließen wieder (review create passed würde durchgehen)
    expect(isSprintReviewSubmitted(db, sprintId)).toBe(false)
    expect(() => assertReviewEditable(db, backlogId)).not.toThrow()

    const opened = calls.find(c => c.action === 'review_round_reopened')
    expect(opened).toBeDefined()
    expect(opened.table).toBe('review_feedback')
    expect(opened.newVal.reason).toBe('manual_reopen')
    const reopened = calls.find(c => c.action === 'review_reopened')
    expect(reopened).toBeDefined()
    expect(reopened.newVal.reason).toBe('manual_reopen')
  })

  // (c) idempotent: zweiter Reopen auf bereits offener Runde → keine neue Runde.
  test('idempotent — already-open round opens no new round', () => {
    const sprintId = seedSprint(db)
    const backlogId = seedIssue(db, { sprintId, status: 'to_review', number: 9102 })
    addRound(db, backlogId, 'not_passed', 1)
    submitSprintReview(db, sprintId, null)

    const first = reopenReviewRound(db, backlogId, null)
    expect(first.opened).toBe(true)
    expect(first.roundNumber).toBe(2)

    const before = db.prepare('SELECT COUNT(*) AS n FROM review_feedback WHERE backlog_id = ?').get(backlogId).n
    const second = reopenReviewRound(db, backlogId, null)
    expect(second.opened).toBe(false)
    expect(second.alreadyOpen).toBe(true)
    const after = db.prepare('SELECT COUNT(*) AS n FROM review_feedback WHERE backlog_id = ?').get(backlogId).n
    expect(after).toBe(before)   // keine Duplikat-Runde
  })

  test('no round yet → opens nothing, only resets the marker', () => {
    const sprintId = seedSprint(db)
    const backlogId = seedIssue(db, { sprintId, status: 'to_review', number: 9103 })
    submitSprintReview(db, sprintId, null)
    const result = reopenReviewRound(db, backlogId, null)
    expect(result.opened).toBe(false)
    expect(result.alreadyOpen).toBe(false)
    expect(result.reopenedSprintId).toBe(sprintId)
    const cnt = db.prepare('SELECT COUNT(*) AS n FROM review_feedback WHERE backlog_id = ?').get(backlogId).n
    expect(cnt).toBe(0)
    expect(isSprintReviewSubmitted(db, sprintId)).toBe(false)
  })

  test('unknown issue → null', () => {
    expect(reopenReviewRound(db, 987654, null)).toBeNull()
  })
})
