/**
 * GF-292 — SelectAllModal (05.60 Overlay, R3-LAB-1). Overlay, das der Select-Mode-
 * Toggle der ListActionBar öffnet: die „Alle auswählen"-Steuerung lebt hier (statt
 * inline). Komponiert ModalShell + DialogHeader/DialogFooter + Checkbox (3-Zustände).
 *
 * Präsentational (Mock-Props); die Mutation macht der Consumer. data-ui je Element.
 */
import SelectAllModal from '../../../components/ui/organisms/SelectAllModal.jsx'

const noop = () => {}

const meta = {
  title: '05 ORGANISMS/05.60 Overlay/SelectAllModal',
  component: SelectAllModal,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    open: { control: 'boolean' },
    selectedCount: { control: { type: 'number', min: 0 } },
    totalCount: { control: { type: 'number', min: 0 } },
    allSelected: { control: 'boolean' },
    someSelected: { control: 'boolean' },
  },
  args: {
    open: true,
    selectedCount: 2,
    totalCount: 3,
    someSelected: true,
  },
}
export default meta

// Default: minimal/Default-Props (nichts gewählt, keine Demo-Daten).
export const Default = {
  args: {
    open: true,
    selectedCount: 0,
    totalCount: 0,
    someSelected: false,
  },
  render: (args) => (
    <div data-ui="organism.select-all-modal.default">
      <SelectAllModal {...args} onClose={noop} onToggleSelectAll={noop} onConfirm={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall (realistisch befüllt, args-getrieben).
export const Main = {
  render: (args) => (
    <div data-ui="organism.select-all-modal.main">
      <SelectAllModal {...args} onClose={noop} onToggleSelectAll={noop} onConfirm={noop} />
    </div>
  ),
}

// States: leer (nichts gewählt) · Teil-Auswahl (indeterminate) · Voll-Auswahl (checked).
export const Variant_States = {
  render: () => (
    <div data-ui="organism.select-all-modal.states" className="flex flex-col gap-4">
      <div data-ui="organism.select-all-modal.state-empty">
        <SelectAllModal open selectedCount={0} totalCount={3} onClose={noop} onToggleSelectAll={noop} onConfirm={noop} />
      </div>
      <div data-ui="organism.select-all-modal.state-some">
        <SelectAllModal open selectedCount={2} totalCount={3} someSelected onClose={noop} onToggleSelectAll={noop} onConfirm={noop} />
      </div>
      <div data-ui="organism.select-all-modal.state-all">
        <SelectAllModal open selectedCount={3} totalCount={3} allSelected onClose={noop} onToggleSelectAll={noop} onConfirm={noop} />
      </div>
    </div>
  ),
}
