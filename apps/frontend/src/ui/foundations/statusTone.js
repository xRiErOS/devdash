/**
 * statusTone — Status → Catppuccin-Ton (Text + Dot), token-sauber.
 *
 * Spiegelt die kanonische Wahrheit `STATUS_COLORS` aus
 * `apps/backend/src/lib/lifecycle.js` (PO-Entscheidung D1: Backend ist Single
 * Source; die Mockup-Hues wurden verworfen). Issue-Stati 1:1 aus STATUS_COLORS;
 * Sprint-/Milestone-Stati (in STATUS_COLORS nicht definiert) sind hier als
 * Frontend-Präsentationswahl auf dieselbe Palette gemappt.
 *
 * WICHTIG (Tailwind v4): Die Map-Werte sind VOLLSTÄNDIGE, literale Utility-Strings
 * (`text-[var(--teal)]`), damit der Tailwind-Scanner sie generiert. Dynamische
 * Interpolation (`text-[var(--${t})]`) würde NICHT erkannt → keine Klasse. Darum
 * pro Status fixe Text-/Dot-Paare, keine Token-Verkettung zur Laufzeit.
 *
 * @param {string} status - roher Status-String einer beliebigen Entität
 * @returns {{text:string, dot:string}} Utility-Klassen (Text-Farbe, Dot-Hintergrund)
 */

// Issue-Lifecycle — 1:1 aus lifecycle.js STATUS_COLORS.
// Sprint/Milestone — analoge Präsentationswahl (gleiche Tokens).
export const STATUS_TONE = {
  // Issue
  new: { text: 'text-[var(--yellow)]', dot: 'bg-[var(--yellow)]' },
  refined: { text: 'text-[var(--blue)]', dot: 'bg-[var(--blue)]' },
  planned: { text: 'text-[var(--lavender)]', dot: 'bg-[var(--lavender)]' },
  in_progress: { text: 'text-[var(--peach)]', dot: 'bg-[var(--peach)]' },
  to_review: { text: 'text-[var(--mauve)]', dot: 'bg-[var(--mauve)]' },
  passed: { text: 'text-[var(--green)]', dot: 'bg-[var(--green)]' },
  rejected: { text: 'text-[var(--red)]', dot: 'bg-[var(--red)]' },
  done: { text: 'text-[var(--teal)]', dot: 'bg-[var(--teal)]' },
  cancelled: { text: 'text-[var(--overlay0)]', dot: 'bg-[var(--overlay0)]' },
  // Sprint (planning|active|review|completed|closed|cancelled)
  planning: { text: 'text-[var(--lavender)]', dot: 'bg-[var(--lavender)]' },
  active: { text: 'text-[var(--peach)]', dot: 'bg-[var(--peach)]' },
  review: { text: 'text-[var(--mauve)]', dot: 'bg-[var(--mauve)]' },
  completed: { text: 'text-[var(--green)]', dot: 'bg-[var(--green)]' },
  closed: { text: 'text-[var(--teal)]', dot: 'bg-[var(--teal)]' },
  // Milestone teilt planning|active|completed|cancelled (oben abgedeckt)
}

const FALLBACK = { text: 'text-[var(--subtext0)]', dot: 'bg-[var(--subtext0)]' }

export function statusTone(status) {
  return STATUS_TONE[status] || FALLBACK
}

// Kurze, menschliche Labels je Status (für StatusDot/PageTitle). Issue +
// Sprint/Milestone. Fallback = roher Status.
export const STATUS_LABEL = {
  new: 'Neu', refined: 'Refined', planned: 'Geplant', in_progress: 'In Arbeit',
  to_review: 'Review', passed: 'Passed', rejected: 'Abgelehnt', done: 'Done', cancelled: 'Abgebrochen',
  planning: 'Planung', active: 'Aktiv', review: 'Review', completed: 'Abgeschlossen', closed: 'Geschlossen',
}

export function statusLabel(status) {
  return STATUS_LABEL[status] || status
}
