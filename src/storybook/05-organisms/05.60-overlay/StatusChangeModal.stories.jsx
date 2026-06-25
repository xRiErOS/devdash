/**
 * GF-290 — StatusChangeModal (05.60 Overlay). Overlay zum Status-Wechsel der
 * selektierten Issues (BulkActionBar MOD-3). Nur ERLAUBTE Übergänge auswählbar
 * (allowedStatuses kommt vom Consumer = valide Transitions). Stateful (Ziel-Status
 * bis Apply). Präsentational; die Mutation macht der Consumer.
 *
 * Ebene-6: CAP-issue-status-transition 🟢. data-ui je Element.
 */
import StatusChangeModal from '../../../components/ui/organisms/StatusChangeModal.jsx'

const noop = () => {}

const ALLOWED = [
  { value: 'refined', label: 'Refined' },
  { value: 'active', label: 'Active' },
  { value: 'review', label: 'Review' },
]

const meta = {
  title: '05 ORGANISMS/05.60 Overlay/StatusChangeModal',
  component: StatusChangeModal,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    selectedCount: { control: { type: 'number', min: 0 } },
    open: { control: 'boolean' },
    allowedStatuses: { control: false, description: 'Nur valide Transitions (Consumer).' },
  },
  args: {
    open: true,
    selectedCount: 3,
    allowedStatuses: ALLOWED,
  },
}
export default meta

// Default: minimaler Default-Props-Zustand (offen, ohne Demo-Daten).
export const Default = {
  args: { open: true, selectedCount: undefined, allowedStatuses: [] },
  render: (args) => (
    <div data-ui="organism.status-change-modal.default">
      <StatusChangeModal {...args} onClose={noop} onApply={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall (realistisch befüllt, args-getrieben).
export const Main = {
  render: (args) => (
    <div data-ui="organism.status-change-modal.main">
      <StatusChangeModal {...args} onClose={noop} onApply={noop} />
    </div>
  ),
}

// States: nichts vorgewählt vs. vorgewählter Ziel-Status; unterschiedliche
// allowedStatuses-Sets (nur valide Transitions je Ausgangsstatus).
export const Variant_States = {
  render: () => (
    <div data-ui="organism.status-change-modal.states" className="flex flex-col gap-4">
      <div data-ui="organism.status-change-modal.state-empty">
        <StatusChangeModal open selectedCount={5} allowedStatuses={ALLOWED} onClose={noop} onApply={noop} />
      </div>
      <div data-ui="organism.status-change-modal.state-preselected">
        <StatusChangeModal
          open
          selectedCount={2}
          value="active"
          allowedStatuses={[
            { value: 'active', label: 'Active' },
            { value: 'done', label: 'Done' },
          ]}
          onClose={noop}
          onApply={noop}
        />
      </div>
    </div>
  ),
}
