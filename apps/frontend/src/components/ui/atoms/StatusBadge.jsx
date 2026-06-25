/**
 * StatusBadge — Variante des Badge-Atoms (PO 2026-06-16, D-pill-badge-taxonomy).
 * Mappt einen Status-Schlüssel → lokalisiertes Label + Catppuccin-Tone und
 * rendert ein <Badge>. Trägt die Status-Semantik, die Badge bewusst NICHT kennt.
 * Props-driven, kein Store/Fetch. data-ui="status-badge" bleibt (Consumer-Stabilität).
 *
 * @param {object} props
 * @param {string} props.status - Status-Schlüssel (z.B. 'new', 'in_progress', 'done', 'active')
 * @param {'solid'|'tint'} [props.appearance='solid'] - an Badge durchgereicht (Terminal-V2 via 'tint'). Default unverändert solid.
 * @param {string} [props.className] - zusätzliche Klassen
 */
import Badge from './Badge.jsx'

// Lokalisierte Labels je Status-Schlüssel (Issue-, Sprint- + Milestone-Status).
const STATUS_LABELS = {
  new: 'Neu',
  refined: 'Refined',
  planned: 'Geplant',
  in_progress: 'In Arbeit',
  to_review: 'Review',
  passed: 'Bestanden',
  rejected: 'Abgelehnt',
  done: 'Done',
  cancelled: 'Storniert',
  // Sprint- UND Milestone-Status (geteiltes Enum planning/active/completed/
  // cancelled) — eine Quelle, damit Sprint-, Milestone- und Issue-Status
  // app-weit farblich konsistent gerendert werden (PO 2026-06-08).
  planning: 'Planung',
  active: 'Aktiv',
  review: 'Review',
  completed: 'Abgeschlossen',
  closed: 'Geschlossen',
}

// Status-Schlüssel → Badge-Tone (direkte Catppuccin-Palette, paritätserhaltend
// zum früheren STATUS_CLASSES-Mapping).
const STATUS_TONE = {
  new: 'yellow',
  refined: 'blue',
  planned: 'lavender',
  in_progress: 'peach',
  to_review: 'mauve',
  passed: 'green',
  rejected: 'red',
  done: 'teal',
  cancelled: 'neutral',
  // Sprint- + Milestone-Status
  planning: 'lavender',
  active: 'peach',
  review: 'mauve',
  completed: 'teal',
  closed: 'neutral',
}

export default function StatusBadge({ status, appearance = 'solid', className = '', ...rest }) {
  const label = STATUS_LABELS[status] || status
  const tone = STATUS_TONE[status] || 'neutral'

  return (
    <Badge data-ui="status-badge" tone={tone} appearance={appearance} className={className} {...rest}>
      {label}
    </Badge>
  )
}
