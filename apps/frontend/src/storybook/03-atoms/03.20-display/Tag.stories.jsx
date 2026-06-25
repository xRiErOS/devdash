/**
 * GF-227 / GF-208-Muster — Tag (03.20 Display, D06). Read-only Metadaten-Marker,
 * Basis-Atom für das TagChip-Molecule (sprint-02). Achsen (kanonisch, feste
 * Reihenfolge): Default (args-Baseline) · Appearance (color-Token). data-ui je
 * Variante (PO-Ansprechbarkeit, T01). 0 inline-style/Roh-Hex.
 */
import Tag from '../../../components/ui/atoms/Tag.jsx'

const COLORS = ['neutral', 'primary', 'success', 'danger', 'warning', 'info']

const meta = {
  title: '03 ATOMS/03.20 Display/Tag',
  component: Tag,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    color: { control: 'select', options: COLORS, description: 'Farb-Token (semantischer Akzent, DD-47).' },
    children: { control: 'text', description: 'Label (ein Wert, read-only).' },
  },
  args: { color: 'neutral', children: 'frontend' },
}
export default meta

export const Default = {
  render: (args) => (
    <div data-ui="atom.tag.default"><Tag {...args} /></div>
  ),
}

// Appearance = Farb-/Akzent-Achse (kanonischer Achsen-Name; Tag: color-Prop).
export const Appearance = {
  render: () => (
    <div data-ui="atom.tag.appearance" className="flex flex-wrap gap-2">
      {COLORS.map((c) => (
        <Tag key={c} color={c} data-ui={`atom.tag.appearance-${c}`}>{c}</Tag>
      ))}
    </div>
  ),
}
