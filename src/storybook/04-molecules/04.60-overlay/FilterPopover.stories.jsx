/**
 * FilterPopover (04.60 Overlay) — Filter-Trigger (Button) + PopoverPanel-Slot mit
 * Aktiv-Counter und beliebigem children-Filterinhalt + „Zurücksetzen"-Footer.
 * GF-2-Insel-Story (Archiv-Extraktion aus `90 Archive/Molecules/Overlays/
 * FilterPopover`, Canon-R12 move + git rm Twin). Konsolidiertes Filter-Menü des
 * getrimmten BacklogPage-SOLL (GF2-BACKLOG-SCOPE).
 *
 * PRESENTATIONAL: props-driven, kein Store/Fetch. Eigener UI-State nur für
 * open/close des Panels (Overlay-Mechanik). data-ui je Wrapper + Element.
 *
 * Gleis-2 (Interaction_Open): Trigger-Klick öffnet das Panel (Body sichtbar).
 */
import { fn, expect, within, userEvent } from 'storybook/test'
import FilterPopover from '../../../components/ui/molecules/FilterPopover.jsx'
import Checkbox from '../../../components/ui/atoms/Checkbox.jsx'

// GF-PO 2026-06-24: Filter-Inhalt in Header + Options differenziert (eigene data-ui),
// Optionen mit luftigerem Abstand (gap-2.5 statt zu eng).
function FilterBody() {
  return (
    <div data-ui="filter-demo.section" className="text-sm text-[var(--text)]">
      <div data-ui="filter-demo.header" className="text-xs font-medium text-[var(--subtext0)] mb-2">Status</div>
      <div data-ui="filter-demo.options" className="flex flex-col gap-2.5">
        <Checkbox data-ui="filter-demo.status-new" label="Neu" checked onChange={() => {}} />
        <Checkbox data-ui="filter-demo.status-refined" label="Refined" onChange={() => {}} />
      </div>
    </div>
  )
}

const meta = {
  title: '04 MOLECULES/04.60 Overlay/FilterPopover',
  component: FilterPopover,
  tags: ['status:stable', 'qa_checklist:open', 'qa_behavioral:open'],
  parameters: { layout: 'padded' },
  argTypes: {
    orientation: { control: 'inline-radio', options: ['vertical', 'horizontal'], description: 'Body-Komposition (gestapelt vs nebeneinander).' },
  },
  args: { label: 'Filter', onClear: fn(), children: <FilterBody /> },
}
export default meta

// Default: minimaler Default-Props-Zustand — kein aktiver Filter (nur Icon-Trigger),
// geschlossen → bewusst != Main (Main trägt Counter).
export const Default = {
  args: { activeCount: 0, onClear: undefined },
  render: (args) => (
    <div data-ui="molecule.filter-popover.default" className="min-h-[60px]">
      <FilterPopover {...args} />
    </div>
  ),
}

// Main: maßgeblich genutzte Gestalt — aktiver Filter-Counter (3) + Zurücksetzen,
// geschlossener Trigger (Panel ist transient → Interaction_Open zeigt offen).
export const Main = {
  args: { activeCount: 3 },
  render: (args) => (
    <div data-ui="molecule.filter-popover.main" className="min-h-[60px]">
      <FilterPopover {...args} />
    </div>
  ),
}

// Interaction_Open: Trigger-Klick öffnet das Panel → Filter-Body wird sichtbar.
export const Interaction_Open = {
  args: { activeCount: 2 },
  render: (args) => (
    <div data-ui="molecule.filter-popover.interaction-open" className="min-h-[280px]">
      <FilterPopover {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvasElement.querySelector('[data-ui="filter-popover.trigger"]')
    await userEvent.click(trigger)
    await expect(canvas.getByText('Status')).toBeInTheDocument()
  },
}
