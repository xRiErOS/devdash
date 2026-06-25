/**
 * GF-254 — DependencyWidget (05.30 Widgets, OR-19). Vorgänger/Nachfolger-Anzeige
 * der Entity-Detail-Schicht. Präsentational: Listen + onRemove/onNavigate vom Consumer.
 *
 * Ebene-6-Gegencheck (OR-19, 6 Caps): dependency-list, dependency-graph,
 * milestone-read, milestone-dep-add/list/remove (_ebene6.md).
 */
import DependencyWidget from '../../../components/ui/organisms/DependencyWidget.jsx'

const noop = () => {}

const PRED = [
  { key: 'DD-100', label: 'API-Client Header-Injection', status: 'done' },
  { key: 'DD-101', label: 'Lifecycle-Validierung', status: 'active' },
]
const SUCC = [{ key: 'DD-200', label: 'Detail-View Verdrahtung', status: 'refined' }]

const meta = {
  title: '05 ORGANISMS/05.30 Widgets/DependencyWidget',
  component: DependencyWidget,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v2'],
  parameters: { layout: 'padded' },
  argTypes: {
    title: { control: 'text' },
    removable: { control: 'boolean' },
    itemLayout: { control: 'inline-radio', options: ['cluster', 'grid'], description: 'Item-Anordnung (GF-303): cluster=inline, grid=ausgerichtet.' },
    tone: { control: 'select', options: ['crust', 'mantle', 'base', 'surface0'] },
    bordered: { control: 'boolean' },
  },
  args: {
    title: 'Abhängigkeiten',
    predecessors: PRED,
    successors: [],
    removable: false,
    itemLayout: 'cluster',
    tone: 'base',
    bordered: false,
  },
}
export default meta

// Default: args-getrieben — nur Vorgänger; „add"-Trigger oben rechts (autodocs-Primary).
export const Default = {
  render: (args) => (
    <div data-ui="organism.dependency-widget.default" className="max-w-md">
      <DependencyWidget {...args} onNavigate={noop} onAdd={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — Vorgänger + Nachfolger gleichzeitig.
export const Main = {
  render: () => (
    <div data-ui="organism.dependency-widget.both" className="max-w-md">
      <DependencyWidget predecessors={PRED} successors={SUCC} onNavigate={noop} onAdd={noop} />
    </div>
  ),
}

// Variant_ItemsCluster: Item-Layout inline-fließend (Default-Anordnung) (GF-303).
export const Variant_ItemsCluster = {
  render: () => (
    <div data-ui="organism.dependency-widget.items-cluster" className="max-w-md">
      <DependencyWidget predecessors={PRED} successors={SUCC} itemLayout="cluster" onNavigate={noop} onAdd={noop} />
    </div>
  ),
}

// Variant_ItemsGrid: Item-Layout als ausgerichtetes 3-Spalten-Raster — gleichmäßig, clean (GF-303).
export const Variant_ItemsGrid = {
  render: () => (
    <div data-ui="organism.dependency-widget.items-grid" className="max-w-md">
      <DependencyWidget predecessors={PRED} successors={SUCC} itemLayout="grid" onNavigate={noop} onAdd={noop} />
    </div>
  ),
}

// Variant_Removable: Unlink-Trigger je Item (Owner-Kontext, nicht Public-Capture).
export const Variant_Removable = {
  render: () => (
    <div data-ui="organism.dependency-widget.removable" className="max-w-md">
      <DependencyWidget predecessors={PRED} successors={SUCC} removable onRemove={noop} onNavigate={noop} />
    </div>
  ),
}

// State_Empty: keine Abhängigkeiten → Leer-Hinweis.
export const State_Empty = {
  render: () => (
    <div data-ui="organism.dependency-widget.empty" className="max-w-md">
      <DependencyWidget predecessors={[]} successors={[]} />
    </div>
  ),
}
