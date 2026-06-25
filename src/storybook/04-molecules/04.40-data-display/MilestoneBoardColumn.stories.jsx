/**
 * GF-324 — MilestoneBoardColumn (04.40 Data Display). Milestone-Spalte des
 * RoadmapBoards: BoardColumn (filled) + DragHandle (D05) + StatusBadge/Count (D04) +
 * Subheader-Meta (Ziel/Progress/Counts, D06). Parent-Scope `roadmap-board.column-<id>`.
 */
import MilestoneBoardColumn from '../../../components/ui/molecules/MilestoneBoardColumn.jsx'
import Stack from '../../../components/ui/layout/Stack.jsx'

const Sprint = ({ scope, k, label }) => (
  <p data-ui={`${scope}.sprint-${k}`} className="truncate rounded-md border border-[var(--surface1)] px-2 py-1 text-sm text-[var(--text)]">
    {k} · {label}
  </p>
)

const meta = {
  title: '04 MOLECULES/04.40 Data Display/MilestoneBoardColumn',
  component: MilestoneBoardColumn,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    name: { control: 'text' },
    status: { control: 'text' },
    reorderable: { control: 'boolean' },
  },
}
export default meta

// Default: minimaler Default-Props-Zustand — nur Name, keine Demo-Daten/Children.
export const Default = {
  render: () => (
    <div data-ui="molecule.milestone-board-column.default" className="max-w-xs">
      <MilestoneBoardColumn data-ui="roadmap-board.column-19" name="M6 — Bugs & Improvements" />
    </div>
  ),
}

// Main (Pflicht): maßgeblicher Hauptfall — Klon der Default-Story (volle Milestone-
// Spalte: DragHandle + Status + Subheader-Meta + Sprint-Cards).
export const Main = {
  render: () => (
    <div data-ui="molecule.milestone-board-column.main" className="max-w-xs">
      <MilestoneBoardColumn
        data-ui="roadmap-board.column-19"
        name="M6 — Bugs & Improvements"
        status="planning"
        description="Sammel-Milestone für Bugs + kleinere Improvements aus dem laufenden Betrieb."
        target="2026-10-15"
        progress={{ value: 1, max: 50 }}
        counts="9 Sp · 1/50 Iss"
      >
        <Stack gap="xs">
          <Sprint scope="roadmap-board.column-19" k="DD#82" label="M6a · Project-Home" />
          <Sprint scope="roadmap-board.column-19" k="DD#85" label="M6b · Backlog" />
        </Stack>
      </MilestoneBoardColumn>
    </div>
  ),
}

// Unassigned: Pseudo-Spalte „NICHT ZUGEORDNET" — Count statt Status, kein DragHandle.
export const Variant_Unassigned = {
  render: () => (
    <div data-ui="molecule.milestone-board-column.unassigned" className="max-w-xs">
      <MilestoneBoardColumn
        data-ui="roadmap-board.column-none"
        name="Nicht zugeordnet"
        count={7}
        reorderable={false}
      >
        <Stack gap="xs">
          <Sprint scope="roadmap-board.column-none" k="DD-105" label="DD-TUI Phase 4.5" />
        </Stack>
      </MilestoneBoardColumn>
    </div>
  ),
}

// Empty: Milestone ohne Sprints → Empty-Hint.
export const State_Empty = {
  render: () => (
    <div data-ui="molecule.milestone-board-column.empty" className="max-w-xs">
      <MilestoneBoardColumn
        data-ui="roadmap-board.column-7"
        name="M-Search"
        status="planning"
        empty
        emptyHint="Keine Sprints."
      />
    </div>
  ),
}
