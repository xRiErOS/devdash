/**
 * Skeleton (03.20 Display) — Basis-Atom (NEU). Lade-Platzhalter (animate-pulse,
 * bg --surface1, rounded, aria-hidden). Muster = Badge/Pill. Achsen:
 * Default (args-Baseline) + Variants (line/block/circle). tags status:stable.
 */
import Skeleton from '../../../components/ui/atoms/Skeleton.jsx'

const VARIANTS = ['line', 'block', 'circle']

const meta = {
  title: '03 ATOMS/03.20 Display/Skeleton',
  component: Skeleton,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    variant: { control: 'inline-radio', options: VARIANTS, description: 'Form-Achse (line/block/circle).' },
    width: { control: 'text', description: 'CSS-Breite (z.B. 50%, 3rem) → w-[…].' },
    height: { control: 'text', description: 'CSS-Höhe (z.B. 2rem) → h-[…].' },
  },
  args: { variant: 'line', width: '12rem' },
}
export default meta

export const Default = {
  render: (args) => (
    <div data-ui="atom.skeleton.default"><Skeleton {...args} /></div>
  ),
}

export const Variants = {
  render: () => (
    <div data-ui="atom.skeleton.variants" className="flex flex-col gap-3">
      <Skeleton variant="line" width="14rem" data-ui="atom.skeleton.line" />
      <Skeleton variant="block" width="14rem" data-ui="atom.skeleton.block" />
      <Skeleton variant="circle" data-ui="atom.skeleton.circle" />
    </div>
  ),
}
