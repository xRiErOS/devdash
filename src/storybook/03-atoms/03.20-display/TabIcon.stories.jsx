/**
 * GF-208-Muster — TabIcon (03.20 Display). Atom: reines SVG-Icon-Dispatch nach
 * Key (overview/backlog/roadmap/todo/sstd/memory/settings). Präsentiert EINEN
 * Wert (ein Icon) → Atom (mem 414); das Icon, das die TabButton-Molecule
 * komponiert. Props-driven, kein Store/Fetch. data-ui je Achse + je Element.
 */
import TabIcon, { TAB_ICON_KEYS } from '../../../components/ui/atoms/TabIcon.jsx'

const meta = {
  title: '03 ATOMS/03.20 Display/TabIcon',
  component: TabIcon,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    name: {
      control: 'select',
      options: TAB_ICON_KEYS,
      description: 'Icon-Key — wählt das Pfad-Set.',
    },
    size: { control: 'number', description: 'Kantenlänge in px (Default 14).' },
  },
  args: { name: 'backlog', size: 14 },
}
export default meta

// Default: args-getrieben — Controls steuern name/size (autodocs-Primary).
export const Default = {
  render: (args) => (
    <div data-ui="atom.tab-icon.default" className="text-[var(--text)]">
      <TabIcon {...args} />
    </div>
  ),
}

// Variants = die 7 Icon-Keys. Atom-Anker je Key (atom.tab-icon.key-*), damit
// der PO jedes Icon 1:1 ansprechen kann.
export const Variants = {
  render: () => (
    <div data-ui="atom.tab-icon.variants" className="flex flex-wrap gap-6 text-[var(--text)]">
      {TAB_ICON_KEYS.map((k) => (
        <div key={k} data-ui={`atom.tab-icon.key-${k}`} className="flex flex-col items-center gap-1">
          <TabIcon name={k} size={20} />
          <span className="text-[10px] text-[var(--subtext0)]">{k}</span>
        </div>
      ))}
    </div>
  ),
}

// Sizes = size-Prop (px). Anker je Größe.
export const Sizes = {
  render: () => (
    <div data-ui="atom.tab-icon.sizes" className="flex items-end gap-6 text-[var(--text)]">
      {[14, 20, 28].map((s) => (
        <div key={s} data-ui={`atom.tab-icon.size-${s}`}>
          <TabIcon name="roadmap" size={s} />
        </div>
      ))}
    </div>
  ),
}
