/**
 * SprintDetails — Detail-Screen eines Sprints über DetailLayout. `Default` =
 * Fixture, `Populated` = reicher Sprint. 0 inline-style / 0 Raw-Hex.
 */
import SprintDetails from './SprintDetails.jsx'

const RICH = {
  key: 'DD#49',
  name: 'Capture-Sprint',
  goal: 'Capture-PWA absichern und Render-Smoke ausbauen.',
  notes: 'Fokus auf Security-Härtung der öffentlichen Capture-Route.',
  status: 'in_progress',
  items: [
    { key: 'DD2-7', type: 'core', title: 'Capture-Host härten', status: 'in_progress' },
    { key: 'DD2-8', type: 'feature', title: 'Render-Smoke erweitern', status: 'new' },
    { key: 'DD2-9', type: 'bug', title: 'Roadmap-Reorder DnD', status: 'to_review' },
  ],
}

const meta = {
  title: '05 SCREENS/SprintDetails',
  component: SprintDetails,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
}
export default meta

const Frame = ({ children }) => <div className="bg-[var(--base)] p-[var(--space-5)] min-h-screen">{children}</div>

export const Default = {
  render: () => <Frame><SprintDetails dataUiScope="screen.sprintDetails.fixture" /></Frame>,
}

export const Populated = {
  render: () => <Frame><SprintDetails sprint={RICH} dataUiScope="screen.sprintDetails.rich" /></Frame>,
}
