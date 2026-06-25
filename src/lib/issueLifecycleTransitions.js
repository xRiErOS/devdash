// DD-252 (M3-S02 T04): Frontend-Lifecycle-Map für Issue-Status-Picker.
// Spiegelt die wichtigsten Transitions aus server/lib/lifecycle.js für UX-Vorab-
// Filter. Backend canTransition() bleibt autoritativ — UI zeigt nur "wahrscheinlich
// gültige" next-states, Server rejected Edge-Cases (z.B. fehlendes goal bei
// refined→planned, WIP-Limit, etc.) und Toast surfaced den Error.
//
// Keine ctx-Logik hier: UI bietet die optionsmenge AN, Server entscheidet finale
// Validität.

export const ISSUE_STATUS_LABELS = Object.freeze({
  new: 'Neu',
  refined: 'Refined',
  planned: 'Geplant',
  in_progress: 'In Arbeit',
  to_review: 'Review',
  passed: 'Bestanden',
  rejected: 'Abgelehnt',
  done: 'Done',
  cancelled: 'Storniert',
})

// Pro from-Status: Set der UI-anzeigbaren next-states. Cancelled ist überall
// erreichbar (Wildcard im Backend), brauch aber notes — UI surfaced Prompt.
//
// B01+B02-Fix (Sub-Agent-Review 2026-05-24): Map an Backend angleichen
// (server/lib/lifecycle.js canTransition). Backend = Wahrheit.
//
// Backend-Map (vereinfacht, ctx-Gates kommen on-server):
//   new          → refined (need goal+background)
//   refined      → new | planned (need assigned_sprint)
//   planned      → refined | in_progress (need WIP-OK)
//   in_progress  → to_review | planned
//   to_review    → passed (need passedReview) | rejected (need rejectedReview) |
//                  planned (reopen wenn rejectedReview)
//   rejected     → in_progress (need WIP-OK) | planned
//   passed       → done (ONLY isSystemTransition=true — KI/UI nie!) |
//                  planned (wildcard reopen)
//   done         → planned (wildcard reopen) | cancelled (wildcard)
//   cancelled    → refined (wildcard reopen)
//   (any)        → cancelled (need notes)
//
// NICHT in Map (Backend würde rejecten):
//   - passed → done (B01: nur sprint-complete)
//   - planned → new (B02: Backend hat keinen expliziten Übergang)
//   - to_review → in_progress (B02: Backend lehnt ab)
//   - rejected → refined (B02: Backend lehnt ab)
const TRANSITIONS = Object.freeze({
  new:         ['refined', 'cancelled'],
  refined:     ['planned', 'new', 'cancelled'],
  planned:     ['in_progress', 'refined', 'cancelled'],
  in_progress: ['to_review', 'planned', 'cancelled'],
  to_review:   ['passed', 'rejected', 'planned', 'cancelled'],
  rejected:    ['in_progress', 'planned', 'cancelled'],
  passed:      ['planned', 'cancelled'],
  done:        ['planned', 'cancelled'],
  cancelled:   ['refined'],
})

/**
 * Liefert die UI-anzeigbaren next-states für einen gegebenen Status.
 * Aktueller Status ist NICHT enthalten (no-op transition).
 */
export function getValidIssueTransitions(currentStatus) {
  return TRANSITIONS[currentStatus] || []
}

export const REQUIRES_NOTES = Object.freeze(new Set(['cancelled']))
