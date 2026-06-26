/**
 * RoadmapBoard — Spalten-Board der Roadmap: Meilenstein = Spalte, Sprint = Card.
 * Eckpfeiler-Organismus (D07: organisms/complex). Echtes @dnd-kit:
 *   - Spalten-Reorder (Drag am Header-Handle) — abhängigkeitsbewusst geblockt
 *   - Card-Move Sprint → Meilenstein bzw. → „Nicht zugeordnet"
 * mit Optimistic Updates im lokalen State (D02).
 *
 * MOCKUP-Phase (Promote 1+2): presentational — Daten kommen als Props (Story:
 * Fixture-Import / MSW im Wrapper später). KEIN Live-Fetch hier; der Connected-
 * Wrapper + Route folgen in Phase 3 (PO). Die DnD-Mathe lebt token-frei in
 * `lib/roadmapBoardDnd.js` (unit-getestet), die Sensoren in `lib/dndSensors.js`.
 *
 * @param {object} props
 * @param {Array} [props.milestones=[]] - { id, name, goal|description, position, sprints[] }
 * @param {Array} [props.unassignedSprints=[]] - Sprints ohne milestone_id
 * @param {Array} [props.deps=[]] - { id, predecessor_id, successor_id } (Reorder-Validierung)
 * @param {boolean} [props.loading=false]
 * @param {string|null} [props.error=null] - Fehlertext/Flag: zeigt den Error-State (EmptyState variant="error")
 * @param {()=>void} [props.onRetry] - Retry-CTA im Error-State (Connected-Wrapper: erneut laden)
 * @param {boolean} [props.wide=false] - Wide-Mode: breitere Spalten + Meilenstein-/Sprint-Details
 * @param {(sprint:object)=>void} [props.onOpenSprint] - Navigation (Mockup: Spy)
 * @param {(milestoneId:number)=>void} [props.onOpenMilestone] - Navigation (Mockup: Spy)
 * @param {(payload:{ordered_ids:number[]})=>void} [props.onReorder] - Spalten-Reorder-Echo
 * @param {(sprintId:number, move:{milestone_id:number|null,position:number})=>void} [props.onCardMove]
 * @param {{type:string,id:number|null}} [props.initialActiveDrag] - Story: Drag-Zustand seed
 * @param {string} [props.initialOverId] - Story: Drop-Ziel seed (Indikator/Highlight)
 * @param {string} [props.dataUiScope='organism.roadmapBoard']
 * @param {string} [props.className]
 */
import { useState, useMemo, useEffect, Fragment } from 'react'
import { DndContext, DragOverlay, closestCorners, useDraggable, useDroppable } from '@dnd-kit/core'
import MilestoneColumn from '../base/MilestoneColumn.jsx'
import UnassignedColumn from '../base/UnassignedColumn.jsx'
import SprintCard from '../base/SprintCard.jsx'
import EmptyState from '../../atoms/EmptyState.jsx'
import EntityId from '../../atoms/EntityId.jsx'
import Icon from '../../foundations/Icon.jsx'
import { useTouchDndSensors } from '../../../lib/dndSensors.js'
import {
  colDragId, cardDragId, colDropId, parseDragId,
  computeColumnReorder, validateColumnReorder, applyColumnReorder, computeCardMove,
} from '../../../lib/roadmapBoardDnd.js'

// Sprint-Status, die als „aktiv" im Spalten-Body erscheinen (Q06). Alles andere
// (done/passed/cancelled/completed/closed) wandert in die Completed-Sektion.
const ACTIVE_STATUS = new Set(['planning', 'active', 'review'])

const goalOf = (m) => m.goal ?? m.description ?? ''

function seedCols(milestones) {
  return milestones.map((m) => ({
    id: m.id, name: m.name, goal: goalOf(m), position: m.position ?? 0,
    target_date: m.target_date, dod_total: m.dod_total,
  }))
}

// successor_id → { id } des Vorgänger-Meilensteins (Dep-Badge im Wide-Mode).
function depPredecessorMap(deps) {
  const map = new Map()
  for (const d of deps || []) {
    if (d.successor_id != null && d.predecessor_id != null) map.set(d.successor_id, { id: d.predecessor_id })
  }
  return map
}

function seedSprints(milestones, unassigned) {
  const fromCols = milestones.flatMap((m) => (m.sprints || []).map((s) => ({ ...s, milestone_id: m.id })))
  const loose = unassigned.map((s) => ({ ...s, milestone_id: null }))
  return [...fromCols, ...loose]
}

// — Draggable/Droppable-Wrapper (Hooks pro Element, stabile Komponenten-Identität) —

function DraggableSprintCard({ sprint, dataUiScope, ...rest }) {
  const drag = useDraggable({ id: cardDragId(sprint.id) })
  return (
    <div ref={drag.setNodeRef} data-ui={`${dataUiScope}.drag`}>
      <SprintCard
        sprint={sprint}
        dataUiScope={dataUiScope}
        dragHandleProps={{ ...drag.listeners, ...drag.attributes }}
        dragRef={drag.setActivatorNodeRef}
        grabbing={drag.isDragging}
        isDragging={drag.isDragging}
        {...rest}
      />
    </div>
  )
}

function DraggableMilestoneColumn({ milestone, sprints, completedSprints, onOpenSprint, onOpenMilestone, wide, dependsOn, dimmed, blocked, dataUiScope }) {
  const drag = useDraggable({ id: colDragId(milestone.id) })
  const drop = useDroppable({ id: colDropId(milestone.id) })
  const dim = dimmed || drag.isDragging
  return (
    <div
      ref={drag.setNodeRef}
      data-ui={`${dataUiScope}.drag`}
      className={`${dim ? 'opacity-50' : ''} ${blocked ? 'animate-pulse rounded-lg ring-2 ring-[var(--accent-danger)]' : ''}`}
    >
      <MilestoneColumn
        milestone={milestone}
        sprints={sprints}
        completedSprints={completedSprints}
        dragHandleProps={{ ...drag.listeners, ...drag.attributes }}
        dragRef={drag.setActivatorNodeRef}
        grabbing={drag.isDragging}
        droppableRef={drop.setNodeRef}
        isOver={drop.isOver}
        CardComponent={DraggableSprintCard}
        onOpenSprint={onOpenSprint}
        onOpenMilestone={onOpenMilestone}
        wide={wide}
        dependsOn={dependsOn}
        dataUiScope={dataUiScope}
      />
    </div>
  )
}

function DroppableUnassignedColumn({ sprints, onOpenSprint, wide, dataUiScope }) {
  const drop = useDroppable({ id: colDropId(null) })
  return (
    <UnassignedColumn
      sprints={sprints}
      droppableRef={drop.setNodeRef}
      isOver={drop.isOver}
      CardComponent={DraggableSprintCard}
      onOpenSprint={onOpenSprint}
      wide={wide}
      dataUiScope={dataUiScope}
    />
  )
}

// 2px-Linie zwischen Spalten beim Spalten-Drag (rein visuell).
function ColumnDropIndicator({ dataUiScope }) {
  return <div data-ui={dataUiScope} aria-hidden="true" className="w-[2px] shrink-0 self-stretch rounded-full bg-[var(--accent-info)]" />
}

// Ghost im DragOverlay beim Spalten-Drag.
function ColumnNamePill({ id, name, dataUiScope }) {
  return (
    <div data-ui={dataUiScope} className="inline-flex items-center gap-[var(--space-1)] px-[var(--space-2)] py-[var(--space-1)] rounded-md bg-[var(--layer-3)] border border-[var(--surface1)] shadow-[var(--shadow-pop)]">
      <Icon name="drag" size={14} mono />
      <EntityId kind="milestone" dataUiScope={`${dataUiScope}.id`} className="text-[12px]">M{id}</EntityId>
      <span className="[font-family:var(--font-display)] text-[13px] font-bold text-[var(--text)]">{name}</span>
    </div>
  )
}

// Scroll-Snap-Verhalten der Meilenstein-Reihe (literale Klassen → JIT-sicher).
// mandatory = rastet immer auf eine Column-Kante, proximity = nur wenn nahe,
// none = freies Scrollen.
const SNAP_CONTAINER = {
  mandatory: 'snap-x snap-mandatory',
  proximity: 'snap-x snap-proximity',
  none: '',
}

function SkeletonColumns({ dataUiScope }) {
  return (
    <div data-ui={dataUiScope} className="flex gap-[var(--space-4)]">
      {[0, 1, 2].map((i) => (
        <div key={i} data-ui={`${dataUiScope}.col-${i}`} className="w-72 shrink-0 min-h-[620px] rounded-lg border border-[var(--surface0)] bg-[var(--layer-2)] animate-pulse" />
      ))}
    </div>
  )
}

export default function RoadmapBoard({
  milestones = [], unassignedSprints = [], deps = [], loading = false, error = null, onRetry,
  wide = false, snap = 'mandatory', onOpenSprint, onOpenMilestone, onReorder, onCardMove,
  initialActiveDrag = null, initialOverId = null,
  dataUiScope = 'organism.roadmapBoard', className = '',
}) {
  const sensors = useTouchDndSensors()
  const predecessors = useMemo(() => depPredecessorMap(deps), [deps])
  const [cols, setCols] = useState(() => seedCols(milestones))
  const [sprints, setSprints] = useState(() => seedSprints(milestones, unassignedSprints))
  const [activeDrag, setActiveDrag] = useState(initialActiveDrag)
  const [overId, setOverId] = useState(initialOverId)
  const [blockedColId, setBlockedColId] = useState(null)

  // Props sind die Wahrheit (presentational): ändern sich milestones/unassigned
  // (Suche, Unassigned-Toggle), die Spalten/Sprints neu seeden. Die lokale
  // DnD-Optimistik wird dabei bewusst auf den Prop-Stand zurückgesetzt — ein
  // Datenwechsel von außen überschreibt eine nicht-persistierte Mockup-Reorder.
  useEffect(() => { setCols(seedCols(milestones)) }, [milestones])
  useEffect(() => { setSprints(seedSprints(milestones, unassignedSprints)) }, [milestones, unassignedSprints])

  const orderedCols = useMemo(() => [...cols].sort((a, b) => a.position - b.position), [cols])
  const groups = useMemo(() => {
    const active = new Map()
    const done = new Map()
    for (const col of cols) { active.set(col.id, []); done.set(col.id, []) }
    const unassigned = []
    for (const s of sprints) {
      if (s.milestone_id == null) { unassigned.push(s); continue }
      const bucket = ACTIVE_STATUS.has(s.status) ? active : done
      if (!bucket.has(s.milestone_id)) bucket.set(s.milestone_id, [])
      bucket.get(s.milestone_id).push(s)
    }
    const byPos = (a, b) => (a.position ?? 0) - (b.position ?? 0)
    for (const list of active.values()) list.sort(byPos)
    for (const list of done.values()) list.sort(byPos)
    return { active, done, unassigned: unassigned.sort(byPos) }
  }, [cols, sprints])

  const isEmpty = orderedCols.length === 0 && groups.unassigned.length === 0

  function flagBlocked(id) {
    setBlockedColId(id)
    if (typeof window !== 'undefined') window.setTimeout(() => setBlockedColId(null), 600)
  }

  function handleDragStart(e) {
    setActiveDrag(parseDragId(e.active.id))
  }
  function handleDragOver(e) {
    setOverId(e.over ? e.over.id : null)
  }
  function handleDragEnd(e) {
    const { active, over } = e
    setActiveDrag(null)
    setOverId(null)
    if (!over) return
    const a = parseDragId(active.id)
    if (a.type === 'col') {
      const ordered = computeColumnReorder(orderedCols, active.id, over.id)
      if (!validateColumnReorder(deps, ordered)) { flagBlocked(a.id); return }
      setCols((prev) => applyColumnReorder(prev, ordered))
      onReorder?.({ ordered_ids: ordered })
    } else if (a.type === 'card') {
      const target = parseDragId(over.id)
      const targetColId = target.type === 'drop' ? target.id : null
      const move = computeCardMove(sprints, active.id, over.id, targetColId)
      setSprints((prev) => prev.map((s) => (s.id === a.id ? { ...s, milestone_id: move.milestone_id, position: move.position } : s)))
      onCardMove?.(a.id, move)
    }
  }

  function renderOverlay() {
    if (!activeDrag) return null
    if (activeDrag.type === 'card') {
      const s = sprints.find((x) => x.id === activeDrag.id)
      return s ? <SprintCard sprint={s} variant="active" isDragging dataUiScope={`${dataUiScope}.overlay.card`} /> : null
    }
    if (activeDrag.type === 'col') {
      const c = cols.find((x) => x.id === activeDrag.id)
      return c ? <ColumnNamePill id={c.id} name={c.name} dataUiScope={`${dataUiScope}.overlay.col`} /> : null
    }
    return null
  }

  if (loading) {
    return (
      <div data-ui={dataUiScope} className={`p-[var(--space-4)] ${className}`}>
        <SkeletonColumns dataUiScope={`${dataUiScope}.skeleton`} />
      </div>
    )
  }

  // Render-Reihenfolge: loading → error → empty → board. Der Error-State kommt vom
  // Connected-Wrapper (Fetch fehlgeschlagen); presentational hier nur dargestellt.
  if (error) {
    return (
      <div data-ui={dataUiScope} className={`flex items-center justify-center min-h-[620px] ${className}`}>
        <EmptyState variant="error" onAction={onRetry} dataUiScope={`${dataUiScope}.error`} />
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div data-ui={dataUiScope} className={`flex items-center justify-center min-h-[620px] ${className}`}>
        <EmptyState variant="empty" dataUiScope={`${dataUiScope}.empty`} />
      </div>
    )
  }

  const draggingCol = activeDrag?.type === 'col'
  // Unassigned-Spalte zeigen, solange Staging-Sprints existieren — oder während
  // eines Drags (Un-Assign-Drop-Ziel). Steuert zugleich die Strip-Breite: mit
  // gepinnter Spalte fixe 3-Column-Breite (deckungsgleich mit der Toolbar), ohne
  // sie füllt der Meilenstein-Strip die volle Breite.
  const showUnassigned = groups.unassigned.length > 0 || Boolean(activeDrag)
  const snapContainer = SNAP_CONTAINER[snap] ?? SNAP_CONTAINER.proximity
  const snapItem = snap === 'none' ? '' : 'snap-start'

  return (
    <div data-ui={dataUiScope} className={className}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* 2-Spalten-Makro-Layout: links die scrollbare Meilenstein-Reihe
            (Breite = 3 Columns, deckungsgleich mit der BrowserToolbar), rechts
            die gepinnte Unassigned-Spalte. Diese bleibt sichtbar, solange es
            Unassigned-Sprints gibt — oder während eines Drags (Un-Assign-Drop-
            Ziel), auch wenn aktuell keine vorhanden sind. */}
        <div
          data-ui={`${dataUiScope}.columns`}
          role="region"
          aria-label="Roadmap"
          className="flex items-start gap-[var(--space-4)]"
        >
          <div
            data-ui={`${dataUiScope}.milestones`}
            className={`no-scrollbar flex items-start gap-[var(--space-4)] overflow-x-auto ${snapContainer} ${showUnassigned ? 'w-[calc(18rem*3+var(--space-4)*2)] max-w-full' : 'flex-1 min-w-0'}`}
          >
            {orderedCols.map((col) => (
              <Fragment key={col.id}>
                {draggingCol && overId === colDropId(col.id) && activeDrag.id !== col.id && (
                  <ColumnDropIndicator dataUiScope={`${dataUiScope}.indicator-${col.id}`} />
                )}
                <div className={snapItem}>
                  <DraggableMilestoneColumn
                    milestone={col}
                    sprints={groups.active.get(col.id) || []}
                    completedSprints={groups.done.get(col.id) || []}
                    onOpenSprint={onOpenSprint}
                    onOpenMilestone={onOpenMilestone}
                    wide={wide}
                    dependsOn={predecessors.get(col.id) || null}
                    dimmed={draggingCol && activeDrag.id === col.id}
                    blocked={blockedColId === col.id}
                    dataUiScope={`${dataUiScope}.column-${col.id}`}
                  />
                </div>
              </Fragment>
            ))}
          </div>
          {showUnassigned && (
            <div data-ui={`${dataUiScope}.unassigned-pin`} className="shrink-0">
              <DroppableUnassignedColumn
                sprints={groups.unassigned}
                onOpenSprint={onOpenSprint}
                wide={wide}
                dataUiScope={`${dataUiScope}.unassigned`}
              />
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={null}>{renderOverlay()}</DragOverlay>
      </DndContext>

      {/* a11y: blockierter Reorder wird angesagt (Q02 — Shake-Keyframe noch offen). */}
      <p className="sr-only" role="status" aria-live="polite">
        {blockedColId != null ? 'Verschieben blockiert: Abhängigkeit verletzt.' : ''}
      </p>
    </div>
  )
}
