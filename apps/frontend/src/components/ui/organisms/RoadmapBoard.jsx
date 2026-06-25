import { useState } from 'react'
import Grid from '../layout/Grid.jsx'
import Stack from '../layout/Stack.jsx'
import MilestoneBoardColumn from '../molecules/MilestoneBoardColumn.jsx'
import EntityItem from './EntityItem.jsx'

/**
 * RoadmapBoard — Organism (05.40 Boards, OR-13, GF-260). Milestone-Spalten ×
 * SprintCards: je Milestone eine Spalte (Header + Sprint-Liste). SprintCards sind
 * EntityItem (entity='sprint'); Desktop-Reorder via Drag-Handle (Touch deferred D09).
 *
 * Reflow-Vertrag (D10-G, LL16): die Spalten liegen in einem `Grid`-Primitiv
 * (Auto-Fit, `minmax(columnMin, 1fr)`) — intrinsischer Reflow OHNE Viewport-
 * Breakpoints. Unterschreitet der Container N×columnMin, brechen Spalten in die
 * nächste Reihe (kein horizontales Scrollen, kein `@container var()`-Verstoß).
 *
 * Präsentational: `milestones` + Callbacks vom Consumer. OR-13 = 6 Caps
 * (milestone-list/reorder/assign-sprint/deferred-stats, sprint-create/reorder).
 *
 * @param {object} props
 * @param {Array<{key:string,name:import('react').ReactNode,status?:string,count?:number,
 *   deferred?:number,description?:import('react').ReactNode,target?:import('react').ReactNode,
 *   progress?:{value:number,max?:number},counts?:import('react').ReactNode,reorderable?:boolean,
 *   sprints?:Array<{key:string,name:import('react').ReactNode,status?:string,
 *   issues?:Array<{key:string,name:import('react').ReactNode,status?:string,priority?:string}>}>}>} [props.milestones]
 *   — Milestone-Spalten (MilestoneBoardColumn): Stammdaten + optionale Subheader-Meta
 *   (description/target/progress/counts) + Trailing (status | count | deferred).
 * @param {string} [props.columnMin='16rem'] - Auto-Fit-Spaltenbreite (Reflow-Schwelle).
 * @param {boolean} [props.expandable=false] - SprintCards via EntityItem-Disclosure
 *   (Chevron im Item-Head, EI-7/8): aufklappen listet die Child-Issues nested als
 *   Stack aus Issue-EntityItems (GF-317). Sonst flache, sortierbare SprintCards (Default).
 * @param {string|null} [props.defaultOpenKey=null] - initial offene Sprint-Zeile (Story/SSR).
 * @param {(key:string)=>void} [props.onToggle]
 * @param {import('react').ReactNode} [props.emptyHint='Keine Milestones.']
 * @param {import('react').ReactNode} [props.columnEmptyHint='Keine Sprints.']
 * @param {string} [props.className]
 */
export default function RoadmapBoard({
  milestones = [],
  columnMin = '16rem',
  expandable = false,
  defaultOpenKey = null,
  onToggle,
  emptyHint = 'Keine Milestones.',
  columnEmptyHint = 'Keine Sprints.',
  className = '',
  ...rest
}) {
  const [openKey, setOpenKey] = useState(defaultOpenKey)
  const toggle = (key) => {
    setOpenKey((cur) => (cur === key ? null : key))
    onToggle?.(key)
  }

  const renderSprint = (sp) => {
    // Aufklappbare Sprint-Zeile = EntityItem mit nativer Disclosure (Chevron im
    // Item-Head, EI-7/8) — KEIN AccordionRow (das ist Text-Disclosure). Children =
    // Stack aus Issue-EntityItems. Sonst flache, sortierbare SprintCard.
    const expandableSprint = expandable
    return (
      <EntityItem
        key={sp.key}
        id={sp.key}
        name={sp.name}
        entity="sprint"
        status={sp.status}
        layout="card"
        surface="bare"
        size="sm"
        draggable={!expandableSprint}
        expanded={expandableSprint ? openKey === sp.key : undefined}
        onToggleExpand={expandableSprint ? () => toggle(sp.key) : undefined}
        childrenLabel="Issues"
        data-ui={`roadmap-board.sprint-${sp.key}`}
      >
        {expandableSprint ? (
          sp.issues && sp.issues.length > 0 ? (
            <Stack gap="xs">
              {sp.issues.map((iss) => (
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
                  draggable={false}
                  data-ui={`roadmap-board.sprint-${sp.key}.issue-${iss.key}`}
                />
              ))}
            </Stack>
          ) : (
            <p data-ui={`roadmap-board.sprint-${sp.key}.empty-hint`} className="text-xs text-[var(--subtext0)]">Keine Issues.</p>
          )
        ) : undefined}
      </EntityItem>
    )
  }

  if (milestones.length === 0) {
    return (
      <div data-ui="roadmap-board" className={className} {...rest}>
        <p data-ui="roadmap-board.empty-hint" className="text-xs text-[var(--subtext0)]">{emptyHint}</p>
      </div>
    )
  }

  return (
    <Grid min={columnMin} gap="md" data-ui="roadmap-board" className={className} {...rest}>
      {milestones.map((ms) => {
        const hasSprints = Boolean(ms.sprints && ms.sprints.length > 0)
        return (
          <MilestoneBoardColumn
            key={ms.key}
            data-ui={`roadmap-board.column-${ms.key}`}
            name={ms.name}
            status={ms.status}
            count={ms.count}
            deferred={ms.deferred}
            description={ms.description}
            target={ms.target}
            progress={ms.progress}
            counts={ms.counts}
            reorderable={ms.reorderable !== false}
            empty={!hasSprints}
            emptyHint={columnEmptyHint}
          >
            {hasSprints ? (
              <Stack gap="xs">{ms.sprints.map((sp) => renderSprint(sp))}</Stack>
            ) : undefined}
          </MilestoneBoardColumn>
        )
      })}
    </Grid>
  )
}
