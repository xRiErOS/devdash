/**
 * MilestoneCloseDialog — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/MilestoneCloseDialog.jsx, DD-277/DD-451).
 *
 * Domänen-bewusste Einheit: Milestone-Status-Transition-Dialog mit Triage-Guard.
 * Wird ein Milestone abgeschlossen (status → completed/cancelled), erhält jedes
 * nicht-terminale Issue eine explizite PO-Triage (Backlog / Done / Storniert),
 * bevor die Transition bestätigt werden darf. Komponiert das Modal-Molecule
 * (Wrapper/Backdrop/ESC/Footer) und das Button-Atom (Footer-Aktionen).
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/API/useEffect-Datenladen.
 * Gehobene Kopplung gegenüber der Quelle:
 *  - Quelle lud die offenen Issues via `fetch('/api/milestones/:id/open-issues')`
 *    im useEffect (+ loading/error-State). Die Liste kommt jetzt als `items`-Prop;
 *    Lade-/Fehler-Zustand werden als `loading`/`error`-Props gehoben (der Konsument
 *    kennt den Fetch-In-Flight-Zustand).
 *  - Quelle submittete via `fetch('/api/milestones/:id/close-with-issues', POST)`
 *    inkl. lokalem `submitting`-State + try/catch. Die Transition ist hier zur
 *    Callback-Prop `onConfirm({ target_status, assignments })` gehoben; der
 *    In-Flight-Zustand kommt als `submitting`-Prop. `onClose` → `onCancel`.
 *
 * Ephemerer UI-State (BLEIBT lokal): `assignments` (Triage-Auswahl pro Issue) —
 * reiner UI-Draft-State, kein Daten-State. Wird beim Öffnen aus `items` seeded
 * (Default 'backlog' = sicherstes Target).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} [props.milestoneName] - Anzeige im Titel
 * @param {'completed'|'cancelled'} [props.targetStatus='completed'] - Ziel-Transition
 * @param {Array<{id:number,title:string,status:string,project_number?:number,sprint_name?:string}>} [props.items=[]] - offene Issues (gehoben)
 * @param {boolean} [props.loading=false] - Issues werden geladen (gehoben)
 * @param {boolean} [props.submitting=false] - Transition in-flight (gehoben)
 * @param {string} [props.error=''] - Fehlertext (gehoben)
 * @param {(result:{target_status:string,assignments:Array<{issue_id:number,target:string}>})=>void} [props.onConfirm] - Transition bestätigen (gehoben)
 * @param {()=>void} [props.onCancel] - Dialog schliessen/abbrechen
 * @param {string} [props.dataUiScope='milestone-close-dialog'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 */

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../molecules/Modal.jsx'
import Button from '../atoms/Button.jsx'

// Triage-Targets je offenem Issue — statische Map (kein String-Interpolation).
const TARGETS = [
  { value: 'backlog', label: 'Backlog', hint: 'Sprint und Milestone werden geloest, Status zurueck.' },
  { value: 'done', label: 'Done', hint: 'PO bestaetigt Direct-Set auf done.' },
  { value: 'cancelled', label: 'Storniert', hint: 'result-Annex traegt den Milestone-Reason.' },
]

export default function MilestoneCloseDialog({
  open,
  milestoneName,
  targetStatus = 'completed',
  items = [],
  loading = false,
  submitting = false,
  error = '',
  onConfirm,
  onCancel,
  dataUiScope = 'milestone-close-dialog',
}) {
  // Ephemerer UI-Draft: Triage-Auswahl pro Issue ({issue_id: target}).
  const [assignments, setAssignments] = useState({})

  // Beim Öffnen / Item-Wechsel: Default-Assignment 'backlog' (sicherstes Target).
  useEffect(() => {
    if (!open) return
    setAssignments(Object.fromEntries(items.map((i) => [i.id, 'backlog'])))
  }, [open, items])

  const allAssigned = useMemo(
    () => items.length === 0 || items.every((i) => assignments[i.id]),
    [items, assignments],
  )

  const setTarget = (issueId, target) => {
    setAssignments((prev) => ({ ...prev, [issueId]: target }))
  }

  const submit = () => {
    if (!allAssigned || submitting || loading) return
    onConfirm?.({
      target_status: targetStatus,
      assignments: items.map((i) => ({ issue_id: i.id, target: assignments[i.id] })),
    })
  }

  const statusLabel = targetStatus === 'cancelled' ? 'stornieren' : 'abschliessen'
  const titleId = `${dataUiScope}.title`

  const titleNode = (
    <span className="flex items-center justify-between w-full" id={titleId} data-ui={`${dataUiScope}.title`}>
      <span className="text-base font-bold font-display">
        Milestone „{milestoneName}“ {statusLabel}
      </span>
      <button
        type="button"
        onClick={() => { if (!submitting) onCancel?.() }}
        disabled={submitting}
        aria-label="Schliessen"
        data-ui={`${dataUiScope}.close`}
        className="rounded-lg flex items-center justify-center w-8 h-8 text-[var(--subtext0)] hover:bg-[var(--surface0)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <X size={16} />
      </button>
    </span>
  )

  const footer = (
    <>
      <Button
        variant="secondary"
        size="md"
        disabled={submitting}
        onClick={() => { if (!submitting) onCancel?.() }}
        data-ui={`${dataUiScope}.cancel`}
      >
        Abbrechen
      </Button>
      <Button
        variant="primary"
        size="md"
        loading={submitting}
        disabled={submitting || loading || !allAssigned}
        onClick={submit}
        data-ui={`${dataUiScope}.confirm`}
      >
        {submitting ? 'Wird abgeschlossen…' : `Bestaetigen (${items.length})`}
      </Button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={onCancel}
      busy={submitting}
      size="lg"
      title={titleNode}
      labelledById={titleId}
      footer={footer}
      backdropDataUi={`${dataUiScope}.backdrop`}
      dialogDataUi={dataUiScope}
    >
      <div data-ui={`${dataUiScope}.body`}>
        {loading && (
          <div className="text-sm text-[var(--subtext0)]" data-ui={`${dataUiScope}.loading`}>
            Issues werden geladen…
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-sm text-[var(--subtext0)]" data-ui={`${dataUiScope}.empty`}>
            Keine offenen Issues — Milestone kann direkt {statusLabel}.
          </div>
        )}

        {!loading && items.length > 0 && (
          <>
            <p className="text-sm mb-3 text-[var(--subtext0)]">
              {items.length} {items.length === 1 ? 'Issue ist' : 'Issues sind'} noch offen.
              Triage pro Issue auswaehlen, bevor der Milestone {statusLabel} wird.
            </p>
            <ul className="space-y-2 list-none p-0 m-0" data-ui={`${dataUiScope}.list`}>
              {items.map((item) => {
                const current = assignments[item.id] || 'backlog'
                return (
                  <li
                    key={item.id}
                    className="rounded-lg p-3 bg-[var(--surface0)]"
                    data-ui={`${dataUiScope}.row`}
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <span className="text-sm font-medium text-[var(--text)]">
                        {item.title}
                      </span>
                      <span className="text-xs font-mono text-[var(--overlay0)]">
                        #{item.project_number ?? item.id} · {item.status} · {item.sprint_name}
                      </span>
                    </div>
                    <div
                      role="radiogroup"
                      aria-label={`Triage fuer ${item.title}`}
                      className="flex flex-wrap gap-2"
                      data-ui={`${dataUiScope}.triage`}
                    >
                      {TARGETS.map((t) => {
                        const isActive = current === t.value
                        return (
                          <label
                            key={t.value}
                            data-ui={`${dataUiScope}.triage.option.${t.value}`}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer border ${isActive ? 'bg-[var(--surface2)] border-[var(--accent-info)]' : 'bg-[var(--surface1)] border-[var(--surface1)]'}`}
                            title={t.hint}
                          >
                            <input
                              type="radio"
                              name={`triage-${item.id}`}
                              value={t.value}
                              checked={isActive}
                              onChange={() => setTarget(item.id, t.value)}
                            />
                            <span className="text-xs text-[var(--text)]">{t.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}

        {error && (
          <div
            className="text-sm mt-3 px-3 py-2 rounded bg-[color-mix(in_srgb,var(--accent-danger)_25%,transparent)] text-[var(--accent-danger)]"
            data-ui={`${dataUiScope}.error`}
          >
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}
