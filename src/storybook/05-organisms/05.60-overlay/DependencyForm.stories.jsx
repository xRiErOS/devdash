/**
 * GF-255 — DependencyForm (05.60 Overlay, OR-20). Dokumentiert die BESTEHENDE,
 * token-saubere DependencyForm (DD-481-Harvest, präsentational) als OR-20-Vertrag —
 * konsolidieren statt duplizieren (PRODUCT.md). Erfasst Vorgänger/Nachfolger je
 * Entität (gleichtypig MS/SP/IS); Picker legt sofort an (onAdd), Items entfernbar
 * (onRemove). Zyklus-/409-Fehler rendert der `error`-Prop. Als Overlay (D04/GF-301)
 * via `DependencyFormModal` in kanonische Modal-Chrome gehüllt (Modal/DialogHeader/
 * DialogFooter) — siehe Story `Modal`.
 *
 * Ebene-6-Gegencheck (OR-20, 3 Caps): dependency-create (mit Zyklus-Schutz),
 * dependency-delete, milestone-dep-add (_ebene6.md).
 *
 * GF-349: Modal-Story trägt Kind-Anker modal-header/-body/-footer (Sub-Anker-Sweep).
 */
import DependencyForm from '../../../components/ui/organisms/DependencyForm.jsx'
import ModalShell from '../../../components/ui/molecules/Modal.jsx'
import DialogHeader from '../../../components/ui/molecules/DialogHeader.jsx'
import DialogFooter from '../../../components/ui/molecules/DialogFooter.jsx'
import Button from '../../../components/ui/atoms/Button.jsx'

const noop = () => {}

const ENTITY = { id: 1, name: 'M-Core' }
const CANDIDATES = [
  { id: 2, name: 'M-Auth' },
  { id: 3, name: 'M-Search' },
  { id: 4, name: 'M-Export' },
]
const DEPS = {
  predecessors: [{ id: 5, name: 'M-Foundation', dependency_id: 10 }],
  successors: [{ id: 6, name: 'M-Release', dependency_id: 11 }],
}

const meta = {
  title: '05 ORGANISMS/05.60 Overlay/DependencyForm',
  component: DependencyForm,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'padded' },
  argTypes: {
    variant: { control: 'inline-radio', options: ['milestone', 'sprint', 'issue'] },
    title: { control: 'text' },
  },
  args: {
    entity: ENTITY,
    variant: 'milestone',
    candidates: CANDIDATES,
    deps: DEPS,
  },
}
export default meta

// Default: minimaler Zustand — nur strukturell nötige Entität, Default-Props sonst.
export const Default = {
  args: {
    entity: ENTITY,
    variant: undefined,
    candidates: undefined,
    deps: undefined,
  },
  render: (args) => (
    <div data-ui="organism.dependency-form.default" className="max-w-md">
      <DependencyForm {...args} onAdd={noop} onRemove={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — Vorgänger + Nachfolger befüllt (eigene Demo-Daten).
export const Main = {
  args: {
    entity: ENTITY,
    variant: 'milestone',
    candidates: CANDIDATES,
    deps: DEPS,
  },
  render: (args) => (
    <div data-ui="organism.dependency-form.main" className="max-w-md">
      <DependencyForm {...args} onAdd={noop} onRemove={noop} />
    </div>
  ),
}

// Empty: keine bestehenden Kanten → Leer-Hinweis je Sektion, nur Picker.
export const State_Empty = {
  render: () => (
    <div data-ui="organism.dependency-form.empty" className="max-w-md">
      <DependencyForm entity={ENTITY} variant="milestone" candidates={CANDIDATES} deps={{}} onAdd={noop} onRemove={noop} />
    </div>
  ),
}

// WithError: Backend meldet Zyklus (409) → Fehler-Toast.
export const State_Error = {
  render: () => (
    <div data-ui="organism.dependency-form.with-error" className="max-w-md">
      <DependencyForm
        entity={ENTITY}
        variant="milestone"
        candidates={CANDIDATES}
        deps={DEPS}
        error={{ kind: 'error', msg: 'Zyklus erkannt — diese Kante würde eine zirkuläre Abhängigkeit erzeugen.' }}
        onAdd={noop}
        onRemove={noop}
      />
    </div>
  ),
}

// Modal: kanonische Overlay-Chrome (ModalShell + DialogHeader + DialogFooter) mit
// Sub-Ankern für Modal-Regionen header/body/footer (GF-349, Canon-Regel 1).
// Rendered inline damit der PO jede Region 1:1 adressieren kann:
// …modal-header, …modal-body, …modal-footer.
export const Variant_Modal = {
  render: () => (
    <div data-ui="organism.dependency-form.modal">
      <ModalShell open onClose={noop} headerless size="md" padded={false} dialogDataUi="organism.dependency-form.modal-shell">
        <div data-ui="organism.dependency-form.modal-header">
          <DialogHeader title="Abhängigkeiten — DD-251" onClose={noop} />
        </div>
        <div data-ui="organism.dependency-form.modal-body" className="px-4 py-4">
          <DependencyForm
            entity={ENTITY}
            variant="issue"
            candidates={CANDIDATES}
            deps={DEPS}
            onAdd={noop}
            onRemove={noop}
          />
        </div>
        <div data-ui="organism.dependency-form.modal-footer">
          <DialogFooter align="end">
            <Button variant="primary" onClick={noop} data-ui="organism.dependency-form.modal-done">Fertig</Button>
          </DialogFooter>
        </div>
      </ModalShell>
    </div>
  ),
}
