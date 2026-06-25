/**
 * GF-226 / LP-03 — Grid (Every Layout). Auto-Fit-Raster: Spaltenzahl ergibt sich
 * intrinsisch aus min-Spaltenbreite (minmax), kein Breakpoint-Gefummel. Reflow-
 * Vertrag in Grid.mdx (D10-G). data-ui je Wrapper + Sample-Tile. 0 inline-style/Hex.
 */
import Grid from '../../../components/ui/layout/Grid.jsx'

const Tile = ({ id, children }) => (
  <div data-ui={id} className="rounded bg-[var(--surface1)] p-[var(--space-4)] text-xs text-[var(--subtext0)]">{children}</div>
)

const meta = {
  title: '02 LAYOUTS/02.10 Primitives/Grid',
  component: Grid,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    min: { control: 'text', description: 'Minimale Spaltenbreite (rem, kein px — D10-C).' },
    gap: { control: 'inline-radio', options: ['none', 'xs', 'sm', 'md', 'lg'] },
  },
  args: { min: '14rem', gap: 'md' },
}
export default meta

export const Default = {
  render: (args) => (
    <Grid {...args} data-ui="layout.grid.default">
      {['Karte A', 'Karte B', 'Karte C', 'Karte D', 'Karte E', 'Karte F'].map((c, i) => (
        <Tile key={c} id={`layout.grid.card-${i}`}>{c}</Tile>
      ))}
    </Grid>
  ),
}

// Density = engere min-Spaltenbreite -> mehr Spalten im selben Container.
export const Density = {
  render: () => (
    <div data-ui="layout.grid.density" className="flex flex-col gap-[var(--space-6)]">
      {['8rem', '14rem'].map((m) => (
        <Grid key={m} min={m} data-ui={`layout.grid.min-${m}`}>
          {['1', '2', '3', '4', '5', '6'].map((c) => (
            <Tile key={c} id={`layout.grid.min-${m}.c${c}`}>min {m}</Tile>
          ))}
        </Grid>
      ))}
    </div>
  ),
}
