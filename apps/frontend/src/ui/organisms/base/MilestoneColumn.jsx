/**
 * MilestoneColumn — eine Meilenstein-Spalte des RoadmapBoard. Presentational:
 * Header (verschiebbar) + Liste aktiver SprintCards (Drop-Ziel) + collapsbare
 * „Abgeschlossen"-Sektion am Fuß.
 *
 * DnD ist NICHT hier verdrahtet — der RoadmapBoard-Container reicht herein:
 *   - Spalten-Drag: `dragHandleProps`/`dragRef`/`grabbing` (→ Header)
 *   - Body-Drop:    `droppableRef`/`isOver`
 *   - Card-Drag:    via `CardComponent` (Container reicht einen Draggable-Wrapper)
 * So bleibt die Spalte in Storybook ohne Container rein per Props darstellbar.
 *
 * @param {object} props
 * @param {{ id:number, name:string, goal?:string }} props.milestone
 * @param {Array} [props.sprints=[]] - aktive Sprints (Column-Body)
 * @param {Array} [props.completedSprints=[]] - abgeschlossene (Fuß, read-only)
 * @param {object} [props.dragHandleProps]
 * @param {React.Ref} [props.dragRef]
 * @param {boolean} [props.grabbing=false]
 * @param {React.Ref} [props.droppableRef]
 * @param {boolean} [props.isOver=false] - Drop-Highlight
 * @param {React.ComponentType} [props.CardComponent] - Sprint-Renderer (Container
 *   reicht einen Draggable-Wrapper; Default = nackte SprintCard)
 * @param {(sprint:object)=>void} [props.onOpenSprint]
 * @param {(id:number)=>void} [props.onOpenMilestone] - „öffnen" → MilestoneDetails
 * @param {boolean} [props.wide=false] - Wide-Mode: breitere Spalte + Details
 * @param {{ id:number, name?:string }} [props.dependsOn=null] - Vorgänger (Dep-Badge)
 * @param {boolean} [props.completedDefaultOpen=false]
 * @param {string} [props.dataUiScope='organism.milestoneColumn']
 * @param {string} [props.className]
 */
import { useState } from 'react'
import SprintCard from './SprintCard.jsx'
import MilestoneColumnHeader from '../../molecules/MilestoneColumnHeader.jsx'
import IconButton from '../../atoms/IconButton.jsx'

function CompletedSprintList({ completedSprints, defaultOpen, dataUiScope }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!completedSprints.length) return null
  return (
    <div data-ui={dataUiScope} className="mt-auto pt-[var(--space-2)] border-t border-[var(--surface1)]">
      <div data-ui={`${dataUiScope}.head`} className="flex items-center gap-[var(--space-1)]">
        <IconButton
          iconName={open ? 'chevron-down' : 'chevron-right'}
          label={open ? 'Abgeschlossene einklappen' : 'Abgeschlossene aufklappen'}
          size="sm"
          onClick={() => setOpen((v) => !v)}
          dataUiScope={`${dataUiScope}.toggle`}
        />
        <span className="[font-family:var(--font-display)] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--subtext0)]">
          Abgeschlossen
        </span>
        <span className="ml-auto tabular-nums text-[11px] text-[var(--subtext0)]">{completedSprints.length}</span>
      </div>
      {open && (
        <div data-ui={`${dataUiScope}.list`} className="flex flex-col gap-[var(--space-1)] mt-[var(--space-2)]">
          {completedSprints.map((s) => (
            <SprintCard key={s.id} sprint={s} variant="completed" dataUiScope={`${dataUiScope}.card-${s.id}`} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function MilestoneColumn({
  milestone, sprints = [], completedSprints = [],
  dragHandleProps, dragRef, grabbing = false,
  droppableRef, isOver = false,
  CardComponent = SprintCard, onOpenSprint, onOpenMilestone,
  wide = false, dependsOn = null,
  completedDefaultOpen = false,
  dataUiScope = 'organism.milestoneColumn', className = '',
}) {
  return (
    <section
      data-ui={dataUiScope}
      role="group"
      aria-label={milestone?.name}
      className={`flex flex-col gap-[var(--space-3)] ${wide ? 'w-[34rem]' : 'w-72'} shrink-0 min-h-[620px] p-[var(--space-3)] rounded-lg border bg-[var(--mantle)] ${isOver ? 'border-[var(--accent-info)] ring-1 ring-[var(--accent-info)]' : 'border-[var(--border)]'} ${className}`}
    >
      <div data-ui={`${dataUiScope}.headWrap`} className="pb-[var(--space-2)] border-b border-[var(--border)]">
        <MilestoneColumnHeader
          milestone={milestone}
          dragHandleProps={dragHandleProps}
          dragRef={dragRef}
          grabbing={grabbing}
          wide={wide}
          onOpenMilestone={onOpenMilestone}
          dependsOn={dependsOn}
          dataUiScope={`${dataUiScope}.header`}
        />
      </div>

      <div
        ref={droppableRef}
        data-ui={`${dataUiScope}.body`}
        className={`flex flex-col gap-[var(--space-2)] flex-1 rounded-md transition-colors duration-[var(--duration-fast)] ${isOver ? 'bg-[var(--state-hover)]' : ''}`}
      >
        {sprints.length === 0 && !isOver && (
          <p data-ui={`${dataUiScope}.empty`} className="px-1 py-2 text-[12px] text-[var(--subtext0)] italic">
            Keine aktiven Sprints
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

      <CompletedSprintList
        completedSprints={completedSprints}
        defaultOpen={completedDefaultOpen}
        dataUiScope={`${dataUiScope}.completed`}
      />
    </section>
  )
}
