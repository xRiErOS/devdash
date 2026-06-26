/**
 * MilestoneColumnHeader — Kopf einer Meilenstein-Spalte. Komponiert DragHandle +
 * EntityId + Name + Ziel. Achse: Namens-/Ziel-Länge, Drag-Zustand. 0 inline / 0 Hex.
 */
import { fn } from 'storybook/test'
import MilestoneColumnHeader from './MilestoneColumnHeader.jsx'

const meta = {
  title: '03 MOLECULES/MilestoneColumnHeader',
  component: MilestoneColumnHeader,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  args: { onOpenMilestone: fn() },
  render: (args) => (
    <div data-ui="molecule.milestoneColumnHeader.story" className="w-72 p-[var(--space-3)] rounded-lg bg-[var(--layer-2)] border border-[var(--surface0)]">
      <MilestoneColumnHeader {...args} />
    </div>
  ),
}
export default meta

export const Default = {
  args: { milestone: { id: 2, name: 'ElementBrowser-Reihe', goal: 'Browser-Organismus samt Bausteinen ausliefern.' } },
}

export const LongName = {
  args: { milestone: { id: 14, name: 'Sehr langer Meilenstein-Name der auf eine Zeile gekürzt werden muss', goal: 'Ebenfalls ein deutlich zu langes Ziel, das per truncate beschnitten wird.' } },
}

export const DraggingState = {
  args: { milestone: { id: 3, name: 'Roadmap & Planung', goal: 'RoadmapBoard als Eckpfeiler.' }, grabbing: true },
}

// Wide-Mode: Ziel mehrzeilig + Detailzeile (Zieldatum · DoD · Dep-Badge).
export const Wide = {
  args: {
    wide: true,
    dependsOn: { id: 1 },
    milestone: {
      id: 2, name: 'ElementBrowser-Reihe',
      goal: 'Browser-Organismus samt Bausteinen ausliefern: Toolbar, Filter-Menü, Master-Detail und die Promote-Kette aus _mockups nach src/ui.',
      target_date: '2026-08-10', dod_total: 3,
    },
  },
}
