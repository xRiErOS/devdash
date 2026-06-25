/**
 * GF-261 — SprintBoard (05.40 Boards, OR-14). Swimlanes je Status mit Issue-Cards
 * (EntityItem) + AssignDropZone (OR-15) je Lane. Reflow-Vertrag (D10-G): Grid
 * Auto-Fit, Lanes brechen intrinsisch um (LL16). Präsentational.
 *
 * Ebene-6-Gegencheck (OR-14): keine gemined Capability → präsentational (_ebene6.md).
 */
import SprintBoard from '../../../components/ui/organisms/SprintBoard.jsx'

const noop = () => {}

const LANES = [
  { key: 'active', label: 'In Arbeit', issues: [
    { key: 'i1', name: 'DD-251 · MetaCard', status: 'active', priority: 'high' },
    { key: 'i2', name: 'DD-252 · Boards', status: 'active' },
  ] },
  { key: 'review', label: 'Review', issues: [
    { key: 'i3', name: 'DD-250 · Modals', status: 'review' },
  ] },
  { key: 'done', label: 'Done', issues: [] },
]

const meta = {
  title: '05 ORGANISMS/05.40 Boards/SprintBoard',
  component: SprintBoard,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    assignable: { control: 'boolean' },
    laneMin: { control: 'text', description: 'Auto-Fit-Lane-Breite = Reflow-Schwelle.' },
  },
  args: {
    lanes: LANES,
    assignable: false,
    laneMin: '15rem',
  },
}
export default meta

// Default (PO 2026-06-18): KEINE DropZone — die Sprint-Zuweisung läuft über das
// Backlog, nicht per Drag aufs Board. Reine Status-Lanes mit Issue-Cards + Count.
export const Default = {
  args: {},
  render: () => (
    <div data-ui="organism.sprint-board.default" className="p-4">
      <SprintBoard />
    </div>
  ),
}

// Main = maßgeblicher Hauptfall = die voll befüllten Status-Lanes mit Issue-Cards
// (Klon der Default-Story, GF-382 Naming). Der kanonische Sprint-Board-Look.
export const Main = {
  render: (args) => (
    <div data-ui="organism.sprint-board.main" className="p-4">
      <SprintBoard {...args} />
    </div>
  ),
}

// Variant_Assignable: opt-in AssignDropZone je Lane (Drag-Ziel) — Sonderfall, nicht Default.
export const Variant_Assignable = {
  render: () => (
    <div data-ui="organism.sprint-board.assignable" className="p-4">
      <SprintBoard lanes={LANES} assignable onAssign={noop} />
    </div>
  ),
}

// State_Empty: keine Lanes → Board-Leer-Hinweis.
export const State_Empty = {
  render: () => (
    <div data-ui="organism.sprint-board.empty" className="p-4">
      <SprintBoard lanes={[]} />
    </div>
  ),
}
