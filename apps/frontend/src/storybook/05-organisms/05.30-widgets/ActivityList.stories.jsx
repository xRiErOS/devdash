/**
 * GF-332 — ActivityList (05.30 Widgets). Audit-Trail/Aktivitäts-Timeline einer
 * Entität (Konkretisierung §4.9): wer/wann/was geändert, mit relativer Zeit und
 * Agent-Herkunfts-Pill. Präsentational — `activity`/`loading` als Props.
 *
 * data-ui je Story-Wrapper UND je Element (PO spricht jedes 1:1 an).
 */
import ActivityList from '../../../components/ui/organisms/ActivityList.jsx'

const ACTIVITY = [
  { id: 1, action: 'create', timestamp: '2026-06-14 09:00:00', agent_id: 'claude-opus' },
  { id: 2, action: 'status_change', old_value: 'refined', new_value: 'in_progress', timestamp: '2026-06-14 10:30:00', agent_id: 'archon-runner' },
  { id: 3, action: 'sprint_assign', old_value: '·', new_value: 'DD#56', timestamp: '2026-06-15 08:00:00' },
  { id: 4, action: 'tags_update', timestamp: '2026-06-15 09:15:00', agent_id: 'bulk-import' },
  { id: 5, action: 'edit', timestamp: '2026-06-15 11:00:00', agent_id: 'claude-opus' },
]

const meta = {
  title: '05 ORGANISMS/05.30 Widgets/ActivityList',
  component: ActivityList,
  tags: ['status:stable', 'qa_behavioral:n/a', 'entity-detail', 'design_version:v1'],
  parameters: { layout: 'padded' },
}
export default meta

// Default: Default-Props-Zustand (keine Daten übergeben).
export const Default = {
  render: () => (
    <div data-ui="organism.activity-list.default" className="max-w-xl">
      <ActivityList />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — voll befüllte Audit-Timeline.
export const Main = {
  render: () => (
    <div data-ui="organism.activity-list.main" className="max-w-xl">
      <ActivityList activity={ACTIVITY} />
    </div>
  ),
}

// State_Loading: Lade-Zustand.
export const State_Loading = {
  render: () => (
    <div data-ui="organism.activity-list.loading" className="max-w-xl">
      <ActivityList loading />
    </div>
  ),
}

// State_Empty: noch keine Aktivität.
export const State_Empty = {
  render: () => (
    <div data-ui="organism.activity-list.empty" className="max-w-xl">
      <ActivityList activity={[]} />
    </div>
  ),
}
