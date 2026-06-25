/**
 * GF-208-Muster — ProgressBar (03.20 Display). Token-saubere Fortschritts-/
 * Auslastungs-Leiste (DD#61, harvested aus 5 inline-Bar-Varianten). Pures Atom:
 * Track + Fill, props-driven, kein Store, keine Domänen-Logik, keine Sub-Atome.
 * Default = args-Baseline; data-ui je Variante (PO-Ansprechbarkeit, T01).
 */
import ProgressBar from '../../../components/ui/atoms/ProgressBar.jsx'

const TONES = ['success', 'warning', 'danger', 'info', 'primary', 'neutral']
const SIZES = ['xs', 'sm', 'md', 'lg']
const TRACKS = ['surface0', 'surface1', 'surface2']

const meta = {
  title: '03 ATOMS/03.20 Display/ProgressBar',
  component: ProgressBar,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    percent: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    value: { control: 'number' },
    max: { control: 'number' },
    tone: { control: 'select', options: TONES, description: 'Fill-Farbe (ignoriert wenn capacity=true).' },
    track: { control: 'inline-radio', options: TRACKS },
    size: { control: 'inline-radio', options: SIZES },
    capacity: { control: 'boolean', description: 'Auslastungs-Modus: Farbe nach Schwelle (>=100 danger, >=80 warning, sonst success).' },
    label: { control: 'text' },
  },
  args: { percent: 60, tone: 'success', track: 'surface1', size: 'sm', capacity: false, label: 'Fortschritt' },
}
export default meta

export const Default = {
  render: (args) => (
    <div data-ui="atom.progressbar.default" className="w-64"><ProgressBar {...args} /></div>
  ),
}

// Appearance = Fill-Farb-/Tone-Achse (kanonischer Achsen-Name; ProgressBar: tone-Prop).
export const Appearance = {
  render: () => (
    <div data-ui="atom.progressbar.appearance" className="flex w-64 flex-col gap-3">
      {TONES.map((t) => (
        <ProgressBar key={t} tone={t} percent={60} label={t} data-ui={`atom.progressbar.appearance-${t}`} />
      ))}
    </div>
  ),
}

export const Sizes = {
  render: () => (
    <div data-ui="atom.progressbar.sizes" className="flex w-64 flex-col gap-3">
      {SIZES.map((s) => (
        <ProgressBar key={s} size={s} percent={60} label={s} data-ui={`atom.progressbar.size-${s}`} />
      ))}
    </div>
  ),
}

// States = Zustands-Achse: capacity-Modus (Schwellen-Farbe) vs. statischer tone.
export const States = {
  render: () => (
    <div data-ui="atom.progressbar.states" className="flex w-64 flex-col gap-3">
      <ProgressBar capacity percent={50} label="capacity 50" data-ui="atom.progressbar.capacity-low" />
      <ProgressBar capacity percent={85} label="capacity 85" data-ui="atom.progressbar.capacity-warning" />
      <ProgressBar capacity percent={100} label="capacity 100" data-ui="atom.progressbar.capacity-danger" />
    </div>
  ),
}
