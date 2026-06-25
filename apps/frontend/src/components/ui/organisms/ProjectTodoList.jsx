/**
 * ProjectTodoList — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/projectHome/ProjectTodoList.jsx, DD-283).
 *
 * Domänen-bewusste Einheit: rendert die sortierbare ToDo-Liste eines Projekts.
 * Enthält den DnD-Provider INTERN (DndContext + SortableContext + arrayMove),
 * komponiert das Organism `./SortableTodoItem.jsx` (B2) pro Zeile und das
 * Molecule `../molecules/EmptyState.jsx` für den Leer-Zustand.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/API/useEffect-Datenladen. Die
 * gehobene Kopplung gegenüber der Quelle:
 *  - Die ToDo-Daten kommen rein als `todos`-Prop (Default `[]`); kein Laden mehr.
 *  - Reorder-Mutation ist zur Callback-Prop `onReorder(idsInNewOrder)` gehoben;
 *    die `arrayMove`-Berechnung (alte/neue Position → neue ID-Reihenfolge) bleibt
 *    als reine UI-Logik intern, gefeuert wird aber nur der Callback.
 *  - `onToggleDone`/`onDelete`/`onOpenDetail`/`onOpenIssue` werden unverändert an
 *    die `SortableTodoItem`-Zeilen durchgereicht (Patches macht der Screen).
 *  - Der inline-`style`-Leer-Zustand der Quelle ist durch das kanonische
 *    `EmptyState`-Molecule ersetzt; die beiden inline-`style`-Listen-Container
 *    sind token-clean nach Tailwind v4 gehoben.
 *
 * Ephemerer UI-State BLEIBT: `useSensors` (DnD-Sensoren) — kein Daten-State.
 *
 * DnD: das Organism hält den DndContext selbst. Sub-Zeilen nutzen `useSortable`
 * (der einzige runtime-dynamische inline-style sitzt dort, nicht hier).
 *
 * @param {object} props
 * @param {Array<{id:number,label:string,status:string,links?:Array}>} [props.todos=[]] - ToDo-Datensätze
 * @param {(idsInNewOrder:number[])=>void} [props.onReorder] - Reorder-Mutation (gehoben)
 * @param {(id:number, nextStatus:'open'|'done')=>void} [props.onToggleDone] - Checkbox-Toggle (durchgereicht)
 * @param {(id:number)=>void} [props.onDelete] - Delete (durchgereicht; Confirm macht der Screen)
 * @param {(todo:object)=>void} [props.onOpenDetail] - Label/Counter-Klick → Detail (durchgereicht)
 * @param {(issueKey:string)=>void} [props.onOpenIssue] - Issue-Pillen-Klick → Issue öffnen (durchgereicht)
 * @param {boolean} [props.reorderable=true] - false → gefilterte/durchsuchte Ansicht ohne DnD (Subset-Reorder würde Positionen korrumpieren)
 * @param {string} [props.dataUiScope='project-todo-list'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { DndContext, closestCenter } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import SortableTodoItem from './SortableTodoItem.jsx'
import EmptyState from '../molecules/EmptyState.jsx'
import { useTouchDndSensors } from '../../../lib/dndSensors.js'

export default function ProjectTodoList({
  todos = [],
  onReorder,
  onToggleDone,
  onDelete,
  onOpenDetail,
  onOpenIssue,
  reorderable = true,
  dataUiScope = 'project-todo-list',
  className = '',
}) {
  // DD-638 (F6): geteilte Touch-DnD-Sensoren — Long-press-Touch macht das
  // Todo-Reordering auf Mobile zuverlässig; Keyboard-a11y bleibt erhalten.
  const sensors = useTouchDndSensors({
    pointerDistance: 6,
    keyboardCoordinateGetter: sortableKeyboardCoordinates,
  })

  const handleDragEnd = (event) => {
    if (!reorderable) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = todos.map((t) => t.id)
    const oldIdx = ids.indexOf(active.id)
    const newIdx = ids.indexOf(over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const reordered = arrayMove(ids, oldIdx, newIdx)
    onReorder?.(reordered)
  }

  if (!todos || todos.length === 0) {
    return (
      <EmptyState
        data-ui={`${dataUiScope}.empty`}
        role="status"
        title="Keine ToDos. Erstes ToDo oben eingeben."
        className={className}
      />
    )
  }

  const ids = todos.map((t) => t.id)

  const items = todos.map((t) => (
    <SortableTodoItem
      key={t.id}
      todo={t}
      rootDataUi="plugin.todo.item"
      onToggleDone={onToggleDone}
      onDelete={onDelete}
      onOpenDetail={onOpenDetail}
      onOpenIssue={onOpenIssue}
    />
  ))

  // DD-363: Reorder nur in der vollständigen, ungefilterten Positions-Ansicht erlaubt.
  // In gefilterten/durchsuchten Ansichten würde ein Subset-Reorder ORDER_MISMATCH werfen
  // bzw. Positionen korrumpieren → kein DndContext, normales div-Listing.
  if (!reorderable) {
    return (
      <div data-ui={dataUiScope} role="list" className={`flex flex-col gap-0.5 ${className}`}>
        {items}
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div data-ui={dataUiScope} role="list" className={`flex flex-col gap-0.5 ${className}`}>
          {items}
        </div>
      </SortableContext>
    </DndContext>
  )
}
