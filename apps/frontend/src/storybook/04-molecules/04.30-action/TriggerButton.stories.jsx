/**
 * GF-208-Muster — TriggerButton (04.30 Action, GF-235). Molecule: Button/IconButton
 * + Count-Badge (aktive Filter/Sort). Dumb (CONV-molecule-boundary): kein Popover-/
 * Open-State — Consumer verdrahtet Klick. Icon aus foundations-Registry (A2).
 * data-ui je Story + je Element (T01).
 * GF-354: `pressed`-Toggle (aria-pressed, Toggle-Affordanz) zu argTypes + States ergänzt.
 */
import TriggerButton from '../../../components/ui/molecules/TriggerButton.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const noop = () => {}

const meta = {
  title: '04 MOLECULES/04.30 Action/TriggerButton',
  component: TriggerButton,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    children: { control: 'text', description: 'Label (leer → iconOnly).' },
    count: { control: 'number', description: 'Aktive Filter/Sort → Badge (>0).' },
    active: { control: 'boolean', description: 'Momentane Hervorhebung (offen/aktiv — Filter/Sort-Trigger).' },
    pressed: {
      control: 'boolean',
      description:
        'Toggle-Semantik (R2-LAB-1): gesetzt → persistenter Umschalter mit aria-pressed. ' +
        'Unpressed = sichtbare Border (ghost), Pressed = Akzent-Tönung (Border + Text). ' +
        'Ist `pressed` undefined, kein Toggle-Modus.',
    },
    iconOnly: { control: 'boolean' },
    disabled: { control: 'boolean' },
    icon: { control: false },
  },
  args: {
    children: 'Filter',
    count: 2,
    active: false,
    iconOnly: false,
    disabled: false,
  },
}
export default meta

// Default: minimaler Zustand — Default-Props, kein Icon/Count/Label-Demo (nur aria-label).
export const Default = {
  args: {},
  render: () => (
    <div data-ui="molecule.trigger-button.default">
      <TriggerButton label="Trigger" onClick={noop}>Trigger</TriggerButton>
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — args-getriebener Trigger mit Count-Badge.
export const Main = {
  render: (args) => (
    <div data-ui="molecule.trigger-button.main">
      <TriggerButton {...args} icon={<Icon name="filter" mono size={14} />} label="Filter" onClick={noop} />
    </div>
  ),
}

// Variant_All = labeled (Button) vs iconOnly (IconButton). Beide mit Count.
export const Variant_All = {
  render: () => (
    <div data-ui="molecule.trigger-button.variants" className="flex items-center gap-4">
      <div data-ui="molecule.trigger-button.labeled">
        <TriggerButton icon={<Icon name="filter" mono size={14} />} count={2} onClick={noop}>Filter</TriggerButton>
      </div>
      <div data-ui="molecule.trigger-button.icon-only">
        <TriggerButton iconOnly icon={<Icon name="sort" mono size={16} />} label="Sortieren" count={1} onClick={noop} />
      </div>
      <div data-ui="molecule.trigger-button.no-count">
        <TriggerButton icon={<Icon name="filter" mono size={14} />} onClick={noop}>Ohne Count</TriggerButton>
      </div>
    </div>
  ),
}

// Variant_States = alle relevanten Zustände: inaktiv, aktiv (Filter/Sort), pressed-off, pressed-on.
// `pressed` aktiviert Toggle-Modus (aria-pressed + persistente Border). Wrapper per LL21.
export const Variant_States = {
  render: () => (
    <div data-ui="molecule.trigger-button.states" className="flex items-center gap-4 flex-wrap">
      <div data-ui="molecule.trigger-button.inactive">
        <TriggerButton icon={<Icon name="filter" mono size={14} />} count={3} onClick={noop}>Inaktiv</TriggerButton>
      </div>
      <div data-ui="molecule.trigger-button.active">
        <TriggerButton active icon={<Icon name="filter" mono size={14} />} count={3} onClick={noop}>Aktiv</TriggerButton>
      </div>
      <div data-ui="molecule.trigger-button.pressed-off">
        <TriggerButton pressed={false} icon={<Icon name="adjust" mono size={14} />} onClick={noop}>Toggle aus</TriggerButton>
      </div>
      <div data-ui="molecule.trigger-button.pressed-on">
        <TriggerButton pressed={true} icon={<Icon name="adjust" mono size={14} />} onClick={noop}>Toggle ein</TriggerButton>
      </div>
    </div>
  ),
}
