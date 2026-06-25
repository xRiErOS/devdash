/**
 * SprintOrderOverlay — kanonisches, token-sauberes Organism (DD-481 Phase-3 Batch 5,
 * harvested aus src/components/SprintOrderOverlay.jsx, DD-287).
 *
 * Domänen-bewusste Einheit (Domäne: Sprint): Drag&Drop-Overlay zum Umordnen der
 * Sprint-Reihenfolge (planning + active). Zwei-Pane-Layout im Modal — links die
 * sortierbare Sprint-Liste (dnd-kit), rechts ein Side-Panel mit Sprint-Details.
 * Komponiert die Molecule Modal und die Domänen-Bausteine MilestonePill +
 * StatusBadge.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/useEffect-Datenladen. Gehobene
 * Kopplung gegenüber der Quelle:
 *  - Quelle filterte/sortierte `sprints` intern auf planning+active. Bleibt als
 *    reine Ableitung (useMemo) erhalten — keine Daten-Kopplung, nur View-Logik.
 *  - Quelle fetchte in `SprintInfoPanel` via `fetch('/api/sprints/:id')` das
 *    aktive Sprint-Detail. Diese Daten-Kopplung ist zur Prop `activeSprintDetail`
 *    gehoben (das Detail-Objekt des aktuell selektierten Sprints, vom Screen
 *    geladen). Lade-/Fehler-Zustand kommen als `infoLoading`/`infoError`-Props.
 *  - Quelle rief in `handleSubmit` `fetch('/api/sprints/reorder', PATCH)` +
 *    Rollback auf. Diese Mutation ist zur Callback-Prop `onReorder(items)` gehoben
 *    (items = [{ id, position }]); der `submitting`/`error`-Zustand kommt als
 *    Props (`submitting`/`error`) rein, damit der Screen Optimistic/Rollback
 *    steuert. `onClose`/`onOpenMilestone`/`onToast` bleiben Callback-Props.
 *  - Quelle setzte die Priority-Border via `ref`-Inline-`style.setProperty`. Hier
 *    durch eine statische, JIT-sichtbare Border-Token-Klassen-Map ersetzt
 *    (gleicher visueller Effekt, kein inline-style).
 *  - `sprintKey` (reiner Label-Formatter) bleibt importiert — keine Daten-Kopplung.
 *
 * Ephemerer UI-State BLEIBT intern: `orderedList` (Drag-Reihenfolge), `activeInfoId`
 * (welcher Sprint im Side-Panel gezeigt wird) — beides reiner UI-State, kein
 * Daten-State. DnD-Verdrahtung (sensors, arrayMove, handleDragEnd, DndContext,
 * SortableContext, useSortable) bleibt im Organism (UI-Verhalten, keine Daten).
 *
 * Erhöhte Kopplung (D-Phase3-01): bindet `@dnd-kit/core` + `@dnd-kit/sortable` +
 * `@dnd-kit/utilities` (Drag-Transform). Das ist UI-Verhalten, kein Daten-State.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {Array<object>} [props.sprints=[]] - alle Sprints des Projekts; intern auf
 *        planning+active gefiltert + nach position sortiert.
 * @param {object} [props.activeSprintDetail=null] - Detail-Objekt des im Side-Panel
 *        aktiven Sprints { id, name, status, goal?, milestone_id?, milestone_name?,
 *        items?: [{id,key?,title,status,priority?}] } (gehoben aus fetch).
 * @param {boolean} [props.infoLoading=false] - Lade-Zustand des Side-Panels (gehoben)
 * @param {string} [props.infoError=''] - Fehler-Text des Side-Panels (gehoben)
 * @param {boolean} [props.submitting=false] - Submit läuft (gehoben; sperrt Buttons + ESC)
 * @param {string} [props.error=''] - Submit-Fehler-Text (gehoben)
 * @param {(items:Array<{id:number,position:number}>)=>void} [props.onReorder] - Übernehmen → Reorder-Mutation (gehoben)
 * @param {(sprintId:number)=>void} [props.onActiveInfoChange] - Info-Icon → Side-Panel-Sprint wechseln
 * @param {()=>void} [props.onClose]
 * @param {(milestoneId:number)=>void} [props.onOpenMilestone] - Klick auf MilestonePill
 * @param {string} [props.dataUiScope='sprint-order-overlay'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 */

import { useEffect, useMemo, useState } from 'react'
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
import EntityPill from '../atoms/EntityPill.jsx'
import StatusBadge from '../atoms/StatusBadge.jsx'
import Modal from '../molecules/Modal.jsx'
import { sprintKey } from '../../../lib/sprintLabel.js'

const SPRINT_PILL_CLASS_BY_STATUS = {
  planning: 'border-[var(--lavender)] text-[var(--lavender)]',
  active: 'border-[var(--peach)] text-[var(--peach)]',
  review: 'border-[var(--mauve)] text-[var(--mauve)]',
}

// Priority → statische Border-Token-Klasse (JIT-sichtbar). Ersetzt den
// ref-`style.setProperty('--row-priority', …)`-Hack der Quelle (token-clean).
const PRIORITY_BORDER = {
  1: 'border-l-[var(--priority-1)]',
  2: 'border-l-[var(--priority-2)]',
  3: 'border-l-[var(--priority-3)]',
  4: 'border-l-[var(--priority-4)]',
  5: 'border-l-[var(--priority-5)]',
}

function SprintPill({ sprint }) {
  const colorClass =
    SPRINT_PILL_CLASS_BY_STATUS[sprint.status] || 'border-[var(--surface2)] text-[var(--text)]'
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

function DragRow({ sprint, position, activeInfoId, onInfoClick, onOpenMilestone, scope }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(sprint.id),
  })

  // EINZIGER erlaubter dynamischer style: der DnD-Transform/Transition ist zur
  // Render-Zeit nicht als statische Tailwind-Klasse abbildbar (dnd-kit berechnet
  // ihn pro Frame aus der Pointer-Bewegung).
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
      // eslint-disable-next-line react/forbid-dom-props -- DnD-Transform: dnd-kit berechnet transform/transition pro Frame, nicht als statische Tailwind-Klasse abbildbar (maxInline=1).
      style={dndStyle}
      data-pos={position}
      data-ui={`${scope}.drag-row.${sprint.id}`}
      className={`bg-[var(--base)] rounded-lg p-3 flex items-center gap-2 border ${
        isDragging ? 'opacity-50 border-[var(--accent-info)]' : 'opacity-100 border-[var(--surface0)]'
      }`}
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
            <EntityPill
              entity="milestone"
              id={sprint.milestone_id}
              name={sprint.milestone_name}
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
          {sprint.goal ? (
            sprint.goal.length > 90 ? `${sprint.goal.slice(0, 90)}…` : sprint.goal
          ) : (
            <em className="text-[var(--subtext0)]">kein Goal</em>
          )}
          {itemCount > 0 && (
            <span className="ml-2">
              · {itemCount} Issue{itemCount !== 1 ? 's' : ''}
              {doneCount > 0 ? ` (${doneCount} done)` : ''}
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
          className={`w-7 h-7 rounded-full border-0 p-0 cursor-pointer inline-grid place-items-center ${
            infoActive
              ? 'bg-[color-mix(in_srgb,var(--accent-info)_22%,transparent)] text-[var(--accent-info)]'
              : 'bg-transparent text-[var(--subtext0)]'
          }`}
        >
          <Info size={16} />
        </button>
      </div>
    </div>
  )
}

// Presentational: Sprint-Detail kommt als Prop rein (gehoben aus fetch).
function SprintInfoPanel({ sprintId, detail, loading, error, onOpenMilestone, scope }) {
  if (sprintId == null) {
    return (
      <div className="text-xs text-[var(--subtext0)] p-2">
        Info-Icon auf der linken Seite klicken, um Sprint-Details zu sehen.
      </div>
    )
  }

  if (loading) return <div className="text-xs text-[var(--subtext0)]">Lade Sprint…</div>
  if (error) return <div className="text-xs text-[var(--accent-danger)]">{error}</div>
  if (!detail) return null

  const items = detail.items || []

  return (
    <div>
      <div
        data-ui={`${scope}.info-panel.header`}
        className="flex items-baseline justify-between gap-2 mb-2"
      >
        <h3 className="m-0 text-xs uppercase tracking-[0.06em] text-[var(--subtext0)]">
          Sprint-Details
        </h3>
        <span
          title="Database-ID (fuer CLI)"
          className="font-display text-[10px] font-medium text-[var(--subtext0)] bg-[var(--surface0)] px-1.5 py-0.5 rounded whitespace-nowrap"
        >
          id: {detail.id}
        </span>
      </div>
      <h4 className="text-sm font-bold m-0 mb-1">
        {sprintKey(detail) ? `${sprintKey(detail)} — ` : ''}
        {detail.name}
      </h4>
      <div className="flex gap-1.5 flex-wrap mb-3">
        <StatusBadge status={detail.status} />
        {detail.milestone_id != null && (
          <EntityPill
            entity="milestone"
            id={detail.milestone_id}
            name={detail.milestone_name}
            onClick={
              typeof onOpenMilestone === 'function'
                ? () => onOpenMilestone(detail.milestone_id)
                : undefined
            }
          />
        )}
      </div>
      {detail.goal && (
        <div className="text-xs text-[var(--hint)] mb-3 leading-normal">{detail.goal}</div>
      )}

      <h3 className="mt-4 mb-2 text-xs uppercase tracking-[0.06em] text-[var(--subtext0)]">
        Issues ({items.length})
      </h3>
      {items.length === 0 && (
        <div className="text-xs text-[var(--subtext0)]">Keine Issues zugewiesen.</div>
      )}
      <div data-ui={`${scope}.info-panel.items`} className="flex flex-col gap-1">
        {items.map((it) => (
          <div
            key={it.id}
            className={`flex items-center gap-2 px-2 py-1.5 rounded border-l-[3px] bg-[var(--mantle)] ${
              PRIORITY_BORDER[it.priority] || PRIORITY_BORDER[3]
            }`}
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

export default function SprintOrderOverlay({
  open,
  sprints = [],
  activeSprintDetail = null,
  infoLoading = false,
  infoError = '',
  submitting = false,
  error = '',
  onReorder,
  onActiveInfoChange,
  onClose,
  onOpenMilestone,
  dataUiScope = 'sprint-order-overlay',
}) {
  // initialList: nur planning+active, sortiert nach position (reine View-Ableitung).
  const initialList = useMemo(() => {
    if (!Array.isArray(sprints)) return []
    return sprints
      .filter((s) => s.status === 'planning' || s.status === 'active')
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  }, [sprints])

  const [orderedList, setOrderedList] = useState(initialList)
  const [activeInfoId, setActiveInfoId] = useState(null)

  // Reset on open / sprints-change (ephemerer UI-State, kein Daten-State).
  useEffect(() => {
    if (open) {
      setOrderedList(initialList)
      const firstId = initialList[0]?.id ?? null
      setActiveInfoId(firstId)
      if (firstId != null) onActiveInfoChange?.(firstId)
    }
    // onActiveInfoChange bewusst NICHT in deps — reiner Open-Reset, kein Re-Sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialList])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderedList.findIndex((s) => String(s.id) === String(active.id))
    const newIndex = orderedList.findIndex((s) => String(s.id) === String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    // DD-287 R2: keine Position-Fix-Regel mehr — alle Sprints (inkl. active)
    // duerfen frei umsortiert werden.
    setOrderedList((prev) => arrayMove(prev, oldIndex, newIndex))
  }

  const handleInfoClick = (id) => {
    setActiveInfoId(id)
    onActiveInfoChange?.(id)
  }

  const handleSubmit = () => {
    const items = orderedList.map((s, idx) => ({ id: s.id, position: idx }))
    onReorder?.(items)
  }

  const title = (
    <span className="flex items-center gap-3 w-full">
      <span
        id="sprint-order-modal-title"
        data-ui={`${dataUiScope}.header.title`}
        className="m-0 text-base flex-1 font-display tracking-[-0.01em]"
      >
        Sprint-Reihenfolge bearbeiten
      </span>
      <span className="text-[var(--hint)] text-[13px]">Drag &amp; Drop · planning + active</span>
    </span>
  )

  const footer = (
    <div data-ui={`${dataUiScope}.footer`} className="flex justify-between items-center gap-2 w-full">
      <div className="text-xs text-[var(--accent-danger)]">{error}</div>
      <div className="flex gap-2">
        <button
          type="button"
          data-ui={`${dataUiScope}.footer.cancel`}
          onClick={onClose}
          disabled={submitting}
          className="font-display text-[13px] font-bold px-4 py-[7px] rounded-md bg-transparent text-[var(--subtext0)] border border-[var(--surface1)] disabled:cursor-not-allowed cursor-pointer"
        >
          Abbrechen
        </button>
        <button
          type="button"
          data-ui={`${dataUiScope}.footer.save`}
          onClick={handleSubmit}
          disabled={submitting || orderedList.length === 0}
          className={`font-display text-[13px] font-bold px-4 py-[7px] rounded-md bg-[var(--accent-primary)] text-[var(--on-accent)] border border-transparent disabled:cursor-not-allowed ${
            submitting ? 'cursor-wait opacity-70' : 'cursor-pointer opacity-100'
          }`}
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
      dialogDataUi={`${dataUiScope}.modal`}
    >
      {/* Body: Two-Pane */}
      <div
        data-ui={`${dataUiScope}.body`}
        className="flex-1 overflow-hidden grid grid-cols-[1fr_380px] min-h-[480px]"
      >
        {/* Linker Pane: Drag-Liste */}
        <section
          data-ui={`${dataUiScope}.left-pane`}
          className="px-5 py-4 overflow-y-auto border-r border-[var(--surface0)]"
        >
          {orderedList.length === 0 && (
            <div className="text-[var(--subtext0)] text-[13px] p-4">
              Keine planning/active Sprints im aktuellen Projekt.
            </div>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={orderedList.map((s) => String(s.id))}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col gap-2">
                {orderedList.map((sprint, idx) => (
                  <DragRow
                    key={sprint.id}
                    sprint={sprint}
                    position={idx + 1}
                    activeInfoId={activeInfoId}
                    onInfoClick={handleInfoClick}
                    onOpenMilestone={onOpenMilestone}
                    scope={dataUiScope}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        {/* Rechter Pane: Side-Panel */}
        <aside
          data-ui={`${dataUiScope}.right-pane`}
          className="px-5 py-4 overflow-y-auto bg-[var(--base)]"
        >
          <SprintInfoPanel
            sprintId={activeInfoId}
            detail={activeSprintDetail}
            loading={infoLoading}
            error={infoError}
            onOpenMilestone={onOpenMilestone}
            scope={dataUiScope}
          />
        </aside>
      </div>
    </Modal>
  )
}
