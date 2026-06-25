/**
 * GF-325 — SprintBoardColumn (04.40 Data Display). Status-Lane des SprintBoards:
 * BoardColumn (filled) + Count-Pill (D04), KEIN DragHandle (D05), optionaler Footer
 * (AssignDropZone). Parent-Scope `sprint-board.lane-<key>`.
 */
import SprintBoardColumn from '../../../components/ui/molecules/SprintBoardColumn.jsx'
import Stack from '../../../components/ui/layout/Stack.jsx'

const Issue = ({ scope, k, label }) => (
  <p data-ui={`${scope}.issue-${k}`} className="truncate rounded-md border border-[var(--surface1)] px-2 py-1 text-sm text-[var(--text)]">
    {k} · {label}
  </p>
)

const meta = {
  title: '04 MOLECULES/04.40 Data Display/SprintBoardColumn',
  component: SprintBoardColumn,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    label: { control: 'text' },
    count: { control: 'number' },
  },
}
export default meta

// Default: Lane im Default-Prop-Zustand (no-args, leer) — Minimalfall.
export const Default = {
  render: () => (
    <div data-ui="molecule.sprint-board-column.default" className="max-w-xs">
      <SprintBoardColumn data-ui="sprint-board.lane-active" />
    </div>
  ),
}

// Main (Pflicht): maßgeblicher Hauptfall — Klon der Default-Story (Status-Lane mit
// Count + Issue-Cards), da kein eigenständig befüllter Realfall existiert.
export const Main = {
  render: () => (
    <div data-ui="molecule.sprint-board-column.main" className="max-w-xs">
      <SprintBoardColumn data-ui="sprint-board.lane-active" label="In Arbeit" count={2}>
        <Stack gap="xs">
          <Issue scope="sprint-board.lane-active" k="DD-251" label="MetaCard" />
          <Issue scope="sprint-board.lane-active" k="DD-252" label="Boards" />
        </Stack>
      </SprintBoardColumn>
    </div>
  ),
}

// WithDropzone: Lane mit Footer-Slot (AssignDropZone-Platzhalter als Drag-Ziel).
export const Variant_WithDropzone = {
  render: () => (
    <div data-ui="molecule.sprint-board-column.with-dropzone" className="max-w-xs">
      <SprintBoardColumn
        data-ui="sprint-board.lane-active"
        label="In Arbeit"
        count={1}
        footer={
          <div data-ui="sprint-board.lane-active.dropzone" className="rounded-md border border-dashed border-[var(--surface1)] px-2 py-3 text-center text-xs text-[var(--subtext0)]">
            Issue zuweisen
          </div>
        }
      >
        <Stack gap="xs">
          <Issue scope="sprint-board.lane-active" k="DD-260" label="RoadmapBoard" />
        </Stack>
      </SprintBoardColumn>
    </div>
  ),
}

// Empty: Lane ohne Issues → Empty-Hint.
export const State_Empty = {
  render: () => (
    <div data-ui="molecule.sprint-board-column.empty" className="max-w-xs">
      <SprintBoardColumn data-ui="sprint-board.lane-done" label="Erledigt" count={0} empty emptyHint="Keine Issues." />
    </div>
  ),
}
