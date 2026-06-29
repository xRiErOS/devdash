// lifecycle.js — ESM (matches api.js ESModule setup)
// Lifecycle state machines: backlog items + sprints

export const STATUS_COLORS = {
  new: 'yellow',
  refined: 'blue',
  planned: 'lavender',
  in_progress: 'peach',
  to_review: 'mauve',
  passed: 'green',
  rejected: 'red',
  done: 'teal',
  cancelled: 'overlay0',
}

export const ISSUE_STATUSES = new Set([
  'new', 'refined', 'planned', 'in_progress',
  'to_review', 'passed', 'rejected', 'done', 'cancelled',
])

export const SPRINT_STATUSES = new Set([
  'planning', 'active', 'review', 'completed', 'closed', 'cancelled',
])

// DD-306 (M3-S01 T08): Milestone-Lifecycle planning|active|completed|cancelled.
// Ersetzt das alte open|reached|cancelled-Schema (Migration 038).
export const MILESTONE_STATUSES = new Set([
  'planning', 'active', 'completed', 'cancelled',
])

// Filter-Whitelist für GET /api/milestones?status=
//  active/planning  → operative Sicht (Default: all non-terminal)
//  completed        → abgeschlossene Milestones
//  all              → keine Filterung
export const MILESTONE_STATUS_FILTERS = new Set([
  'planning', 'active', 'completed', 'cancelled', 'open', 'all',
])
// 'open' bleibt als Filter-Alias erhalten für Backward-Compat: matcht planning OR active.

/**
 * canTransition(from, to, ctx) → { allowed: boolean, reason: string }
 *
 * Lifecycle erlaubt manuelle Übergänge (DD2-172: Archon-Subsystem entfernt;
 * es gibt keinen Token-/Automatik-Pfad mehr — alle Übergänge sind PO-getrieben).
 *
 * ctx shape:
 *   goal               string|null   — backlog.goal
 *   background         string|null   — backlog.background
 *   assigned_sprint    number|null   — backlog.assigned_sprint
 *   isSystemTransition boolean       — internal trigger (z.B. sprint complete)
 *   hasPassedReview    boolean       — latest feedback review_status='passed'
 *   hasRejectedReview  boolean       — latest feedback review_status='not_passed'
 *   sprintWipLimit     number|null   — Sprint-WIP-Limit
 *   sprintInProgressCount number|null — aktuell in_progress im Sprint
 *   cancellationNotes  string|null   — notes field when cancelling
 */
export function canTransition(from, to, ctx = {}) {
  // Wildcard: any status → cancelled
  if (to === 'cancelled') {
    if (!ctx.cancellationNotes) {
      return { allowed: false, reason: 'cancellationNotes ist Pflicht beim Abbrechen' }
    }
    return { allowed: true, reason: '' }
  }

  // Wildcard: cancelled → refined
  if (from === 'cancelled' && to === 'refined') {
    return { allowed: true, reason: '' }
  }

  // done/passed → planned (Reopen für nächsten Sprint)
  if ((from === 'done' || from === 'passed') && to === 'planned') {
    return { allowed: true, reason: '' }
  }

  const transitions = {
    new: {
      refined: () => {
        if (!ctx.goal || !ctx.background) {
          return 'goal und background müssen befüllt sein'
        }
        return null
      },
    },
    refined: {
      new: () => null,
      planned: () => {
        if (ctx.assigned_sprint == null) {
          return 'assigned_sprint muss gesetzt sein'
        }
        return null
      },
    },
    planned: {
      refined: () => null,
      in_progress: () => {
        // DD-41: WIP-Limit pruefen.
        if (ctx.sprintWipLimit != null && ctx.sprintInProgressCount != null
            && ctx.sprintInProgressCount >= ctx.sprintWipLimit) {
          return `WIP-Limit von ${ctx.sprintWipLimit} erreicht`
        }
        return null
      },
    },
    in_progress: {
      to_review: () => null,
      planned: () => null,
    },
    to_review: {
      passed: () => {
        if (!ctx.hasPassedReview) return 'Review muss bestanden sein'
        return null
      },
      rejected: () => {
        if (!ctx.hasRejectedReview) return 'Review muss als nicht-bestanden bewertet sein'
        return null
      },
      planned: () => {
        if (!ctx.hasRejectedReview) return 'Review muss abgelehnt worden sein'
        return null
      },
    },
    rejected: {
      in_progress: () => {
        if (ctx.sprintWipLimit != null && ctx.sprintInProgressCount != null
            && ctx.sprintInProgressCount >= ctx.sprintWipLimit) {
          return `WIP-Limit von ${ctx.sprintWipLimit} erreicht`
        }
        return null
      },
      planned: () => null,
    },
    passed: {
      done: () => {
        if (!ctx.isSystemTransition) {
          return 'done darf nur durch sprint complete gesetzt werden'
        }
        return null
      },
    },
  }

  const fromMap = transitions[from]
  if (!fromMap) {
    return { allowed: false, reason: `Unbekannter Ausgangsstatus: ${from}` }
  }

  const check = fromMap[to]
  if (!check) {
    return { allowed: false, reason: `Übergang ${from} → ${to} nicht erlaubt` }
  }

  const reason = check()
  if (reason) {
    return { allowed: false, reason }
  }

  return { allowed: true, reason: '' }
}

/**
 * canSprintTransition(from, to, ctx) → { allowed: boolean, reason: string }
 *
 * ctx shape:
 *   cancellationNotes        string|null  — Pflicht bei → cancelled
 *   allItemsPassedOrCancelled boolean     — Vorbedingung für review → completed
 */
/**
 * canMilestoneTransition(from, to, ctx) → { allowed: boolean, reason: string }
 *
 * DD-306 (M3-S01 T08): Forward-only Lifecycle für Milestones.
 *
 * Transitions:
 *   planning → active → completed   (Forward)
 *   completed → active              (DD-357 Reopen)
 *   planning → cancelled
 *   active   → cancelled
 *   (any außer completed) → cancelled  (mit ctx.cancellationNotes)
 *   cancelled → planning            (DD-524 Reopen)
 *
 * Reopen-Pfade (DD-357 completed→active, DD-524 cancelled→planning) sind
 * sanktioniert. Sonst keine backward-Transitions (D04-analog).
 *
 * ctx shape:
 *   cancellationNotes  string|null   — Pflicht bei → cancelled
 *   allSprintsDone     boolean       — DD-512: Pflicht bei active → completed.
 *                                      true wenn alle zugeordneten Sprints terminal sind
 *                                      (completed|closed|cancelled). Caller (patchMilestoneStatus)
 *                                      befüllt diesen Wert aus der DB — missing/false = blockiert.
 *   openSprints        string[]      — DD-512: Keys/Namen der noch nicht-terminalen Sprints,
 *                                      für die Fehlermeldung (z.B. ["DD#15","DD#16"]).
 *
 * Dual-error-path contract (DD-512):
 *   Der kanonische HTTP-422-Response mit Code SPRINTS_NOT_DONE wird von
 *   patchMilestoneStatus (milestoneLifecycle.js) emittiert — dieser berechnet
 *   sprintCtx aus der DB und wirft MilestoneLifecycleError *vor* dem
 *   canMilestoneTransition-Aufruf, sobald allSprintsDone === false.
 *   Ein direkter Aufrufer von canMilestoneTransition erhält ausschließlich den
 *   blocking reason string (allowed: false) — sein Wrapper entscheidet den
 *   HTTP-Status-Code selbst.
 */
export function canMilestoneTransition(from, to, ctx = {}) {
  // Idempotenz: no-op
  if (from === to) {
    return { allowed: true, reason: 'no-op' }
  }

  // Wildcard: any → cancelled (mit Notes)
  if (to === 'cancelled') {
    if (!ctx.cancellationNotes) {
      return { allowed: false, reason: 'cancellationNotes ist Pflicht beim Abbrechen' }
    }
    if (from === 'completed') {
      return { allowed: false, reason: 'completed → cancelled nicht erlaubt' }
    }
    return { allowed: true, reason: '' }
  }

  const transitions = {
    planning: { active: () => null },
    active: {
      // DD-512: Guard — alle zugeordneten Sprints müssen terminal sein (completed|closed|cancelled).
      // "done" im Spec meint terminal: der Sprint-Status-Enum hat kein literales "done",
      // daher mapping: done ≡ terminal = completed OR closed OR cancelled.
      // Fehlender ctx.allSprintsDone (= undefined/null) wird wie false behandelt —
      // der Endpoint-Pfad via patchMilestoneStatus befüllt diesen Wert immer;
      // direkte Test-Aufrufe ohne ctx.allSprintsDone werden bewusst geblockt.
      completed: () => {
        if (ctx.allSprintsDone !== true) {
          const openList = ctx.openSprints?.length
            ? ctx.openSprints.join(', ')
            : 'unbekannte Sprints'
          return `Meilenstein kann nicht abgeschlossen werden — offene Sprints: ${openList}`
        }
        return null
      },
    },
    // DD-357: sanktionierter Reopen completed → active (Milestone war doch nicht
    // fertig → zurück „in Arbeit"). completed → planning bleibt verboten (Reset
    // würde verschleiern, dass schon Arbeit lief).
    // KEIN Guard hier (DD-512 Constraint: Reopen bleibt unberührt).
    completed: { active: () => null },
    // DD-524: Reopen aus cancelled → planning (Re-Entry an den initialen
    // aktiven Zustand des Forward-Modells; danach planning → active).
    cancelled: { planning: () => null },
  }

  const fromMap = transitions[from]
  if (!fromMap) {
    return { allowed: false, reason: `Unbekannter Milestone-Status: ${from}` }
  }
  const check = fromMap[to]
  if (!check) {
    return { allowed: false, reason: `Milestone-Übergang ${from} → ${to} nicht erlaubt` }
  }
  const reason = check()
  if (reason) {
    return { allowed: false, reason }
  }
  return { allowed: true, reason: '' }
}

export function canSprintTransition(from, to, ctx = {}) {
  // DD-158: Idempotenz — identische Übergänge liefern ok mit reason='no-op'.
  // Caller (PATCH /api/sprints/:id/status) erkennt 'no-op' und überspringt
  // UPDATE, notes-Append und Audit-Log.
  if (from === to) {
    return { allowed: true, reason: 'no-op' }
  }

  if (to === 'cancelled') {
    if (!ctx.cancellationNotes) {
      return { allowed: false, reason: 'cancellationNotes ist Pflicht beim Abbrechen' }
    }
    return { allowed: true, reason: '' }
  }

  const transitions = {
    planning: {
      active: () => null,
    },
    active: {
      review: () => null,
      planning: () => null,
    },
    review: {
      active: () => null,
      completed: () => {
        if (!ctx.allItemsPassedOrCancelled) {
          return 'Alle nicht-stornierten Issues müssen einen passed-Review haben'
        }
        return null
      },
    },
    completed: {},
    closed: {},
    // DD-524: Reopen aus cancelled → planning (sicheres Re-Entry an den
    // Anfang des Forward-Modells; der PO re-aktiviert danach via planning →
    // active). cancelled → active wird bewusst NICHT erlaubt, damit ein
    // reaktivierter Sprint die planning-Phase erneut durchläuft.
    cancelled: {
      planning: () => null,
    },
  }

  const fromMap = transitions[from]
  if (!fromMap) {
    return { allowed: false, reason: `Unbekannter Sprint-Status: ${from}` }
  }

  const check = fromMap[to]
  if (!check) {
    return { allowed: false, reason: `Sprint-Übergang ${from} → ${to} nicht erlaubt` }
  }

  const reason = check()
  if (reason) {
    return { allowed: false, reason }
  }

  return { allowed: true, reason: '' }
}
