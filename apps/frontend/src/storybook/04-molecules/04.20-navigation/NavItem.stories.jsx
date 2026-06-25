/**
 * GF-208-Muster — NavItem (04.20 Navigation, GF-232). Molecule: Icon-Node + Label
 * + optionaler Count-Badge, gerendert als Link (href) oder Button (onClick).
 * Dumb (CONV-molecule-boundary): `active` ist ein Prop, kein Routing-State. Icon
 * kommt aus der foundations-Registry (kanonisch, A2). data-ui je Story + je
 * Element (T01).
 */
import NavItem from '../../../components/ui/molecules/NavItem.jsx'
import Icon from '../../01-foundations/01.20-iconography/Icon.jsx'

const noop = () => {}

const meta = {
  title: '04 MOLECULES/04.20 Navigation/NavItem',
  component: NavItem,
  tags: ['status:stable', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    children: { control: 'text', description: 'Label.' },
    count: { control: 'number', description: 'Optionaler Count → Badge.' },
    active: { control: 'boolean' },
    href: { control: 'text' },
    icon: { control: false },
  },
  args: {
    children: 'Roadmap',
    active: false,
    href: '#roadmap',
  },
}
export default meta

// Default: minimaler Default-Props-Zustand — nur Label, kein Icon/Count/active.
export const Default = {
  args: { children: 'Item', active: false, href: undefined, count: undefined },
  render: (args) => (
    <div data-ui="molecule.nav-item.default" className="max-w-[220px]">
      <NavItem {...args} />
    </div>
  ),
}

// Main: realistischer Hauptfall — Sidebar-Eintrag mit Icon + Label + Count, aktiv.
export const Main = {
  args: { children: 'Roadmap', active: true, href: '#roadmap', count: 12 },
  render: (args) => (
    <div data-ui="molecule.nav-item.main" className="max-w-[220px]">
      <NavItem {...args} icon={<Icon name="roadmap" mono size={16} />} />
    </div>
  ),
}

// Variant_All = Render-Modus: Link (href) vs Button (onClick). Beide mit Icon.
export const Variant_All = {
  render: () => (
    <div data-ui="molecule.nav-item.variants" className="flex flex-col gap-1 max-w-[220px]">
      <div data-ui="molecule.nav-item.as-link">
        <NavItem href="#board" icon={<Icon name="board" mono size={16} />}>Board (Link)</NavItem>
      </div>
      <div data-ui="molecule.nav-item.as-button">
        <NavItem onClick={noop} icon={<Icon name="settings" mono size={16} />}>Settings (Button)</NavItem>
      </div>
    </div>
  ),
}

// Variant_States = aktiv vs inaktiv (Link-Modus, direkter Vergleich).
export const Variant_States = {
  render: () => (
    <div data-ui="molecule.nav-item.states" className="flex flex-col gap-1 max-w-[220px]">
      <div data-ui="molecule.nav-item.active">
        <NavItem href="#home" active icon={<Icon name="home" mono size={16} />} count={3}>Aktiv</NavItem>
      </div>
      <div data-ui="molecule.nav-item.inactive">
        <NavItem href="#backlog" icon={<Icon name="backlog" mono size={16} />} count={3}>Inaktiv</NavItem>
      </div>
      <div data-ui="molecule.nav-item.disabled">
        <NavItem onClick={noop} disabled icon={<Icon name="settings" mono size={16} />}>Gesperrt</NavItem>
      </div>
    </div>
  ),
}

// Variant_IconRail = icon-only-Variante (NavRail in der Sidebar): 44px-Quadrat,
// Label nur als aria, Count als Eck-Overlay. PO-Anforderung (T01).
export const Variant_IconRail = {
  render: () => (
    <div data-ui="molecule.nav-item.icon-rail" className="flex flex-col gap-1 w-fit">
      <div data-ui="molecule.nav-item.rail-active">
        <NavItem iconOnly active href="#home" label="Home" icon={<Icon name="home" mono size={18} />} />
      </div>
      <div data-ui="molecule.nav-item.rail-inactive">
        <NavItem iconOnly href="#board" label="Board" icon={<Icon name="board" mono size={18} />} />
      </div>
      <div data-ui="molecule.nav-item.rail-count">
        <NavItem iconOnly href="#backlog" label="Backlog" count={5} icon={<Icon name="backlog" mono size={18} />} />
      </div>
    </div>
  ),
}

// Variant_Composition = Slot-Belegung: nur Label, +Icon, +Count, Icon+Count.
export const Variant_Composition = {
  render: () => (
    <div data-ui="molecule.nav-item.composition" className="flex flex-col gap-1 max-w-[220px]">
      <div data-ui="molecule.nav-item.label-only"><NavItem href="#a">Nur Label</NavItem></div>
      <div data-ui="molecule.nav-item.with-icon"><NavItem href="#b" icon={<Icon name="roadmap" mono size={16} />}>Mit Icon</NavItem></div>
      <div data-ui="molecule.nav-item.with-count"><NavItem href="#c" count={7}>Mit Count</NavItem></div>
      <div data-ui="molecule.nav-item.icon-count"><NavItem href="#d" icon={<Icon name="milestone" mono size={16} />} count={42}>Icon + Count</NavItem></div>
    </div>
  ),
}
