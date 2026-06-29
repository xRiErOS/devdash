// lifecycle.js — ESM (matches api.js ESModule setup)
// Lifecycle state machines: backlog items + sprints + milestones
//
// DD2-155 (Status-Vereinheitlichung): gleiche Bedeutung = gleiches Wort über
// Meilenstein/Sprint/Issue. Kanon je Bedeutung:
//   nicht gestartet = new · eingeplant = planned · in Arbeit = in_progress
//   in Review = to_review · fertig = completed · abgebrochen = cancelled
// Entity-spezifisch (kein Konflikt): Issue refined/passed/rejected.
// Migriert: planning→new, active→in_progress, review→to_review, done→completed,
// closed→entfernt (war Sprint-Dup zu completed).

export const STATUS_COLORS = {
  new: 'yellow',
  refined: 'blue',
  planned: 'lavender',
  in_progress: 'peach',
  to_review: 'mauve',
  passed: 'green',
  rejected: 'red',
  completed: 'teal',
  cancelled: 'overlay0',
}

export const ISSUE_STATUSES = new Set([
  'new', 'refined', 'planned', 'in_progress',
  'to_review', 'passed', 'rejected', 'completed', 'cancelled',
])

export const SPRINT_STATUSES = new Set([
  'new', 'planned', 'in_progress', 'to_review', 'completed', 'cancelled',
])

// DD2-155: Milestone-Lifecycle new|planned|in_progress|completed|cancelled.
// Meilensteine werden über ihre Sprints gereviewt — kein eigener Review-Status.
export const MILESTONE_STATUSES = new Set([
  'new', 'planned', 'in_progress', 'completed', 'cancelled',
])

// Filter-Whitelist für GET /api/milestones?status=
//  non-terminal (new|planned|in_progress) → operative Sicht
//  completed                              → abgeschlossene Milestones
//  all                                    → keine Filterung
export const MILESTONE_STATUS_FILTERS = new Set([
  'new', 'planned', 'in_progress', 'completed', 'cancelled', 'open', 'all',
])
// 'open' bleibt als Filter-Alias erhalten für Backward-Compat:
// matcht non-terminal = new OR planned OR in_progress.

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

  // completed/passed → planned (Reopen für nächsten Sprint)
  if ((from === 'completed' || from === 'passed') && to === 'planned') {
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
        // DD2-113 (PO-Entscheidung 2026-06-29): goal+background sind Pflicht vor planned.
        // Greift v.a. bei direkt als 'refined' angelegten Issues (ISSUE_CREATE_STATUSES =
        // ['new','refined']), die den new→refined-Guard umgangen haben. Spiegelt bewusst die
        // new→refined-Bedingung. Reopen-Pfade (done/passed → planned) laufen oberhalb dieser
        // Map und bleiben unberührt.
        if (!ctx.goal || !ctx.background) {
          return 'goal und background müssen befüllt sein'
        }
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
      completed: () => {
        if (!ctx.isSystemTransition) {
          return 'completed darf nur durch sprint complete gesetzt werden'
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
 * canMilestoneTransition(from, to, ctx) → { allowed: boolean, reason: string }
 *
 * DD2-155: Forward-Lifecycle new → planned → in_progress → completed.
 * `planned` ist überspringbar (new → in_progress), analog zum alten
 * planning → active. Meilensteine haben keinen eigenen Review-Status.
 *
 * Transitions:
 *   new → planned → in_progress → completed   (Forward)
 *   new → in_progress                         (planned überspringbar)
 *   completed → in_progress                   (DD-357 Reopen)
 *   (any außer completed) → cancelled         (mit ctx.cancellationNotes)
 *   cancelled → new                           (DD-524 Reopen)
 *
 * ctx shape:
 *   cancellationNotes  string|null   — Pflicht bei → cancelled
 *   allSprintsDone     boolean       — DD-512: Pflicht bei in_progress → completed.
 *                                      true wenn alle zugeordneten Sprints terminal sind
 *                                      (completed|cancelled). Caller (patchMilestoneStatus)
 *                                      befüllt diesen Wert aus der DB — missing/false = blockiert.
 *   openSprints        string[]      — DD-512: Keys/Namen der noch nicht-terminalen Sprints.
 *
 * Dual-error-path contract (DD-512):
 *   Der kanonische HTTP-422-Response mit Code SPRINTS_NOT_DONE wird von
 *   patchMilestoneStatus (milestoneLifecycle.js) emittiert — dieser berechnet
 *   sprintCtx aus der DB und wirft MilestoneLifecycleError *vor* dem
 *   canMilestoneTransition-Aufruf, sobald allSprintsDone === false.
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
    new: {
      planned: () => null,
      in_progress: () => null,
    },
    planned: {
      in_progress: () => null,
      new: () => null,
    },
    in_progress: {
      // DD-512: Guard — alle zugeordneten Sprints müssen terminal sein (completed|cancelled).
      // Fehlender ctx.allSprintsDone (= undefined/null) wird wie false behandelt —
      // der Endpoint-Pfad via patchMilestoneStatus befüllt diesen Wert immer.
      completed: () => {
        if (ctx.allSprintsDone !== true) {
          const openList = ctx.openSprints?.length
            ? ctx.openSprints.join(', ')
            : 'unbekannte Sprints'
          return `Meilenstein kann nicht abgeschlossen werden — offene Sprints: ${openList}`
        }
        return null
      },
      planned: () => null,
    },
    // DD-357: sanktionierter Reopen completed → in_progress (Milestone war doch
    // nicht fertig → zurück „in Arbeit"). KEIN Guard (DD-512: Reopen unberührt).
    completed: { in_progress: () => null },
    // DD-524: Reopen aus cancelled → new (Re-Entry an den Anfang des Forward-Modells).
    cancelled: { new: () => null },
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

/**
 * canSprintTransition(from, to, ctx) → { allowed: boolean, reason: string }
 *
 * DD2-155: Forward-Lifecycle new → planned → in_progress → to_review → completed.
 * `planned` überspringbar (new → in_progress), analog zum alten planning → active.
 *
 * ctx shape:
 *   cancellationNotes         string|null  — Pflicht bei → cancelled
 *   allItemsPassedOrCancelled boolean      — Vorbedingung für to_review → completed
 */
export function canSprintTransition(from, to, ctx = {}) {
  // DD-158: Idempotenz — identische Übergänge liefern ok mit reason='no-op'.
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
    new: {
      planned: () => null,
      in_progress: () => null,
    },
    planned: {
      in_progress: () => null,
      new: () => null,
    },
    in_progress: {
      to_review: () => null,
      planned: () => null,
    },
    to_review: {
      in_progress: () => null,
      completed: () => {
        if (!ctx.allItemsPassedOrCancelled) {
          return 'Alle nicht-stornierten Issues müssen einen passed-Review haben'
        }
        return null
      },
    },
    completed: {},
    // DD-524: Reopen aus cancelled → new (sicheres Re-Entry an den Anfang des
    // Forward-Modells; der PO re-aktiviert danach via new → in_progress).
    cancelled: {
      new: () => null,
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
