import React, { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import Modal from './ui/molecules/Modal.jsx'

/**
 * DD-277 — Milestone-Close-Dialog.
 *
 * Wenn ein Milestone abgeschlossen wird (status → reached/cancelled), erhalten
 * alle nicht-terminalen Issues eine explizite Triage durch den PO:
 *   - Backlog: Issue verlaesst Sprint+Milestone, status → refined.
 *   - Done:    Issue wird auf done gesetzt (PO-Direct-Set).
 *   - Cancelled: Issue wird storniert, result-Annex traegt den Reason.
 *
 * DD-451: auf zentrales ui/Modal migriert. busy-Guard via Modal-Prop (blockt
 * ESC + Backdrop-Close während laufendem Submit), aria-labelledby via labelledById.
 *
 * Props:
 *  - open: boolean
 *  - milestoneId: number
 *  - milestoneName: string
 *  - targetStatus: 'completed'|'cancelled'
 *  - onClose: () => void
 *  - onConfirmed: (result) => void
 */
const TARGETS = [
  { value: 'backlog', label: 'Backlog', hint: 'Sprint und Milestone werden geloest, Status zurueck.' },
  { value: 'done', label: 'Done', hint: 'PO bestaetigt Direct-Set auf done.' },
  { value: 'cancelled', label: 'Storniert', hint: 'result-Annex traegt den Milestone-Reason.' },
]

export default function MilestoneCloseDialog({
  open,
  milestoneId,
  milestoneName,
  targetStatus = 'completed',
  onClose,
  onConfirmed,
}) {
  const [items, setItems] = useState([])
  const [assignments, setAssignments] = useState({}) // {issue_id: target}
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !milestoneId) return
    setLoading(true)
    setError('')
    fetch(`/api/milestones/${milestoneId}/open-issues`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => {
        const list = Array.isArray(data?.items) ? data.items : []
        setItems(list)
        // Default-Assignment: backlog (sicherstes Target).
        setAssignments(Object.fromEntries(list.map(i => [i.id, 'backlog'])))
      })
      .catch(e => setError(`Issues konnten nicht geladen werden: ${e.message}`))
      .finally(() => setLoading(false))
  }, [open, milestoneId])

  const allAssigned = useMemo(
    () => items.length === 0 || items.every(i => assignments[i.id]),
    [items, assignments],
  )

  const setTarget = (issueId, target) => {
    setAssignments(prev => ({ ...prev, [issueId]: target }))
  }

  const submit = async () => {
    if (!allAssigned || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const body = {
        target_status: targetStatus,
        assignments: items.map(i => ({ issue_id: i.id, target: assignments[i.id] })),
      }
      const res = await fetch(`/api/milestones/${milestoneId}/close-with-issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      onConfirmed?.(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const statusLabel = targetStatus === 'cancelled' ? 'stornieren' : 'abschliessen'

  const titleNode = (
    <span className="flex items-center justify-between w-full" id="milestone-close-title">
      <span className="text-base font-bold font-display">
        Milestone „{milestoneName}“ {statusLabel}
      </span>
      <button
        type="button"
        onClick={() => { if (!submitting) onClose?.() }}
        disabled={submitting}
        aria-label="Schliessen"
        className="rounded-lg flex items-center justify-center w-8 h-8 text-[var(--subtext0)] hover:bg-[var(--surface0)]"
      >
        <X size={16} />
      </button>
    </span>
  )

  const footer = (
    <>
      <button
        type="button"
        onClick={() => { if (!submitting) onClose?.() }}
        disabled={submitting}
        className="px-3 py-1.5 rounded-lg text-sm bg-[var(--surface0)] text-[var(--text)]"
      >
        Abbrechen
      </button>
      <button
        type="button"
        onClick={submit}
        disabled={submitting || loading || !allAssigned}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--blue)] text-[var(--base)]${submitting || !allAssigned ? ' opacity-70' : ''}`}
        data-testid="milestone-close-confirm"
      >
        {submitting ? 'Wird abgeschlossen…' : `Bestaetigen (${items.length})`}
      </button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={submitting}
      size="lg"
      title={titleNode}
      labelledById="milestone-close-title"
      footer={footer}
      backdropDataUi="milestone-close-dialog"
      dialogTestId="milestone-close-dialog"
    >
      <div data-testid="milestone-close-body">
        {loading && (
          <div className="text-sm text-[var(--subtext0)]">Issues werden geladen…</div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-sm text-[var(--subtext0)]" data-testid="milestone-close-empty">
            Keine offenen Issues — Milestone kann direkt {statusLabel}.
          </div>
        )}

        {!loading && items.length > 0 && (
          <>
            <p className="text-sm mb-3 text-[var(--subtext0)]">
              {items.length} {items.length === 1 ? 'Issue ist' : 'Issues sind'} noch offen.
              Triage pro Issue auswaehlen, bevor der Milestone {statusLabel} wird.
            </p>
            <ul className="space-y-2 list-none p-0 m-0">
              {items.map(item => {
                const current = assignments[item.id] || 'backlog'
                return (
                  <li
                    key={item.id}
                    className="rounded-lg p-3 bg-[var(--surface0)]"
                    data-testid={`milestone-close-row-${item.id}`}
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-2">
                      <span className="text-sm font-medium text-[var(--text)]">
                        {item.title}
                      </span>
                      <span className="text-xs font-mono text-[var(--overlay0)]">
                        #{item.project_number ?? item.id} · {item.status} · {item.sprint_name}
                      </span>
                    </div>
                    <div role="radiogroup" aria-label={`Triage fuer ${item.title}`} className="flex flex-wrap gap-2">
                      {TARGETS.map(t => {
                        const isActive = current === t.value
                        return (
                          <label
                            key={t.value}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer border ${isActive ? 'bg-[var(--surface2)] border-[var(--blue)]' : 'bg-[var(--mantle)] border-[var(--surface1)]'}`}
                            title={t.hint}
                          >
                            <input
                              type="radio"
                              name={`triage-${item.id}`}
                              value={t.value}
                              checked={isActive}
                              onChange={() => setTarget(item.id, t.value)}
                              data-testid={`milestone-close-radio-${item.id}-${t.value}`}
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
            className="text-sm mt-3 px-3 py-2 rounded bg-[color-mix(in_srgb,var(--red)_25%,transparent)] text-[var(--red)]"
            data-testid="milestone-close-error"
          >
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}
