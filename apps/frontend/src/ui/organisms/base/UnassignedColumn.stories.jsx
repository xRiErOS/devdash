/**
 * UnassignedColumn — Staging-Spalte (Sprints ohne Meilenstein). Achsen:
 * Befüllung, Drop-Highlight (isOver). Optisch abgesetzt (layer-3 + dashed).
 * 0 inline / 0 Hex.
 */
import { fn } from 'storybook/test'
import UnassignedColumn from './UnassignedColumn.jsx'

const SPRINTS = [
  { id: 108, key: 'DD2#51', name: 'Connected-Wrapper + Daten-Layer', status: 'new', issue_done: 0, issue_total: 4 },
  { id: 109, key: 'DD2#53', name: 'Dependency-Graph-Widget', status: 'new', issue_done: 0, issue_total: 2 },
]

const meta = {
  title: '04 ORGANISMS/UnassignedColumn',
  component: UnassignedColumn,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  args: { onOpenSprint: fn() },
  render: (args) => (
    <div data-ui="organism.unassignedColumn.story" className="bg-[var(--base)] p-[var(--space-4)]">
      <UnassignedColumn {...args} />
    </div>
  ),
}
export default meta

export const WithSprints = { args: { sprints: SPRINTS } }
export const Empty = { args: { sprints: [] } }
export const IsOver = { args: { sprints: SPRINTS, isOver: true } }
