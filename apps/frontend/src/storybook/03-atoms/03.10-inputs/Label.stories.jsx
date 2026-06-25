/**
 * Label — Atom (03.10 Inputs). Form-Feld-Beschriftung auf nativem `<label htmlFor>`.
 * Teil der Inputs-Familie neben Button/Input/Select/Checkbox. Muster =
 * Button.stories.jsx (kanonische Achsen, per-Element data-ui, 0 Hex).
 * Achsen: Default · Sizes (sm/md) · States (required-Marker).
 * GF-352: Sizes-Export ergänzt (per-Instanz additiver Wrapper, LL21).
 */
import Label from '../../../components/ui/atoms/Label.jsx'

const meta = {
  title: '03 ATOMS/03.10 Inputs/Label',
  component: Label,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    htmlFor: { control: 'text', description: 'id des beschrifteten Feldes (Klick fokussiert es).' },
    required: { control: 'boolean', description: 'Rendert "*"-Marker (Deko, aria-hidden) im --accent-danger.' },
    size: { control: 'inline-radio', options: ['sm', 'md'], description: 'sm = text-xs, md = text-sm.' },
    children: { control: 'text', description: 'Beschriftungstext.' },
  },
  args: { htmlFor: 'email', required: false, size: 'md', children: 'E-Mail-Adresse' },
}
export default meta

// Default: args-getrieben (autodocs <Primary>) — Controls steuern alle Props.
export const Default = {
  render: (args) => (
    <div data-ui="atom.label.default">
      <Label {...args} />
    </div>
  ),
}

// Sizes = sm (text-xs) / md (text-sm, Default). Per-Instanz additive Wrapper (LL21).
export const Sizes = {
  render: () => (
    <div data-ui="atom.label.sizes" className="flex flex-col gap-2">
      <div data-ui="atom.label.size-sm">
        <Label htmlFor="field-sm" size="sm">Kleine Beschriftung (sm)</Label>
      </div>
      <div data-ui="atom.label.size-md">
        <Label htmlFor="field-md" size="md">Mittlere Beschriftung (md)</Label>
      </div>
    </div>
  ),
}

// States = required-Achse (Pflicht-Marker an/aus).
export const States = {
  render: () => (
    <div data-ui="atom.label.states" className="flex flex-col gap-2">
      <Label htmlFor="opt" data-ui="atom.label.state-optional">Optional</Label>
      <Label htmlFor="req" required data-ui="atom.label.state-required">Pflichtfeld</Label>
    </div>
  ),
}
