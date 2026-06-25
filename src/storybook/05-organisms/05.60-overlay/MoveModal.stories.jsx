/**
 * GF-289 — MoveModal (05.60 Overlay). Overlay zum Verschieben selektierter Issues
 * in einen anderen Backlog/ein anderes Projekt (BulkActionBar MOD-2; CAP-issue-move).
 * Stateful (gewähltes Ziel bis Apply); präsentational mit Mock-Targets.
 *
 * data-ui je Element. Modal open in Stories (sonst rendert nichts).
 */
import MoveModal from '../../../components/ui/organisms/MoveModal.jsx'

const noop = () => {}

const TARGETS = [
  { value: 'devd', label: 'Developer Dashboard (DD)' },
  { value: 'mybaby', label: 'MyBaby Tracker (MBT)' },
  { value: 'selene', label: 'Selene (SEL)' },
]

const meta = {
  title: '05 ORGANISMS/05.60 Overlay/MoveModal',
  component: MoveModal,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    selectedCount: { control: { type: 'number', min: 1 } },
    value: { control: 'text' },
    open: { control: 'boolean' },
  },
  args: {
    open: true,
    targets: TARGETS,
    selectedCount: 3,
    value: '',
  },
}
export default meta

// Default: minimaler Default-Props-Zustand (no demo data).
export const Default = {
  args: {
    targets: [],
    selectedCount: 0,
    value: '',
  },
  render: (args) => (
    <div data-ui="organism.move-modal.default">
      <MoveModal {...args} onClose={noop} onMove={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall (realistisch befüllt, args-getrieben).
export const Main = {
  render: (args) => (
    <div data-ui="organism.move-modal.main">
      <MoveModal {...args} onClose={noop} onMove={noop} />
    </div>
  ),
}

// States: leer (kein Ziel gewählt, Verschieben disabled) vs. Ziel gewählt.
export const Variant_States = {
  render: () => (
    <div data-ui="organism.move-modal.states" className="flex flex-col gap-4">
      <div data-ui="organism.move-modal.state-empty">
        <MoveModal open targets={TARGETS} selectedCount={3} onClose={noop} onMove={noop} />
      </div>
      <div data-ui="organism.move-modal.state-selected">
        <MoveModal open targets={TARGETS} value="mybaby" selectedCount={1} onClose={noop} onMove={noop} />
      </div>
    </div>
  ),
}
