/**
 * GF-285 / LP-07 — Columns (PO D01, Review sprint-01). Explizite, asymmetrische
 * Spalten-Ratios (z.B. 2fr 1fr) — die Lücke zwischen Grid (auto-fit, symmetrisch)
 * und Sidebar (genau 2, fix+fluid). Reflow-Vertrag in Columns.mdx (D10-G).
 * data-ui je Wrapper + Sample-Tile. 0 inline-style/Hex.
 */
import Columns from './Columns.jsx'

const Tile = ({ id, children }) => (
  <div data-ui={id} className="rounded bg-[var(--surface1)] p-[var(--space-4)] text-xs text-[var(--subtext0)]">{children}</div>
)

const RATIOS = ['1-1', '2-1', '1-2', '1-1-1', '3-1']

const meta = {
  title: '01 FOUNDATIONS/Primitives/Columns',
  component: Columns,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    cols: { control: 'select', options: ['1-1', '1-1-1', '1-1-1-1', '2-1', '1-2', '3-1', '1-3'], description: 'Spalten-Ratio (fr).' },
    gap: { control: 'inline-radio', options: ['none', 'xs', 'sm', 'md', 'lg'] },
  },
  args: { cols: '2-1', gap: 'md' },
}
export default meta

export const Default = {
  render: (args) => (
    <Columns {...args} data-ui="layout.columns.default">
      <Tile id="layout.columns.main">Content (2fr)</Tile>
      <Tile id="layout.columns.aside">Aside (1fr)</Tile>
    </Columns>
  ),
}

// Ratios = die explizite fr-Achse (Review T04: 2fr 1fr etc.).
export const Ratios = {
  render: () => (
    <div data-ui="layout.columns.ratios" className="flex flex-col gap-[var(--space-4)]">
      {RATIOS.map((r) => (
        <Columns key={r} cols={r} data-ui={`layout.columns.ratio-${r}`}>
          {r.split('-').map((part, i) => (
            <Tile key={i} id={`layout.columns.ratio-${r}.c${i}`}>{part}fr</Tile>
          ))}
        </Columns>
      ))}
    </div>
  ),
}

// Gaps inkl. `none` (gap-0) — vollständige Token-Skala analog Stack.Gaps (GF-356).
export const Gaps = {
  render: () => (
    <div data-ui="layout.columns.gaps" className="flex flex-col gap-[var(--space-6)]">
      {['none', 'xs', 'sm', 'md', 'lg'].map((g) => (
        <div key={g} data-ui={`layout.columns.gap-${g}`}>
          <Columns gap={g} cols="1-1">
            <Tile id={`layout.columns.gap-${g}.a`}>gap {g} / A</Tile>
            <Tile id={`layout.columns.gap-${g}.b`}>gap {g} / B</Tile>
          </Columns>
        </div>
      ))}
    </div>
  ),
}
