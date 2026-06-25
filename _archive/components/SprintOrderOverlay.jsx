import React, { useState, useEffect, useMemo } from 'react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Info } from 'lucide-react'
import MilestonePill from './MilestonePill.jsx'
import StatusBadge from './ui/atoms/StatusBadge.jsx'
import Modal from './ui/molecules/Modal.jsx'
import { sprintKey } from '../lib/sprintLabel.js'

// DD-287: Sprint-Order-Overlay
// - Modal mit Drag&Drop-Sortierliste (planning + active Sprints, project-scoped)
// - DD-287 R2 (2026-05-23): auch active Sprints sind frei draggable —
//   die alte Position-Fix-Regel wurde sowohl server- als auch
//   clientseitig entfernt (PO-Feedback).
// - DD-289 R2 Iter2: MilestonePill ist klickbar und navigiert zu
//   /milestone/:id (sowohl DragRow als auch SprintInfoPanel).
// - Info-Icon oeffnet Side-Panel rechts mit Issue-Liste
// - Optimistic Update; Rollback bei API-Fehler
// - DD-451: Backdrop/Panel/ESC/Backdrop-Close + role=dialog auf zentrales ui/Modal
//   (size=xl, fade, busy-guard) migriert. Two-Pane-Body als children, Actions als
//   footer-Slot. inline-style nur noch fuer dnd-kit transform/transition (kein
//   className-Aequivalent). Alle statischen Token-styles -> Tailwind-Arbitrary-Class.
//
// Props:
//   - open: bool
//   - sprints: array (alle Sprints des Projekts; wird intern auf planning+active gefiltert)
//   - onClose: () => void
//   - onReordered: (updatedSprints) => void  // Callback nach Server-Submit
//   - onOpenMilestone?: (milestoneId) => void  // DD-289 R2 Iter2: Klick auf MilestonePill
//   - onToast?: (msg) => void

const SPRINT_PILL_CLASS_BY_STATUS = {
  planning: 'border-[var(--lavender)] text-[var(--lavender)]',
  active:   'border-[var(--peach)] text-[var(--peach)]',
  review:   'border-[var(--mauve)] text-[var(--mauve)]',
}

function SprintPill({ sprint }) {
  const colorClass = SPRINT_PILL_CLASS_BY_STATUS[sprint.status] || 'border-[var(--surface2)] text-[var(--text)]'
  return (
    <span
      className={`inline-flex items-center gap-2 font-display text-xs font-bold px-2.5 py-1 rounded-full bg-transparent border ${colorClass}`}
    >
      {sprintKey(sprint) || sprint.name}
    </span>
  )
}

function PositionIndicator({ value }) {
  return (
    <span className="font-display text-[11px] text-[var(--subtext0)] bg-[var(--surface0)] rounded px-1.5 py-0.5 min-w-[24px] text-center inline-block">
      {value}
    </span>
  )
}

function DragRow({ sprint, position, activeInfoId, onInfoClick, onOpenMilestone }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(sprint.id) })

  // dnd-kit transform/transition: kein statisches Token, kein className-Aequivalent.
  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const infoActive = activeInfoId === sprint.id

  const itemCount = sprint.item_count ?? 0
  const doneCount = sprint.done_count ?? 0

  return (
    <div
      ref={setNodeRef}
      // eslint-disable-next-line react/forbid-dom-props -- dnd-kit transform, kein statisches Token
      style={dndStyle}
      data-pos={position}
      data-ui={`sprint-order-overlay.drag-row.${sprint.id}`}
      className={`bg-[var(--base)] rounded-lg p-3 flex items-center gap-2 border ${isDragging ? 'opacity-50 border-[var(--accent-info)]' : 'opacity-100 border-[var(--surface0)]'}`}
    >
      <PositionIndicator value={position} />
      <button
        type="button"
        aria-label="Drag-Handle"
        title="Ziehen, um Reihenfolge zu aendern"
        {...attributes}
        {...listeners}
        className="w-6 h-7 bg-transparent border-0 p-0 text-[var(--overlay0)] cursor-grab inline-grid place-items-center shrink-0"
      >
        <GripVertical size={16} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="font-display text-[13px] font-bold inline-flex items-center gap-2 flex-wrap">
          <SprintPill sprint={sprint} />
          {sprint.milestone_id != null && (
            <MilestonePill
              milestone_id={sprint.milestone_id}
              name={sprint.milestone_name}
              variant="short"
              onClick={
                typeof onOpenMilestone === 'function'
                  ? () => onOpenMilestone(sprint.milestone_id)
                  : undefined
              }
            />
          )}
          <span className="text-[var(--text)]">{sprint.name}</span>
        </div>
        <div className="text-xs text-[var(--hint)] mt-0.5">
          {sprint.goal
            ? (sprint.goal.length > 90 ? `${sprint.goal.slice(0, 90)}…` : sprint.goal)
            : <em className="text-[var(--subtext0)]">kein Goal</em>}
          {itemCount > 0 && (
            <span className="ml-2">
              · {itemCount} Issue{itemCount !== 1 ? 's' : ''}{doneCount > 0 ? ` (${doneCount} done)` : ''}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          aria-label="Sprint-Info"
          aria-expanded={infoActive}
          onClick={() => onInfoClick(sprint.id)}
          className={`w-7 h-7 rounded-full border-0 p-0 cursor-pointer inline-grid place-items-center ${infoActive ? 'bg-[color-mix(in_srgb,var(--accent-info)_22%,transparent)] text-[var(--accent-info)]' : 'bg-transparent text-[var(--subtext0)]'}`}
        >
          <Info size={16} />
        </button>
      </div>
    </div>
  )
}

function SprintInfoPanel({ sprintId, onOpenMilestone }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (sprintId == null) { setData(null); return }
    let cancelled = false
    setLoading(true)
    setError('')
    fetch(`/api/sprints/${sprintId}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Sprint-Detail nicht erreichbar')))
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e.message || 'Fehler beim Laden') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [sprintId])

  if (sprintId == null) {
    return (
      <div className="text-xs text-[var(--subtext0)] p-2">
        Info-Icon auf der linken Seite klicken, um Sprint-Details zu sehen.
      </div>
    )
  }

  if (loading) return <div className="text-xs text-[var(--subtext0)]">Lade Sprint…</div>
  if (error) return <div className="text-xs text-[var(--accent-danger)]">{error}</div>
  if (!data) return null

  const items = data.items || []

  return (
    <div>
      <div
        data-ui="sprint-order-overlay.info-panel.header"
        className="flex items-baseline justify-between gap-2 mb-2"
      >
        <h3 className="m-0 text-xs uppercase tracking-[0.06em] text-[var(--subtext0)]">
          Sprint-Details
        </h3>
        <span
          title="Database-ID (fuer CLI)"
          className="font-display text-[10px] font-medium text-[var(--subtext0)] bg-[var(--surface0)] px-1.5 py-0.5 rounded whitespace-nowrap"
        >
          id: {data.id}
        </span>
      </div>
      <h4 className="text-sm font-bold m-0 mb-1">
        {sprintKey(data) ? `${sprintKey(data)} — ` : ''}{data.name}
      </h4>
      <div className="flex gap-1.5 flex-wrap mb-3">
        <StatusBadge status={data.status} />
        {data.milestone_id != null && (
          <MilestonePill
            milestone_id={data.milestone_id}
            name={data.milestone_name}
            variant="short"
            onClick={
              typeof onOpenMilestone === 'function'
                ? () => onOpenMilestone(data.milestone_id)
                : undefined
            }
          />
        )}
      </div>
      {data.goal && (
        <div className="text-xs text-[var(--hint)] mb-3 leading-normal">
          {data.goal}
        </div>
      )}

      <h3 className="mt-4 mb-2 text-xs uppercase tracking-[0.06em] text-[var(--subtext0)]">
        Issues ({items.length})
      </h3>
      {items.length === 0 && (
        <div className="text-xs text-[var(--subtext0)]">Keine Issues zugewiesen.</div>
      )}
      <div data-ui="sprint-order-overlay.info-panel.items" className="flex flex-col gap-1">
        {items.map(it => (
          <div
            key={it.id}
            ref={(el) => el && el.style.setProperty('--row-priority', `var(--priority-${it.priority || 3})`)}
            className="flex items-center gap-2 px-2 py-1.5 rounded border-l-[3px] border-l-[var(--row-priority)] bg-[var(--mantle)]"
          >
            <span className="font-display text-[11px] text-[var(--hint)] shrink-0 min-w-[52px]">
              {it.key || `#${it.id}`}
            </span>
            <span
              className="text-xs flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
              title={it.title}
            >
              {it.title}
            </span>
            <StatusBadge status={it.status} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SprintOrderOverlay({ open, sprints, onClose, onReordered, onOpenMilestone, onToast }) {
  // initialList: nur planning+active, sortiert nach position, gefiltert
  const initialList = useMemo(() => {
    if (!Array.isArray(sprints)) return []
    return sprints
      .filter(s => s.status === 'planning' || s.status === 'active')
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  }, [sprints])

  const [orderedList, setOrderedList] = useState(initialList)
  const [activeInfoId, setActiveInfoId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Reset on open / sprints-change
  useEffect(() => {
    if (open) {
      setOrderedList(initialList)
      setActiveInfoId(initialList[0]?.id ?? null)
      setError('')
    }
  }, [open, initialList])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderedList.findIndex(s => String(s.id) === String(active.id))
    const newIndex = orderedList.findIndex(s => String(s.id) === String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    // DD-287 R2: keine Position-Fix-Regel mehr — alle Sprints (inkl. active)
    // duerfen frei umsortiert werden. Server akzeptiert beliebige Reihenfolge.
    setOrderedList(prev => arrayMove(prev, oldIndex, newIndex))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    const items = orderedList.map((s, idx) => ({ id: s.id, position: idx }))
    try {
      const res = await fetch('/api/sprints/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      onReordered?.(data.sprints || [])
      onClose()
    } catch (e) {
      const msg = e.message || 'Reorder fehlgeschlagen'
      setError(msg)
      onToast?.(`Reorder fehlgeschlagen: ${msg}`)
      // Rollback im Overlay auf initialList
      setOrderedList(initialList)
    } finally {
      setSubmitting(false)
    }
  }

  const title = (
    <span className="flex items-center gap-3 w-full">
      <span
        id="sprint-order-modal-title"
        data-ui="sprint-order-overlay.header.title"
        className="m-0 text-base flex-1 font-display tracking-[-0.01em]"
      >
        Sprint-Reihenfolge bearbeiten
      </span>
      <span className="text-[var(--hint)] text-[13px]">
        Drag &amp; Drop · planning + active
      </span>
    </span>
  )

  const footer = (
    <div
      data-ui="sprint-order-overlay.footer"
      className="flex justify-between items-center gap-2 w-full"
    >
      <div className="text-xs text-[var(--accent-danger)]">
        {error}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          data-ui="sprint-order-overlay.footer.cancel"
          onClick={onClose}
          disabled={submitting}
          className={`font-display text-[13px] font-bold px-4 py-[7px] rounded-md bg-transparent text-[var(--subtext0)] border border-[var(--surface1)] ${submitting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          Abbrechen
        </button>
        <button
          type="button"
          data-ui="sprint-order-overlay.footer.save"
          onClick={handleSubmit}
          disabled={submitting || orderedList.length === 0}
          className={`font-display text-[13px] font-bold px-4 py-[7px] rounded-md bg-[var(--accent-primary)] text-[var(--on-accent)] border border-transparent ${submitting ? 'cursor-wait opacity-70' : 'cursor-pointer opacity-100'}`}
        >
          {submitting ? 'Speichere…' : 'Uebernehmen'}
        </button>
      </div>
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      labelledById="sprint-order-modal-title"
      size="xl"
      busy={submitting}
      fade
      padded={false}
      footer={footer}
      dialogDataUi="sprint-order-overlay.modal"
    >
      {/* Body: Two-Pane */}
      <div
        data-ui="sprint-order-overlay.body"
        className="flex-1 overflow-hidden grid grid-cols-[1fr_380px] min-h-[480px]"
      >
        {/* Linker Pane: Drag-Liste */}
        <section
          data-ui="sprint-order-overlay.left-pane"
          className="px-5 py-4 overflow-y-auto border-r border-[var(--surface0)]"
        >
          {orderedList.length === 0 && (
            <div className="text-[var(--subtext0)] text-[13px] p-4">
              Keine planning/active Sprints im aktuellen Projekt.
            </div>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedList.map(s => String(s.id))}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2">
                {orderedList.map((sprint, idx) => (
                  <DragRow
                    key={sprint.id}
                    sprint={sprint}
                    position={idx + 1}
                    activeInfoId={activeInfoId}
                    onInfoClick={setActiveInfoId}
                    onOpenMilestone={onOpenMilestone}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        {/* Rechter Pane: Side-Panel */}
        <aside
          data-ui="sprint-order-overlay.right-pane"
          className="px-5 py-4 overflow-y-auto bg-[var(--base)]"
        >
          <SprintInfoPanel sprintId={activeInfoId} onOpenMilestone={onOpenMilestone} />
        </aside>
      </div>
    </Modal>
  )
}
