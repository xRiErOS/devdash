/**
 * RoadmapMetaSandbox — Spielwiese für die MetaPanel-/Layout-Forks. Controls:
 * panelMode (on-select | always), selected (none | sprint | milestone), collapsed.
 * Presets als Stories. Presentational (Fixtures + Spies). 0 inline-style / 0 Raw-Hex.
 */
import { fn } from 'storybook/test'
import RoadmapMetaSandbox from './RoadmapMetaSandbox.jsx'
import milestones from '../foundations/fixtures/milestone-list.json'
import deps from '../foundations/fixtures/milestone-deps.json'
import unassignedSprints from '../foundations/fixtures/roadmap-unassigned.json'

const meta = {
  title: '05 SCREENS/RoadmapMetaSandbox',
  component: RoadmapMetaSandbox,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    panelMode: {
      control: 'inline-radio',
      options: ['on-select', 'always'],
      description: 'on-select: Panel nur bei Auswahl (Board füllt sonst, reflowt bei Auswahl). always: Panel dauerhaft rechts (Platzhalter ohne Auswahl).',
    },
    selected: {
      control: 'inline-radio',
      options: ['none', 'sprint', 'milestone'],
      description: 'Welche Entität das MetaPanel zeigt (Mockup: arg-gesteuert statt per Klick).',
    },
    collapsed: { control: 'boolean', name: 'MetaPanel eingeklappt' },
  },
  args: {
    panelMode: 'on-select', selected: 'none', collapsed: false,
    milestones, deps, unassignedSprints,
    onTransition: fn(), onOpenDetail: fn(),
  },
}
export default meta

// on-select + none → kein Panel, Board füllt die volle Breite.
export const FullWidth = {
  args: { panelMode: 'on-select', selected: 'none' },
}

// Sprint gewählt → Panel dockt rechts, Board reflowt schmaler.
export const SprintSelected = {
  args: { panelMode: 'on-select', selected: 'sprint' },
}

// Meilenstein gewählt → Panel zeigt Meilenstein-Details + Transition.
export const MilestoneSelected = {
  args: { panelMode: 'on-select', selected: 'milestone' },
}

// always + none → Panel dauerhaft rechts mit Platzhalter.
export const AlwaysPlaceholder = {
  args: { panelMode: 'always', selected: 'none' },
}

// Eingeklappt → schmale Rail, Board nutzt mehr Breite.
export const CollapsedRail = {
  args: { panelMode: 'on-select', selected: 'sprint', collapsed: true },
}
