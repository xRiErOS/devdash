/**
 * UnassignedColumn — Staging-Spalte für Sprints ohne Meilenstein. Rechtes Ende
 * des RoadmapBoard (D05). Presentational, analog `MilestoneColumn`, aber:
 *   - kein DragHandle (Spalte nicht verschiebbar)
 *   - kein „Abgeschlossen"-Bereich
 *   - optisch abgesetzt: layer-3 + gestrichelte Border (Q03-Entscheidung)
 *
 * Drop-Ziel-Verdrahtung kommt vom Container (`droppableRef`/`isOver`),
 * Card-Drag via `CardComponent` (Container reicht einen Draggable-Wrapper).
 *
 * @param {object} props
 * @param {Array} [props.sprints=[]] - nicht zugeordnete Sprints
 * @param {React.Ref} [props.droppableRef]
 * @param {boolean} [props.isOver=false]
 * @param {React.ComponentType} [props.CardComponent]
 * @param {(sprint:object)=>void} [props.onOpenSprint]
 * @param {boolean} [props.wide=false] - Wide-Mode: breitere Spalte + Card-Details
 * @param {string} [props.dataUiScope='organism.unassignedColumn']
 * @param {string} [props.className]
 */
import SprintCard from './SprintCard.jsx'
import UnassignedColumnHeader from '../../molecules/UnassignedColumnHeader.jsx'

export default function UnassignedColumn({
  sprints = [], droppableRef, isOver = false,
  CardComponent = SprintCard, onOpenSprint, wide = false,
  dataUiScope = 'organism.unassignedColumn', className = '',
}) {
  return (
    <section
      data-ui={dataUiScope}
      role="group"
      aria-label="Nicht zugeordnet"
      className={`flex flex-col gap-[var(--space-3)] ${wide ? 'w-[34rem]' : 'w-72'} shrink-0 min-h-[620px] p-[var(--space-3)] rounded-lg border border-dashed bg-[var(--layer-3)] ${isOver ? 'border-[var(--accent-info)] ring-1 ring-[var(--accent-info)]' : 'border-[var(--border)]'} ${className}`}
    >
      <UnassignedColumnHeader count={sprints.length} dataUiScope={`${dataUiScope}.header`} />

      <div
        ref={droppableRef}
        data-ui={`${dataUiScope}.body`}
        className={`flex flex-col gap-[var(--space-2)] flex-1 rounded-md transition-colors duration-[var(--duration-fast)] ${isOver ? 'bg-[var(--state-hover)]' : ''}`}
      >
        {sprints.length === 0 && !isOver && (
          <p data-ui={`${dataUiScope}.empty`} className="px-1 py-2 text-[12px] text-[var(--subtext0)] italic">
            Alle Sprints zugeordnet
          </p>
        )}
        {sprints.map((s) => (
          <CardComponent
            key={s.id}
            sprint={s}
            variant="active"
            wide={wide}
            onOpen={onOpenSprint ? () => onOpenSprint(s) : undefined}
            dataUiScope={`${dataUiScope}.card-${s.id}`}
          />
        ))}
      </div>
    </section>
  )
}
