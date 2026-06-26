/**
 * SprintCard — Sprint als Board-Card. Achsen: variant (active|completed),
 * status, Drag-Zustand. Komponiert EntityId + StatusDot + ProgressBar +
 * DragHandle. 0 inline / 0 Hex.
 */
import { fn } from 'storybook/test'
import SprintCard from './SprintCard.jsx'

const meta = {
  title: '04 ORGANISMS/SprintCard',
  component: SprintCard,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
  args: { onOpen: fn() },
  render: (args) => (
    <div data-ui="organism.sprintCard.story" className="w-72">
      <SprintCard {...args} />
    </div>
  ),
}
export default meta

export const Active = {
  args: { sprint: { id: 104, key: 'DD2#49', name: 'Browser-Organismus + Bausteine', status: 'active', issue_done: 1, issue_total: 5 } },
}

export const Review = {
  args: { sprint: { id: 102, key: 'DD2#42', name: 'Render-Smoke-Netz', status: 'review', issue_done: 2, issue_total: 3 } },
}

export const Dragging = {
  args: { sprint: { id: 106, key: 'DD2#52', name: 'RoadmapBoard Mockup', status: 'active', issue_done: 0, issue_total: 9 }, isDragging: true },
}

export const Completed = {
  args: { variant: 'completed', sprint: { id: 103, key: 'DD2#40', name: 'Clean-Cut Baseline', status: 'done' } },
}

// Wide-Mode: Detailzeile (Issue-Count + storniert) + Chevron → Issue-Liste.
export const Wide = {
  args: {
    wide: true,
    sprint: {
      id: 104, key: 'DD2#49', name: 'Browser-Organismus + Bausteine', status: 'active',
      issue_done: 1, issue_total: 5, issue_cancelled: 3,
      issues: [
        { key: 'DD2-220', title: 'BrowserToolbar-Organismus', status: 'done' },
        { key: 'DD2-221', title: 'FilterMenu-Popover anbinden', status: 'active' },
        { key: 'DD2-222', title: 'MasterDetail-Layout', status: 'planning' },
      ],
    },
  },
}
