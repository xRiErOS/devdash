import { useState } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ListChecks, ChevronDown, ChevronRight } from 'lucide-react'
import DroppableColumn from '../molecules/DroppableColumn.jsx'
import EmptyState from '../molecules/EmptyState.jsx'
import SprintHeader from './SprintHeader.jsx'
import SortableIssueCard from './SortableIssueCard.jsx'

/**
 * SprintColumn — kanonisches, token-sauberes Organism (DD-481 Phase 3 Batch 4,
 * harvest aus src/components/sprintBoard/SprintColumn.jsx).
 *
 * Domänen-bewusste Einheit: rendert eine vollständige Sprint-Spalte des Roadmap-
 * Boards — Drop-Target (DroppableColumn) + Sprint-Metadaten (SprintHeader) +
 * vertikal sortierbare Liste von Issue-Karten (SortableIssueCard) bzw. ein
 * EmptyState, wenn keine Items vorhanden sind. `hideCompleted` blendet erledigte
 * Issues (status `done`/`cancelled`) aus.
 *
 * Komponiert:
 *  - ../molecules/DroppableColumn.jsx — @dnd-kit Drop-Target (eigener Transform/Highlight intern)
 *  - ./SprintHeader.jsx (Batch 1) — Sprint-Kopfzeile inkl. Kapazität/Toolbar
 *  - ./SortableIssueCard.jsx (Batch 2) — DnD-Wrapper um IssueCard (transform-style intern)
 *  - ../molecules/EmptyState.jsx — Leer-Zustand der Spalte
 *
 * PRESENTATIONAL (D-Phase3-01) — gehobene Kopplung gegenüber der Quelle:
 *  - Die Quelle reichte Daten bereits props-rein durch (kein Store/Fetch direkt in
 *    SprintColumn); sämtliche `sprint`/`items`-Daten kommen als Props, Mutationen
 *    laufen über Callback-Props (onReorder/onAddIssue/onEdit/onDelete/onRunArchon/
 *    onOpenMilestone/onSelect/onToggleMulti).
 *  - Quelle übergab den active/review-Hervorhebungs-`style` (mantle/crust-Background
 *    + top-border) als inline-style an DroppableColumn. Da das eine STATISCHE binäre
 *    Wahl ist (kein runtime-per-frame-Wert), ist sie hier zu Tailwind-Klassen-Maps
 *    aufgelöst (ACTIVE_COL/IDLE_COL) — kein verbleibender inline-style nötig.
 *  - Quelle nutzte ein abweichendes SprintHeader/SortableIssueCard-Props-Schema
 *    (primitives.jsx); hier auf die kanonischen Batch-1/2-Organisms verdrahtet
 *    (sprintId/reviewHref/actionsSlot etc. werden vom Screen vorbereitet und
 *    durchgereicht).
 *
 * Ephemerer UI-State (BLEIBT): `collapsed` (lokaler Collapse-Toggle der Spalte).
 *
 * @param {object} props
 * @param {object} props.sprint - Sprint-Datensatz (status, name, capacity, …; siehe SprintHeader).
 * @param {Array<object>} [props.items=[]] - Issue-Datensätze der Spalte (siehe IssueCard).
 * @param {string} [props.sprintId] - vorformatierter Sprint-Key für SprintHeader (z.B. "DD#34").
 * @param {string} [props.milestoneLabel] - vorformatiertes Milestone-Label für SprintHeader.
 * @param {string} [props.milestoneTitle] - Milestone-Tooltip für SprintHeader.
 * @param {boolean} [props.hideCompleted=false] - blendet done/cancelled-Items aus.
 * @param {boolean} [props.collapsible=false] - blendet einen Collapse-Toggle der Spalte ein.
 * @param {boolean} [props.archonEnabled=false] - reicht den Archon-Trigger an SprintHeader durch.
 * @param {number} [props.activeRunId] - aktive Archon-Run-ID (an SprintHeader).
 * @param {string} [props.reviewHref] - Review-Link-Ziel (an SprintHeader).
 * @param {string} [props.highlightQuery=''] - Such-Query → Titel-Highlight in den Karten.
 * @param {Set<number>} [props.selectedIds] - multi-selektierte Issue-IDs.
 * @param {React.ReactNode} [props.actionsSlot] - Lifecycle-Buttons-Slot (an SprintHeader).
 * @param {React.ReactNode} [props.archonLogSlot] - Archon-Log-Slot (an SprintHeader).
 * @param {(sprintId:number, dir:'up'|'down')=>void} [props.onReorder]
 * @param {(sprint:object)=>void} [props.onEdit]
 * @param {(sprint:object)=>void} [props.onDelete]
 * @param {(sprint:object)=>(void|Promise<void>)} [props.onRunArchon]
 * @param {(milestoneId:number)=>void} [props.onOpenMilestone]
 * @param {(id:number)=>void} [props.onSelect]
 * @param {(id:number)=>void} [props.onToggleMulti]
 * @param {(id:number, next:string, notes?:string)=>void} [props.onStatusChange]
 * @param {string} [props.dataUiScope='sprint-column'] - parametrisierter data-ui-Wurzelbereich (I03/D01).
 * @param {string} [props.className]
 */

// active/review-Sprints: mantle-Background + Akzent-Top-Border. Statische Klassen-
// Maps (Tailwind-JIT-sichtbar), Ersatz für den inline-style der Quelle.
const ACTIVE_COL = 'bg-[var(--mantle)] border-t-[3px] border-t-[var(--accent-primary)]'
const IDLE_COL = 'bg-[var(--crust)] border-t-[3px] border-t-transparent'

const COMPLETED_STATUSES = new Set(['done', 'cancelled'])

export default function SprintColumn({
  sprint,
  items = [],
  sprintId,
  milestoneLabel,
  milestoneTitle,
  hideCompleted = false,
  collapsible = false,
  archonEnabled = false,
  activeRunId = null,
  reviewHref,
  highlightQuery = '',
  selectedIds,
  actionsSlot,
  archonLogSlot,
  onReorder,
  onEdit,
  onDelete,
  onRunArchon,
  onOpenMilestone,
  onSelect,
  onToggleMulti,
  onStatusChange,
  dataUiScope = 'sprint-column',
  className = '',
}) {
  const [collapsed, setCollapsed] = useState(false)

  const isActive = sprint.status === 'active' || sprint.status === 'review'
  const colTone = isActive ? ACTIVE_COL : IDLE_COL

  // hideCompleted: done/cancelled-Items rausfiltern (presentational, kein Daten-State).
  const visibleItems = hideCompleted
    ? items.filter((i) => !COMPLETED_STATUSES.has(i.status))
    : items

  const selected = selectedIds || new Set()

  return (
    <DroppableColumn
      id={`col-sprint-${sprint.id}`}
      data-ui={dataUiScope}
      className={`flex-shrink-0 w-[22rem] rounded-xl p-4 ${colTone} ${className}`}
    >
      <div className="flex items-start gap-1">
        {collapsible && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            data-ui={`${dataUiScope}.collapse`}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Spalte ausklappen' : 'Spalte einklappen'}
            className="mt-0.5 shrink-0 text-[var(--subtext0)] hover:text-[var(--text)]"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <SprintHeader
            sprint={sprint}
            sprintId={sprintId}
            milestoneLabel={milestoneLabel}
            milestoneTitle={milestoneTitle}
            archonEnabled={archonEnabled}
            activeRunId={activeRunId}
            reviewHref={reviewHref}
            actionsSlot={actionsSlot}
            archonLogSlot={archonLogSlot}
            onReorder={onReorder}
            onEdit={onEdit}
            onDelete={onDelete}
            onRunArchon={onRunArchon}
            onOpenMilestone={onOpenMilestone}
            dataUiScope={`${dataUiScope}.header`}
          />
        </div>
      </div>

      {!collapsed && (
        <SortableContext
          items={visibleItems.map((i) => String(i.id))}
          strategy={verticalListSortingStrategy}
        >
          {visibleItems.map((item) => (
            <SortableIssueCard
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              multiSelected={selected.has(item.id)}
              highlightQuery={highlightQuery}
              onSelect={onSelect}
              onToggleMulti={onToggleMulti}
              onStatusChange={onStatusChange}
              dataUiScope={`${dataUiScope}.card`}
            />
          ))}
          {visibleItems.length === 0 && (
            <EmptyState
              size="sm"
              icon={<ListChecks size={20} />}
              title={hideCompleted ? 'Keine offenen Items' : 'Keine Items'}
              description={
                hideCompleted
                  ? 'Items per Drag & Drop aus dem Backlog hinzufuegen.'
                  : undefined
              }
              data-ui={`${dataUiScope}.empty`}
            />
          )}
        </SortableContext>
      )}
    </DroppableColumn>
  )
}
