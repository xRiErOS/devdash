/**
 * RoadmapBoardScreen — eigenständiger Screen (Projekt-Zentrale): PageTitle-Kopf
 * + Steuerzeile (Suche · Wide-Toggle · Panel-/Unassigned-Toggle · Erstellen) +
 * RoadmapBoard mit angedocktem MetaPanel.
 *
 * Presentational: Daten/Callbacks kommen als Props. Der Screen besitzt nur
 * UI-State (Suchbegriff, Wide-Mode, Panel-/Unassigned-Sichtbarkeit, Auswahl) und
 * filtert die Daten rein-funktional (`lib/roadmapBoardFilter`). KEIN Fetch — der
 * Connected-Wrapper + Route folgen in Phase 3 (PO).
 *
 * Auswahl → MetaPanel: Klick auf eine Sprint-Card (`onOpenSprint`) bzw. das ↗ einer
 * Meilenstein-Spalte (`onOpenMilestone`) selektiert die Entität ins MetaPanel
 * (öffnet es). Die ↗-Navigation des Panels ruft die echten Navigations-Spies
 * (`onOpenSprint`/`onOpenMilestone`) — im Mockup Platzhalter (Phase 3).
 *
 * @param {object} props
 * @param {string} [props.slug='devd2']
 * @param {Array} [props.milestones=[]]
 * @param {Array} [props.unassignedSprints=[]]
 * @param {Array} [props.deps=[]]
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.metaPanelOpen=false] - Start: MetaPanel sichtbar
 * @param {boolean} [props.showUnassigned=true] - Start: Unassigned-Spalte sichtbar
 * @param {'none'|'sprint'|'milestone'} [props.initialSelectedKind='none'] - Start-Auswahl (Story-Preview)
 * @param {(sprint:object)=>void} [props.onOpenSprint] - Navigation (Panel-↗)
 * @param {(milestoneId:number)=>void} [props.onOpenMilestone] - Navigation (Panel-↗)
 * @param {(payload:object)=>void} [props.onReorder]
 * @param {(sprintId:number, move:object)=>void} [props.onCardMove]
 * @param {(nextStatus:string)=>void} [props.onTransition] - MetaPanel-Statuswechsel (Spy)
 * @param {()=>void} [props.onCreateMilestone]
 * @param {()=>void} [props.onCreateSprint]
 * @param {()=>void} [props.onCreateIssue]
 * @param {string} [props.dataUiScope='screen.roadmapBoard']
 * @param {string} [props.className]
 */
import { useState, useMemo, useEffect } from 'react'
import PageTitle from '../organisms/base/PageTitle.jsx'
import BrowserToolbar from '../organisms/complex/BrowserToolbar.jsx'
import CreateActions from '../molecules/CreateActions.jsx'
import IconButton from '../atoms/IconButton.jsx'
import RoadmapBoard from '../organisms/complex/RoadmapBoard.jsx'
import MetaPanel from '../organisms/complex/MetaPanel.jsx'
import { filterRoadmap } from '../../lib/roadmapBoardFilter.js'

const FINISHED = new Set(['passed', 'completed'])
const WIP = new Set(['new', 'planned', 'in_progress', 'to_review'])

function computeStats({ milestones, unassignedSprints }) {
  const all = [...milestones.flatMap((m) => m.sprints || []), ...unassignedSprints]
  let finished = 0
  let wip = 0
  for (const s of all) {
    if (FINISHED.has(s.status)) finished += 1
    else if (WIP.has(s.status)) wip += 1
  }
  return { total: all.length, finished, wip }
}

// Start-Auswahl aus den Daten ableiten (Story-Preview). 'sprint' → erster Sprint
// im ersten Meilenstein mit Sprints; 'milestone' → erster Meilenstein.
function pickInitial(kind, milestones) {
  if (kind === 'sprint') {
    for (const m of milestones) {
      if (m.sprints?.length) return { kind: 'sprint', ...m.sprints[0] }
    }
    return null
  }
  if (kind === 'milestone') {
    return milestones[0] ? { kind: 'milestone', ...milestones[0] } : null
  }
  return null
}

export default function RoadmapBoardScreen({
  slug = 'devd2',
  milestones = [], unassignedSprints = [], deps = [], loading = false,
  metaPanelOpen = false, showUnassigned = true, initialSelectedKind = 'none',
  onOpenSprint, onOpenMilestone, onReorder, onCardMove, onTransition,
  onCreateMilestone, onCreateSprint, onCreateIssue,
  dataUiScope = 'screen.roadmapBoard', className = '',
}) {
  const [query, setQuery] = useState('')
  const [wide, setWide] = useState(false)
  const [metaOpen, setMetaOpen] = useState(metaPanelOpen)
  const [hideUnassigned, setHideUnassigned] = useState(!showUnassigned)
  const [selected, setSelected] = useState(() => pickInitial(initialSelectedKind, milestones))

  // Story-Controls live auf den State spiegeln (Seed-Props ändern sich → State folgt).
  useEffect(() => { setMetaOpen(metaPanelOpen) }, [metaPanelOpen])
  useEffect(() => { setHideUnassigned(!showUnassigned) }, [showUnassigned])
  useEffect(() => {
    const s = pickInitial(initialSelectedKind, milestones)
    setSelected(s)
    if (s) setMetaOpen(true)
  }, [initialSelectedKind, milestones])

  const filtered = useMemo(
    () => filterRoadmap({ milestones, unassignedSprints }, query),
    [milestones, unassignedSprints, query],
  )
  const stats = useMemo(() => computeStats(filtered), [filtered])
  const hasUnassigned = filtered.unassignedSprints.length > 0

  const selectSprint = (s) => { setSelected({ kind: 'sprint', ...s }); setMetaOpen(true) }
  const selectMilestone = (id) => {
    const m = filtered.milestones.find((x) => x.id === id)
    if (m) { setSelected({ kind: 'milestone', ...m }); setMetaOpen(true) }
  }
  const openSelectedDetail = () => {
    if (!selected) return
    if (selected.kind === 'sprint') onOpenSprint?.(selected)
    else onOpenMilestone?.(selected.id)
  }

  return (
    <div data-ui={dataUiScope} className={`flex flex-col gap-[var(--space-4)] p-[var(--space-5)] min-h-screen bg-[var(--base)] ${className}`}>
      <PageTitle
        icon="chevron-right"
        id={slug}
        idTone="peach"
        name="Roadmap"
        meta={[`gesamt: ${stats.total}`, `finished: ${stats.finished}`, `wip: ${stats.wip}`]}
        dataUiScope={`${dataUiScope}.title`}
      />

      <div data-ui={`${dataUiScope}.toolbar`} className="flex items-stretch gap-[var(--space-4)]">
        <BrowserToolbar
          query={query}
          onQueryChange={setQuery}
          dataUiScope={`${dataUiScope}.toolbar.browser`}
          className="w-[calc(18rem*3+var(--space-4)*2)] max-w-full min-w-0 justify-center rounded-lg border border-[var(--border)]"
        />
        <div data-ui={`${dataUiScope}.toolbar.actions`} className="flex items-center gap-[var(--space-2)] shrink-0 px-[var(--space-2)] py-[var(--space-2)] rounded-lg bg-[var(--mantle)] border border-[var(--border)]">
          <IconButton
            iconName="expand"
            label={wide ? 'Schmale Spalten' : 'Breite Spalten (Details)'}
            on={wide}
            onClick={() => setWide((v) => !v)}
            dataUiScope={`${dataUiScope}.toolbar.wide`}
          />
          <span data-ui={`${dataUiScope}.toolbar.unassigned`} className="relative inline-flex">
            <IconButton
              iconName="backlog"
              label={hideUnassigned ? 'Nicht zugeordnet einblenden' : 'Nicht zugeordnet ausblenden'}
              on={!hideUnassigned}
              onClick={() => setHideUnassigned((v) => !v)}
              dataUiScope={`${dataUiScope}.toolbar.unassigned.btn`}
            />
            {hasUnassigned && (
              <span
                aria-hidden="true"
                data-ui={`${dataUiScope}.toolbar.unassigned.dot`}
                className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[var(--accent-danger)] ring-2 ring-[var(--mantle)]"
              />
            )}
          </span>
          <IconButton
            iconName="info"
            label={metaOpen ? 'Details-Panel schließen' : 'Details-Panel öffnen'}
            on={metaOpen}
            onClick={() => setMetaOpen((v) => !v)}
            dataUiScope={`${dataUiScope}.toolbar.meta`}
          />
          <CreateActions
            onCreateMilestone={onCreateMilestone}
            onCreateSprint={onCreateSprint}
            onCreateIssue={onCreateIssue}
            dataUiScope={`${dataUiScope}.toolbar.create`}
          />
        </div>
      </div>

      <div data-ui={`${dataUiScope}.body`} className="flex items-stretch gap-[var(--space-4)]">
        <div data-ui={`${dataUiScope}.boardArea`} className="flex-1 min-w-0">
          <RoadmapBoard
            milestones={filtered.milestones}
            unassignedSprints={hideUnassigned ? [] : filtered.unassignedSprints}
            deps={deps}
            loading={loading}
            wide={wide}
            onOpenSprint={selectSprint}
            onOpenMilestone={selectMilestone}
            onReorder={onReorder}
            onCardMove={onCardMove}
            dataUiScope={`${dataUiScope}.board`}
          />
        </div>

        {metaOpen && (
          <MetaPanel
            entity={selected}
            onTransition={onTransition}
            onOpenDetail={openSelectedDetail}
            dataUiScope={`${dataUiScope}.meta`}
          />
        )}
      </div>
    </div>
  )
}
