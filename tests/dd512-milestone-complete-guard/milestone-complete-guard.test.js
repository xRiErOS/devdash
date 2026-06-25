// DD-512: Milestone-Lifecycle-Guard — completed erst wenn alle Sprints done (REQ-47/T10)
//
// "done" im Sprint-Kontext = terminal: der Sprint-Status-Enum hat kein literales "done",
// daher Mapping: terminal ≡ completed | closed | cancelled.
// Blocking-Sprints: planning | active | review.

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'
import {
  canMilestoneTransition,
} from '../../server/lib/lifecycle.js'
import {
  patchMilestoneStatus,
  MilestoneLifecycleError,
} from '../../server/lib/milestoneLifecycle.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_033 = '033_v3_milestone_deferred.sql'
const MIG_038 = '038_v3_milestones_status_lifecycle.sql'

// ---------------------------------------------------------------------------
// Part A — canMilestoneTransition pure-function unit tests (DD-512)
// ---------------------------------------------------------------------------

describe('DD-512 — canMilestoneTransition: active → completed guard', () => {
  test('erlaubt wenn allSprintsDone=true (keine offenen Sprints)', () => {
    const r = canMilestoneTransition('active', 'completed', {
      allSprintsDone: true,
      openSprints: [],
    })
    expect(r.allowed).toBe(true)
    expect(r.reason).toBe('')
  })

  test('geblockt wenn allSprintsDone=false — reason enthält open-sprint Bezeichner', () => {
    const r = canMilestoneTransition('active', 'completed', {
      allSprintsDone: false,
      openSprints: ['DD#15', 'DD#16'],
    })
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/offene Sprints/i)
    expect(r.reason).toContain('DD#15')
    expect(r.reason).toContain('DD#16')
  })

  test('geblockt wenn allSprintsDone=false — einzelner Sprint in reason', () => {
    const r = canMilestoneTransition('active', 'completed', {
      allSprintsDone: false,
      openSprints: ['DD#7'],
    })
    expect(r.allowed).toBe(false)
    expect(r.reason).toContain('DD#7')
  })

  test('geblockt wenn ctx.allSprintsDone fehlt (Guard nicht bypassbar durch Omission)', () => {
    const r = canMilestoneTransition('active', 'completed')
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/offene Sprints/i)
  })

  test('geblockt wenn ctx.allSprintsDone=false aber openSprints leer — generische Meldung', () => {
    const r = canMilestoneTransition('active', 'completed', {
      allSprintsDone: false,
      openSprints: [],
    })
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/offene Sprints/i)
    // Fallback-Text wenn keine konkreten Sprint-Keys vorhanden
    expect(r.reason).toContain('unbekannte Sprints')
  })

  // DD-357 Regression: Reopen completed → active bleibt OHNE Guard
  test('Reopen completed → active bleibt erlaubt (DD-357 — kein allSprintsDone-Guard)', () => {
    const r = canMilestoneTransition('completed', 'active')
    expect(r.allowed).toBe(true)
  })

  // Auch mit allSprintsDone=false — der Reopen-Pfad ignoriert den Guard
  test('Reopen completed → active auch wenn allSprintsDone=false erlaubt', () => {
    const r = canMilestoneTransition('completed', 'active', { allSprintsDone: false })
    expect(r.allowed).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Part B — patchMilestoneStatus DB-Integration (DD-512)
// ---------------------------------------------------------------------------

describe('DD-512 — patchMilestoneStatus: sprint-precondition integration', () => {
  let db, logDir, milestoneId, auditCalls

  function setupDb() {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-dd512-'))
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_033, { logDir })
    applyMigration(db, MIG_038, { logDir })
    auditCalls = []
  }

  function insertMilestone(status = 'active') {
    const r = db.prepare(
      `INSERT INTO milestones (project_id, name, target_date, status) VALUES (?, ?, ?, ?)`
    ).run(2, 'M-DD512', '2026-12-31', status)
    return Number(r.lastInsertRowid)
  }

  function insertSprint(milestoneId_, status, projectNumber = 1) {
    const r = db.prepare(`
      INSERT INTO sprints (project_id, project_number, name, status, position, milestone_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(2, projectNumber, `Sprint-${projectNumber}`, status, projectNumber, milestoneId_)
    return Number(r.lastInsertRowid)
  }

  beforeEach(() => {
    setupDb()
    milestoneId = insertMilestone('active')
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  // --- Blocking cases (422) ---

  test('active → completed mit einem active Sprint → 422 SPRINTS_NOT_DONE', () => {
    insertSprint(milestoneId, 'active', 1)
    let err
    try {
      patchMilestoneStatus(db, milestoneId, 'completed')
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(MilestoneLifecycleError)
    expect(err.statusCode).toBe(422)
    expect(err.code).toBe('SPRINTS_NOT_DONE')
    // Fehlermeldung enthält Sprint-Key DD#1
    expect(err.message).toContain('DD#1')
    // DB nicht verändert
    const row = db.prepare('SELECT status FROM milestones WHERE id = ?').get(milestoneId)
    expect(row.status).toBe('active')
  })

  test('active → completed mit einem planning Sprint → 422 (planning ist blocking)', () => {
    insertSprint(milestoneId, 'planning', 2)
    let err
    try {
      patchMilestoneStatus(db, milestoneId, 'completed')
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(MilestoneLifecycleError)
    expect(err.statusCode).toBe(422)
    expect(err.code).toBe('SPRINTS_NOT_DONE')
    expect(err.message).toContain('DD#2')
  })

  test('active → completed mit einem review Sprint → 422 (review ist blocking)', () => {
    insertSprint(milestoneId, 'review', 3)
    let err
    try {
      patchMilestoneStatus(db, milestoneId, 'completed')
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(MilestoneLifecycleError)
    expect(err.statusCode).toBe(422)
    expect(err.code).toBe('SPRINTS_NOT_DONE')
    expect(err.message).toContain('DD#3')
  })

  test('Fehlermeldung enthält alle blocking Sprint-Keys', () => {
    insertSprint(milestoneId, 'active', 10)
    insertSprint(milestoneId, 'planning', 11)
    let err
    try {
      patchMilestoneStatus(db, milestoneId, 'completed')
    } catch (e) {
      err = e
    }
    expect(err.statusCode).toBe(422)
    expect(err.message).toContain('DD#10')
    expect(err.message).toContain('DD#11')
  })

  // --- Allowing cases (200) ---

  test('active → completed wenn alle Sprints completed → erlaubt', () => {
    insertSprint(milestoneId, 'completed', 20)
    insertSprint(milestoneId, 'completed', 21)
    const updated = patchMilestoneStatus(db, milestoneId, 'completed')
    expect(updated.status).toBe('completed')
  })

  test('active → completed wenn alle Sprints closed → erlaubt', () => {
    insertSprint(milestoneId, 'closed', 22)
    const updated = patchMilestoneStatus(db, milestoneId, 'completed')
    expect(updated.status).toBe('completed')
  })

  test('active → completed wenn alle Sprints cancelled → erlaubt', () => {
    insertSprint(milestoneId, 'cancelled', 23)
    const updated = patchMilestoneStatus(db, milestoneId, 'completed')
    expect(updated.status).toBe('completed')
  })

  test('active → completed wenn gemischte terminale Sprints (completed+closed+cancelled) → erlaubt', () => {
    insertSprint(milestoneId, 'completed', 30)
    insertSprint(milestoneId, 'closed', 31)
    insertSprint(milestoneId, 'cancelled', 32)
    const updated = patchMilestoneStatus(db, milestoneId, 'completed')
    expect(updated.status).toBe('completed')
  })

  test('active → completed ohne zugeordnete Sprints (0 Sprints) → erlaubt', () => {
    // Milestone hat gar keine Sprints — allSprintsDone = true (kein Blocker)
    const updated = patchMilestoneStatus(db, milestoneId, 'completed')
    expect(updated.status).toBe('completed')
  })

  test('active → completed mit gemischten (ein blocking, ein terminal) → 422', () => {
    insertSprint(milestoneId, 'completed', 40)
    insertSprint(milestoneId, 'active', 41)
    let err
    try {
      patchMilestoneStatus(db, milestoneId, 'completed')
    } catch (e) {
      err = e
    }
    expect(err.statusCode).toBe(422)
    // Nur der blocking Sprint in der Meldung
    expect(err.message).toContain('DD#41')
    expect(err.message).not.toContain('DD#40')
  })

  // --- DD-357 Regression: completed → active bleibt unberührt ---

  test('Reopen completed → active weiterhin erlaubt — kein SPRINTS_NOT_DONE (DD-357)', () => {
    // Erst Milestone auf completed setzen (keine Sprints → erlaubt)
    patchMilestoneStatus(db, milestoneId, 'completed')
    // Dann Reopen: completed → active darf NICHT durch DD-512-Guard geblockt werden
    const updated = patchMilestoneStatus(db, milestoneId, 'active')
    expect(updated.status).toBe('active')
  })

  // I02: Idempotenz — completed → completed ist ein no-op.
  // Der Sprint-Query/Guard darf NICHT feuern, weil `from !== 'active'`.
  // Ein blocking active Sprint darf das no-op nicht stören.
  test('completed → completed mit blocking active Sprint → no-op, kein Throw (I02)', () => {
    // Milestone direkt auf completed setzen (keine Sprints → erlaubt)
    patchMilestoneStatus(db, milestoneId, 'completed')
    // Jetzt einen aktiven (blockenden) Sprint zuordnen — NACHDEM der Milestone completed ist.
    // Dies simuliert einen Zustand, der in der Praxis nicht entstehen sollte,
    // aber die Guard-Logik muss trotzdem korrekt sein: from=completed, to=completed → no-op.
    insertSprint(milestoneId, 'active', 99)

    // completed → completed: canMilestoneTransition gibt reason='no-op' zurück,
    // patchMilestoneStatus gibt den Milestone unverändert zurück — kein Throw.
    let result
    expect(() => {
      result = patchMilestoneStatus(db, milestoneId, 'completed')
    }).not.toThrow()
    expect(result.status).toBe('completed')

    // DB bleibt completed
    const row = db.prepare('SELECT status FROM milestones WHERE id = ?').get(milestoneId)
    expect(row.status).toBe('completed')
  })
})
