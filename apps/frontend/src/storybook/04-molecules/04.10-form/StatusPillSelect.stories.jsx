/**
 * GF-208-Muster — StatusPillSelect (04.10 Form, GF-231). Molecule: StatusBadge
 * (aktueller Status) + Select-Atom (Wechsel). DUMB (CONV-molecule-boundary, I02):
 * präsentational, keine Transition-Logik — Consumer verdrahtet onChange. data-ui
 * je Story + je Element (PO-Ansprechbarkeit, T01).
 *
 * GF-353: States auf alle 6 Status erweitert (refined/to_review/passed ergänzt).
 * Per-Instanz-Differenzierung via additiver Wrapper-<div> (LL21, kein Prop-Override).
 */
import StatusPillSelect from '../../../components/ui/molecules/StatusPillSelect.jsx'

// Status-Optionen (Issue-Lifecycle) — Werte spiegeln das StatusBadge-Enum.
const STATUS_OPTIONS = [
  { value: 'new', label: 'Neu' },
  { value: 'refined', label: 'Refined' },
  { value: 'in_progress', label: 'In Arbeit' },
  { value: 'to_review', label: 'Review' },
  { value: 'passed', label: 'Bestanden' },
  { value: 'done', label: 'Done' },
]

const noop = () => {}

const meta = {
  title: '04 MOLECULES/04.10 Form/StatusPillSelect',
  component: StatusPillSelect,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    status: { control: 'select', options: STATUS_OPTIONS.map((o) => o.value), description: 'Aktueller Status (Badge + Select-value).' },
    disabled: { control: 'boolean' },
    options: { control: false },
  },
  args: {
    status: 'in_progress',
    options: STATUS_OPTIONS,
    disabled: false,
  },
}
export default meta

// Default: minimaler Default-Props-Zustand — Meta-Args bewusst geleert (undefined),
// damit die Komponenten-Defaults greifen (status undefined, options=[], disabled=false).
// Inhaltlich != Main (LL-Gate Default!=Main).
export const Default = {
  args: { status: undefined, options: undefined, disabled: undefined },
  render: (args) => (
    <div data-ui="molecule.status-pill-select.default">
      <StatusPillSelect {...args} onChange={noop} />
    </div>
  ),
}

// Main = realistischer Hauptfall: Statuswechsel-Affordanz (Default-Props, args-getrieben).
export const Main = {
  render: (args) => (
    <div data-ui="molecule.status-pill-select.main">
      <StatusPillSelect {...args} onChange={noop} />
    </div>
  ),
}

// States = alle 6 Status (Badge-Tone folgt dem Status) + gesperrt.
// Per-Instanz-Differenzierung via additiver Wrapper-<div data-ui="..."> (LL21):
// Component-Anker bleibt erhalten, kein Prop-Override.
export const Variant_States = {
  render: () => (
    <div data-ui="molecule.status-pill-select.states" className="flex flex-col items-start gap-3">
      <div data-ui="molecule.status-pill-select.state-new">
        <StatusPillSelect status="new" options={STATUS_OPTIONS} onChange={noop} />
      </div>
      <div data-ui="molecule.status-pill-select.state-refined">
        <StatusPillSelect status="refined" options={STATUS_OPTIONS} onChange={noop} />
      </div>
      <div data-ui="molecule.status-pill-select.state-in-progress">
        <StatusPillSelect status="in_progress" options={STATUS_OPTIONS} onChange={noop} />
      </div>
      <div data-ui="molecule.status-pill-select.state-to-review">
        <StatusPillSelect status="to_review" options={STATUS_OPTIONS} onChange={noop} />
      </div>
      <div data-ui="molecule.status-pill-select.state-passed">
        <StatusPillSelect status="passed" options={STATUS_OPTIONS} onChange={noop} />
      </div>
      <div data-ui="molecule.status-pill-select.state-done">
        <StatusPillSelect status="done" options={STATUS_OPTIONS} onChange={noop} />
      </div>
      <div data-ui="molecule.status-pill-select.state-disabled">
        <StatusPillSelect status="to_review" options={STATUS_OPTIONS} disabled onChange={noop} />
      </div>
    </div>
  ),
}
