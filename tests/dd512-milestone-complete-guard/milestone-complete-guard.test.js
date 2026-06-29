// DD-512: Milestone-Lifecycle-Guard — completed erst wenn alle Sprints terminal (REQ-47/T10)
//
// DD2-155: terminal ≡ completed | cancelled (Sprint-Status closed entfernt).
// Blocking-Sprints: new | planned | in_progress | to_review.

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'
import {
  canMilestoneTransition,
} from '../../apps/backend/src/lib/lifecycle.js'
import {
  patchMilestoneStatus,
  MilestoneLifecycleError,
} from '../../apps/backend/src/lib/milestoneLifecycle.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_033 = '033_v3_milestone_deferred.sql'
const MIG_038 = '038_v3_milestones_status_lifecycle.sql'
// DD2-155: spec_path (039) ist Voraussetzung für den milestones-Recreate in 065,
// 065 vereinheitlicht das Status-Vokabular (planning→new, active→in_progress, …).
const MIG_039 = '039_v3_milestones_spec_path.sql'
const MIG_065 = '065_v3_dd2_155_status_unify.sql'

// ---------------------------------------------------------------------------
// Part A — canMilestoneTransition pure-function unit tests (DD-512)
// ---------------------------------------------------------------------------

describe('DD-512 — canMilestoneTransition: in_progress → completed guard', () => {
  test('erlaubt wenn allSprintsDone=true (keine offenen Sprints)', () => {
    const r = canMilestoneTransition('in_progress', 'completed', {
      allSprintsDone: true,
      openSprints: [],
    })
    expect(r.allowed).toBe(true)
    expect(r.reason).toBe('')
  })

  test('geblockt wenn allSprintsDone=false — reason enthält open-sprint Bezeichner', () => {
    const r = canMilestoneTransition('in_progress', 'completed', {
      allSprintsDone: false,
      openSprints: ['DD#15', 'DD#16'],
    })
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/offene Sprints/i)
    expect(r.reason).toContain('DD#15')
    expect(r.reason).toContain('DD#16')
  })

  test('geblockt wenn allSprintsDone=false — einzelner Sprint in reason', () => {
    const r = canMilestoneTransition('in_progress', 'completed', {
      allSprintsDone: false,
      openSprints: ['DD#7'],
    })
    expect(r.allowed).toBe(false)
    expect(r.reason).toContain('DD#7')
  })

  test('geblockt wenn ctx.allSprintsDone fehlt (Guard nicht bypassbar durch Omission)', () => {
    const r = canMilestoneTransition('in_progress', 'completed')
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/offene Sprints/i)
  })

  test('geblockt wenn ctx.allSprintsDone=false aber openSprints leer — generische Meldung', () => {
    const r = canMilestoneTransition('in_progress', 'completed', {
      allSprintsDone: false,
      openSprints: [],
    })
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/offene Sprints/i)
    // Fallback-Text wenn keine konkreten Sprint-Keys vorhanden
    expect(r.reason).toContain('unbekannte Sprints')
  })

  // DD-357 Regression: Reopen completed → in_progress bleibt OHNE Guard
  test('Reopen completed → in_progress bleibt erlaubt (DD-357 — kein allSprintsDone-Guard)', () => {
    const r = canMilestoneTransition('completed', 'in_progress')
    expect(r.allowed).toBe(true)
  })

  // Auch mit allSprintsDone=false — der Reopen-Pfad ignoriert den Guard
  test('Reopen completed → in_progress auch wenn allSprintsDone=false erlaubt', () => {
    const r = canMilestoneTransition('completed', 'in_progress', { allSprintsDone: false })
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
    applyMigration(db, MIG_039, { logDir })
    applyMigration(db, MIG_065, { logDir })
    auditCalls = []
  }

  function insertMilestone(status = 'in_progress') {
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
    milestoneId = insertMilestone('in_progress')
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  // --- Blocking cases (422) ---

  test('in_progress → completed mit einem in_progress Sprint → 422 SPRINTS_NOT_DONE', () => {
    insertSprint(milestoneId, 'in_progress',1)
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
    expect(row.status).toBe('in_progress')
  })

  test('in_progress → completed mit einem new Sprint → 422 (new ist blocking)', () => {
    insertSprint(milestoneId, 'new',2)
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

  test('in_progress → completed mit einem to_review Sprint → 422 (to_review ist blocking)', () => {
    insertSprint(milestoneId, 'to_review',3)
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
    insertSprint(milestoneId, 'in_progress',10)
    insertSprint(milestoneId, 'new',11)
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

  test('in_progress → completed wenn alle Sprints completed → erlaubt', () => {
    insertSprint(milestoneId, 'completed', 20)
    insertSprint(milestoneId, 'completed', 21)
    const updated = patchMilestoneStatus(db, milestoneId, 'completed')
    expect(updated.status).toBe('completed')
  })

  test('in_progress → completed wenn alle Sprints completed (Ex-closed) → erlaubt', () => {
    insertSprint(milestoneId, 'completed',22)
    const updated = patchMilestoneStatus(db, milestoneId, 'completed')
    expect(updated.status).toBe('completed')
  })

  test('in_progress → completed wenn alle Sprints cancelled → erlaubt', () => {
    insertSprint(milestoneId, 'cancelled', 23)
    const updated = patchMilestoneStatus(db, milestoneId, 'completed')
    expect(updated.status).toBe('completed')
  })

  test('in_progress → completed wenn gemischte terminale Sprints (completed+cancelled) → erlaubt', () => {
    insertSprint(milestoneId, 'completed', 30)
    insertSprint(milestoneId, 'completed',31)
    insertSprint(milestoneId, 'cancelled', 32)
    const updated = patchMilestoneStatus(db, milestoneId, 'completed')
    expect(updated.status).toBe('completed')
  })

  test('in_progress → completed ohne zugeordnete Sprints (0 Sprints) → erlaubt', () => {
    // Milestone hat gar keine Sprints — allSprintsDone = true (kein Blocker)
    const updated = patchMilestoneStatus(db, milestoneId, 'completed')
    expect(updated.status).toBe('completed')
  })

  test('in_progress → completed mit gemischten (ein blocking, ein terminal) → 422', () => {
    insertSprint(milestoneId, 'completed', 40)
    insertSprint(milestoneId, 'in_progress',41)
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

  // --- DD-357 Regression: completed → in_progress bleibt unberührt ---

  test('Reopen completed → in_progress weiterhin erlaubt — kein SPRINTS_NOT_DONE (DD-357)', () => {
    // Erst Milestone auf completed setzen (keine Sprints → erlaubt)
    patchMilestoneStatus(db, milestoneId, 'completed')
    // Dann Reopen: completed → in_progress darf NICHT durch DD-512-Guard geblockt werden
    const updated = patchMilestoneStatus(db, milestoneId, 'in_progress')
    expect(updated.status).toBe('in_progress')
  })

  // I02: Idempotenz — completed → completed ist ein no-op.
  // Der Sprint-Query/Guard darf NICHT feuern, weil `from !== 'in_progress'`.
  // Ein blocking in_progress Sprint darf das no-op nicht stören.
  test('completed → completed mit blocking active Sprint → no-op, kein Throw (I02)', () => {
    // Milestone direkt auf completed setzen (keine Sprints → erlaubt)
    patchMilestoneStatus(db, milestoneId, 'completed')
    // Jetzt einen aktiven (blockenden) Sprint zuordnen — NACHDEM der Milestone completed ist.
    // Dies simuliert einen Zustand, der in der Praxis nicht entstehen sollte,
    // aber die Guard-Logik muss trotzdem korrekt sein: from=completed, to=completed → no-op.
    insertSprint(milestoneId, 'in_progress',99)

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
