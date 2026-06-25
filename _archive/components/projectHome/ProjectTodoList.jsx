// DD-283 (M3-S02 T03): Sortierbare ToDo-Liste mit @dnd-kit. DndContext + Sortable
// Context. arrayMove via ids → onReorder. Slug `project-home.todo-tab.list`.

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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
// DD-500: canonical ui/organisms/SortableTodoItem (statt produktiv-Variante).
// rootDataUi hält den gate-kritischen Wurzel-Anker `plugin.todo.item`; dataUiScope
// hält die Kind-Anker auf `project-home.todo-tab.list.item.*` (1:1 zur Ist-Form).
import SortableTodoItem from '../ui/organisms/SortableTodoItem.jsx'

export default function ProjectTodoList({ todos, onReorder, onToggleDone, onDelete, onOpenDetail, onOpenIssue, reorderable = true }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event) => {
    if (!reorderable) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = todos.map(t => t.id)
    const oldIdx = ids.indexOf(active.id)
    const newIdx = ids.indexOf(over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const reordered = arrayMove(ids, oldIdx, newIdx)
    onReorder?.(reordered)
  }

  if (!todos || todos.length === 0) {
    return (
      <div
        data-ui="project-home.todo-tab.list.empty"
        role="status"
        style={{
          padding: 'var(--space-6, 24px)',
          textAlign: 'center',
          color: 'var(--subtext0)',
          fontSize: 13,
        }}
      >
        Keine ToDos. Erstes ToDo oben eingeben.
      </div>
    )
  }

  const ids = todos.map(t => t.id)

  const items = todos.map((t) => (
    <SortableTodoItem
      key={t.id}
      todo={t}
      rootDataUi="plugin.todo.item"
      dataUiScope="project-home.todo-tab.list.item"
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
      <div
        data-ui="project-home.todo-tab.list"
        role="list"
        style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        {items}
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          data-ui="project-home.todo-tab.list"
          role="list"
          style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {items}
        </div>
      </SortableContext>
    </DndContext>
  )
}
