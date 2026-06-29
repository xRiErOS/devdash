/**
 * MilestoneColumn — Meilenstein-Spalte. Achsen: Sprint-Befüllung, Completed-
 * Sektion, Drop-Highlight (isOver). Presentational (DnD-Props vom Container).
 * 0 inline / 0 Hex.
 */
import { fn } from 'storybook/test'
import MilestoneColumn from './MilestoneColumn.jsx'

const MILESTONE = { id: 2, name: 'ElementBrowser-Reihe', goal: 'Browser-Organismus samt Bausteinen ausliefern: Toolbar, Filter-Menü, Master-Detail und die Promote-Kette.', target_date: '2026-08-10', dod_total: 3 }
const ACTIVE = [
  { id: 104, key: 'DD2#49', name: 'Browser-Organismus + Bausteine', status: 'in_progress', issue_done: 1, issue_total: 5, issue_cancelled: 3, issues: [
    { key: 'DD2-220', title: 'BrowserToolbar-Organismus', status: 'completed' },
    { key: 'DD2-221', title: 'FilterMenu-Popover anbinden', status: 'in_progress' },
  ] },
  { id: 105, key: 'DD2#50', name: 'Promote: _mockups → src/ui', status: 'new', issue_done: 0, issue_total: 3, issues: [
    { key: 'DD2-230', title: 'ElementRow nach atoms ziehen', status: 'new' },
  ] },
]
const COMPLETED = [
  { id: 103, key: 'DD2#40', name: 'Clean-Cut Baseline', status: 'completed' },
  { id: 99, key: 'DD2#38', name: 'Spike: dnd-kit', status: 'cancelled' },
]

const meta = {
  title: '04 ORGANISMS/MilestoneColumn',
  component: MilestoneColumn,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  args: { milestone: MILESTONE, onOpenSprint: fn(), onOpenMilestone: fn() },
  render: (args) => (
    <div data-ui="organism.milestoneColumn.story" className="bg-[var(--base)] p-[var(--space-4)]">
      <MilestoneColumn {...args} />
    </div>
  ),
}
export default meta

export const WithSprints = { args: { sprints: ACTIVE } }

export const Empty = { args: { sprints: [] } }

export const WithCompleted = {
  args: { sprints: ACTIVE, completedSprints: COMPLETED, completedDefaultOpen: true },
}

export const IsOver = { args: { sprints: ACTIVE, isOver: true } }

// Wide-Mode: doppelte Breite, Meilenstein-Detailblock (Ziel mehrzeilig +
// Zieldatum + DoD + Dep-Badge), Sprint-Detailzeile + Issue-Chevron.
export const Wide = {
  args: { sprints: ACTIVE, completedSprints: COMPLETED, wide: true, dependsOn: { id: 1 } },
}
