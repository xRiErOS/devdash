/**
 * GF-226 / LP-04 — Switcher (Every Layout). Kippt Row<->Stack, sobald der
 * CONTAINER die Token-Schwelle (--cq-sm/md/lg, GF-228/D01) unterschreitet —
 * intrinsisch via flex-basis-calc, KEINE Viewport-Media (D10-B). Reflow-Vertrag
 * in Switcher.mdx (D10-G). Im Default-Canvas (breit) als Reihe sichtbar; die
 * Constrained-Story zeigt den Stack-Zustand. 0 inline-style/Hex.
 */
import Switcher from './Switcher.jsx'

const Tile = ({ id, children }) => (
  <div data-ui={id} className="rounded bg-[var(--surface1)] p-[var(--space-4)] text-xs text-[var(--subtext0)]">{children}</div>
)

const meta = {
  title: '01 FOUNDATIONS/Primitives/Switcher',
  component: Switcher,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    threshold: { control: 'inline-radio', options: ['sm', 'md', 'lg'], description: 'Schwelle aus --cq-* (480/768/1024).' },
    gap: { control: 'inline-radio', options: ['none', 'xs', 'sm', 'md', 'lg'] },
  },
  args: { threshold: 'sm', gap: 'sm' },
}
export default meta

export const Default = {
  render: (args) => (
    <Switcher {...args} data-ui="layout.switcher.default">
      <Tile id="layout.switcher.item-1">Bereich A</Tile>
      <Tile id="layout.switcher.item-2">Bereich B</Tile>
      <Tile id="layout.switcher.item-3">Bereich C</Tile>
    </Switcher>
  ),
}

// Constrained = Container schmaler als --cq-sm (480px) -> jeder Block volle Breite
// (Stack). Demonstriert den intrinsischen Reflow ohne Viewport-Resize.
export const Constrained = {
  render: () => (
    <div data-ui="layout.switcher.constrained" className="w-80 bg-[var(--surface0)] p-[var(--space-2)]">
      <Switcher threshold="sm" data-ui="layout.switcher.stacked">
        <Tile id="layout.switcher.stacked.a">schmaler Container</Tile>
        <Tile id="layout.switcher.stacked.b">kippt zu Stack</Tile>
        <Tile id="layout.switcher.stacked.c">unter --cq-sm</Tile>
      </Switcher>
    </div>
  ),
}
