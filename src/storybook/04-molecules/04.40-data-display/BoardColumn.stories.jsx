/**
 * GF-322 — BoardColumn (04.40 Data Display). Basis-Spalten-Hülle, geteilt von
 * MilestoneBoardColumn + SprintBoardColumn. surface filled (grau, Default) | ghost
 * (transparent + border-b). Header lean; Milestone-Meta via subheader-Slot.
 * Parent-Scope-data-ui (D01).
 */
import BoardColumn from '../../../components/ui/molecules/BoardColumn.jsx'
import Pill from '../../../components/ui/atoms/Pill.jsx'
import ProgressBar from '../../../components/ui/atoms/ProgressBar.jsx'
import DragHandle from '../../../components/ui/atoms/DragHandle.jsx'
import Stack from '../../../components/ui/layout/Stack.jsx'

const Item = ({ scope, k, label }) => (
  <p data-ui={`${scope}.item-${k}`} className="truncate rounded-md border border-[var(--surface1)] px-2 py-1 text-sm text-[var(--text)]">
    {k} · {label}
  </p>
)

const meta = {
  title: '04 MOLECULES/04.40 Data Display/BoardColumn',
  component: BoardColumn,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    title: { control: 'text' },
    surface: { control: 'inline-radio', options: ['filled', 'ghost'] },
    empty: { control: 'boolean' },
  },
}
export default meta

// Default: gefüllte (graue) Spalte — Titel + Count-Pill (headerEnd) + Item-Stack.
export const Default = {
  render: () => (
    <div data-ui="molecule.board-column.default" className="max-w-xs">
      <BoardColumn
        data-ui="demo-board.column-x"
        title="M-Core"
        headerEnd={<Pill color="neutral" size="sm" data-ui="demo-board.column-x.count">2</Pill>}
      >
        <Stack gap="xs">
          <Item scope="demo-board.column-x" k="DD-251" label="MetaCard" />
          <Item scope="demo-board.column-x" k="DD-252" label="Boards" />
        </Stack>
      </BoardColumn>
    </div>
  ),
}

// Ghost: transparenter Header + border-b (GF-316-Look).
export const Variant_Ghost = {
  render: () => (
    <div data-ui="molecule.board-column.ghost" className="max-w-xs">
      <BoardColumn
        data-ui="demo-board.column-g"
        surface="ghost"
        title="M-Core (ghost)"
        headerEnd={<Pill color="neutral" size="sm">2</Pill>}
      >
        <Stack gap="xs">
          <Item scope="demo-board.column-g" k="DD-251" label="MetaCard" />
        </Stack>
      </BoardColumn>
    </div>
  ),
}

// Main (Pflicht): leading (DragHandle) + subheader-Meta (Ziel + ProgressBar + Counts)
// — der volle, realistisch befüllte Milestone-Spalten-Aufbau auf der Basis.
export const Main = {
  render: () => (
    <div data-ui="molecule.board-column.rich" className="max-w-xs">
      <BoardColumn
        data-ui="demo-board.column-r"
        title="M6 — Bugs & Improvements"
        leading={<DragHandle data-ui="demo-board.column-r.drag-handle" />}
        headerEnd={<Pill color="info" size="sm" data-ui="demo-board.column-r.status">Planung</Pill>}
        subheader={
          <Stack gap="xs">
            <span data-ui="demo-board.column-r.target" className="text-xs text-[var(--subtext0)]">Ziel 2026-10-15</span>
            <ProgressBar value={1} max={50} data-ui="demo-board.column-r.progress" />
            <span data-ui="demo-board.column-r.counts" className="text-xs text-[var(--subtext1)]">9 Sp · 1/50 Iss</span>
          </Stack>
        }
      >
        <Stack gap="xs">
          <Item scope="demo-board.column-r" k="DD#82" label="M6a · Project-Home" />
        </Stack>
      </BoardColumn>
    </div>
  ),
}

// WithFooter: Spalte mit Footer-Slot (z.B. AssignDropZone im SprintBoard).
export const Variant_WithFooter = {
  render: () => (
    <div data-ui="molecule.board-column.with-footer" className="max-w-xs">
      <BoardColumn
        data-ui="demo-board.column-f"
        title="In Arbeit"
        headerEnd={<Pill color="info" size="sm">1</Pill>}
        footer={
          <div data-ui="demo-board.column-f.footer-slot" className="rounded-md border border-dashed border-[var(--surface1)] px-2 py-3 text-center text-xs text-[var(--subtext0)]">
            Issue zuweisen
          </div>
        }
      >
        <Stack gap="xs">
          <Item scope="demo-board.column-f" k="DD-260" label="RoadmapBoard" />
        </Stack>
      </BoardColumn>
    </div>
  ),
}

// Empty: keine Items → Empty-Hint statt Body.
export const State_Empty = {
  render: () => (
    <div data-ui="molecule.board-column.empty" className="max-w-xs">
      <BoardColumn
        data-ui="demo-board.column-empty"
        title="M-Search"
        headerEnd={<Pill color="neutral" size="sm">0</Pill>}
        empty
        emptyHint="Keine Sprints."
      />
    </div>
  ),
}
