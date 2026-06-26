/**
 * RoadmapBoardScreen — eigenständiger Screen: Titelzeile + Steuerzeile (inkl.
 * Panel-/Unassigned-Toggle) + RoadmapBoard mit angedocktem MetaPanel.
 * Controls: metaPanelOpen · showUnassigned · initialSelectedKind. Auswahl auch
 * per Klick (Card / Column-↗). Presentational (Props/Fixtures). 0 inline / 0 Hex.
 */
import { fn } from 'storybook/test'
import RoadmapBoardScreen from './RoadmapBoardScreen.jsx'
import milestones from '../foundations/fixtures/milestone-list.json'
import deps from '../foundations/fixtures/milestone-deps.json'
import unassignedSprints from '../foundations/fixtures/roadmap-unassigned.json'
import { roadmapHandlers } from '../foundations/fixtures/roadmap.handlers.js'

const meta = {
  title: '05 SCREENS/RoadmapBoardScreen',
  component: RoadmapBoardScreen,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    metaPanelOpen: { control: 'boolean', name: 'MetaPanel offen' },
    showUnassigned: { control: 'boolean', name: 'Unassigned-Spalte zeigen' },
    initialSelectedKind: {
      control: 'inline-radio',
      options: ['none', 'sprint', 'milestone'],
      name: 'Start-Auswahl',
      description: 'Vorab gewählte Entität fürs MetaPanel (sonst per Klick: Card / Column-↗).',
    },
  },
  args: {
    slug: 'devd2',
    milestones, deps, unassignedSprints,
    metaPanelOpen: false, showUnassigned: true, initialSelectedKind: 'none',
    onOpenSprint: fn(), onOpenMilestone: fn(), onReorder: fn(), onCardMove: fn(), onTransition: fn(),
    onCreateMilestone: fn(), onCreateSprint: fn(), onCreateIssue: fn(),
  },
}
export default meta

export const Default = {
  parameters: { msw: { handlers: roadmapHandlers } },
}

// MetaPanel offen mit vorab gewähltem Sprint → Details + Transition.
export const WithSprintPanel = {
  args: { metaPanelOpen: true, initialSelectedKind: 'sprint' },
}

// MetaPanel offen mit vorab gewähltem Meilenstein.
export const WithMilestonePanel = {
  args: { metaPanelOpen: true, initialSelectedKind: 'milestone' },
}

// Unassigned-Spalte ausgeblendet → Board ohne rechte Staging-Spalte.
export const UnassignedHidden = {
  args: { showUnassigned: false },
}

export const Empty = {
  args: { milestones: [], unassignedSprints: [], deps: [] },
}
