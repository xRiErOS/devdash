/**
 * Switch — Atom (03.10 Inputs). Boolean-Toggle für sofortiges An/Aus
 * (≠ Checkbox: keine zu bestätigende Auswahl). Nativer `<button role="switch">` —
 * Tastatur + Fokus gratis. Track + Thumb, checked = --accent-primary.
 * Muster = Button.stories.jsx (kanonische Achsen, per-Element data-ui, 0 Hex).
 * Achsen: Switch hat KEIN variant-/color-Prop → nur Default · Sizes · States · Composition.
 * GF-351: Composition-Achse ergänzt (label-Slot-Kontext).
 */
import Switch from '../../../components/ui/atoms/Switch.jsx'

const meta = {
  title: '03 ATOMS/03.10 Inputs/Switch',
  component: Switch,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    checked: { control: 'boolean', description: 'An/Aus-Zustand (Track = --accent-primary, Thumb verschoben).' },
    disabled: { control: 'boolean', description: 'Gesperrt — opacity + cursor-not-allowed.' },
    size: { control: 'inline-radio', options: ['sm', 'md'], description: 'sm = 28×16, md = 36×20 Track.' },
    label: { control: 'text', description: 'Optionales Label rechts des Tracks.' },
  },
  args: { checked: false, disabled: false, size: 'md', label: 'Als Kontext anzeigen' },
}
export default meta

// Default: args-getrieben (autodocs <Primary>) — Controls steuern alle Props.
export const Default = {
  render: (args) => (
    <div data-ui="atom.switch.default">
      <Switch {...args} />
    </div>
  ),
}

export const Sizes = {
  render: () => (
    <div data-ui="atom.switch.sizes" className="flex items-center gap-4">
      {['sm', 'md'].map((s) => (
        <Switch key={s} size={s} checked label={`size ${s}`} data-ui={`atom.switch.size-${s}`} />
      ))}
    </div>
  ),
}

// States = Zustand-Booleans (off/on/disabled).
export const States = {
  render: () => (
    <div data-ui="atom.switch.states" className="flex flex-col gap-2">
      <Switch checked={false} label="Off" data-ui="atom.switch.state-off" />
      <Switch checked label="On" data-ui="atom.switch.state-on" />
      <Switch checked disabled label="Disabled" data-ui="atom.switch.state-disabled" />
    </div>
  ),
}

// Composition: label-Slot-Kontext — Switch in einem Settings-ähnlichen
// Formular-Kontext (Track + Label rechts, mehrere Zeilen).
export const Composition = {
  render: () => (
    <div data-ui="atom.switch.composition" className="flex flex-col gap-3 max-w-xs">
      <div data-ui="atom.switch.composition-context-label" className="flex items-center justify-between rounded-md border border-[var(--surface1)] bg-[var(--base)] px-3 py-2">
        <span className="text-sm text-[var(--text)]">Als Kontext anzeigen</span>
        <Switch checked size="sm" />
      </div>
      <div data-ui="atom.switch.composition-notifications-label" className="flex items-center justify-between rounded-md border border-[var(--surface1)] bg-[var(--base)] px-3 py-2">
        <span className="text-sm text-[var(--text)]">Benachrichtigungen</span>
        <Switch checked={false} size="sm" />
      </div>
      <div data-ui="atom.switch.composition-inline-label" className="flex items-center gap-2 rounded-md border border-[var(--surface1)] bg-[var(--base)] px-3 py-2">
        <Switch checked label="Inline-Label rechts" />
      </div>
    </div>
  ),
}
