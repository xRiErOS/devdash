import { useRef, useState, useEffect } from 'react'
import StatusBadge from '../atoms/StatusBadge.jsx'
import PopoverPanel from '../atoms/PopoverPanel.jsx'
import {
  getValidIssueTransitions,
  ISSUE_STATUS_LABELS,
  REQUIRES_NOTES,
} from '../../../lib/issueLifecycleTransitions.js'

/**
 * StatusPicker — Organism (DD-481 Harvest aus components/StatusPicker.jsx).
 * Domänen-bewusst: kennt den Issue-Lifecycle (gültige Status-Übergänge,
 * Status-Farben, Notes-Pflicht beim Stornieren). Klickbare Status-Pill, die ein
 * Popover mit den gültigen next-states öffnet; Auswahl löst onChange aus.
 * Static-Mode (kein onChange / disabled) delegiert an das StatusBadge-Atom.
 *
 * Komponiert: ../atoms/StatusBadge.jsx (Static-Fallback), ../atoms/PopoverPanel.jsx
 * (Dropdown-Hülle).
 *
 * Gehobene Kopplung (presentational, D-Phase3-01):
 *  - `useConfirmDialog()`-Context (ConfirmDialogContext-Store) → als Callback-Prop
 *    `onRequestNotes(next)` herausgehoben. Der Screen reicht in Phase 5 seinen
 *    prompt()-Aufruf ein; ohne Callback wird ein Status mit Notes-Pflicht direkt
 *    mit notes=null durchgereicht (Caller kann serverseitig rejecten).
 *  - `window.dispatchEvent('devd-toast', …)` Fehler-/Validierungs-Toasts →
 *    als optionaler Callback-Prop `onError(message)` herausgehoben.
 *  - Übergangs-Optionen kommen weiterhin domänen-default aus der Lifecycle-Lib,
 *    sind aber via `options`-Prop überschreibbar (presentational-konfigurierbar).
 *
 * Behaltener ephemerer UI-State: `open` (useState), `ref` (useRef),
 * Outside-Click + Escape (useEffect) — kein Daten-State.
 *
 * @param {object} props
 * @param {string} props.status - aktueller Status-Schlüssel
 * @param {(next: string, notes: string|null) => (void|Promise<void>)} [props.onChange]
 *   - Mutation-Callback; fehlt er (oder disabled) → reiner StatusBadge-Static-Mode
 * @param {(next: string) => (string|null|Promise<string|null>)} [props.onRequestNotes]
 *   - Notes-Abfrage für Status mit Notes-Pflicht; Rückgabe null = abbrechen
 * @param {(message: string) => void} [props.onError] - Fehler-/Validierungs-Surface
 * @param {Array<{value: string, label?: string, requiresNotes?: boolean}>} [props.options]
 *   - explizite Übergangs-Optionen; Default = Lifecycle-Lib für `status`
 * @param {boolean} [props.disabled=false]
 * @param {'sm'|'md'} [props.size='md']
 * @param {string} [props.dataUiScope='status-picker'] - Wurzel-data-ui-Namespace (I03/D01)
 */

const STATUS_COLOR = {
  new: 'bg-[var(--yellow)]',
  refined: 'bg-[var(--blue)]',
  planned: 'bg-[var(--lavender)]',
  in_progress: 'bg-[var(--peach)]',
  to_review: 'bg-[var(--mauve)]',
  passed: 'bg-[var(--green)]',
  rejected: 'bg-[var(--red)]',
  done: 'bg-[var(--teal)]',
  cancelled: 'bg-[var(--overlay0)]',
}
const FALLBACK_COLOR = 'bg-[var(--overlay0)]'

const SIZE = {
  sm: 'text-[10px] px-1.5 py-px',
  md: 'text-[11px] px-2 py-0.5',
}

export default function StatusPicker({
  status,
  onChange,
  onRequestNotes,
  onError,
  options,
  disabled = false,
  size = 'md',
  dataUiScope = 'status-picker',
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const isInteractive = typeof onChange === 'function' && !disabled

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const label = ISSUE_STATUS_LABELS[status] || status
  const colorClass = STATUS_COLOR[status] || FALLBACK_COLOR
  const sizeClass = SIZE[size] || SIZE.md

  // Static-Mode delegiert an StatusBadge → DRY mit dem Atom.
  if (!isInteractive) {
    return <StatusBadge status={status} />
  }

  const validNext = options
    ? options
    : getValidIssueTransitions(status).map((value) => ({
        value,
        label: ISSUE_STATUS_LABELS[value] || value,
        requiresNotes: REQUIRES_NOTES.has(value),
      }))

  const handleSelect = async (opt) => {
    setOpen(false)
    let notes = null
    if (opt.requiresNotes) {
      if (typeof onRequestNotes === 'function') {
        notes = await onRequestNotes(opt.value)
        if (notes === null) return
        if (!notes || !notes.trim()) {
          onError?.('Notes sind Pflicht beim Stornieren')
          return
        }
      }
    }
    try {
      await onChange(opt.value, notes)
    } catch (e) {
      onError?.(e?.message || 'Statuswechsel fehlgeschlagen')
    }
  }

  return (
    <span ref={ref} data-ui={dataUiScope} className="relative inline-block">
      <button
        type="button"
        data-ui={`${dataUiScope}.trigger`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o) }}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Status ändern (aktuell: ${label})`}
        className={`inline-flex items-center font-semibold leading-snug rounded-full border-0 cursor-pointer text-[var(--on-accent)] ${colorClass} ${sizeClass}`}
      >
        {label}
        <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" className="ml-1">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>
      {open && (
        <PopoverPanel className="top-full min-w-[160px] p-1">
          <ul
            role="listbox"
            data-ui={`${dataUiScope}.menu`}
            aria-label="Gültige Status-Übergänge"
            className="flex flex-col gap-0.5 list-none m-0 p-0"
          >
            {validNext.length === 0 && (
              <li className="px-2.5 py-1.5 text-[11px] italic text-[var(--subtext1)]">
                Keine Übergänge verfügbar
              </li>
            )}
            {validNext.map((opt) => {
              const c = STATUS_COLOR[opt.value] || FALLBACK_COLOR
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    data-ui={`${dataUiScope}.option.${opt.value}`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelect(opt) }}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 bg-transparent text-[var(--text)] border-0 rounded cursor-pointer text-xs text-left hover:bg-[var(--surface0)]"
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${c}`}
                      aria-hidden="true"
                    />
                    {opt.label || ISSUE_STATUS_LABELS[opt.value] || opt.value}
                  </button>
                </li>
              )
            })}
          </ul>
        </PopoverPanel>
      )}
    </span>
  )
}
