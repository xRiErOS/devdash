/**
 * GF-291 — TagEditModal (05.60 Overlay). Overlay zum Tag-Hinzufügen/-Entfernen für
 * die selektierten Issues (BulkActionBar MOD-5 / BAB-4). Komponiert ModalShell +
 * DialogHeader/DialogFooter + TagChip (zugewiesen, entfernbar) + Button (verfügbar).
 *
 * Ebene-6: CAP-issue-tag-set 🟢. Stateful (gewählte Tag-Menge bis Apply); die
 * Mutation macht der Consumer. data-ui je Element.
 */
import TagEditModal from '../../../components/ui/organisms/TagEditModal.jsx'

const noop = () => {}

const TAG_OPTIONS = [
  { value: 'bug', label: 'bug' },
  { value: 'feature', label: 'feature' },
  { value: 'chore', label: 'chore' },
  { value: 'blocked', label: 'blocked' },
  { value: 'a11y', label: 'a11y' },
]

const meta = {
  title: '05 ORGANISMS/05.60 Overlay/TagEditModal',
  component: TagEditModal,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    selectedCount: { control: 'number' },
    open: { control: 'boolean' },
  },
  args: {
    open: true,
    tagOptions: TAG_OPTIONS,
    value: ['bug'],
    selectedCount: 3,
  },
}
export default meta

// Default: minimaler Default-Props-Zustand (no-args, nur strukturell nötiges open).
export const Default = {
  args: { open: true, tagOptions: [], value: [], selectedCount: 0 },
  render: (args) => (
    <div data-ui="organism.tag-edit-modal.default">
      <TagEditModal {...args} onClose={noop} onApply={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall (realistisch befüllt, eigene explizite args).
export const Main = {
  args: { open: true, tagOptions: TAG_OPTIONS, value: ['bug'], selectedCount: 3 },
  render: (args) => (
    <div data-ui="organism.tag-edit-modal.main">
      <TagEditModal {...args} onClose={noop} onApply={noop} />
    </div>
  ),
}

// States: keine Tags zugewiesen vs. mehrere zugewiesen (TagChip entfernbar).
export const Variant_States = {
  render: () => (
    <div data-ui="organism.tag-edit-modal.states" className="flex flex-col gap-4">
      <div data-ui="organism.tag-edit-modal.state-empty">
        <TagEditModal open tagOptions={TAG_OPTIONS} value={[]} selectedCount={5} onClose={noop} onApply={noop} />
      </div>
      <div data-ui="organism.tag-edit-modal.state-assigned">
        <TagEditModal open tagOptions={TAG_OPTIONS} value={['bug', 'a11y']} selectedCount={2} onClose={noop} onApply={noop} />
      </div>
    </div>
  ),
}
