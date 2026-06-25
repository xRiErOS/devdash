/**
 * GF-226 / LP-06 — Center (Every Layout). Horizontal zentrierte Inhaltsspalte mit
 * fluider Max-Breite (rem), optional `intrinsic` für Cover-artige Zentrierung der
 * Kinder. Kein achsen-kippender Reflow — Reflow-Vertrag in Center.mdx (D10-G).
 * data-ui je Wrapper + Sample-Tile. 0 inline-style/Hex.
 */
import Center from '../../../components/ui/layout/Center.jsx'

const Tile = ({ id, children }) => (
  <div data-ui={id} className="rounded bg-[var(--surface1)] p-[var(--space-4)] text-xs text-[var(--subtext0)]">{children}</div>
)

const meta = {
  title: '02 LAYOUTS/02.10 Primitives/Center',
  component: Center,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    max: { control: 'inline-radio', options: ['sm', 'md', 'lg'], description: 'Max-Breite (30/40/60rem — D10-C).' },
    gutters: { control: 'inline-radio', options: ['none', 'sm', 'md', 'lg'], description: 'Horizontaler Innenabstand (--space-*).' },
    intrinsic: { control: 'boolean', description: 'Kinder zusätzlich entlang der Achse zentrieren.' },
  },
  args: { max: 'md', gutters: 'md', intrinsic: false },
}
export default meta

export const Default = {
  render: (args) => (
    <div className="bg-[var(--surface0)] py-[var(--space-6)]">
      <Center {...args} data-ui="layout.center.default">
        <Tile id="layout.center.content">Zentrierte Spalte — wächst bis zur Max-Breite, dann zentriert sie im Viewport.</Tile>
      </Center>
    </div>
  ),
}

export const Widths = {
  render: () => (
    <div className="flex flex-col gap-[var(--space-4)] bg-[var(--surface0)] py-[var(--space-4)]">
      {['sm', 'md', 'lg'].map((m) => (
        <Center key={m} max={m} data-ui={`layout.center.max-${m}`}>
          <Tile id={`layout.center.max-${m}.tile`}>max {m}</Tile>
        </Center>
      ))}
    </div>
  ),
}

export const Intrinsic = {
  render: () => (
    <div className="bg-[var(--surface0)] py-[var(--space-6)]">
      <Center intrinsic data-ui="layout.center.intrinsic">
        <Tile id="layout.center.intrinsic.a">zentrierter Block</Tile>
        <Tile id="layout.center.intrinsic.b">mittig</Tile>
      </Center>
    </div>
  ),
}
