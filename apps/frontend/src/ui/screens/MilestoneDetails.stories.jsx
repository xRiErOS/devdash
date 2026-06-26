/**
 * MilestoneDetails — Detail-Screen eines Milestones über DetailLayout. `Default`
 * = Fixture, `Populated` = reicher Milestone. 0 inline-style / 0 Raw-Hex.
 */
import MilestoneDetails from './MilestoneDetails.jsx'

const RICH = {
  name: 'M3 Mobile-Track',
  description: 'Mobile-first Capture-PWA und responsive Shell.',
  target_date: '2026-09-30',
  status: 'active',
  sprints: [
    { key: 'DD#49', name: 'Capture-Sprint', status: 'active' },
    { key: 'DD#50', name: 'Mobile-Sprint', status: 'planning' },
  ],
  dod_items: [
    { id: 1, label: 'Capture-PWA offline-fähig', done: 1 },
    { id: 2, label: 'Shell responsive bis 360px', done: 0 },
    { id: 3, label: 'a11y-Audit bestanden', done: 0 },
  ],
}

const meta = {
  title: '05 SCREENS/MilestoneDetails',
  component: MilestoneDetails,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
}
export default meta

const Frame = ({ children }) => <div className="bg-[var(--base)] p-[var(--space-5)] min-h-screen">{children}</div>

export const Default = {
  render: () => <Frame><MilestoneDetails dataUiScope="screen.milestoneDetails.fixture" /></Frame>,
}

export const Populated = {
  render: () => <Frame><MilestoneDetails milestone={RICH} dataUiScope="screen.milestoneDetails.rich" /></Frame>,
}
