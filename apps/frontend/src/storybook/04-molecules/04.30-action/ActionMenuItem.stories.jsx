/**
 * GF-208-Muster — ActionMenuItem (04.30 Action, GF-236). Molecule: menuitem-Button
 * + Icon-Node + Kbd-Atom (Shortcut). Dumb (CONV-molecule-boundary): kein Menü-State
 * — Consumer verdrahtet Klick/Mechanik. Icon aus foundations-Registry (A2).
 * data-ui je Story + je Element (T01).
 */
import ActionMenuItem from '../../../components/ui/molecules/ActionMenuItem.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const noop = () => {}

const meta = {
  title: '04 MOLECULES/04.30 Action/ActionMenuItem',
  component: ActionMenuItem,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    children: { control: 'text', description: 'Label.' },
    shortcut: { control: 'text', description: 'Tasten-Glyph(en) → Kbd.' },
    danger: { control: 'boolean', description: 'Destruktive Aktion (Danger-Akzent).' },
    disabled: { control: 'boolean' },
    icon: { control: false },
  },
  args: {
    children: 'Kopieren',
    shortcut: 'C',
    danger: false,
    disabled: false,
  },
}
export default meta

// Default: minimaler no-args Zustand — Default-Props, nur Label, kein Icon/Shortcut.
export const Default = {
  args: { children: 'Aktion', shortcut: '', danger: false, disabled: false },
  render: (args) => (
    <div data-ui="molecule.action-menu-item.default" role="menu" className="w-56 rounded-lg border border-[var(--surface1)] p-1">
      <ActionMenuItem {...args} onClick={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — args-getriebener Menüeintrag mit Icon + Shortcut.
export const Main = {
  render: (args) => (
    <div data-ui="molecule.action-menu-item.main" role="menu" className="w-56 rounded-lg border border-[var(--surface1)] p-1">
      <ActionMenuItem {...args} icon={<Icon name="copy" mono size={16} />} onClick={noop} />
    </div>
  ),
}

// Variant_States = default · gesperrt · destruktiv (danger). Als Menü-Gruppe.
export const Variant_States = {
  render: () => (
    <div data-ui="molecule.action-menu-item.states" role="menu" className="w-56 rounded-lg border border-[var(--surface1)] p-1 flex flex-col">
      <div data-ui="molecule.action-menu-item.default-state">
        <ActionMenuItem icon={<Icon name="edit" mono size={16} />} shortcut="E" onClick={noop}>Bearbeiten</ActionMenuItem>
      </div>
      <div data-ui="molecule.action-menu-item.disabled">
        <ActionMenuItem icon={<Icon name="copy" mono size={16} />} disabled onClick={noop}>Gesperrt</ActionMenuItem>
      </div>
      <div data-ui="molecule.action-menu-item.danger">
        <ActionMenuItem icon={<Icon name="delete" role="danger" size={16} />} danger shortcut={['⌫']} onClick={noop}>Löschen</ActionMenuItem>
      </div>
    </div>
  ),
}

// Variant_Composition = Slot-Belegung: nur Label, +Icon, +Shortcut (Kombo), Icon+Shortcut.
export const Variant_Composition = {
  render: () => (
    <div data-ui="molecule.action-menu-item.composition" role="menu" className="w-56 rounded-lg border border-[var(--surface1)] p-1 flex flex-col">
      <div data-ui="molecule.action-menu-item.label-only"><ActionMenuItem onClick={noop}>Nur Label</ActionMenuItem></div>
      <div data-ui="molecule.action-menu-item.icon-only"><ActionMenuItem icon={<Icon name="copy" mono size={16} />} label="Kopieren" onClick={noop} /></div>
      <div data-ui="molecule.action-menu-item.with-icon"><ActionMenuItem icon={<Icon name="edit" mono size={16} />} onClick={noop}>Mit Icon</ActionMenuItem></div>
      <div data-ui="molecule.action-menu-item.with-shortcut"><ActionMenuItem shortcut={['⌘', 'C']} onClick={noop}>Kombo-Shortcut</ActionMenuItem></div>
      <div data-ui="molecule.action-menu-item.icon-shortcut"><ActionMenuItem icon={<Icon name="copy" mono size={16} />} shortcut="C" onClick={noop}>Icon + Shortcut</ActionMenuItem></div>
    </div>
  ),
}
