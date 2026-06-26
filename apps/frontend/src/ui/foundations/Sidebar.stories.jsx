/**
 * GF-226 / LP-05 — Sidebar (Every Layout). Schmale fixe Spalte neben flexiblem
 * Inhalt; bricht via flex-wrap um, wenn der Platz fehlt. Reflow-Vertrag in
 * Sidebar.mdx (D10-G). HINWEIS: die kanonische Sidebar nutzt aktuell den Viewport-
 * `lg:`-Collapse (DD-516), kein Container-Query -> Follow-up GF-282 (I02).
 * data-ui je Wrapper + Sample-Region. 0 inline-style/Hex.
 */
import Sidebar from './Sidebar.jsx'

// Statische bg-Klassen (kein Interpolieren — Tailwind-JIT braucht den vollen Token-String).
const Side = ({ id, children }) => (
  <div data-ui={id} className="rounded bg-[var(--surface0)] p-[var(--space-4)] text-xs text-[var(--subtext0)]">{children}</div>
)
const Content = ({ id, children }) => (
  <div data-ui={id} className="rounded bg-[var(--surface1)] p-[var(--space-4)] text-xs text-[var(--subtext0)]">{children}</div>
)

const meta = {
  title: '01 FOUNDATIONS/Primitives/Sidebar',
  component: Sidebar,
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  argTypes: {
    sideWidth: { control: 'text', description: 'Breite der fixen Spalte (rem, kein px — D10-C).' },
    sideRight: { control: 'boolean', description: 'Seitenspalte rechts statt links.' },
    gap: { control: 'inline-radio', options: ['none', 'xs', 'sm', 'md', 'lg'] },
  },
  args: { sideWidth: '13.75rem', sideRight: false, gap: 'md' },
}
export default meta

export const Default = {
  render: (args) => (
    <Sidebar
      {...args}
      data-ui="layout.sidebar.default"
      side={<Side id="layout.sidebar.side">Seitenspalte</Side>}
    >
      <Content id="layout.sidebar.content">Hauptinhalt — nimmt den Restplatz, mindestens die halbe Breite.</Content>
    </Sidebar>
  ),
}

// B01-Fix (Review): args-driven — der sideRight-/gap-Control wirkt jetzt live
// (vorher hardcodet render() das Prop, Toggle war wirkungslos). Default rechts.
export const SideRight = {
  args: { sideRight: true, gap: 'md' },
  render: (args) => (
    <Sidebar
      {...args}
      data-ui="layout.sidebar.side-right"
      side={<Side id="layout.sidebar.right.side">rechts</Side>}
    >
      <Content id="layout.sidebar.right.content">Inhalt + fixe Spalte; Seite per sideRight-Control umschaltbar.</Content>
    </Sidebar>
  ),
}
