/**
 * GF-213/GF-208-Muster — Pill (03.20 Display). Badge-Atom, token-sauber.
 * Wird vom Iconography-Catalog komponiert → braucht eigene GF-2-Doku.
 * Default = args-Baseline; data-ui je Variante (PO-Ansprechbarkeit, T01).
 */
import Pill from '../../../components/ui/atoms/Pill.jsx'

const COLORS = ['primary', 'success', 'danger', 'warning', 'info', 'neutral']
const VARIANTS = ['filled', 'outline', 'ghost']

const meta = {
  title: '03 ATOMS/03.20 Display/Pill',
  component: Pill,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    variant: { control: 'inline-radio', options: VARIANTS },
    appearance: { control: 'inline-radio', options: ['solid', 'tint'], description: 'V2-Terminal-Schalter (GF-337): tint überschreibt variant (getönt + Rand + scharfe Kante).' },
    color: { control: 'select', options: COLORS },
    size: { control: 'inline-radio', options: ['sm', 'md'] },
    children: { control: 'text' },
  },
  args: { variant: 'filled', appearance: 'solid', color: 'neutral', size: 'sm', children: 'Label' },
}
export default meta

export const Default = {
  render: (args) => (
    <div data-ui="atom.pill.default"><Pill {...args} /></div>
  ),
}

// Variants = Treatment-Achse: solid-Stile (filled/outline/ghost) + V2-Terminal `tint`
// (GF-337 — getönt + Rand + scharfe Kante, analog Button appearance=tint; überschreibt
// variant). tint = Drift-Prävention für V2-Organismen (T07).
export const Variants = {
  render: () => (
    <div data-ui="atom.pill.variants" className="flex flex-wrap gap-2">
      {VARIANTS.map((v) => (
        <Pill key={v} variant={v} color="info" data-ui={`atom.pill.${v}`}>{v}</Pill>
      ))}
      <Pill color="info" appearance="tint" data-ui="atom.pill.tint">tint</Pill>
    </div>
  ),
}

// Appearance = Farb-/Akzent-Achse (kanonischer Achsen-Name; Pill: color-Prop).
export const Appearance = {
  render: () => (
    <div data-ui="atom.pill.appearance" className="flex flex-wrap gap-2">
      {COLORS.map((c) => (
        <Pill key={c} color={c} data-ui={`atom.pill.appearance-${c}`}>{c}</Pill>
      ))}
    </div>
  ),
}

export const Sizes = {
  render: () => (
    <div data-ui="atom.pill.sizes" className="flex items-center gap-2">
      {['sm', 'md'].map((s) => (
        <Pill key={s} size={s} color="info" data-ui={`atom.pill.size-${s}`}>{s}</Pill>
      ))}
    </div>
  ),
}
