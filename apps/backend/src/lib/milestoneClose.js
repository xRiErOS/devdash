// DD-277 — Milestone-Close mit Issue-Triage.
// DD2-155 (2026-06-29): Status-Vokabular vereinheitlicht — Issue done → completed.
//
// Beim Abschließen eines Meilensteins (status → 'completed' oder 'cancelled')
// erhalten nicht-terminale Issues eine explizite Triage:
//   - 'backlog'   → assigned_sprint=NULL, milestone-Text geleert, Status auf
//                   'refined' (wenn planned) bzw. 'new' (wenn new) zurueck.
//   - 'completed' → status='completed', completed_at=NOW. PO-Triggered Direct-Set.
//   - 'cancelled' → status='cancelled', completed_at=NOW, result-Annex.
//
// Helper ist pure: keine Express-Abhaengigkeiten, akzeptiert better-sqlite3-DB
// + Audit-Log-Funktion (Dependency-Injection fuer Tests).

export const VALID_TARGETS = new Set(['backlog', 'completed', 'cancelled'])
export const VALID_TERMINAL_STATUS = new Set(['completed', 'cancelled'])

export class MilestoneCloseError extends Error {
  constructor(message, { statusCode = 400, field } = {}) {
    super(message)
    this.statusCode = statusCode
    if (field) this.field = field
  }
}

/**
 * Liefert nicht-terminale Issues eines Milestones.
 * Verkettung: backlog.assigned_sprint → sprints.id, sprints.milestone_id = ?
 * Terminale Stati: completed, passed, cancelled.
 */
export function listOpenIssuesForMilestone(db, milestoneId) {
  return db.prepare(`
    SELECT b.id, b.project_number, b.title, b.type, b.status, b.priority,
           b.assigned_sprint, s.name AS sprint_name
      FROM backlog b
      JOIN sprints s ON b.assigned_sprint = s.id
     WHERE s.milestone_id = ?
       AND b.status NOT IN ('completed', 'passed', 'cancelled')
     ORDER BY b.priority ASC, b.id ASC
  `).all(milestoneId)
}

function applyAssignment(db, milestone, issue, target, auditLog) {
  const oldStatus = issue.status
  const oldSprint = issue.assigned_sprint

  if (target === 'backlog') {
    // Zurueck in den ungeplanten Backlog: Sprint-Verknuepfung loesen + Status
    // sinnvoll zuruecksetzen, damit das Item neu eingeplant werden kann.
    let newStatus = oldStatus
    if (oldStatus === 'planned' || oldStatus === 'in_progress') newStatus = 'refined'
    db.prepare(`
      UPDATE backlog
         SET assigned_sprint = NULL,
             milestone = NULL,
             status = ?
       WHERE id = ?
    `).run(newStatus, issue.id)
    auditLog('backlog', issue.id, 'milestone_close_backlog',
      { status: oldStatus, assigned_sprint: oldSprint, milestone_id: milestone.id },
      { status: newStatus, assigned_sprint: null, milestone_id: null },
      'milestone-close')
    return { id: issue.id, target, from_status: oldStatus, to_status: newStatus }
  }

  if (target === 'completed') {
    // PO-Triggered direkter Direct-Set; Audit-Log markiert die Sonderbehandlung.
    db.prepare(`
      UPDATE backlog
         SET status = 'completed',
             completed_at = CURRENT_TIMESTAMP
       WHERE id = ?
    `).run(issue.id)
    auditLog('backlog', issue.id, 'milestone_close_completed',
      { status: oldStatus },
      { status: 'completed', milestone_id: milestone.id },
      'milestone-close')
    return { id: issue.id, target, from_status: oldStatus, to_status: 'completed' }
  }

  if (target === 'cancelled') {
    const reason = `Milestone "${milestone.name}" closed`
    // result-Feld erhaelt einen Cancel-Reason-Annex (statt zu ueberschreiben).
    const old = db.prepare('SELECT result FROM backlog WHERE id = ?').get(issue.id)
    const oldResult = old?.result || ''
    const annex = `cancelled_reason: ${JSON.stringify(reason)}`
    const newResult = oldResult ? `${oldResult.trim()}\n\n${annex}` : annex
    db.prepare(`
      UPDATE backlog
         SET status = 'cancelled',
             completed_at = CURRENT_TIMESTAMP,
             result = ?
       WHERE id = ?
    `).run(newResult, issue.id)
    auditLog('backlog', issue.id, 'milestone_close_cancelled',
      { status: oldStatus },
      { status: 'cancelled', reason, milestone_id: milestone.id },
      'milestone-close')
    return { id: issue.id, target, from_status: oldStatus, to_status: 'cancelled', reason }
  }

  throw new MilestoneCloseError(`Unbekanntes target: ${target}`, { field: 'assignments[].target' })
}

/**
 * Schließt einen Milestone mit Issue-Triage.
 *
 * @param db better-sqlite3 instance
 * @param opts.milestoneId   number (Milestone-PK)
 * @param opts.targetStatus  'completed'|'cancelled'
 * @param opts.assignments   [{issue_id, target}], target in VALID_TARGETS
 * @param opts.auditLog      optional (table, recordId, action, oldVal, newVal, agent) => void
 */
export function closeMilestoneWithIssues(db, { milestoneId, targetStatus, assignments }, { auditLog = () => {} } = {}) {
  if (!Number.isInteger(milestoneId) || milestoneId <= 0) {
    throw new MilestoneCloseError('milestoneId muss positive Ganzzahl sein', { field: 'milestoneId' })
  }
  if (!VALID_TERMINAL_STATUS.has(targetStatus)) {
    throw new MilestoneCloseError(
      `target_status muss eines von ${[...VALID_TERMINAL_STATUS].join(', ')} sein`,
      { field: 'target_status' }
    )
  }
  if (!Array.isArray(assignments)) {
    throw new MilestoneCloseError('assignments muss ein Array sein', { field: 'assignments' })
  }
  for (const a of assignments) {
    if (!a || !Number.isInteger(a.issue_id)) {
      throw new MilestoneCloseError('assignments[].issue_id Pflicht', { field: 'assignments[].issue_id' })
    }
    if (!VALID_TARGETS.has(a.target)) {
      throw new MilestoneCloseError(
        `assignments[].target muss eines von ${[...VALID_TARGETS].join(', ')} sein`,
        { field: 'assignments[].target' }
      )
    }
  }

  const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(milestoneId)
  if (!milestone) throw new MilestoneCloseError('Milestone not found', { statusCode: 404 })

  // Erlaubte Quell-Stati: non-terminal (new|planned|in_progress) → 'completed'/'cancelled'. Bereits terminal → 409.
  if (milestone.status === 'completed' || milestone.status === 'cancelled') {
    throw new MilestoneCloseError(
      `Milestone ist bereits ${milestone.status}`,
      { statusCode: 409 }
    )
  }

  const open = listOpenIssuesForMilestone(db, milestoneId)
  const openMap = new Map(open.map(i => [i.id, i]))

  // Pflicht: alle offenen Issues muessen ein Assignment haben.
  const missingAssignment = open.filter(i => !assignments.some(a => a.issue_id === i.id))
  if (missingAssignment.length > 0) {
    throw new MilestoneCloseError(
      `Fehlende assignments fuer Issues: ${missingAssignment.map(i => i.id).join(', ')}`,
      { field: 'assignments', statusCode: 400 }
    )
  }

  const processed = []
  const failed = []

  // DD-277: explizite BEGIN/COMMIT (statt db.transaction()) — vermeidet ein
  // beobachtetes Visibility-Problem in better-sqlite3, bei dem Updates innerhalb
  // einer wrapper-Transaktion in WAL-Mode nicht zu externen Readern propagieren.
  db.exec('BEGIN IMMEDIATE')
  let committed = false
  try {
    for (const a of assignments) {
      const issue = openMap.get(a.issue_id)
      if (!issue) {
        failed.push({ id: a.issue_id, reason: 'nicht offen oder nicht im Milestone' })
        continue
      }
      try {
        processed.push(applyAssignment(db, milestone, issue, a.target, auditLog))
      } catch (e) {
        failed.push({ id: a.issue_id, reason: e.message })
      }
    }

    // Milestone-Status final umschalten.
    db.prepare('UPDATE milestones SET status = ? WHERE id = ?').run(targetStatus, milestoneId)
    auditLog('milestones', milestoneId, 'status_change',
      { status: milestone.status },
      { status: targetStatus, processed: processed.length },
      'milestone-close')

    db.exec('COMMIT')
    committed = true
  } finally {
    if (!committed) {
      try { db.exec('ROLLBACK') } catch { /* no-op */ }
    }
  }

  return {
    milestone_id: milestoneId,
    milestone_name: milestone.name,
    target_status: targetStatus,
    processed,
    failed,
  }
}
