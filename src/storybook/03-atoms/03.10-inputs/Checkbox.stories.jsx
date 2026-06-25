/**
 * Checkbox — Atom (03.10 Inputs). Boolean-Eingabe der Inputs-Trias
 * (Text/Boolean/Dropdown) neben Button/Input/Select. Token-saubere
 * Catppuccin-Box auf nativem Input (a11y bleibt) + Check-/Minus-Icon.
 * Muster = Button.stories.jsx (kanonische Achsen, per-Element data-ui, 0 Hex).
 * Achsen: Checkbox hat KEIN variant-/color-Prop → nur Default · Sizes · States
 * · Composition (Label-Slot). Reife status:stable (neu, noch nicht PO-reviewt).
 */
import Checkbox from '../../../components/ui/atoms/Checkbox.jsx'

const meta = {
  title: '03 ATOMS/03.10 Inputs/Checkbox',
  component: Checkbox,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    checked: { control: 'boolean', description: 'Aktiv-Zustand (gefüllte Box + Check-Icon).' },
    indeterminate: { control: 'boolean', description: 'Visueller Misch-Zustand (Minus, aria-checked="mixed").' },
    disabled: { control: 'boolean', description: 'Gesperrt — opacity + cursor-not-allowed.' },
    size: { control: 'inline-radio', options: ['sm', 'md'], description: 'sm = 14px, md = 16px Box.' },
    label: { control: 'text', description: 'Optionales Label rechts der Box.' },
  },
  args: { checked: false, indeterminate: false, disabled: false, size: 'md', label: 'Als Kontext markieren' },
}
export default meta

// Default: args-getrieben (autodocs <Primary>) — Controls steuern alle Props.
export const Default = {
  render: (args) => (
    <div data-ui="atom.checkbox.default">
      <Checkbox {...args} />
    </div>
  ),
}

export const Sizes = {
  render: () => (
    <div data-ui="atom.checkbox.sizes" className="flex items-center gap-4">
      {['sm', 'md'].map((s) => (
        <Checkbox key={s} size={s} checked label={`size ${s}`} data-ui={`atom.checkbox.size-${s}`} />
      ))}
    </div>
  ),
}

// States = Zustand-Booleans (checked/indeterminate/disabled).
export const States = {
  render: () => (
    <div data-ui="atom.checkbox.states" className="flex flex-col gap-2">
      <Checkbox checked={false} label="Unchecked" data-ui="atom.checkbox.state-unchecked" />
      <Checkbox checked label="Checked" data-ui="atom.checkbox.state-checked" />
      <Checkbox indeterminate label="Indeterminate" data-ui="atom.checkbox.state-indeterminate" />
      <Checkbox checked disabled label="Disabled" data-ui="atom.checkbox.state-disabled" />
    </div>
  ),
}

// Composition = optionaler Label-Slot (mit/ohne).
export const Composition = {
  render: () => (
    <div data-ui="atom.checkbox.composition" className="flex items-center gap-4">
      <Checkbox checked data-ui="atom.checkbox.no-label" />
      <Checkbox checked label="Mit Label" data-ui="atom.checkbox.with-label" />
    </div>
  ),
}
