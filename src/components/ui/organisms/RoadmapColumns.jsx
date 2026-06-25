// RoadmapColumns — shared presentational module for the Roadmap-Board (DD-510).
//
// EXTRAHIERT aus der kanonischen Ziel-Story
// (src/components/screens/RoadmapBoard.stories.jsx). Single-Source der
// Spalten-Komposition: BEIDE — die Story (visueller SOLL-Vertrag) UND die
// Live-View (src/views/RoadmapBoard.jsx) — importieren von hier. Damit ist
// 1:1 garantiert (kein Drift zwischen Story und View).
//
// PRESENTATIONAL: kein fetch/Store/Router/DnD-Laufzeit. Daten kommen als Props,
// Interaktion via Callbacks. Die DnD-Verdrahtung (Draggable/Droppable) reicht
// die Live-View über die OPTIONALEN Hook-Props (`wrapCard`, `columnDropProps`,
// `dragHandlePropsFor`) durch — ohne diese Props ist das gerenderte DOM
// byte-identisch zur Story (Story ruft sie nicht auf → Default = Passthrough).
//
// TOKEN-CLEAN: 0 inline-style, 0 Raw-Hex (alle Klassen aus der Story übernommen).

import { GripVertical, Inbox } from 'lucide-react'
import StatusBadge from '../atoms/StatusBadge.jsx'
import ProgressBar from '../atoms/ProgressBar.jsx'
import SprintCard from './SprintCard.jsx'

export const SCOPE = 'roadmap-board'

// Milestone-Filter (REQ-45/46): Default blendet erledigte (completed) aus.
export const MILESTONE_FILTER_OPTIONS = [
  { value: 'open', label: 'Nicht erledigt' },
  { value: 'all', label: 'Alle' },
  { value: 'planning', label: 'Planung' },
  { value: 'active', label: 'Aktiv' },
  { value: 'completed', label: 'Abgeschlossen' },
  { value: 'cancelled', label: 'Storniert' },
]

export const LABEL_CLS = 'block text-[10px] font-bold uppercase tracking-wider mb-1 text-[var(--subtext0)]'

// ── Pure helpers (unit-testable) ────────────────────────────────────────────
export function filterMilestones(milestones, status) {
  if (status === 'all') return milestones
  if (status === 'open') return milestones.filter((m) => m.status !== 'completed')
  return milestones.filter((m) => m.status === status)
}

// DD-639 (F7): snap-col = Einrast-Ziel im horizontalen Snap-Container (greift nur
// <768px, s. index.css); max-md:w-[85%] gibt der nächsten Spalte den Peek-Rand
// (Swipe-Affordance). Desktop bleibt w-64 ohne Snap.
const COLUMN_CLS = 'snap-col flex w-64 max-md:w-[85%] shrink-0 flex-col'
// Abgeschlossen = completed/closed/cancelled; offen = planning/active/review.
export const DONE_SPRINT_STATUSES = ['completed', 'closed', 'cancelled']
export const isDoneSprint = (s) => DONE_SPRINT_STATUSES.includes(s.status)
export const sprintsOf = (sprints, milestoneId) =>
  sprints
    // M1: null/undefined-Bucket robust (uncoerced optimistic insert darf keine Card verlieren).
    .filter((s) => (s.milestone_id ?? null) === (milestoneId ?? null))
    .sort((a, b) => a.position - b.position)
export const issueRollup = (cards) =>
  cards.reduce(
    (acc, s) => ({ done: acc.done + (s.issue_done ?? 0), total: acc.total + (s.issue_total ?? 0) }),
    { done: 0, total: 0 },
  )

// ── Presentational pieces ───────────────────────────────────────────────────

// Default Card-Wrapper: identity (Story-Pfad, kein DnD). Die Live-View ersetzt
// ihn durch einen @dnd-kit-Draggable-Wrapper (`wrapCard`).
const identityWrap = (node) => node

function Card({ sprint, issuesBySprint, onOpenSprint, onOpenIssue, defaultExpandedId, wrapCard = identityWrap }) {
  const card = (
    <SprintCard
      sprint={sprint}
      issues={issuesBySprint?.[sprint.id] || []}
      defaultExpanded={sprint.id === defaultExpandedId}
      onOpen={onOpenSprint}
      onOpenIssue={onOpenIssue}
      dataUiScope={`${SCOPE}.card.${sprint.id}`}
    />
  )
  return wrapCard(card, sprint)
}

function ColumnBody({
  cards,
  scope,
  onOpenSprint,
  onOpenIssue,
  tone,
  defaultExpandedId,
  issuesBySprint,
  wrapCard,
  columnDropProps,
}) {
  const body =
    tone === 'unassigned'
      ? 'border-dashed border-[var(--surface2)] bg-[var(--base)]'
      : 'border-[var(--surface1)] bg-[var(--mantle)]'
  // PO 2026-06-08: abgeschlossene Sprints separiert am Spaltenfuss — visuelle
  // Trennung offen/in Planung/in Arbeit (oben) vs. abgeschlossen (unten).
  const open = cards.filter((s) => !isDoneSprint(s))
  const done = cards.filter(isDoneSprint)
  return (
    <div
      data-ui={`${scope}.body`}
      className={`flex flex-1 flex-col gap-2 rounded-b-md border border-t-0 p-2 min-h-[20rem] ${body}`}
      {...(columnDropProps || {})}
    >
      {open.map((sprint) => (
        <Card
          key={sprint.id}
          sprint={sprint}
          issuesBySprint={issuesBySprint}
          onOpenSprint={onOpenSprint}
          onOpenIssue={onOpenIssue}
          defaultExpandedId={defaultExpandedId}
          wrapCard={wrapCard}
        />
      ))}
      {done.length > 0 && (
        <div data-ui={`${scope}.done`} className="mt-auto flex flex-col gap-2 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--subtext0)]">
              Abgeschlossen ({done.length})
            </span>
            <span className="h-px flex-1 bg-[var(--surface1)]" />
          </div>
          <div className="flex flex-col gap-2 opacity-70">
            {done.map((sprint) => (
              <Card
                key={sprint.id}
                sprint={sprint}
                issuesBySprint={issuesBySprint}
                onOpenSprint={onOpenSprint}
                onOpenIssue={onOpenIssue}
                defaultExpandedId={defaultExpandedId}
                wrapCard={wrapCard}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function MilestoneColumn({
  milestone,
  sprints,
  onOpenMilestone,
  onOpenSprint,
  onOpenIssue,
  defaultExpandedId,
  issuesBySprint,
  // DnD-Hooks (Live-View, optional). Story übergibt sie nicht → identisches DOM.
  wrapCard,
  columnDropProps,
  dragHandleProps,
  columnRef,
}) {
  const scope = `${SCOPE}.column.${milestone.id}`
  const cards = sprintsOf(sprints, milestone.id)
  const roll = issueRollup(cards)
  const dodPct = milestone.dod_total > 0 ? Math.round((milestone.dod_done / milestone.dod_total) * 100) : 0
  return (
    <div data-ui={scope} className={COLUMN_CLS} ref={columnRef}>
      <div
        data-ui={`${scope}.head`}
        className="rounded-t-md border border-b-0 border-[var(--surface1)] bg-[var(--surface0)] px-2.5 py-1.5"
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-ui={`${scope}.drag-handle`}
            aria-label="Meilenstein-Reihenfolge ändern"
            className="shrink-0 cursor-grab touch-none text-[var(--subtext0)]"
            {...(dragHandleProps || {})}
          >
            <GripVertical size={13} aria-hidden="true" />
          </button>
          <button
            type="button"
            data-ui={`${scope}.open`}
            onClick={() => onOpenMilestone?.(milestone.id)}
            className="min-w-0 flex-1 truncate text-left text-[12px] font-bold text-[var(--text)] hover:underline"
            title={milestone.name}
          >
            {milestone.name}
          </button>
          <StatusBadge status={milestone.status} className="shrink-0" data-ui={`${scope}.status`} />
        </div>
        <p
          data-ui={`${scope}.description`}
          className="m-0 mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--subtext1)]"
          title={milestone.description}
        >
          {milestone.description}
        </p>
        <div data-ui={`${scope}.meta`} className="mt-1.5 flex items-center gap-2">
          <span data-ui={`${scope}.target`} className="shrink-0 font-mono text-[10px] text-[var(--subtext0)]">
            Ziel {milestone.target_date}
          </span>
          <ProgressBar
            percent={dodPct}
            size="xs"
            tone="success"
            label={`DoD ${milestone.dod_done} von ${milestone.dod_total}`}
            className="flex-1"
          />
          <span data-ui={`${scope}.counts`} className="shrink-0 font-mono text-[10px] text-[var(--subtext0)]">
            {cards.length} Sp · {roll.done}/{roll.total} Iss
          </span>
        </div>
      </div>
      <ColumnBody
        cards={cards}
        scope={scope}
        onOpenSprint={onOpenSprint}
        onOpenIssue={onOpenIssue}
        defaultExpandedId={defaultExpandedId}
        issuesBySprint={issuesBySprint}
        wrapCard={wrapCard}
        columnDropProps={columnDropProps}
      />
    </div>
  )
}

export function UnassignedColumn({
  sprints,
  onOpenSprint,
  onOpenIssue,
  defaultExpandedId,
  issuesBySprint,
  // DnD-Hooks (Live-View, optional).
  wrapCard,
  columnDropProps,
}) {
  const scope = `${SCOPE}.unassigned`
  const cards = sprintsOf(sprints, null)
  return (
    <div data-ui={scope} className={`${COLUMN_CLS} opacity-95`}>
      <div
        data-ui={`${scope}.head`}
        className="flex items-center gap-1.5 rounded-t-md border border-b-0 border-dashed border-[var(--surface2)] bg-[var(--base)] px-2.5 py-1.5"
      >
        <Inbox size={13} aria-hidden="true" className="shrink-0 text-[var(--subtext0)]" />
        <span className="min-w-0 flex-1 truncate text-[12px] font-bold uppercase tracking-wide text-[var(--subtext0)]">
          Nicht zugeordnet
        </span>
        <span data-ui={`${scope}.count`} className="shrink-0 font-mono text-[10px] text-[var(--subtext0)]">
          {cards.length}
        </span>
      </div>
      <ColumnBody
        cards={cards}
        scope={scope}
        onOpenSprint={onOpenSprint}
        onOpenIssue={onOpenIssue}
        tone="unassigned"
        defaultExpandedId={defaultExpandedId}
        issuesBySprint={issuesBySprint}
        wrapCard={wrapCard}
        columnDropProps={columnDropProps}
      />
    </div>
  )
}
