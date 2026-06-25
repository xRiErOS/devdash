/**
 * Select — Atom (03.10 Inputs). Dropdown-Auswahl, drittes Inputs-Atom neben
 * Button/Input/Checkbox (Inputs-Trias Text/Boolean/Dropdown, PO 2026-06-16).
 * Muster = Button.stories.jsx (kanonische Achsen, per-Element data-ui, 0 Hex).
 * Reife status:stable — neu, noch nicht PO-reviewt (CONV-status-reife-flow).
 */
import Select from '../../../components/ui/atoms/Select.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const OPTS = [
  { value: 'low', label: 'Niedrig' },
  { value: 'med', label: 'Mittel' },
  { value: 'high', label: 'Hoch' },
]

const meta = {
  title: '03 ATOMS/03.10 Inputs/Select',
  component: Select,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md'], description: 'sm/md — md = 16px-Schrift (iOS-Zoom-Schutz).' },
    invalid: { control: 'boolean', description: 'Fehlerzustand: aria-invalid + Danger-Outline.' },
    disabled: { control: 'boolean' },
    placeholder: { control: 'text', description: 'Disabled Leeroption als Prompt.' },
  },
  args: { options: OPTS, size: 'md', invalid: false, disabled: false, defaultValue: 'med' },
}
export default meta

// Default: args-getrieben (autodocs <Primary>).
export const Default = {
  render: (args) => (
    <div data-ui="atom.select.default" className="max-w-xs">
      <Select {...args} />
    </div>
  ),
}

export const Sizes = {
  render: () => (
    <div data-ui="atom.select.sizes" className="flex flex-col gap-2 max-w-xs">
      {['sm', 'md'].map((s) => (
        <Select key={s} size={s} options={OPTS} defaultValue="med" data-ui={`atom.select.size-${s}`} />
      ))}
    </div>
  ),
}

// States = Zustand-Booleans (invalid/disabled).
export const States = {
  render: () => (
    <div data-ui="atom.select.states" className="flex flex-col gap-2 max-w-xs">
      <Select options={OPTS} defaultValue="med" invalid data-ui="atom.select.state-invalid" />
      <Select options={OPTS} defaultValue="med" disabled data-ui="atom.select.state-disabled" />
    </div>
  ),
}

// Composition = Placeholder-Prompt + leadingIcon.
export const Composition = {
  render: () => (
    <div data-ui="atom.select.composition" className="flex flex-col gap-2 max-w-xs">
      <Select options={OPTS} placeholder="Priorität wählen…" defaultValue="" data-ui="atom.select.placeholder" />
      <Select options={OPTS} defaultValue="med" leadingIcon={<Icon name="filter" size={14} />} data-ui="atom.select.icon-left" />
    </div>
  ),
}
