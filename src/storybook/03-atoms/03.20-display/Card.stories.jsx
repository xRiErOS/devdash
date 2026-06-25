/**
 * GF-213/GF-208-Muster — Card (03.20 Display). Flächen-/Panel-Atom (tone-Hierarchie).
 * Wird vom Iconography-Catalog komponiert → braucht eigene GF-2-Doku.
 * Default = args-Baseline; data-ui je Variante (T01).
 */
import Card from '../../../components/ui/atoms/Card.jsx'

// GF-420: Voll-Leiter inkl. surface1/surface2 (Surface-Elevation-Canon 01.15).
// Reihenfolge = semantische Tiefe crust→…→surface2 (statische Tiefe endet bei 4).
const TONES = ['crust', 'mantle', 'base', 'surface0', 'surface1', 'surface2']
const PADDINGS = ['none', 'sm', 'md']

const meta = {
  title: '03 ATOMS/03.20 Display/Card',
  component: Card,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    tone: { control: 'select', options: TONES },
    bordered: { control: 'boolean' },
    padding: { control: 'inline-radio', options: PADDINGS },
    children: { control: 'text' },
  },
  args: { tone: 'base', bordered: true, padding: 'md', children: 'Card-Inhalt' },
}
export default meta

export const Default = {
  render: (args) => (
    <div data-ui="atom.card.default"><Card {...args} /></div>
  ),
}

// Appearance = Flächen-Tone-Achse (kanonischer Achsen-Name; Card: tone-Prop).
export const Appearance = {
  render: () => (
    <div data-ui="atom.card.appearance" className="flex flex-wrap gap-2">
      {TONES.map((t) => (
        <Card key={t} tone={t} data-ui={`atom.card.appearance-${t}`}>{t}</Card>
      ))}
    </div>
  ),
}

// Sizes = Dichte-Achse (Card: padding-Prop).
export const Sizes = {
  render: () => (
    <div data-ui="atom.card.sizes" className="flex flex-wrap items-start gap-2">
      {PADDINGS.map((p) => (
        <Card key={p} tone="surface0" padding={p} data-ui={`atom.card.size-${p}`}>padding {p}</Card>
      ))}
    </div>
  ),
}

// States = Zustand-Booleans (bordered an/aus).
export const States = {
  render: () => (
    <div data-ui="atom.card.states" className="flex flex-wrap gap-2">
      <Card tone="surface0" bordered data-ui="atom.card.state-bordered">mit Border</Card>
      <Card tone="surface0" bordered={false} data-ui="atom.card.state-borderless">ohne Border</Card>
    </div>
  ),
}
