import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'
import {
  canMilestoneTransition,
  MILESTONE_STATUSES,
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

describe('T08 — canMilestoneTransition (Pure Lifecycle Function)', () => {
  test('Forward-Path: new → in_progress jeweils erlaubt', () => {
    expect(canMilestoneTransition('new', 'in_progress').allowed).toBe(true)
  })

  // DD-512: in_progress → completed erfordert jetzt ctx.allSprintsDone=true.
  // Ohne ctx wird der Guard geblockt (missing = false-Semantik — nicht bypassbar durch Omission).
  test('Forward-Path: in_progress → completed erlaubt wenn allSprintsDone=true', () => {
    expect(canMilestoneTransition('in_progress', 'completed', { allSprintsDone: true }).allowed).toBe(true)
  })

  test('Forward-Path: in_progress → completed geblockt wenn allSprintsDone fehlt (Guard nicht bypassbar)', () => {
    const r = canMilestoneTransition('in_progress', 'completed')
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/offene Sprints/i)
  })

  test('Cancellation: new|in_progress → cancelled mit Notes erlaubt', () => {
    expect(canMilestoneTransition('new', 'cancelled', { cancellationNotes: 'Skipped' }).allowed).toBe(true)
    expect(canMilestoneTransition('in_progress', 'cancelled', { cancellationNotes: 'Stop' }).allowed).toBe(true)
  })

  test('Cancellation ohne Notes → 400 (Pflicht-Field)', () => {
    const r = canMilestoneTransition('new', 'cancelled')
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/cancellationNotes ist Pflicht/i)
  })

  test('Cancellation aus completed-State → abgelehnt (terminal nicht reversibel)', () => {
    const r = canMilestoneTransition('completed', 'cancelled', { cancellationNotes: 'late cancel' })
    expect(r.allowed).toBe(false)
  })

  // DD-357: completed → in_progress ist jetzt sanktionierter Reopen (PO-Entscheid).
  test('Reopen completed → in_progress ist erlaubt (DD-357)', () => {
    expect(canMilestoneTransition('completed', 'in_progress').allowed).toBe(true)
  })

  // DD-524: cancelled → new ist sanktionierter Reopen (Re-Entry an den
  // initialen Zustand des Forward-Modells).
  test('Reopen cancelled → new ist erlaubt (DD-524)', () => {
    expect(canMilestoneTransition('cancelled', 'new').allowed).toBe(true)
  })

  test('cancelled → in_progress|completed bleiben abgelehnt (nur new-Reopen)', () => {
    expect(canMilestoneTransition('cancelled', 'in_progress').allowed).toBe(false)
    expect(canMilestoneTransition('cancelled', 'completed').allowed).toBe(false)
  })

  test('Backward-Transitions: completed → new + in_progress → new bleiben abgelehnt', () => {
    expect(canMilestoneTransition('completed', 'new').allowed).toBe(false)
    expect(canMilestoneTransition('in_progress', 'new').allowed).toBe(false)
  })

  test('Skip-Transition new → completed (übersprungen in_progress) ist abgelehnt', () => {
    expect(canMilestoneTransition('new', 'completed').allowed).toBe(false)
  })

  test('Idempotenz: from === to liefert no-op', () => {
    const r = canMilestoneTransition('in_progress', 'in_progress')
    expect(r.allowed).toBe(true)
    expect(r.reason).toBe('no-op')
  })

  test('Unbekannter Ausgangsstatus → abgelehnt mit klarem reason', () => {
    const r = canMilestoneTransition('weirdo', 'in_progress')
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/Unbekannter Milestone-Status/i)
  })

  test('MILESTONE_STATUSES enthält exakt die 5 erwarteten Werte', () => {
    expect([...MILESTONE_STATUSES].sort()).toEqual(['cancelled', 'completed', 'in_progress', 'new', 'planned'])
  })
})

describe('T08 — patchMilestoneStatus (DB-Helper mit Audit-DI)', () => {
  let db, logDir, milestoneId, auditCalls

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-mlc-'))
    applyMigration(db, MIG_029, { logDir })
    applyMigration(db, MIG_033, { logDir })
    applyMigration(db, MIG_038, { logDir })
    applyMigration(db, MIG_039, { logDir })
    applyMigration(db, MIG_065, { logDir })
    const r = db.prepare(
      `INSERT INTO milestones (project_id, name, target_date, status) VALUES (?, ?, ?, ?)`
    ).run(2, 'M-Test', '2026-08-12', 'new')
    milestoneId = Number(r.lastInsertRowid)
    auditCalls = []
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('Happy-Path: new → in_progress wird persistiert + Audit-Log getriggert', () => {
    const auditLog = (table, id, action, oldVal, newVal, agentId) => {
      auditCalls.push({ table, id, action, oldVal, newVal, agentId })
    }
    const updated = patchMilestoneStatus(db, milestoneId, 'in_progress', { agentId: 'po', auditLog })
    expect(updated.status).toBe('in_progress')

    const row = db.prepare('SELECT status FROM milestones WHERE id = ?').get(milestoneId)
    expect(row.status).toBe('in_progress')

    expect(auditCalls).toHaveLength(1)
    expect(auditCalls[0]).toMatchObject({
      table: 'milestones',
      id: milestoneId,
      action: 'milestone_status_change',
      oldVal: { status: 'new' },
      newVal: { status: 'in_progress' },
      agentId: 'po',
    })
  })

  test('Invalid-Transition new → completed → 400 TRANSITION_INVALID, kein Update, kein Audit', () => {
    const auditLog = () => auditCalls.push('called')
    expect(() => patchMilestoneStatus(db, milestoneId, 'completed', { auditLog }))
      .toThrow(MilestoneLifecycleError)
    expect(auditCalls).toEqual([])
    const row = db.prepare('SELECT status FROM milestones WHERE id = ?').get(milestoneId)
    expect(row.status).toBe('new')
  })

  test('Idempotenz: new → new ist no-op, kein Audit', () => {
    const auditLog = () => auditCalls.push('called')
    const updated = patchMilestoneStatus(db, milestoneId, 'new', { auditLog })
    expect(updated.status).toBe('new')
    expect(auditCalls).toEqual([])
  })

  test('Cancellation: new → cancelled mit Notes wird persistiert', () => {
    const auditLog = (...args) => auditCalls.push(args)
    const updated = patchMilestoneStatus(db, milestoneId, 'cancelled', {
      cancellationNotes: 'Scope-Cut',
      auditLog,
    })
    expect(updated.status).toBe('cancelled')
    expect(auditCalls).toHaveLength(1)
    const [, , action, , newVal] = auditCalls[0]
    expect(action).toBe('milestone_status_change')
    expect(newVal.cancellationNotes).toBe('Scope-Cut')
  })

  test('Cancellation ohne Notes → 400, kein Update', () => {
    expect(() => patchMilestoneStatus(db, milestoneId, 'cancelled'))
      .toThrow(/cancellationNotes ist Pflicht/i)
    const row = db.prepare('SELECT status FROM milestones WHERE id = ?').get(milestoneId)
    expect(row.status).toBe('new')
  })

  test('Milestone not found → 404 NOT_FOUND', () => {
    let err
    try { patchMilestoneStatus(db, 99999, 'active') } catch (e) { err = e }
    expect(err).toBeInstanceOf(MilestoneLifecycleError)
    expect(err.statusCode).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
  })

  test('Full-Forward-Path: new → in_progress → completed in 2 Schritten persistent', () => {
    patchMilestoneStatus(db, milestoneId, 'in_progress', { auditLog: () => {} })
    patchMilestoneStatus(db, milestoneId, 'completed', { auditLog: () => {} })
    const row = db.prepare('SELECT status FROM milestones WHERE id = ?').get(milestoneId)
    expect(row.status).toBe('completed')
  })
})
