/**
 * Next3SprintsCard — Organism (DD-481 Phase 5 Gap G4, Projekt-Home Overview).
 *
 * Domänen-bewusste Einheit: die nächsten (bis zu 3) geplanten Sprints eines
 * Projekts, je Zeile mit Drag-Handle-Affordance, plus eine Add-Action zum
 * Einfügen eines neuen Sprints. Komponiert das Organism SprintRow + die Atoms
 * Card + IconButton + das Molecule EmptyState + die Layout-Primitives.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/API/useEffect-Datenladen. Die
 * Sprints kommen als Prop; Add/Select/Reorder sind zu Callback-Props gehoben. Der
 * Drag-Handle ist eine reine VISUELLE Affordance — die eigentliche Reorder-LOGIK
 * (Positions-Berechnung + Persistenz) gehört in den Konsumenten/Screen, analog zur
 * entkoppelten SprintRow (die ihren DnD-Code bewusst nicht trägt). Der Handle wird
 * über den `leading`-Slot INNERHALB der SprintRow gerendert (nicht als
 * Parent-Geschwister) — Anker `${scope}.sprint-row.drag-handle`, stopPropagation
 * hält den Row-Klick sauber.
 *
 * DD-489: Die @dnd-kit-Verdrahtung (DndContext + SortableContext) lebt — analog zu
 * ProjectTodoList — in DIESER Listen-Komponente und wird per `reorderable`-Prop
 * aktiviert. Der Konsument bekommt via `onReorder(fromId, toId)` die rohe
 * Drag-Geste und entscheidet selbst über Positions-Berechnung + API-Persistenz
 * (siehe src/lib/sprintReorder.js). Ohne `reorderable` bleibt es ein statisches
 * Listing mit rein visuellem Handle (Story-/Snapshot-Kontrakt unverändert).
 *
 * TOKEN-CLEAN: 0 inline-style-Literale, 0 Raw-Hex.
 *
 * @param {object} props
 * @param {Array<object>} [props.sprints=[]] - Sprint-Objekte (max. 3 werden gerendert)
 * @param {()=>void} [props.onAdd] - Add-Action „Neuen Sprint einfügen"
 * @param {(sprintId:number)=>void} [props.onSelect] - Zeilen-Klick (an SprintRow durchgereicht)
 * @param {(fromId:number, toId:number)=>void} [props.onReorder] - Drag-End: rohe Geste (gehoben)
 * @param {boolean} [props.reorderable=false] - aktiviert DndContext/SortableContext
 * @param {string} [props.title='Next 3 Sprints'] - Card-Titel
 * @param {string} [props.dataUiScope='next-3-sprints-card'] - Wurzel-data-ui-bereich (I03/D01)
 * @param {string} [props.className] - zusätzliche Klassen
 */
import { Plus, GripVertical } from 'lucide-react'
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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Card from '../atoms/Card.jsx'
import IconButton from '../atoms/IconButton.jsx'
import Cluster from '../layout/Cluster.jsx'
import Stack from '../layout/Stack.jsx'
import SprintRow from './SprintRow.jsx'
import EmptyState from '../molecules/EmptyState.jsx'

// Statischer (nicht-draggbarer) Drag-Handle — reine visuelle Affordance.
function StaticHandle({ dataUiScope }) {
  return (
    <span
      role="button"
      tabIndex={-1}
      data-ui={`${dataUiScope}.sprint-row.drag-handle`}
      aria-label="Sprint verschieben"
      onClick={(e) => e.stopPropagation()}
      className="shrink-0 cursor-grab touch-none text-[var(--overlay0)]"
    >
      <GripVertical size={16} aria-hidden="true" />
    </span>
  )
}

// Sortable-Wrapper: bindet den @dnd-kit-Drag-Source an den Handle im leading-Slot.
// Die DnD-Listener sitzen NUR auf dem Handle (nicht der ganzen Zeile) → Row-Klick
// bleibt sauber.
function SortableSprintRow({ sprint, onSelect, dataUiScope }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sprint.id })

  // DnD transform/transition applied imperatively via the ref callback (no inline
  // style prop — honors the token-clean / forbid-dom-props enforcement layer).
  const setStyle = (el) => {
    setNodeRef(el)
    if (!el) return
    el.style.transform = CSS.Transform.toString(transform) || ''
    el.style.transition = transition || ''
    el.style.opacity = isDragging ? '0.4' : ''
  }

  const handle = (
    <span
      role="button"
      tabIndex={0}
      data-ui={`${dataUiScope}.sprint-row.drag-handle`}
      aria-label="Sprint verschieben"
      onClick={(e) => e.stopPropagation()}
      className="shrink-0 cursor-grab touch-none text-[var(--overlay0)]"
      {...attributes}
      {...listeners}
    >
      <GripVertical size={16} aria-hidden="true" />
    </span>
  )

  return (
    <div ref={setStyle}>
      <SprintRow
        sprint={sprint}
        onSelect={onSelect}
        showChevron={false}
        dataUiScope={`${dataUiScope}.sprint-row`}
        leading={handle}
      />
    </div>
  )
}

export default function Next3SprintsCard({
  sprints = [],
  onAdd,
  onSelect,
  onReorder,
  reorderable = false,
  title = 'Next 3 Sprints',
  dataUiScope = 'next-3-sprints-card',
  className = '',
}) {
  const visible = sprints.slice(0, 3)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event) => {
    if (!reorderable) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    onReorder?.(active.id, over.id)
  }

  const header = (
    <Cluster justify="between" className="mb-3 flex-nowrap">
      <h3 data-ui={`${dataUiScope}.title`} className="m-0 text-[13px] font-bold text-[var(--text)]">
        {title}
      </h3>
      <IconButton
        size="sm"
        icon={<Plus size={16} aria-hidden="true" />}
        label="Neuen Sprint einfügen"
        variant="default"
        onClick={onAdd}
        data-ui={`${dataUiScope}.add`}
      />
    </Cluster>
  )

  if (visible.length === 0) {
    return (
      <Card tone="mantle" data-ui={dataUiScope} className={className}>
        {header}
        <EmptyState role="status" title="Keine geplanten Sprints." data-ui={`${dataUiScope}.empty`} />
      </Card>
    )
  }

  if (!reorderable) {
    return (
      <Card tone="mantle" data-ui={dataUiScope} className={className}>
        {header}
        <Stack gap="xs" data-ui={`${dataUiScope}.list`}>
          {visible.map((sprint) => (
            <SprintRow
              key={sprint.id}
              sprint={sprint}
              onSelect={onSelect}
              showChevron={false}
              dataUiScope={`${dataUiScope}.sprint-row`}
              leading={<StaticHandle dataUiScope={dataUiScope} />}
            />
          ))}
        </Stack>
      </Card>
    )
  }

  return (
    <Card tone="mantle" data-ui={dataUiScope} className={className}>
      {header}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visible.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <Stack gap="xs" data-ui={`${dataUiScope}.list`}>
            {visible.map((sprint) => (
              <SortableSprintRow
                key={sprint.id}
                sprint={sprint}
                onSelect={onSelect}
                dataUiScope={dataUiScope}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>
    </Card>
  )
}
