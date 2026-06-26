/**
 * NavigationRail — vertikale Haupt-Navigation. Achse: wide (schmal ↔ breit).
 * Komponiert IconButton (schmal) bzw. Icon + Label-Zeilen (breit). data-ui je
 * Teil. 0 inline-style / 0 Raw-Hex.
 */
import NavigationRail from './NavigationRail.jsx'

const ITEMS = [
  { key: 'home', label: 'Tool-Home' },
  { key: 'dashboard', label: 'Projekt-Home', active: true },
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'backlog', label: 'Backlog' },
  { key: 'brain', label: 'Memories' },
]
const FOOT = [
  { key: 'stats', label: 'AI-Cost' },
  { key: 'settings', label: 'Settings' },
  { key: 'delete', label: 'Trash' },
]

const meta = {
  title: '04 ORGANISMS/NavigationRail',
  component: NavigationRail,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
  argTypes: { wide: { control: 'boolean' } },
  args: { items: ITEMS, footItems: FOOT, wide: false },
}
export default meta

export const Collapsed = {
  render: (args) => (
    <div data-ui="organism.nav.collapsed" className="flex h-[420px] bg-[var(--base)]">
      <NavigationRail {...args} wide={false} dataUiScope="organism.nav.collapsed.rail" />
    </div>
  ),
}

export const Wide = {
  render: (args) => (
    <div data-ui="organism.nav.wide" className="flex h-[420px] bg-[var(--base)]">
      <NavigationRail {...args} wide dataUiScope="organism.nav.wide.rail" />
    </div>
  ),
}
