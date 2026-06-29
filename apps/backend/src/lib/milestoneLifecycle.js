// DD-306 (M3-S01 T08): Milestone-Status-Lifecycle Helper.
//
// Validiert Transitions über canMilestoneTransition (lifecycle.js), persistiert
// status-Updates und schreibt Audit-Log. Reine Funktion — keine Express-Abhängigkeiten.

import { canMilestoneTransition } from './lifecycle.js'

export class MilestoneLifecycleError extends Error {
  constructor(message, { statusCode = 400, code, field } = {}) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.field = field
  }
}

// DD-512 / DD2-155: Sprint-Status-Werte die als "terminal" gelten.
// Ein Meilenstein kann erst auf "completed" wechseln wenn alle zugeordneten Sprints terminal sind.
// Terminal = completed|cancelled. Blocking-Sprints sind new|planned|in_progress|to_review.
export const DONE_SPRINT_STATUSES = new Set(['completed', 'cancelled'])

/**
 * Wechselt den Lifecycle-Status eines Milestones.
 *
 * @param {Database} db                better-sqlite3 Instanz
 * @param {number}   milestoneId       Ziel-Milestone
 * @param {string}   newStatus         new|planned|in_progress|completed|cancelled
 * @param {Object}   [opts]
 * @param {string}   [opts.cancellationNotes]  Pflicht bei → cancelled
 * @param {string}   [opts.agentId='ui']       Audit-Log-Agent
 * @param {Function} [opts.auditLog]           Audit-Log-Helper (DI für Tests).
 *                                              Signatur: (table, recordId, action, oldVal, newVal, agentId)
 * @returns {Object} aktualisierter Milestone (komplette Row)
 */
export function patchMilestoneStatus(db, milestoneId, newStatus, opts = {}) {
  const { cancellationNotes = null, agentId = 'ui', auditLog = null } = opts

  const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(milestoneId)
  if (!milestone) {
    throw new MilestoneLifecycleError('Milestone not found', { statusCode: 404, code: 'NOT_FOUND' })
  }

  // DD-512: Vorbedingung für active → completed: alle zugeordneten Sprints müssen terminal sein.
  // Berechnung hier (im Caller), damit lifecycle.js rein bleibt und ctx vollständig befüllt wird.
  // Frühzeitiger 422-Throw mit SPRINTS_NOT_DONE — analog Sprint-Complete-422.
  let sprintCtx = {}
  if (newStatus === 'completed' && milestone.status === 'in_progress') {
    // JOIN mit projects um Sprint-Keys (prefix#project_number) zu bilden.
    const sprints = db.prepare(`
      SELECT s.id, s.name, s.status, s.project_number, p.prefix
      FROM sprints s
      LEFT JOIN projects p ON p.id = s.project_id
      WHERE s.milestone_id = ?
    `).all(milestoneId)

    // Sprints mit nicht-terminalem Status blockieren den Meilenstein-Abschluss.
    const openSprints = sprints
      .filter(s => !DONE_SPRINT_STATUSES.has(s.status))
      .map(s => {
        if (s.prefix && s.project_number != null) return `${s.prefix}#${s.project_number}`
        if (s.name) return s.name
        return `#${s.id}`
      })

    sprintCtx = {
      allSprintsDone: openSprints.length === 0,
      openSprints,
    }

    // Milestone mit 0 Sprints: allSprintsDone = true — kein Blocker (Spezifikation REQ-47/T10).
    if (!sprintCtx.allSprintsDone) {
      throw new MilestoneLifecycleError(
        `Meilenstein kann nicht abgeschlossen werden — offene Sprints: ${openSprints.join(', ')}`,
        { statusCode: 422, code: 'SPRINTS_NOT_DONE', field: 'status' }
      )
    }
  }

  const check = canMilestoneTransition(milestone.status, newStatus, { cancellationNotes, ...sprintCtx })
  if (!check.allowed) {
    throw new MilestoneLifecycleError(check.reason, {
      statusCode: 400,
      code: 'TRANSITION_INVALID',
      field: 'status',
    })
  }
  if (check.reason === 'no-op') {
    return milestone
  }

  const tx = db.transaction(() => {
    db.prepare('UPDATE milestones SET status = ? WHERE id = ?').run(newStatus, milestoneId)
    if (typeof auditLog === 'function') {
      auditLog('milestones', milestoneId, 'milestone_status_change',
        { status: milestone.status },
        { status: newStatus, cancellationNotes: cancellationNotes || undefined },
        agentId)
    }
  })
  tx()

  return db.prepare('SELECT * FROM milestones WHERE id = ?').get(milestoneId)
}

/**
 * milestoneCompletePreview — read-only: wie viele offene Sprints + offene Issues
 * eine Cascade-Complete terminal setzen würde (Grundlage für den TUI-Confirm, DD2-28).
 */
export function milestoneCompletePreview(db, milestoneId) {
  const sprints = db.prepare('SELECT id, status FROM sprints WHERE milestone_id = ?').all(milestoneId)
  const openSprintIds = sprints.filter(s => !DONE_SPRINT_STATUSES.has(s.status)).map(s => s.id)
  let issues = 0
  for (const sid of openSprintIds) {
    issues += db.prepare(
      "SELECT COUNT(*) AS c FROM backlog WHERE assigned_sprint = ? AND status NOT IN ('completed','cancelled')"
    ).get(sid).c
  }
  return { openSprints: openSprintIds.length, issues, openSprintIds }
}

/**
 * cascadeCompleteMilestone — PO-getriggerter Komplett-Abschluss (DD2-28). Statt am
 * SPRINTS_NOT_DONE-Gate (422) zu scheitern, setzt der PO bewusst die ganze Kette
 * terminal: offene Sprints → completed, ihre offenen Issues → completed, dann der
 * Meilenstein → completed. Nur aus 'in_progress' (die normale gated Transition).
 * Transaktional + Audit. Spiegelt cascadeDeleteSprints, nur mit Ziel-Status statt Delete.
 *
 * Bewusste, eng begrenzte Ausnahme zu DD-186 (completed sonst nur via sprint-complete):
 * Hier ist der PO der handelnde Akteur über die TUI — kein Automatik-Verdikt.
 */
export function cascadeCompleteMilestone(db, milestoneId, opts = {}) {
  const { agentId = 'ui', auditLog = null } = opts
  const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(milestoneId)
  if (!milestone) {
    throw new MilestoneLifecycleError('Milestone not found', { statusCode: 404, code: 'NOT_FOUND' })
  }
  if (milestone.status === 'completed') return milestone // idempotent
  if (milestone.status !== 'in_progress') {
    throw new MilestoneLifecycleError(
      `Cascade-Complete nur aus 'in_progress' möglich (Meilenstein ist: ${milestone.status})`,
      { statusCode: 400, code: 'TRANSITION_INVALID', field: 'status' }
    )
  }
  const tx = db.transaction(() => {
    const sprints = db.prepare('SELECT id, status FROM sprints WHERE milestone_id = ?').all(milestoneId)
    for (const s of sprints) {
      if (DONE_SPRINT_STATUSES.has(s.status)) continue
      const issues = db.prepare(
        "SELECT id, status FROM backlog WHERE assigned_sprint = ? AND status NOT IN ('completed','cancelled')"
      ).all(s.id)
      for (const it of issues) {
        db.prepare("UPDATE backlog SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(it.id)
        if (typeof auditLog === 'function') {
          auditLog('backlog', it.id, 'milestone_cascade_completed', { status: it.status }, { status: 'completed' }, agentId)
        }
      }
      db.prepare("UPDATE sprints SET status = 'completed' WHERE id = ?").run(s.id)
      if (typeof auditLog === 'function') {
        auditLog('sprints', s.id, 'milestone_cascade_complete', { status: s.status }, { status: 'completed' }, agentId)
      }
    }
    db.prepare("UPDATE milestones SET status = 'completed' WHERE id = ?").run(milestoneId)
    if (typeof auditLog === 'function') {
      auditLog('milestones', milestoneId, 'milestone_status_change',
        { status: milestone.status }, { status: 'completed', cascade: true }, agentId)
    }
  })
  tx()
  return db.prepare('SELECT * FROM milestones WHERE id = ?').get(milestoneId)
}
