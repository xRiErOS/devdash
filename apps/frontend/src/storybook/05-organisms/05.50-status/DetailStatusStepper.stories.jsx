/**
 * GF-208-Muster — DetailStatusStepper (05.50 Status). Transition-aware Status-
 * Organismus (DD-697, harvested aus ui/organisms): zeigt den aktuellen Status
 * mittig + die via getValidIssueTransitions zulässigen Übergänge davor/dahinter.
 * Interaktion + Transition-Logik → Organism-Tier (mem 414). Props-driven
 * (current/onSelect/disabled), Backend bleibt autoritativ. data-ui je Achse +
 * je Element (PO-Ansprechbarkeit, T01).
 * GF-351: Composition-Achse ergänzt (Detail-Header-Kontext).
 */
import DetailStatusStepper from '../../../components/ui/organisms/DetailStatusStepper.jsx'

// Lifecycle-Stati mit nicht-leerem Transitions-Set (Walk über die Achse).
const WALK = ['new', 'planned', 'in_progress', 'to_review', 'done']
const noop = () => {}

const meta = {
  title: '05 ORGANISMS/05.50 Status/DetailStatusStepper',
  component: DetailStatusStepper,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'padded' },
  argTypes: {
    current: {
      control: 'select',
      options: ['new', 'refined', 'planned', 'in_progress', 'to_review', 'passed', 'rejected', 'done', 'cancelled'],
      description: 'Aktueller Issue-Status (mittig, Primärfarbe).',
    },
    disabled: { control: 'boolean', description: 'Deaktiviert die Transitions-Knöpfe.' },
    onSelect: { action: 'select', description: 'Klick auf einen Übergang. Ohne Handler sind die Optionen statisch.' },
  },
  args: {
    current: 'in_progress',
    disabled: false,
    onSelect: noop,
  },
}
export default meta

// Default: minimaler Default-Props-Zustand (kein onSelect → statische Optionen,
// Default-current 'new' am Anfang der Achse).
export const Default = {
  args: { current: 'new', disabled: false, onSelect: undefined },
  render: (args) => (
    <div data-ui="organism.detail-status-stepper.default" className="max-w-xl">
      <DetailStatusStepper {...args} />
    </div>
  ),
}

// Main = maßgeblicher Hauptfall (realistisch befüllt, interaktiv mit onSelect).
export const Main = {
  args: { current: 'in_progress', disabled: false, onSelect: noop },
  render: (args) => (
    <div data-ui="organism.detail-status-stepper.main" className="max-w-xl">
      <DetailStatusStepper {...args} />
    </div>
  ),
}

// Variant_All = Status-Walk über die Lifecycle-Achse. Jeder Status zeigt sein
// eigenes valides Transitions-Set (davor gedimmt links, dahinter rechts).
// Atom-Anker je Status (organism.detail-status-stepper.status-*), damit der PO
// jede Position 1:1 ansprechen kann.
export const Variant_All = {
  render: () => (
    <div data-ui="organism.detail-status-stepper.variants" className="flex flex-col gap-6 max-w-xl">
      {WALK.map((s) => (
        <div key={s} data-ui={`organism.detail-status-stepper.status-${s}`}>
          <DetailStatusStepper current={s} onSelect={noop} />
        </div>
      ))}
    </div>
  ),
}

// Variant_States = interaktiv-disabled vs read-only (ohne onSelect → statische Optionen).
export const Variant_States = {
  render: () => (
    <div data-ui="organism.detail-status-stepper.states" className="flex flex-col gap-6 max-w-xl">
      <div data-ui="organism.detail-status-stepper.state-disabled">
        <DetailStatusStepper current="in_progress" onSelect={noop} disabled />
      </div>
      <div data-ui="organism.detail-status-stepper.state-readonly">
        <DetailStatusStepper current="in_progress" />
      </div>
    </div>
  ),
}

// Variant_Composition: Detail-Header-Kontext — DetailStatusStepper als Bereich ganz oben
// in der Issue-Detailansicht (Header mit Titel + Status-Stepper darunter).
export const Variant_Composition = {
  render: () => (
    <div data-ui="organism.detail-status-stepper.composition" className="flex flex-col gap-6 max-w-xl">
      <div data-ui="organism.detail-status-stepper.composition-detail-header" className="flex flex-col gap-2 rounded-md border border-[var(--surface1)] bg-[var(--base)] p-4">
        <div data-ui="organism.detail-status-stepper.composition-title-row" className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--text)]">DD-42 · StatusBadgeSelect Composition ergänzen</h2>
        </div>
        <div data-ui="organism.detail-status-stepper.composition-stepper">
          <DetailStatusStepper current="in_progress" onSelect={noop} />
        </div>
      </div>
      <div data-ui="organism.detail-status-stepper.composition-detail-header-review" className="flex flex-col gap-2 rounded-md border border-[var(--surface1)] bg-[var(--base)] p-4">
        <div data-ui="organism.detail-status-stepper.composition-title-row-review" className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--text)]">DD-43 · Status im Review</h2>
        </div>
        <div data-ui="organism.detail-status-stepper.composition-stepper-review">
          <DetailStatusStepper current="to_review" onSelect={noop} />
        </div>
      </div>
    </div>
  ),
}
