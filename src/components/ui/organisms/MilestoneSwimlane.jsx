/**
 * MilestoneSwimlane — kanonisches, token-sauberes Organism (DD-481 Phase 3 Batch 3,
 * Harvest aus src/components/MilestoneSwimlane.jsx, DD-288/DD-289).
 *
 * Domänen-bewusste Einheit (Domäne: Milestone): rendert die Milestone-Swimlanes
 * des Sprint-Boards. Pro Milestone eine Lane mit Header (Layers-Icon links,
 * MilestonePill + Name, Status-Pill, Sprint-/Item-Counts rechts) und darunter
 * eine horizontal scrollende Card-Fläche, die die Sprint-Spalten (renderLane)
 * aufnimmt. Komponiert die Atoms MilestonePill, Card und Grid.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/API/useEffect-Datenladen.
 * Gehobene Kopplung gegenüber der Quelle:
 *  - Die Quelle war eine EINZEL-Swimlane mit `useSortable` (@dnd-kit) — pro
 *    Milestone ein runtime-dynamischer DnD-Transform-Wrapper (inline Transform-
 *    Style). Bei maxInline=0 ist diese Inline-Style-Kopplung ENTFERNT: die Drag&Drop-
 *    Verdrahtung (sortableId, transform, listeners) gehört in den Screen
 *    (Phase 5), der jede Lane in seinen eigenen Sortable-Wrapper packt. Dieses
 *    Organism ist rein darstellend und bekommt die Daten als `milestones`-Array.
 *  - Die Sprint-Spalten (vorher `children`) kommen jetzt pro Lane via
 *    `renderLane(milestone)`-Render-Prop herein — so bleibt das Organism frei
 *    von Sprint-Domänen-Fetch, der Screen liefert den Spalten-Inhalt.
 *  - Der Header-Klick (vorher inline onOpenMilestone + JS-style-Hover) ist zur
 *    `onSelect(id)`-Callback-Prop gehoben; der Hover-Effekt läuft token-clean
 *    über das MilestonePill-Atom (Underline-Decoration-Token).
 *
 * Ephemerer UI-State: optionaler Collapse pro Lane (`collapsedIds` Set), rein
 * lokaler UI-Toggle — kein Daten-State.
 *
 * @param {object} props
 * @param {Array<object>} [props.milestones=[]] - Lanes: { id|null, name, status,
 *        sprintCount?, itemCount? }. id==null ⇒ "Ohne Milestone"-Bucket (kein
 *        Klick, gedimmt, transparenter Body).
 * @param {(id:number)=>void} [props.onSelect] - Klick/Enter auf Header (Pill + Name) →
 *        Milestone-Detail öffnen. Nur für nicht-none-Buckets aktiv.
 * @param {(milestone:object)=>import('react').ReactNode} [props.renderLane] - Render-Prop
 *        für den Lane-Body (Sprint-Spalten). Default: leer.
 * @param {boolean} [props.collapsible=false] - blendet pro Lane einen Collapse-Toggle ein.
 * @param {string} [props.dataUiScope='milestone-swimlane'] - Wurzel-data-ui-bereich
 *        (I03/D01: parametrisiert, nie ein Domänen-bereich hart in die Library).
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { useState } from 'react'
import { Layers, ChevronDown, ChevronRight } from 'lucide-react'
import EntityPill from '../atoms/EntityPill.jsx'
import Card from '../atoms/Card.jsx'
import Grid from '../layout/Grid.jsx'

// Status → statische Token-Klassen-Maps (JIT-sichtbar, keine String-Interpolation
// im Token). Ersetzt das `var(--${statusColor})`-Pattern der Quelle.
const STATUS_BG = {
  open: 'bg-[color-mix(in_srgb,var(--accent-info)_18%,transparent)]',
  reached: 'bg-[color-mix(in_srgb,var(--accent-success)_18%,transparent)]',
  cancelled: 'bg-[color-mix(in_srgb,var(--overlay0)_18%,transparent)]',
}
const STATUS_TEXT = {
  open: 'text-[var(--accent-info)]',
  reached: 'text-[var(--accent-success)]',
  cancelled: 'text-[var(--overlay0)]',
}
const STATUS_BORDER = {
  open: 'border border-[color-mix(in_srgb,var(--accent-info)_35%,transparent)]',
  reached: 'border border-[color-mix(in_srgb,var(--accent-success)_35%,transparent)]',
  cancelled: 'border border-[color-mix(in_srgb,var(--overlay0)_35%,transparent)]',
}
const STATUS_BG_FALLBACK = 'bg-[color-mix(in_srgb,var(--subtext0)_18%,transparent)]'
const STATUS_TEXT_FALLBACK = 'text-[var(--subtext0)]'
const STATUS_BORDER_FALLBACK = 'border border-[color-mix(in_srgb,var(--subtext0)_35%,transparent)]'

function StatusPill({ status, scope }) {
  if (!status) return null
  const bg = STATUS_BG[status] || STATUS_BG_FALLBACK
  const text = STATUS_TEXT[status] || STATUS_TEXT_FALLBACK
  const border = STATUS_BORDER[status] || STATUS_BORDER_FALLBACK
  return (
    <span
      data-ui={`${scope}.lane.status`}
      className={`text-[11px] px-2 py-0.5 rounded font-medium ${bg} ${text} ${border}`}
    >
      {status}
    </span>
  )
}

function Lane({ milestone, onSelect, renderLane, collapsible, scope }) {
  const [collapsed, setCollapsed] = useState(false)
  const isNoneBucket = milestone == null || milestone.id == null
  const sprintCount = milestone?.sprintCount ?? 0
  const itemCount = milestone?.itemCount ?? 0
  const isClickable = !isNoneBucket && typeof onSelect === 'function'

  const headerBg = isNoneBucket ? 'bg-[var(--mantle)]' : 'bg-[var(--surface0)]'
  const headerText = isNoneBucket ? 'text-[var(--overlay0)]' : 'text-[var(--text)]'
  const bodyBg = isNoneBucket ? 'bg-transparent' : 'bg-[var(--crust)]'

  return (
    <div
      data-ui={`${scope}.lane`}
      data-milestone-id={isNoneBucket ? '__none__' : String(milestone.id)}
      className="mb-4"
    >
      {/* Header */}
      <div
        data-ui={`${scope}.lane.header`}
        className={`flex items-center gap-3 px-3 py-2 rounded-t-lg border-b border-[var(--surface1)] ${headerBg} ${headerText}`}
      >
        {collapsible && (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Lane ausklappen' : 'Lane einklappen'}
            data-ui={`${scope}.lane.collapse`}
            className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded text-[var(--overlay0)] hover:text-[var(--accent-info)]"
          >
            {collapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
          </button>
        )}

        <span
          className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 text-[var(--overlay0)]"
          aria-hidden="true"
        >
          <Layers size={14} />
        </span>

        {/* Name + Pill — klickbar via MilestonePill-Atom (Underline-Hover token-clean) */}
        <div data-ui={`${scope}.lane.title`} className="flex items-center gap-2 min-w-0">
          {!isNoneBucket && (
            <EntityPill
              entity="milestone"
              id={`M${milestone.id}`}
              title={isClickable ? `Milestone-Detail "${milestone.name}" öffnen` : undefined}
              onClick={isClickable ? () => onSelect(milestone.id) : undefined}
              data-ui={`${scope}.lane.pill`}
            />
          )}
          <h3 className={`font-semibold text-sm truncate ${headerText}`}>
            {isNoneBucket ? 'Ohne Milestone' : milestone.name}
          </h3>
        </div>

        {/* Status-Pill */}
        {!isNoneBucket && <StatusPill status={milestone.status} scope={scope} />}

        {/* Counts (rechts) */}
        <span data-ui={`${scope}.lane.counts`} className="ml-auto text-xs font-mono text-[var(--subtext0)]">
          {sprintCount} Sprint{sprintCount === 1 ? '' : 's'} · {itemCount} Item{itemCount === 1 ? '' : 's'}
        </span>
      </div>

      {/* Lane-Body — horizontal scrollende Sprint-Spalten */}
      {!collapsed && (
        <Card
          tone={isNoneBucket ? 'base' : 'crust'}
          bordered={false}
          padding="sm"
          data-ui={`${scope}.lane.body`}
          className={`flex gap-4 overflow-x-auto items-start min-h-[120px] rounded-t-none rounded-b-lg ${isNoneBucket ? 'bg-transparent' : bodyBg}`}
        >
          {typeof renderLane === 'function' ? renderLane(milestone) : null}
        </Card>
      )}
    </div>
  )
}

export default function MilestoneSwimlane({
  milestones = [],
  onSelect,
  renderLane,
  collapsible = false,
  dataUiScope = 'milestone-swimlane',
  className = '',
}) {
  return (
    <Grid
      min="100%"
      gap="none"
      data-ui={dataUiScope}
      className={className}
    >
      {milestones.map((m) => (
        <Lane
          key={m?.id == null ? '__none__' : m.id}
          milestone={m}
          onSelect={onSelect}
          renderLane={renderLane}
          collapsible={collapsible}
          scope={dataUiScope}
        />
      ))}
    </Grid>
  )
}
