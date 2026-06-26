/**
 * MilestoneColumnHeader — Kopf einer Meilenstein-Spalte im RoadmapBoard.
 *
 * Komposition: `DragHandle` (Spalte verschieben) + `EntityId` (M-Key, mauve) +
 * Name + „öffnen"-`IconButton` (rechts → MilestoneDetails) + Ziel. Im Wide-Mode
 * zusätzlich ein Detailblock (Ziel mehrzeilig + Zieldatum + DoD-Count +
 * Abhängigkeits-Badge). Reines Molecule, props-driven — DnD-Props und der
 * Navigations-Callback kommen vom RoadmapBoard-Container.
 *
 * Hinweis: bewusst NICHT die `.milestone-tile__name`-Klasse (Link-Unterstreichung,
 * passt zu einer klickbaren Kachel, nicht zu einem Spalten-Titel) — siehe
 * Decision-Log in RoadmapBoard.mdx (D03-Abweichung).
 *
 * @param {object} props
 * @param {{ id:number, name:string, goal?:string, target_date?:string, dod_total?:number }} props.milestone
 * @param {object} [props.dragHandleProps] - listeners+attributes vom Container
 * @param {React.Ref} [props.dragRef] - Activator-Node-Ref (setActivatorNodeRef)
 * @param {boolean} [props.grabbing=false]
 * @param {boolean} [props.wide=false] - Wide-Mode: Detailblock einblenden
 * @param {(id:number)=>void} [props.onOpenMilestone] - „öffnen" → MilestoneDetails (Mockup: Spy)
 * @param {{ id:number, name?:string }} [props.dependsOn=null] - Vorgänger-Meilenstein (Dep-Badge)
 * @param {string} [props.dataUiScope='molecule.milestoneColumnHeader']
 * @param {string} [props.className]
 */
import EntityId from '../atoms/EntityId.jsx'
import DragHandle from '../atoms/DragHandle.jsx'
import IconButton from '../atoms/IconButton.jsx'
import Icon from '../foundations/Icon.jsx'

export default function MilestoneColumnHeader({
  milestone, dragHandleProps, dragRef, grabbing = false,
  wide = false, onOpenMilestone, dependsOn = null,
  dataUiScope = 'molecule.milestoneColumnHeader', className = '',
}) {
  const { id, name, goal, target_date, dod_total } = milestone || {}
  return (
    <div data-ui={dataUiScope} className={`flex flex-col gap-[var(--space-1)] ${className}`}>
      <div data-ui={`${dataUiScope}.row`} className="flex items-center gap-[var(--space-1)] min-w-0">
        <DragHandle
          ref={dragRef}
          label={`Meilenstein ${name} verschieben`}
          grabbing={grabbing}
          dataUiScope={`${dataUiScope}.grip`}
          {...dragHandleProps}
        />
        <EntityId kind="milestone" dataUiScope={`${dataUiScope}.id`} className="shrink-0 text-[13px]">
          M{id}
        </EntityId>
        <h2
          data-ui={`${dataUiScope}.name`}
          className="m-0 min-w-0 flex-1 truncate [font-family:var(--font-display)] text-[14px] font-bold text-[var(--text)]"
          title={name}
        >
          {name}
        </h2>
        <IconButton
          iconName="external"
          label={`Meilenstein ${name} öffnen`}
          size="sm"
          onClick={onOpenMilestone ? () => onOpenMilestone(id) : undefined}
          dataUiScope={`${dataUiScope}.open`}
          className="shrink-0"
        />
      </div>

      {goal && (
        <p
          data-ui={`${dataUiScope}.goal`}
          className={`m-0 pl-[28px] text-[12px] leading-[1.4] text-[var(--subtext0)] ${wide ? 'whitespace-normal' : 'truncate'}`}
          title={goal}
        >
          {goal}
        </p>
      )}

      {wide && (
        <div
          data-ui={`${dataUiScope}.detail`}
          className="flex flex-wrap items-center gap-[var(--space-2)] pl-[28px] mt-[var(--space-1)] [font-family:var(--font-display)] text-[11px] text-[var(--subtext0)]"
        >
          {target_date && (
            <span data-ui={`${dataUiScope}.detail.date`} className="inline-flex items-center gap-1">
              <Icon name="calendar" size={12} inherit />
              {target_date}
            </span>
          )}
          {dod_total != null && (
            <span data-ui={`${dataUiScope}.detail.dod`} className="inline-flex items-center gap-1">
              <Icon name="checklist" size={12} inherit />
              {dod_total} DoD
            </span>
          )}
          {dependsOn && (
            <span data-ui={`${dataUiScope}.detail.dep`} className="inline-flex items-center gap-1 text-[var(--accent-info)]">
              <Icon name="dependencies" size={12} inherit />
              nach M{dependsOn.id}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
