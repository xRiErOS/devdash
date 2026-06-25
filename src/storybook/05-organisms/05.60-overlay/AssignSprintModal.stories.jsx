/**
 * GF-288 — AssignSprintModal (05.60 Overlay, MOD-1). Overlay zum Zuweisen eines
 * Sprints zu den selektierten Issues (BulkActionBar-getriggert). Komponiert
 * ModalShell (headerless) + DialogHeader/DialogFooter + Select-Atom.
 *
 * Präsentational (Mock-Props); die Mutation macht der Consumer. data-ui je Element.
 *
 * GF-358 — Variants-Prüfung (AUDIT-17, konservativ):
 * N/A — die Komponente hat eine einzige strukturelle Layout-Konfiguration
 * (Header + Select-Region + Footer, immer identisch). Kein size-Prop, keine
 * alternative Slot-Belegung, kein abweichender Render-Pfad. Die bestehenden
 * States (leer vs. vorbelegt) decken die relevanten Props vollständig ab;
 * eine separate Variants-Achse würde denselben UI-Zustand doppeln.
 */
import AssignSprintModal from '../../../components/ui/organisms/AssignSprintModal.jsx'

const noop = () => {}

const SPRINTS = [
  { value: 's-27', label: 'Sprint DD#27 — Organismen' },
  { value: 's-28', label: 'Sprint DD#28 — Overlays' },
  { value: 's-29', label: 'Sprint DD#29 — Screens' },
]

const meta = {
  title: '05 ORGANISMS/05.60 Overlay/AssignSprintModal',
  component: AssignSprintModal,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    open: { control: 'boolean' },
    selectedCount: { control: { type: 'number', min: 0 } },
    sprints: { control: false },
  },
  args: {
    open: true,
    selectedCount: 3,
    sprints: SPRINTS,
  },
}
export default meta

// Default: minimaler no-args-Zustand (Default-Props der Komponente).
export const Default = {
  args: {},
  render: (args) => (
    <div data-ui="organism.assign-sprint-modal.default">
      <AssignSprintModal {...args} onClose={noop} onAssign={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall (realistisch befüllt, explizite Demo-Daten).
export const Main = {
  args: {
    open: true,
    selectedCount: 3,
    sprints: SPRINTS,
  },
  render: (args) => (
    <div data-ui="organism.assign-sprint-modal.main">
      <AssignSprintModal {...args} onClose={noop} onAssign={noop} />
    </div>
  ),
}

// States: leer (kein Sprint vorgewählt) vs. vorbelegt (value gesetzt).
export const Variant_States = {
  render: () => (
    <div data-ui="organism.assign-sprint-modal.states" className="flex flex-col gap-4">
      <div data-ui="organism.assign-sprint-modal.state-empty">
        <AssignSprintModal open sprints={SPRINTS} onClose={noop} onAssign={noop} />
      </div>
      <div data-ui="organism.assign-sprint-modal.state-selected">
        <AssignSprintModal open sprints={SPRINTS} value="s-28" selectedCount={5} onClose={noop} onAssign={noop} />
      </div>
    </div>
  ),
}
