import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'
import {
  canMilestoneTransition,
  MILESTONE_STATUSES,
} from '../../server/lib/lifecycle.js'
import {
  patchMilestoneStatus,
  MilestoneLifecycleError,
} from '../../server/lib/milestoneLifecycle.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'
const MIG_033 = '033_v3_milestone_deferred.sql'
const MIG_038 = '038_v3_milestones_status_lifecycle.sql'

describe('T08 — canMilestoneTransition (Pure Lifecycle Function)', () => {
  test('Forward-Path: planning → active jeweils erlaubt', () => {
    expect(canMilestoneTransition('planning', 'active').allowed).toBe(true)
  })

  // DD-512: active → completed erfordert jetzt ctx.allSprintsDone=true.
  // Ohne ctx wird der Guard geblockt (missing = false-Semantik — nicht bypassbar durch Omission).
  test('Forward-Path: active → completed erlaubt wenn allSprintsDone=true', () => {
    expect(canMilestoneTransition('active', 'completed', { allSprintsDone: true }).allowed).toBe(true)
  })

  test('Forward-Path: active → completed geblockt wenn allSprintsDone fehlt (Guard nicht bypassbar)', () => {
    const r = canMilestoneTransition('active', 'completed')
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/offene Sprints/i)
  })

  test('Cancellation: planning|active → cancelled mit Notes erlaubt', () => {
    expect(canMilestoneTransition('planning', 'cancelled', { cancellationNotes: 'Skipped' }).allowed).toBe(true)
    expect(canMilestoneTransition('active', 'cancelled', { cancellationNotes: 'Stop' }).allowed).toBe(true)
  })

  test('Cancellation ohne Notes → 400 (Pflicht-Field)', () => {
    const r = canMilestoneTransition('planning', 'cancelled')
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/cancellationNotes ist Pflicht/i)
  })

  test('Cancellation aus completed-State → abgelehnt (terminal nicht reversibel)', () => {
    const r = canMilestoneTransition('completed', 'cancelled', { cancellationNotes: 'late cancel' })
    expect(r.allowed).toBe(false)
  })

  // DD-357: completed → active ist jetzt sanktionierter Reopen (PO-Entscheid).
  test('Reopen completed → active ist erlaubt (DD-357)', () => {
    expect(canMilestoneTransition('completed', 'active').allowed).toBe(true)
  })

  // DD-524: cancelled → planning ist sanktionierter Reopen (Re-Entry an den
  // initialen aktiven Zustand des Forward-Modells).
  test('Reopen cancelled → planning ist erlaubt (DD-524)', () => {
    expect(canMilestoneTransition('cancelled', 'planning').allowed).toBe(true)
  })

  test('cancelled → active|completed bleiben abgelehnt (nur planning-Reopen)', () => {
    expect(canMilestoneTransition('cancelled', 'active').allowed).toBe(false)
    expect(canMilestoneTransition('cancelled', 'completed').allowed).toBe(false)
  })

  test('Backward-Transitions: completed → planning + active → planning bleiben abgelehnt', () => {
    expect(canMilestoneTransition('completed', 'planning').allowed).toBe(false)
    expect(canMilestoneTransition('active', 'planning').allowed).toBe(false)
  })

  test('Skip-Transition planning → completed (übersprungen active) ist abgelehnt', () => {
    expect(canMilestoneTransition('planning', 'completed').allowed).toBe(false)
  })

  test('Idempotenz: from === to liefert no-op', () => {
    const r = canMilestoneTransition('active', 'active')
    expect(r.allowed).toBe(true)
    expect(r.reason).toBe('no-op')
  })

  test('Unbekannter Ausgangsstatus → abgelehnt mit klarem reason', () => {
    const r = canMilestoneTransition('weirdo', 'active')
    expect(r.allowed).toBe(false)
    expect(r.reason).toMatch(/Unbekannter Milestone-Status/i)
  })

  test('MILESTONE_STATUSES enthält exakt die 4 erwarteten Werte', () => {
    expect([...MILESTONE_STATUSES].sort()).toEqual(['active', 'cancelled', 'completed', 'planning'])
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
    const r = db.prepare(
      `INSERT INTO milestones (project_id, name, target_date, status) VALUES (?, ?, ?, ?)`
    ).run(2, 'M-Test', '2026-08-12', 'planning')
    milestoneId = Number(r.lastInsertRowid)
    auditCalls = []
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('Happy-Path: planning → active wird persistiert + Audit-Log getriggert', () => {
    const auditLog = (table, id, action, oldVal, newVal, agentId) => {
      auditCalls.push({ table, id, action, oldVal, newVal, agentId })
    }
    const updated = patchMilestoneStatus(db, milestoneId, 'active', { agentId: 'po', auditLog })
    expect(updated.status).toBe('active')

    const row = db.prepare('SELECT status FROM milestones WHERE id = ?').get(milestoneId)
    expect(row.status).toBe('active')

    expect(auditCalls).toHaveLength(1)
    expect(auditCalls[0]).toMatchObject({
      table: 'milestones',
      id: milestoneId,
      action: 'milestone_status_change',
      oldVal: { status: 'planning' },
      newVal: { status: 'active' },
      agentId: 'po',
    })
  })

  test('Invalid-Transition planning → completed → 400 TRANSITION_INVALID, kein Update, kein Audit', () => {
    const auditLog = () => auditCalls.push('called')
    expect(() => patchMilestoneStatus(db, milestoneId, 'completed', { auditLog }))
      .toThrow(MilestoneLifecycleError)
    expect(auditCalls).toEqual([])
    const row = db.prepare('SELECT status FROM milestones WHERE id = ?').get(milestoneId)
    expect(row.status).toBe('planning')
  })

  test('Idempotenz: planning → planning ist no-op, kein Audit', () => {
    const auditLog = () => auditCalls.push('called')
    const updated = patchMilestoneStatus(db, milestoneId, 'planning', { auditLog })
    expect(updated.status).toBe('planning')
    expect(auditCalls).toEqual([])
  })

  test('Cancellation: planning → cancelled mit Notes wird persistiert', () => {
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
    expect(row.status).toBe('planning')
  })

  test('Milestone not found → 404 NOT_FOUND', () => {
    let err
    try { patchMilestoneStatus(db, 99999, 'active') } catch (e) { err = e }
    expect(err).toBeInstanceOf(MilestoneLifecycleError)
    expect(err.statusCode).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
  })

  test('Full-Forward-Path: planning → active → completed in 2 Schritten persistent', () => {
    patchMilestoneStatus(db, milestoneId, 'active', { auditLog: () => {} })
    patchMilestoneStatus(db, milestoneId, 'completed', { auditLog: () => {} })
    const row = db.prepare('SELECT status FROM milestones WHERE id = ?').get(milestoneId)
    expect(row.status).toBe('completed')
  })
})
