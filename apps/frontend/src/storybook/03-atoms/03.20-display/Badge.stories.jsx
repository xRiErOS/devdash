/**
 * Badge (03.20 Display) — Basis-Atom (D-pill-badge-taxonomy). Farbcodierter
 * Label-Chip auf der direkten Catppuccin-Tone-Achse. StatusBadge = Variante
 * (status→tone+label, eigene Story). Muster = Pill. tags status:stable (neu).
 */
import Badge from '../../../components/ui/atoms/Badge.jsx'

const TONES = ['yellow', 'blue', 'lavender', 'peach', 'mauve', 'green', 'red', 'teal', 'sapphire', 'neutral']

const meta = {
  title: '03 ATOMS/03.20 Display/Badge',
  component: Badge,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    tone: { control: 'select', options: TONES, description: 'Direkte Palette-Tone (Status-Codierung).' },
    appearance: { control: 'inline-radio', options: ['solid', 'tint'], description: 'V2-Terminal-Schalter (GF-337): tint = getönt + Rand + scharfe Kante.' },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    children: { control: 'text' },
  },
  args: { tone: 'neutral', appearance: 'solid', size: 'md', children: 'Label' },
}
export default meta

export const Default = {
  render: (args) => (
    <div data-ui="atom.badge.default"><Badge {...args} /></div>
  ),
}

// Variants = Treatment-Achse: solid (Chip, Default) vs. tint (V2-Terminal, GF-337 —
// getönt + Rand + scharfe Kante, analog Button appearance=tint). Drift-Prävention (T07).
export const Variants = {
  render: () => (
    <div data-ui="atom.badge.variants" className="flex flex-col gap-3">
      <div data-ui="atom.badge.variants-solid" className="flex flex-wrap gap-2">
        {TONES.map((t) => (
          <Badge key={t} tone={t} appearance="solid" data-ui={`atom.badge.solid-${t}`}>{t}</Badge>
        ))}
      </div>
      <div data-ui="atom.badge.variants-tint" className="flex flex-wrap gap-2">
        {TONES.map((t) => (
          <Badge key={t} tone={t} appearance="tint" data-ui={`atom.badge.tint-${t}`}>{t}</Badge>
        ))}
      </div>
    </div>
  ),
}

// Appearance = Tone-Achse (kanonischer Achsen-Name).
export const Appearance = {
  render: () => (
    <div data-ui="atom.badge.appearance" className="flex flex-wrap gap-2">
      {TONES.map((t) => (
        <Badge key={t} tone={t} data-ui={`atom.badge.appearance-${t}`}>{t}</Badge>
      ))}
    </div>
  ),
}

export const Sizes = {
  render: () => (
    <div data-ui="atom.badge.sizes" className="flex items-center gap-2">
      {['sm', 'md'].map((s) => (
        <Badge key={s} size={s} tone="teal" data-ui={`atom.badge.size-${s}`}>{s}</Badge>
      ))}
    </div>
  ),
}
