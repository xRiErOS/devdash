/**
 * TransitionActions — DD-481 Organism. Generische Status-Übergangs-Leiste:
 * ein Button je gültigem Folge-Status; Klick löst den Übergang aus, ein
 * Fehler-Surface darüber zeigt abgelehnte Übergänge (z.B. Backend-Reject:
 * fehlendes Goal, WIP-Limit, Zyklus). Generisch über drei Varianten
 * (issue/sprint/milestone) — issue zieht die Default-Übergänge aus der
 * Lifecycle-Lib; sprint/milestone reichen ihr Set via `options`-Prop
 * (eigene Lifecycle-Libs existieren noch nicht).
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/API. Mutation als Callback:
 *   onTransition(nextStatus, notes|null) — der Konsument führt den API-Call aus,
 *   behandelt Reject und reicht eine `error`-Meldung zurück (controlled) ODER
 *   wirft → wird abgefangen und an onError(message) gereicht.
 * Status mit Notes-Pflicht (z.B. cancelled) fragen über onRequestNotes(next) ab;
 * Rückgabe null = abbrechen.
 *
 * @param {object} props
 * @param {string} props.current - aktueller Status-Schlüssel
 * @param {'issue'|'sprint'|'milestone'} [props.variant='issue'] - Default-Übergangs-Quelle
 * @param {Array<{value:string,label?:string,requiresNotes?:boolean}>} [props.options]
 *        - explizite Folge-Status (überschreibt Varianten-Default)
 * @param {(next:string, notes:string|null)=>(void|Promise<void>)} [props.onTransition]
 * @param {(next:string)=>(string|null|Promise<string|null>)} [props.onRequestNotes]
 * @param {(message:string)=>void} [props.onError] - Fehler aus geworfenem onTransition
 * @param {string|null} [props.error=null] - controlled Fehler-Surface
 * @param {boolean} [props.busy=false] - Übergang in-flight → Buttons disabled
 * @param {string} [props.title='Aktionen'] - Sektions-Label (sr-only wenn leer)
 * @param {string} [props.dataUiScope='transition-actions'] - Wurzel-data-ui-bereich
 * @param {string} [props.className]
 */

import Button from '../atoms/Button.jsx'
import {
  getValidIssueTransitions,
  ISSUE_STATUS_LABELS,
  REQUIRES_NOTES,
} from '../../../lib/issueLifecycleTransitions.js'

// Übergangs-„Richtung" → Button-Variante. Destruktiv (abbrechen/ablehnen) =
// danger, Vorwärts (Review/bestanden/done/aktiv) = primary, Rest (zurück/öffnen)
// = secondary. Statische Map → JIT-sicher über das Button-Atom.
const TONE = {
  cancelled: 'danger',
  rejected: 'danger',
  passed: 'primary',
  done: 'primary',
  completed: 'primary',
  to_review: 'primary',
  review: 'primary',
  in_progress: 'primary',
  active: 'primary',
}
const variantFor = (value) => TONE[value] || 'secondary'

export default function TransitionActions({
  current,
  variant = 'issue',
  options,
  onTransition,
  onRequestNotes,
  onError,
  error = null,
  busy = false,
  title = 'Aktionen',
  dataUiScope = 'transition-actions',
  className = '',
}) {
  const transitions = options
    ? options
    : variant === 'issue'
      ? getValidIssueTransitions(current).map((value) => ({
          value,
          label: ISSUE_STATUS_LABELS[value] || value,
          requiresNotes: REQUIRES_NOTES.has(value),
        }))
      : []

  const handle = async (opt) => {
    if (busy) return
    let notes = null
    if (opt.requiresNotes) {
      if (typeof onRequestNotes === 'function') {
        notes = await onRequestNotes(opt.value)
        if (notes === null) return
        if (!notes || !notes.trim()) {
          onError?.('Notes sind Pflicht für diesen Übergang')
          return
        }
      }
    }
    try {
      await onTransition?.(opt.value, notes)
    } catch (e) {
      onError?.(e?.message || 'Statuswechsel fehlgeschlagen')
    }
  }

  return (
    <div data-ui={dataUiScope} className={`flex flex-col gap-2 ${className}`}>
      {title ? (
        <span data-ui={`${dataUiScope}.title`} className="text-[10px] uppercase tracking-wide text-[var(--subtext0)]">
          {title}
        </span>
      ) : null}

      {error ? (
        <div
          data-ui={`${dataUiScope}.error`}
          role="alert"
          className="px-2.5 py-1.5 rounded-md text-[11px] bg-[var(--accent-danger)] text-[var(--on-accent)]"
        >
          {error}
        </div>
      ) : null}

      {transitions.length === 0 ? (
        <p data-ui={`${dataUiScope}.empty`} className="m-0 text-[11px] italic text-[var(--subtext0)]">
          Keine Übergänge verfügbar
        </p>
      ) : (
        <div data-ui={`${dataUiScope}.buttons`} className="grid grid-cols-2 gap-1.5">
          {transitions.map((opt) => (
            <Button
              key={opt.value}
              variant={variantFor(opt.value)}
              size="sm"
              loading={busy}
              onClick={() => handle(opt)}
              data-ui={`${dataUiScope}.action.${opt.value}`}
              className="w-full"
            >
              {opt.label || ISSUE_STATUS_LABELS[opt.value] || opt.value}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
