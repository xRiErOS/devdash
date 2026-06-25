// reviewMarker.js — DD-507
//
// Sprint-level Review-Abschluss-Marker (sprints.review_submitted_at) +
// Auto-Runde-bei-Rework-Logik. Reine DB-Helper, die auditLog injiziert
// bekommen — analog zu milestoneClose.js. server/api.js exportiert die App
// nicht, deshalb lebt die testbare Logik hier.
//
// Semantik des Markers:
//   - OFFEN      → review_submitted_at IS NULL
//   - SUBMITTED  → review_submitted_at traegt einen Timestamp
//
// Solange ein Sprint submitted ist, sind Review-Runden-Edits fuer Issues in
// diesem Sprint gesperrt (409) — ABER nur, wenn die letzte Runde des Issues
// bereits ein entschiedenes Verdict (passed/not_passed) traegt (DD-662). Eine
// noch offene (pending) oder gar nicht existierende Runde bleibt editierbar,
// sonst faengt ein verdictloser Submit (DD#81) die Issues unentrinnbar im
// to_review. Wege, den Marker zurueckzusetzen:
//   - Rework-Transition (Issue → to_review mit letztem Verdict not_passed) →
//     maybeAutoOpenReworkRound (automatisch).
//   - Manuelles Reopen via reopenReviewRound (DD-662, neues review-reopen-Verb).

export class ReviewEditLockedError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ReviewEditLockedError'
    this.status = 409
  }
}

export const REVIEW_EDIT_LOCKED_MESSAGE =
  'Review ist abgeschlossen — vor Bearbeitung neue Runde via Rework (to_review) öffnen'

// Hat der Sprint eine submitted Review-Iteration?
export function isSprintReviewSubmitted(db, sprintId) {
  if (sprintId == null) return false
  const row = db.prepare('SELECT review_submitted_at FROM sprints WHERE id = ?').get(sprintId)
  return !!(row && row.review_submitted_at != null)
}

// Edit-Gate: wirft ReviewEditLockedError (409), wenn der dem Issue zugewiesene
// Sprint eine submitted Review-Iteration hat UND die letzte Runde des Issues
// bereits ein entschiedenes Verdict traegt. Resolved backlogId → assigned_sprint.
//
// DD-662: Die submitted-Sperre greift NICHT mehr, solange das Issue noch keine
// entschiedene Runde hat (pending oder gar keine). So kann der PO nach einem
// (ggf. vorzeitigen) Sprint-Review-Submit das erste Verdict trotzdem noch
// erfassen — der verdictlose Submit faengt das Issue nicht mehr im to_review.
export function assertReviewEditable(db, backlogId) {
  const item = db.prepare('SELECT assigned_sprint FROM backlog WHERE id = ?').get(backlogId)
  const sprintId = item ? item.assigned_sprint : null
  if (!isSprintReviewSubmitted(db, sprintId)) return

  const latest = db.prepare(
    'SELECT review_status FROM review_feedback WHERE backlog_id = ? ORDER BY round_number DESC, id DESC LIMIT 1'
  ).get(backlogId)
  const decided = !!(latest && latest.review_status !== 'pending')
  if (decided) {
    throw new ReviewEditLockedError(REVIEW_EDIT_LOCKED_MESSAGE)
  }
}

// "Review abschliessen" — setzt review_submitted_at = CURRENT_TIMESTAMP.
// Re-submit aktualisiert nur den Timestamp (idempotent-ish). Kein all-passed
// Gate hier — der gehoert zu sprint complete.
// Returns the updated sprint row, oder null wenn der Sprint nicht existiert.
export function submitSprintReview(db, sprintId, auditFn) {
  const before = db.prepare('SELECT * FROM sprints WHERE id = ?').get(sprintId)
  if (!before) return null

  db.prepare("UPDATE sprints SET review_submitted_at = CURRENT_TIMESTAMP WHERE id = ?").run(sprintId)
  const after = db.prepare('SELECT * FROM sprints WHERE id = ?').get(sprintId)

  if (auditFn) {
    auditFn('sprints', sprintId, 'review_submitted',
      { review_submitted_at: before.review_submitted_at ?? null },
      { review_submitted_at: after.review_submitted_at }, 'dashboard-po')
  }
  return after
}

// Auto-Runde + Reopen bei → to_review.
//
// Bedingung: newStatus === 'to_review' UND der letzte Review-Verdict des Issues
// === 'not_passed'. Nur dann (Rework) wird automatisch eine neue pending-Runde
// geoeffnet und ggf. der Sprint-Marker zurueckgesetzt. First-ever to_review
// (kein vorheriger not_passed-Verdict) oeffnet KEINE Auto-Runde.
//
// Direkter DB-Write — NICHT durch das Edit-Gate geroutet (und resettet den
// Marker ohnehin). In einer Transaktion ausgefuehrt.
//
// Returns { opened: boolean, roundId?, roundNumber?, reopenedSprintId? }.
export function maybeAutoOpenReworkRound(db, backlogId, newStatus, auditFn) {
  if (newStatus !== 'to_review') return { opened: false }

  const latest = db.prepare(
    'SELECT review_status FROM review_feedback WHERE backlog_id = ? ORDER BY round_number DESC, id DESC LIMIT 1'
  ).get(backlogId)
  if (!latest || latest.review_status !== 'not_passed') return { opened: false }

  const item = db.prepare('SELECT assigned_sprint FROM backlog WHERE id = ?').get(backlogId)
  const sprintId = item ? item.assigned_sprint : null

  let result = { opened: false }
  const tx = db.transaction(() => {
    const maxRound = db.prepare(
      'SELECT MAX(round_number) AS mr FROM review_feedback WHERE backlog_id = ?'
    ).get(backlogId)
    const roundNumber = (maxRound?.mr ?? 0) + 1
    const ins = db.prepare(
      "INSERT INTO review_feedback (backlog_id, round_number, review_status, notes) VALUES (?, ?, 'pending', NULL)"
    ).run(backlogId, roundNumber)
    const roundId = Number(ins.lastInsertRowid)

    if (auditFn) {
      auditFn('review_feedback', roundId, 'auto_round_opened',
        null, { round_number: roundNumber, reason: 'rework_to_review' }, 'system-auto')
    }

    result = { opened: true, roundId, roundNumber }

    if (sprintId != null) {
      const wasSubmitted = isSprintReviewSubmitted(db, sprintId)
      db.prepare('UPDATE sprints SET review_submitted_at = NULL WHERE id = ?').run(sprintId)
      result.reopenedSprintId = sprintId
      // Skip audit if already null to avoid noise; resetting is harmless either way.
      if (wasSubmitted && auditFn) {
        auditFn('sprints', sprintId, 'review_reopened',
          { review_submitted_at: 'submitted' },
          { review_submitted_at: null, reason: 'rework_to_review' }, 'system-auto')
      }
    }
  })
  tx()
  return result
}

// Manuelles Reopen (DD-662) — oeffnet eine frische pending-Runde auf einem
// Issue, dessen letzte Runde bereits ein entschiedenes Verdict traegt, und
// setzt den Sprint-Review-Marker zurueck. Im Gegensatz zu maybeAutoOpenReworkRound
// haengt es NICHT an einem not_passed-Verdict — es ist der explizite PO-/Agent-
// Befehl "diese Review wieder oeffnen".
//
// Idempotenz:
//   - letzte Runde bereits pending (offen) → KEINE neue Runde (alreadyOpen=true),
//     Marker wird dennoch defensiv zurueckgesetzt.
//   - keine Runde vorhanden → KEINE neue Runde (nichts zu reoeffnen), nur Marker
//     zuruecksetzen; review create legt dann Runde 1 an.
//   - letzte Runde entschieden (passed/not_passed) → frische pending-Runde.
//
// Direkter DB-Write in einer Transaktion (wie maybeAutoOpenReworkRound). DD-186
// unberuehrt: aendert keine Berechtigung, nur den Runden-/Marker-Zustand.
//
// Returns { opened, alreadyOpen, roundId?, roundNumber?, reopenedSprintId? }
// oder null, wenn das Issue nicht existiert.
export function reopenReviewRound(db, backlogId, auditFn) {
  const item = db.prepare('SELECT id, assigned_sprint FROM backlog WHERE id = ?').get(backlogId)
  if (!item) return null
  const sprintId = item.assigned_sprint

  const latest = db.prepare(
    'SELECT review_status FROM review_feedback WHERE backlog_id = ? ORDER BY round_number DESC, id DESC LIMIT 1'
  ).get(backlogId)
  const alreadyOpen = !!(latest && latest.review_status === 'pending')
  const shouldOpen = !!(latest && latest.review_status !== 'pending')

  let result = { opened: false, alreadyOpen }
  const tx = db.transaction(() => {
    if (shouldOpen) {
      const maxRound = db.prepare(
        'SELECT MAX(round_number) AS mr FROM review_feedback WHERE backlog_id = ?'
      ).get(backlogId)
      const roundNumber = (maxRound?.mr ?? 0) + 1
      const ins = db.prepare(
        "INSERT INTO review_feedback (backlog_id, round_number, review_status, notes) VALUES (?, ?, 'pending', NULL)"
      ).run(backlogId, roundNumber)
      const roundId = Number(ins.lastInsertRowid)
      if (auditFn) {
        auditFn('review_feedback', roundId, 'review_round_reopened',
          null, { round_number: roundNumber, reason: 'manual_reopen' }, 'dashboard-po')
      }
      result.opened = true
      result.roundId = roundId
      result.roundNumber = roundNumber
    }

    if (sprintId != null) {
      const wasSubmitted = isSprintReviewSubmitted(db, sprintId)
      db.prepare('UPDATE sprints SET review_submitted_at = NULL WHERE id = ?').run(sprintId)
      result.reopenedSprintId = sprintId
      if (wasSubmitted && auditFn) {
        auditFn('sprints', sprintId, 'review_reopened',
          { review_submitted_at: 'submitted' },
          { review_submitted_at: null, reason: 'manual_reopen' }, 'dashboard-po')
      }
    }
  })
  tx()
  return result
}

// ── Verdict → Status-Sync (DD-111, umgebaut ADR 2026-04-29) ─────────────────
// Diese zwei Helfer halten backlog.status mit dem letzten Review-Verdict des
// Issues synchron. Vorher als nicht-exportierte Closures in server/api.js — hier
// extrahiert (DD-507-Pattern), damit die Verdict↔Status-Invariante unittestbar
// ist. Beide werden nach jedem Verdict-Schreibweg (POST neue Runde / PATCH
// bestehende Runde) aus api.js mit (db, backlogId, auditFn) aufgerufen.

// passed-Verdict zieht das Issue auf passed (to_review/rejected → passed).
// done/cancelled sind final und bleiben unberührt.
export function autoSetPassedOnReviewPass(db, backlogId, auditFn) {
  const item = db.prepare('SELECT id, status FROM backlog WHERE id = ?').get(backlogId)
  if (!item) return
  if (item.status === 'done' || item.status === 'cancelled') return
  const latest = db.prepare(
    'SELECT review_status FROM review_feedback WHERE backlog_id = ? ORDER BY round_number DESC, id DESC LIMIT 1'
  ).get(backlogId)
  if (!latest || latest.review_status !== 'passed') return

  if (item.status === 'to_review' || item.status === 'rejected') {
    db.prepare("UPDATE backlog SET status='passed' WHERE id=?").run(backlogId)
    if (auditFn) auditFn('backlog', backlogId, 'status_change',
      { status: item.status }, { status: 'passed', reason: 'latest_review_passed' }, 'system-auto')
  }
}

// Spiegel-Trigger: not_passed-Verdict zieht das Issue auf rejected.
// done/cancelled sind final und bleiben unberührt.
export function autoSetRejectedOnReviewFail(db, backlogId, auditFn) {
  const item = db.prepare('SELECT id, status FROM backlog WHERE id = ?').get(backlogId)
  if (!item) return
  if (item.status === 'done' || item.status === 'cancelled') return
  const latest = db.prepare(
    'SELECT review_status FROM review_feedback WHERE backlog_id = ? ORDER BY round_number DESC, id DESC LIMIT 1'
  ).get(backlogId)
  if (!latest || latest.review_status !== 'not_passed') return

  // Symmetrisch zu autoSetPassedOnReviewPass (das to_review UND rejected → passed
  // zieht): ein not_passed-Verdict muss auch ein bereits-passed Issue auf rejected
  // ziehen. Ohne das passed-Bein blieb status='passed' neben einer not_passed-Runde
  // stehen → unreparierbare Divergenz (DD#81-Trap-Rest / SPF-161).
  if (item.status === 'to_review' || item.status === 'passed') {
    db.prepare("UPDATE backlog SET status='rejected' WHERE id=?").run(backlogId)
    if (auditFn) auditFn('backlog', backlogId, 'status_change',
      { status: item.status }, { status: 'rejected', reason: 'latest_review_not_passed' }, 'system-auto')
  }
}
