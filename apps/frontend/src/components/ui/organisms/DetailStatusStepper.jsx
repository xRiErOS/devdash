import { ChevronRight } from 'lucide-react'
import Cluster from '../layout/Cluster.jsx'
import { getValidIssueTransitions, ISSUE_STATUS_LABELS } from '../../../lib/issueLifecycleTransitions.js'

/**
 * DetailStatusStepper — kanonischer Status-Fokus ganz oben in der Detail-Ansicht
 * (DD-635 / F3). PO-Feedback 2026-06-13: ersetzt die alte volle 7-Schritt-
 * Pipeline-Anzeige. Der AKTUELLE Status sitzt mittig in der Primärfarbe; die
 * validen Lifecycle-Transitions (getValidIssueTransitions — Backend bleibt
 * autoritativ) sitzen dezent gedimmt davor (links, lifecycle-früher) und dahinter
 * (rechts). Horizontal scrollbar (overflow-x-auto) → kein Layout-Bruch @393.
 *
 * Geteilter Baustein für Vollbild-Detail (<1024) UND Two-Pane (≥1024).
 *
 * @param {object} props
 * @param {string} props.current - aktueller Issue-Status
 * @param {(toStatus: string) => void} [props.onSelect] - Klick auf eine gedimmte
 *        Transition löst den Übergang aus; ohne Handler sind die Optionen statisch.
 * @param {boolean} [props.disabled] - deaktiviert die Transitions-Knöpfe
 */

// Lineare Lifecycle-Achse — bestimmt, ob ein valider Übergang VOR (links) oder
// NACH (rechts) dem aktuellen Status einsortiert wird.
const STATUS_AXIS = ['new', 'refined', 'planned', 'in_progress', 'to_review', 'passed', 'done']
const axisIdx = (s) => {
  const i = STATUS_AXIS.indexOf(s)
  return i === -1 ? 99 : i
}

export default function DetailStatusStepper({ current, onSelect, disabled = false }) {
  const cur = axisIdx(current)
  const opts = getValidIssueTransitions(current)
  const before = opts.filter((s) => axisIdx(s) < cur)
  const after = opts.filter((s) => axisIdx(s) >= cur)

  const Ghost = ({ s }) => {
    const label = ISSUE_STATUS_LABELS[s] || s
    const cls =
      'rounded-full border border-[var(--surface2)] px-2.5 py-1 text-xs text-[var(--subtext0)] opacity-50 whitespace-nowrap'
    if (!onSelect) {
      return <span data-ui={`app-shell.detail.status.option.${s}`} className={cls}>{label}</span>
    }
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(s)}
        data-ui={`app-shell.detail.status.option.${s}`}
        className={`${cls} hover:opacity-100 transition-opacity`}
        title={`Status → ${label}`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="overflow-x-auto" data-ui="app-shell.detail.status-stepper">
      <Cluster gap="xs" className="flex-nowrap w-max items-center">
        {before.map((s) => <Ghost key={s} s={s} />)}
        {before.length > 0 && <ChevronRight size={12} className="opacity-40 shrink-0" />}
        <span
          data-ui="app-shell.detail.status.current"
          className="rounded-full bg-[var(--accent-primary)] px-3 py-1 text-xs font-semibold text-[var(--on-accent)] whitespace-nowrap"
        >
          {ISSUE_STATUS_LABELS[current] || current}
        </span>
        {after.length > 0 && <ChevronRight size={12} className="opacity-40 shrink-0" />}
        {after.map((s) => <Ghost key={s} s={s} />)}
      </Cluster>
    </div>
  )
}
