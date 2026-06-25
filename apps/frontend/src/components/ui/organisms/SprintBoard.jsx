import Grid from '../layout/Grid.jsx'
import Stack from '../layout/Stack.jsx'
import SprintBoardColumn from '../molecules/SprintBoardColumn.jsx'
import EntityItem from './EntityItem.jsx'
import AssignDropZone from './AssignDropZone.jsx'

/**
 * SprintBoard — Organism (05.40 Boards, OR-14, GF-261). Swimlanes je Status: eine
 * Lane je Status mit den zugehörigen Issue-Cards (EntityItem) und — wenn `assignable` —
 * einer AssignDropZone (OR-15) als Drag-Ziel. Desktop-Drag-Assign (Touch deferred D09).
 *
 * Reflow-Vertrag (D10-G, LL16): die Lanes liegen in einem `Grid`-Primitiv (Auto-Fit,
 * `minmax(laneMin, 1fr)`) — intrinsischer Umbruch ohne Viewport-Breakpoint / ohne
 * `@container var()`. `laneMin` ist die Reflow-Schwelle.
 *
 * Präsentational: `lanes` + Callbacks vom Consumer. OR-14 = keine gemined Cap
 * (präsentational, Ebene 6).
 *
 * @param {object} props
 * @param {Array<{key:string,label:import('react').ReactNode,status?:string,
 *   issues?:Array<{key:string,name:import('react').ReactNode,status?:string,priority?:string}>}>} [props.lanes]
 * @param {boolean} [props.assignable=false] - AssignDropZone je Lane einblenden.
 * @param {string} [props.laneMin='15rem'] - Auto-Fit-Lane-Breite (Reflow-Schwelle).
 * @param {(laneKey:string)=>void} [props.onAssign] - AssignDropZone-Aktivierung je Lane.
 * @param {import('react').ReactNode} [props.emptyHint='Keine Lanes.']
 * @param {import('react').ReactNode} [props.laneEmptyHint='Keine Issues.']
 * @param {string} [props.className]
 */
export default function SprintBoard({
  lanes = [],
  assignable = false,
  laneMin = '15rem',
  onAssign,
  emptyHint = 'Keine Lanes.',
  laneEmptyHint = 'Keine Issues.',
  className = '',
  ...rest
}) {
  if (lanes.length === 0) {
    return (
      <div data-ui="sprint-board" className={className} {...rest}>
        <p data-ui="sprint-board.empty-hint" className="text-xs text-[var(--subtext0)]">{emptyHint}</p>
      </div>
    )
  }

  return (
    <Grid min={laneMin} gap="md" data-ui="sprint-board" className={className} {...rest}>
      {lanes.map((lane) => {
        const hasIssues = Boolean(lane.issues && lane.issues.length > 0)
        return (
          <SprintBoardColumn
            key={lane.key}
            data-ui={`sprint-board.lane-${lane.key}`}
            label={lane.label}
            count={(lane.issues || []).length}
            empty={!hasIssues}
            emptyHint={laneEmptyHint}
            footer={
              assignable ? (
                <AssignDropZone
                  data-ui={`sprint-board.column-dropzone-${lane.key}`}
                  label="Issue zuweisen"
                  onActivate={() => onAssign?.(lane.key)}
                />
              ) : undefined
            }
          >
            {hasIssues ? (
              <Stack gap="xs">
                {lane.issues.map((iss) => (
                  <EntityItem
                    key={iss.key}
                    id={iss.key}
                    name={iss.name}
                    entity="issue"
                    status={iss.status}
                    priority={iss.priority}
                    layout="card"
                    surface="bare"
                    size="sm"
                    draggable
                    data-ui={`sprint-board.issue-${iss.key}`}
                  />
                ))}
              </Stack>
            ) : undefined}
          </SprintBoardColumn>
        )
      })}
    </Grid>
  )
}
