/**
 * GF-208-Muster — IconButton (03.10 Inputs). Icon-only Action-Atom, token-sauber.
 * Leaf-Atom: rendert ein natives <button> mit Icon-Slot, komponiert keine Atome.
 * Default = args-Baseline; data-ui je Wert (PO-Ansprechbarkeit, T01).
 *
 * Achsen: `variant` ist eine Farb-/Rollen-Tone-Achse (default/primary/danger/
 * ghost) → kanonischer Name `Appearance` (kein struktureller Variant). `size`
 * → Sizes, `disabled` → States, Icon-Slot → Composition.
 *
 * a11y (B01): Die gefüllte primary-Fläche (--accent-primary) trägt ihr Icon auf
 * --on-accent (kontrastierendes On-Accent-Token, WCAG AA) — die Variante erzwingt
 * das via [&_svg]:text-… und überschreibt die Eigen-Rollenfarbe des <Icon>. Daher
 * KEIN role-getöntes Icon (z.B. success-Grün) auf der primary-Fläche.
 *
 * Icons in Stories NUR via <Icon name … /> (kein direkter lucide-Import).
 */
import IconButton from '../../../components/ui/atoms/IconButton.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const APPEARANCES = ['default', 'primary', 'danger', 'ghost']
const SIZES = ['sm', 'md', 'lg']

const meta = {
  title: '03 ATOMS/03.10 Inputs/IconButton',
  component: IconButton,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: APPEARANCES,
      description: 'Visuelle Rolle/Tone — default/primary/danger/ghost (Token-Flächen).',
    },
    size: {
      control: 'inline-radio',
      options: SIZES,
      description: 'sm=28px · md=36px · lg=44px (Touch-Target, Mobile-Pflicht).',
    },
    disabled: { control: 'boolean' },
    label: { control: 'text', description: 'aria-label/title (Pflicht — Icon-only).' },
  },
  args: {
    label: 'Hinzufügen',
    variant: 'default',
    size: 'md',
    disabled: false,
  },
}
export default meta

// Default: args-getrieben — Controls-Panel steuert alle Props (autodocs <Primary>).
export const Default = {
  render: (args) => (
    <div data-ui="atom.icon-button.default">
      <IconButton {...args} icon={<Icon name="add" size={16} />} />
    </div>
  ),
}

// Appearance = Farb-/Rollen-Tone-Achse (variant-Prop). Jede Tone trägt ein data-ui.
export const Appearance = {
  render: () => (
    <div data-ui="atom.icon-button.appearance" className="flex flex-wrap items-center gap-2">
      <IconButton data-ui="atom.icon-button.default" variant="default" label="Standard" icon={<Icon name="add" size={16} />} />
      <IconButton data-ui="atom.icon-button.primary" variant="primary" label="Hinzufügen" icon={<Icon name="add" size={16} />} />
      <IconButton data-ui="atom.icon-button.danger" variant="danger" label="Löschen" icon={<Icon name="delete" size={16} />} />
      <IconButton data-ui="atom.icon-button.ghost" variant="ghost" label="Einstellungen" icon={<Icon name="settings" size={16} />} />
    </div>
  ),
}

export const Sizes = {
  render: () => (
    <div data-ui="atom.icon-button.sizes" className="flex items-center gap-2">
      {SIZES.map((s) => (
        <IconButton key={s} size={s} data-ui={`atom.icon-button.size-${s}`} label={`Größe ${s}`} icon={<Icon name="add" size={16} />} />
      ))}
    </div>
  ),
}

// States = Zustand-Booleans (disabled).
export const States = {
  render: () => (
    <div data-ui="atom.icon-button.states" className="flex items-center gap-2">
      <IconButton data-ui="atom.icon-button.state-default" label="Aktiv" icon={<Icon name="add" size={16} />} />
      <IconButton data-ui="atom.icon-button.state-disabled" disabled label="Gesperrt" icon={<Icon name="add" size={16} />} />
    </div>
  ),
}

// Composition = Icon-Slot-Anordnung (verschiedene Icons im selben Atom).
export const Composition = {
  render: () => (
    <div data-ui="atom.icon-button.composition" className="flex items-center gap-2">
      <IconButton data-ui="atom.icon-button.icon-add" variant="primary" label="Neu" icon={<Icon name="add" size={16} />} />
      <IconButton data-ui="atom.icon-button.icon-edit" label="Bearbeiten" icon={<Icon name="edit" size={16} />} />
      <IconButton data-ui="atom.icon-button.icon-copy" variant="ghost" label="Kopieren" icon={<Icon name="copy" size={16} />} />
    </div>
  ),
}
