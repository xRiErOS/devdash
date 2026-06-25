import React from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ListChecks } from 'lucide-react'
import EmptyState from '../ui/molecules/EmptyState.jsx'
import { DroppableColumn, SprintHeader, SortableIssueCard } from './primitives.jsx'

// Plan 04 T01 (D09): einzelne Sprint-Spalte als wiederverwendbares Organism.
// Komponiert DroppableColumn + SprintHeader + SortableContext + SortableIssueCard.
// Props-rein (kein State) — identisches Markup für flat- und Swimlane-Modus.
// DD-49/DD-187: active- und review-Sprints werden mit peach top-border +
// mantle-Background hervorgehoben (isActive intern berechnet).
export default function SprintColumn({
  sprint,
  items,
  sprintCount,
  hideCompleted,
  onReorder,
  onAddIssue,
  onEdit,
  onDelete,
  onSprintChanged,
  archonEnabled,
  onOpenMilestone,
  onSelect,
  onToggleMulti,
  selectedIds,
  search,
}) {
  const isActive = sprint.status === 'active' || sprint.status === 'review'
  return (
    <DroppableColumn
      columnId={`col-sprint-${sprint.id}`}
      data-ui={`sprint-board.column.${sprint.id}`}
      className="flex-shrink-0 w-[22rem] rounded-xl p-4"
      style={{
        background: isActive ? 'var(--mantle)' : 'var(--crust)',
        borderTop: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
      }}
    >
      <SprintHeader
        sprint={sprint}
        sprintCount={sprintCount}
        onReorder={onReorder}
        onAddIssue={onAddIssue}
        onEdit={onEdit}
        onDelete={onDelete}
        onSprintChanged={onSprintChanged}
        archonEnabled={archonEnabled}
        onOpenMilestone={onOpenMilestone}
      />
      <SortableContext
        items={items.map(i => String(i.id))}
        strategy={verticalListSortingStrategy}
      >
        {items.map(item => (
          <SortableIssueCard key={item.id} item={item} onSelect={onSelect} onToggleMulti={onToggleMulti} multiSelected={selectedIds.has(item.id)} highlightQuery={search} />
        ))}
        {items.length === 0 && (
          <EmptyState
            size="sm"
            icon={<ListChecks size={20} />}
            title={hideCompleted ? 'Keine offenen Items' : 'Keine Items'}
            description={hideCompleted ? 'Items per Drag & Drop aus dem Backlog hinzufuegen.' : undefined}
          />
        )}
      </SortableContext>
    </DroppableColumn>
  )
}
