/**
 * GF-208-Muster — TabButton (04.20 Navigation). Molecule (DD-694): komponiert das
 * Badge-Atom (Count) + optionales TabIcon-Atom zu einer Tab-Schaltfläche.
 * Props-driven, kein Store/Routing. Zwei Device-Varianten (Desktop/Mobile, NICHT
 * vermischt); Tablet ist KEINE eigene Variante, sondern ein Storybook-Viewport
 * (PLAN I05). data-ui je Achse + je Element (PO-Ansprechbarkeit, T01).
 */
import TabButton from '../../../components/ui/molecules/TabButton.jsx'
import TabIcon from '../../../components/ui/atoms/TabIcon.jsx'

const meta = {
  title: '04 MOLECULES/04.20 Navigation/TabButton',
  component: TabButton,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    active: { control: 'boolean', description: 'Markiert den Tab als aktiv (Unterstrich-Akzent / Farbe).' },
    count: { control: 'number', description: 'Optionaler Count — gerendert als Badge-Atom.' },
    mobile: { control: 'boolean', description: 'Vertikales Mobile-Layout (Icon über Label, 44px Touch-Target).' },
    children: { control: 'text', description: 'Label-Inhalt.' },
    icon: { control: false, description: 'Optionales Icon (TabIcon-Atom o.ä.).' },
  },
  args: {
    children: 'Backlog',
    active: false,
    mobile: false,
  },
}
export default meta

// Default: minimaler Default-Props-Zustand — nur Label, kein Icon/Count/active.
export const Default = {
  args: { children: 'Backlog', active: false, mobile: false, count: undefined, icon: undefined },
  render: (args) => (
    <div data-ui="molecule.tab-button.default">
      <TabButton {...args} />
    </div>
  ),
}

// Main: realistischer Hauptfall — aktive Tab-Schaltfläche mit Icon + Count.
export const Main = {
  args: { children: 'Backlog', active: true, mobile: false, count: 12 },
  render: (args) => (
    <div data-ui="molecule.tab-button.main">
      <TabButton {...args} icon={<TabIcon name="backlog" />} />
    </div>
  ),
}

// Variant_All = Device-Achse (Desktop vs Mobile), NICHT vermischt. Tablet =
// Viewport (Storybook-Toolbar), keine eigene Component-Variante. Je Device
// aktiv+inaktiv in einer Tablist-Reihe.
export const Variant_All = {
  render: () => (
    <div data-ui="molecule.tab-button.variants" className="flex flex-col gap-8">
      <div data-ui="molecule.tab-button.desktop" role="tablist" className="flex items-end border-b border-[var(--surface1)]">
        <TabButton data-ui="molecule.tab-button.desktop-overview" active icon={<TabIcon name="overview" />}>Übersicht</TabButton>
        <TabButton data-ui="molecule.tab-button.desktop-backlog" icon={<TabIcon name="backlog" />} count={12}>Backlog</TabButton>
        <TabButton data-ui="molecule.tab-button.desktop-roadmap" icon={<TabIcon name="roadmap" />}>Roadmap</TabButton>
      </div>
      <div data-ui="molecule.tab-button.mobile" role="tablist" className="flex items-stretch border-b border-[var(--surface1)] max-w-xs">
        <TabButton data-ui="molecule.tab-button.mobile-overview" mobile active icon={<TabIcon name="overview" size={18} />}>Übersicht</TabButton>
        <TabButton data-ui="molecule.tab-button.mobile-backlog" mobile icon={<TabIcon name="backlog" size={18} />} count={12}>Backlog</TabButton>
        <TabButton data-ui="molecule.tab-button.mobile-settings" mobile icon={<TabIcon name="settings" size={18} />}>Settings</TabButton>
      </div>
    </div>
  ),
}

// Variant_States = aktiv vs inaktiv (Desktop-Layout zum direkten Vergleich).
export const Variant_States = {
  render: () => (
    <div data-ui="molecule.tab-button.states" role="tablist" className="flex items-end border-b border-[var(--surface1)]">
      <div data-ui="molecule.tab-button.active">
        <TabButton active icon={<TabIcon name="backlog" />} count={3}>Aktiv</TabButton>
      </div>
      <div data-ui="molecule.tab-button.inactive">
        <TabButton icon={<TabIcon name="backlog" />} count={3}>Inaktiv</TabButton>
      </div>
    </div>
  ),
}

// Variant_Composition = Slot-Belegung: nur Label, Label+Icon, Label+Count, Label+Icon+Count.
export const Variant_Composition = {
  render: () => (
    <div data-ui="molecule.tab-button.composition" role="tablist" className="flex items-end border-b border-[var(--surface1)]">
      <div data-ui="molecule.tab-button.label-only"><TabButton active>Nur Label</TabButton></div>
      <div data-ui="molecule.tab-button.with-icon"><TabButton icon={<TabIcon name="roadmap" />}>Mit Icon</TabButton></div>
      <div data-ui="molecule.tab-button.with-count"><TabButton count={7}>Mit Count</TabButton></div>
      <div data-ui="molecule.tab-button.icon-count"><TabButton icon={<TabIcon name="todo" />} count={42}>Icon + Count</TabButton></div>
    </div>
  ),
}
