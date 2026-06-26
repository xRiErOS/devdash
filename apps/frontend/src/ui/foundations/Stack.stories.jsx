/**
 * GF-226 / LP-01 — Stack (Every Layout). Vertikaler Fluss, Token-Gap. Kein
 * Reflow (immer vertikal) — siehe Reflow-Vertrag in Stack.mdx (D10-G).
 * data-ui je Wrapper + Sample-Tile (PO-Ansprechbarkeit, T01). 0 inline-style/Hex.
 */
import Stack from './Stack.jsx'

const Tile = ({ id, children }) => (
  <div data-ui={id} className="rounded bg-[var(--surface1)] p-[var(--space-3)] text-xs text-[var(--subtext0)]">{children}</div>
)

const meta = {
  title: '01 FOUNDATIONS/Primitives/Stack',
  component: Stack,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    gap: { control: 'inline-radio', options: ['none', 'xs', 'sm', 'md', 'lg'], description: 'Token-Gap (--space-*).' },
    align: { control: 'inline-radio', options: ['start', 'center', 'end', 'stretch'] },
  },
  args: { gap: 'md', align: 'stretch' },
}
export default meta

export const Default = {
  render: (args) => (
    <Stack {...args} data-ui="layout.stack.default">
      <Tile id="layout.stack.item-1">Erste Zeile</Tile>
      <Tile id="layout.stack.item-2">Zweite Zeile</Tile>
      <Tile id="layout.stack.item-3">Dritte Zeile</Tile>
    </Stack>
  ),
}

// Gaps inkl. `none` (gap-0) — vollständige Token-Skala (Review T01).
export const Gaps = {
  render: () => (
    <div data-ui="layout.stack.gaps" className="flex flex-wrap gap-[var(--space-6)]">
      {['none', 'xs', 'sm', 'md', 'lg'].map((g) => (
        <Stack key={g} gap={g} data-ui={`layout.stack.gap-${g}`}>
          <Tile id={`layout.stack.gap-${g}.a`}>gap {g}</Tile>
          <Tile id={`layout.stack.gap-${g}.b`}>·</Tile>
          <Tile id={`layout.stack.gap-${g}.c`}>·</Tile>
        </Stack>
      ))}
    </div>
  ),
}

// Alignment inkl. `end` (Review T02). Tiles content-breit (nicht stretch), damit
// die Quer-Achsen-Position start/center/end sichtbar wird; `stretch` füllt die Spalte.
export const Alignment = {
  render: () => (
    <div data-ui="layout.stack.alignment" className="flex flex-wrap gap-[var(--space-6)]">
      {['start', 'center', 'end', 'stretch'].map((a) => (
        <Stack key={a} align={a} data-ui={`layout.stack.align-${a}`} className="w-48 bg-[var(--surface0)] p-[var(--space-2)]">
          <Tile id={`layout.stack.align-${a}.label`}>align: {a}</Tile>
          <Tile id={`layout.stack.align-${a}.a`}>schmal</Tile>
          <Tile id={`layout.stack.align-${a}.b`}>etwas breiter</Tile>
        </Stack>
      ))}
    </div>
  ),
}
