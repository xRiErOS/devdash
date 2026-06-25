/**
 * GF-208-Muster — Spinner (03.20 Display). Token-sauberer Lade-Indikator
 * (rotierendes lucide Loader2). Pures Atom: props-driven, kein Store, keine
 * Domänen-Logik. Default = args-Baseline; data-ui je Variante (PO-Ansprechbarkeit).
 */
import Spinner from '../../../components/ui/atoms/Spinner.jsx'

const SIZES = ['sm', 'md', 'lg']

const meta = {
  title: '03 ATOMS/03.20 Display/Spinner',
  component: Spinner,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'inline-radio', options: SIZES, description: 'Kantenlänge des Spinners.' },
    label: { control: 'text', description: 'aria-label (Screenreader-Bedeutung).' },
  },
  args: { size: 'md', label: 'Lädt' },
}
export default meta

export const Default = {
  render: (args) => (
    <div data-ui="atom.spinner.default"><Spinner {...args} /></div>
  ),
}

export const Sizes = {
  render: () => (
    <div data-ui="atom.spinner.sizes" className="flex items-center gap-4">
      {SIZES.map((s) => (
        <Spinner key={s} size={s} label={`Lädt (${s})`} data-ui={`atom.spinner.${s}`} />
      ))}
    </div>
  ),
}
