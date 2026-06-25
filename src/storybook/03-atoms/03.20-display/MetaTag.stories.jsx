/**
 * MetaTag — Atom-Story (03.20 Display). Mono `key:value`-Chip (EntityDetail V2 Terminal),
 * Wert farbig nach Ton. data-ui je Variante (PO-Ansprechbarkeit, T01).
 */
import MetaTag from '../../../components/ui/atoms/MetaTag.jsx'

const TONES = ['peach', 'blue', 'mauve', 'teal', 'green', 'red', 'yellow', 'neutral']

const meta = {
  title: '03 ATOMS/03.20 Display/MetaTag',
  component: MetaTag,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    tone: { control: 'select', options: TONES },
    label: { control: 'text' },
    value: { control: 'text' },
  },
  args: { label: 'prio', value: 'hoch', tone: 'peach' },
}
export default meta

export const Default = {
  render: (args) => <div data-ui="atom.meta-tag.default"><MetaTag {...args} /></div>,
}

// Appearance = Farb-/Ton-Achse (kanonischer Achsen-Name).
export const Appearance = {
  render: () => (
    <div data-ui="atom.meta-tag.appearance" className="flex flex-wrap gap-4">
      {TONES.map((t) => (
        <MetaTag key={t} label={t} value="wert" tone={t} data-ui={`atom.meta-tag.appearance-${t}`} />
      ))}
    </div>
  ),
}

// Composition: der typische Header-Tag-Cluster (prio/status/type).
export const Composition = {
  render: () => (
    <div data-ui="atom.meta-tag.composition" className="flex flex-wrap gap-4">
      <MetaTag label="prio" value="hoch" tone="peach" data-ui="atom.meta-tag.compose-prio" />
      <MetaTag label="status" value="active" tone="blue" data-ui="atom.meta-tag.compose-status" />
      <MetaTag label="type" value="feature" tone="mauve" data-ui="atom.meta-tag.compose-type" />
    </div>
  ),
}
