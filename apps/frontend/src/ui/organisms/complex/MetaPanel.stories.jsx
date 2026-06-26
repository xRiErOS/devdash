/**
 * MetaPanel — rechte Metadaten-/Aktions-Spalte. Zwei Modi:
 *   - rows-Modus (generisch): MetaGrid aus `rows`.
 *   - entity-Modus (board-kontextuell): Sprint/Meilenstein-Details + Transition-Widget.
 * Achse je Modus zusätzlich: collapsed (offen ↔ Streifen). 0 inline-style / 0 Raw-Hex.
 */
import { fn } from 'storybook/test'
import MetaPanel from './MetaPanel.jsx'

const ROWS = [
  { label: 'Status', value: 'refined' },
  { label: 'Priorität', value: 'P2' },
  { label: 'Sprint', value: 'DD#49' },
  { label: 'Typ', value: 'chore' },
]

// Sample-Entitäten (Form wie milestone-list.json-Fixture).
const SPRINT_ENTITY = {
  kind: 'sprint', id: 106, key: 'DD2#52', name: 'RoadmapBoard Mockup',
  status: 'active', target_date: '2026-09-01', position: 0, issue_total: 9, issue_done: 4,
}
const MILESTONE_ENTITY = {
  kind: 'milestone', id: 2, name: 'ElementBrowser-Reihe',
  status: 'active', target_date: '2026-08-10', dod_total: 3,
  sprints: [{ id: 104 }, { id: 105 }],
}

const meta = {
  title: '04 ORGANISMS/MetaPanel',
  component: MetaPanel,
  tags: ['status:open', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
  argTypes: { collapsed: { control: 'boolean' } },
  args: { collapsed: false, onToggleCollapse: fn(), onTransition: fn(), onOpenDetail: fn() },
}
export default meta

const frame = (node) => (
  <div className="flex justify-end h-[460px] bg-[var(--base)]">{node}</div>
)

// — rows-Modus (Bestandsschutz) —
export const Open = {
  args: { rows: ROWS },
  render: (args) => frame(<MetaPanel {...args} collapsed={false} dataUiScope="organism.metaPanel.open.panel" />),
}

export const Collapsed = {
  args: { rows: ROWS },
  render: (args) => frame(<MetaPanel {...args} collapsed dataUiScope="organism.metaPanel.collapsed.panel" />),
}

// — entity-Modus: Sprint mit Fortschritt + Transition (active → review/planning/cancelled) —
export const EntitySprint = {
  args: { entity: SPRINT_ENTITY },
  render: (args) => frame(<MetaPanel {...args} dataUiScope="organism.metaPanel.sprint.panel" />),
}

// — entity-Modus: Meilenstein (active → completed/cancelled) —
export const EntityMilestone = {
  args: { entity: MILESTONE_ENTITY },
  render: (args) => frame(<MetaPanel {...args} dataUiScope="organism.metaPanel.milestone.panel" />),
}

// — entity-Modus: Endzustand (keine Folge-Status) —
export const EntityTerminal = {
  args: { entity: { ...SPRINT_ENTITY, status: 'closed', issue_done: 9 } },
  render: (args) => frame(<MetaPanel {...args} dataUiScope="organism.metaPanel.terminal.panel" />),
}

// — entity-Modus eingeklappt (Rail) —
export const EntityCollapsed = {
  args: { entity: SPRINT_ENTITY, collapsed: true },
  render: (args) => frame(<MetaPanel {...args} dataUiScope="organism.metaPanel.entityCollapsed.panel" />),
}

// — Platzhalter (rows-Modus ohne rows) → 'always'-Panel ohne Auswahl —
export const Placeholder = {
  args: { rows: [] },
  render: (args) => frame(<MetaPanel {...args} dataUiScope="organism.metaPanel.placeholder.panel" />),
}
