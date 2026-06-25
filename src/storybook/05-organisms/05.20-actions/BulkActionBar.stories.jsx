/**
 * GF-247-Muster — BulkActionBar (05.20 Actions, OR-08). Erscheint bei Mehrfach-
 * auswahl: Count + Clear + action-as-data (assign/move/transition/delete). Organism
 * (conditional Render + action-Modell); die Mutation macht der Consumer.
 *
 * Ebene-6 (OR-08) — Capability-Gegencheck:
 * | CAP | Verb | frontend | Anmerkung |
 * |---|---|---|---|
 * | CAP-issue-bulk-edit | issue/bulk-edit | 🟡 partial | Status/Sprint/Tags — Mutation beim Consumer |
 * | CAP-tag-delete | tag/delete | 🟡 partial | global aus allen Issues — destruktiv (danger) |
 *
 * data-ui je Wrapper + Count + je Aktion (PO-Ansprechbarkeit, T01).
 */
import { useState } from 'react'
import BulkActionBar from '../../../components/ui/organisms/BulkActionBar.jsx'
import ConfirmDialog from '../../../components/ui/organisms/ConfirmDialog.jsx'
import AssignSprintModal from '../../../components/ui/organisms/AssignSprintModal.jsx'
import MoveModal from '../../../components/ui/organisms/MoveModal.jsx'
import StatusChangeModal from '../../../components/ui/organisms/StatusChangeModal.jsx'
import TagEditModal from '../../../components/ui/organisms/TagEditModal.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const noop = () => {}

// BAB-3: Icons in gefärbten Buttons mit `inherit` → erben die on-accent-Textfarbe
// des Buttons (kontrastreich), statt im eigenen Rollen-Token (grau) kontrastarm zu werden.
const bulkActions = [
  { id: 'assign', label: 'Sprint zuweisen', icon: <Icon name="add" size={14} inherit />, onAction: noop },
  { id: 'move', label: 'Verschieben', icon: <Icon name="swap" size={14} inherit />, onAction: noop },
  { id: 'transition', label: 'Status ändern', icon: <Icon name="branch" size={14} inherit />, onAction: noop },
  { id: 'edit_tags', label: 'Tags ändern', icon: <Icon name="tags" size={14} inherit />, onAction: noop },
  { id: 'delete', label: 'Löschen', icon: <Icon name="delete" size={14} inherit />, danger: true, onAction: noop },
]

const meta = {
  title: '05 ORGANISMS/05.20 Actions/BulkActionBar',
  component: BulkActionBar,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'padded' },
  argTypes: {
    selectedCount: { control: { type: 'number', min: 0 }, description: '>0 → Leiste sichtbar.' },
    actions: { control: false, description: 'action-as-data: {id,label,icon,danger,onAction}.' },
  },
  args: {
    selectedCount: 3,
    actions: bulkActions,
  },
}
export default meta

// Default: minimaler Zustand — eine Auswahl, keine Aktionen (Default-Props-Fall).
export const Default = {
  args: { selectedCount: 1, actions: [] },
  render: (args) => (
    <div data-ui="organism.bulk-action-bar.default" className="max-w-3xl">
      <BulkActionBar {...args} onClearSelection={noop} />
    </div>
  ),
}

// Main (Pflicht): maßgeblicher Hauptfall — Klon der Default-Story (args-getrieben),
// da kein eigenständig befüllter Realfall existiert.
export const Main = {
  render: (args) => (
    <div data-ui="organism.bulk-action-bar.main" className="max-w-3xl">
      <BulkActionBar {...args} onClearSelection={noop} />
    </div>
  ),
}

// Variant_States = idle (selectedCount 0 → rendert nichts) vs. aktiv (Leiste + Count-Badge).
export const Variant_States = {
  render: () => (
    <div data-ui="organism.bulk-action-bar.states" className="flex flex-col gap-6 max-w-3xl">
      <div data-ui="organism.bulk-action-bar.state-idle">
        <BulkActionBar selectedCount={0} actions={bulkActions} onClearSelection={noop} />
        <p className="text-xs text-[var(--subtext0)]">Keine Auswahl → die Leiste rendert nichts.</p>
      </div>
      <div data-ui="organism.bulk-action-bar.state-active">
        <BulkActionBar selectedCount={5} actions={bulkActions} onClearSelection={noop} />
      </div>
    </div>
  ),
}

// Variant_Composition = volle Leiste mit allen vier Aktionen (delete = danger), Anker-Set für PO.
export const Variant_Composition = {
  render: () => (
    <div data-ui="organism.bulk-action-bar.composition" className="max-w-3xl">
      <BulkActionBar selectedCount={12} actions={bulkActions} onClearSelection={noop} />
    </div>
  ),
}

// Interactive (MOD-6): jede Aktion öffnet das zugehörige Modal — state-driven.
// assign→AssignSprintModal · move→MoveModal · transition→StatusChangeModal ·
// edit_tags→TagEditModal · delete→ConfirmDialog (danger). Demonstriert den
// vollen Bulk-Flow (BulkActionBar als Trigger-Leiste der Action-Overlays).
const SPRINTS = [{ value: 's34', label: 'Sprint DD#34' }, { value: 's35', label: 'Sprint DD#35' }]
const TARGETS = [{ value: 'devd', label: 'Developer Dashboard' }, { value: 'mybaby', label: 'MyBaby Tracker' }]
const STATUSES = [{ value: 'active', label: 'Active' }, { value: 'review', label: 'Review' }, { value: 'done', label: 'Done' }]
const TAGS = [{ value: 'bug', label: 'bug' }, { value: 'ui', label: 'ui' }, { value: 'infra', label: 'infra' }]

function InteractiveBulkActionBar() {
  const [openModal, setOpenModal] = useState(null)
  const close = () => setOpenModal(null)
  const count = 3
  const actions = bulkActions.map((a) => ({ ...a, onAction: () => setOpenModal(a.id) }))
  return (
    <div data-ui="organism.bulk-action-bar.interactive" className="max-w-3xl">
      <BulkActionBar selectedCount={count} actions={actions} onClearSelection={noop} />
      <AssignSprintModal open={openModal === 'assign'} onClose={close} sprints={SPRINTS} onAssign={close} selectedCount={count} />
      <MoveModal open={openModal === 'move'} onClose={close} targets={TARGETS} onMove={close} selectedCount={count} />
      <StatusChangeModal open={openModal === 'transition'} onClose={close} allowedStatuses={STATUSES} onApply={close} selectedCount={count} />
      <TagEditModal open={openModal === 'edit_tags'} onClose={close} tagOptions={TAGS} value={[]} onApply={close} selectedCount={count} />
      <ConfirmDialog
        open={openModal === 'delete'}
        onClose={close}
        danger
        title={`${count} Issues löschen?`}
        message="Diese Aktion entfernt die ausgewählten Issues dauerhaft und kann nicht rückgängig gemacht werden."
        confirmLabel="Endgültig löschen"
        onConfirm={close}
      />
    </div>
  )
}

export const Interaction_Click = {
  render: () => <InteractiveBulkActionBar />,
}
