/**
 * GF-226 / LP-02 — Cluster (Every Layout). Horizontale Gruppe, umbrechend
 * (flex-wrap, intrinsisch). Reflow-Vertrag in Cluster.mdx (D10-G).
 * data-ui je Wrapper + Sample-Tile. 0 inline-style/Hex.
 */
import Cluster from './Cluster.jsx'

const Tile = ({ id, children }) => (
  <div data-ui={id} className="rounded bg-[var(--surface1)] px-[var(--space-3)] py-[var(--space-2)] text-xs text-[var(--subtext0)]">{children}</div>
)

const meta = {
  title: '01 FOUNDATIONS/Primitives/Cluster',
  component: Cluster,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    gap: { control: 'inline-radio', options: ['none', 'xs', 'sm', 'md', 'lg'] },
    justify: { control: 'inline-radio', options: ['start', 'center', 'between', 'end'] },
  },
  args: { gap: 'sm', justify: 'start' },
}
export default meta

export const Default = {
  render: (args) => (
    <Cluster {...args} data-ui="layout.cluster.default">
      <Tile id="layout.cluster.item-1">Filter</Tile>
      <Tile id="layout.cluster.item-2">Sortierung</Tile>
      <Tile id="layout.cluster.item-3">Aktion</Tile>
    </Cluster>
  ),
}

// Wrapping = intrinsischer Umbruch: viele Items, schmaler Container -> zweite Zeile.
export const Wrapping = {
  render: () => (
    <div data-ui="layout.cluster.wrapping" className="w-72 bg-[var(--surface0)] p-[var(--space-2)]">
      <Cluster data-ui="layout.cluster.wrap">
        {['eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben'].map((t, i) => (
          <Tile key={t} id={`layout.cluster.wrap-${i}`}>{t}</Tile>
        ))}
      </Cluster>
    </div>
  ),
}

export const Justify = {
  render: () => (
    <div data-ui="layout.cluster.justify" className="flex flex-col gap-[var(--space-4)]">
      {['start', 'center', 'between', 'end'].map((j) => (
        <Cluster key={j} justify={j} data-ui={`layout.cluster.justify-${j}`} className="bg-[var(--surface0)] p-[var(--space-2)]">
          <Tile id={`layout.cluster.justify-${j}.a`}>{j}</Tile>
          <Tile id={`layout.cluster.justify-${j}.b`}>·</Tile>
        </Cluster>
      ))}
    </div>
  ),
}
