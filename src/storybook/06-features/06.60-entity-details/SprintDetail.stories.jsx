/**
 * SprintDetails — Organism-Story (05.70). Sprint-Variante der EntityDetail V2 (Terminal).
 * Demo-Daten; Section-Inhalte Platzhalter (D01 deferred).
 */
import SprintDetails from '../../../components/ui/organisms/SprintDetails.jsx'

const noop = () => {}

// A3-T1 Fixture (korrekte Shapes; Fortschritt in meta gefaltet, D-C; tags {value,label,color}).
const DATA = {
  id: 'DD#62', title: 'Tastatur-Layer & Slot-Komposition',
  goal: 'EntityDetail-Slots stabil — Sprint/Milestone teilen den Frame.',
  status: 'active', capacity: '24 P',
  goalBlocks: [{ key: 'goal', label: 'Ziel', value: 'Sprint/Milestone auf den EntityDetail-Frame heben.' }],
  notes: [{ key: 'n', label: 'Notizen', value: 'Re-Home 05.70→06.60 zuerst; IssueDetails nach Fix.' }],
  // Fortschritt in meta gefaltet (D-C — kein eigener progress-Slot, wie Issue)
  meta: [['Key', 'DD#62'], ['Status', 'active'], ['Start', '2026-06-16'], ['Ende', '2026-06-27'], ['Kapazität', '24 P'], ['Issues', '6 / 9 passed'], ['Punkte', '16 / 24']],
  transitions: [
    { key: 'review', label: 'In Review', variant: 'secondary' },
    { key: 'complete', label: 'Abschließen', variant: 'success' },
  ],
  issues: [
    { key: 'DD-251', label: 'Tastatur-Navigation', status: 'to_review' },
    { key: 'DD-252', label: 'Slot-Anker Sprint', status: 'in_progress' },
  ],
  reviewMetrics: { open: 2, passed: 6, rejected: 1 },
  // EntityTags-Shape {value,label,color} (EntityTags liest t.value) — TECH-B04
  tags: [{ value: 'frontend', label: 'frontend', color: 'blue' }, { value: 'gf-2', label: 'gf-2', color: 'mauve' }],
  tagOptions: [{ value: 'backend', label: 'backend', color: 'peach' }],
  // ActivityList-Shape {id,action,timestamp,agent_id,...} — TECH-B03
  activity: [
    { id: 1, action: 'status_change', new_value: 'to_review', timestamp: '2026-06-21T08:00:00', agent_id: 'DD-251' },
    { id: 2, action: 'started', timestamp: '2026-06-20T09:00:00', agent_id: 'DD-252' },
  ],
  onNavigate: noop, onOpenReview: noop,
}

const meta = {
  title: '06 FEATURES/06.60 Entity Details/SprintDetail',
  component: SprintDetails,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v2', 'domain:sprint'],
  parameters: { layout: 'fullscreen' },
}
export default meta

export const Default = {
  render: () => <div data-ui="organism.sprint-details.default"><SprintDetails /></div>,
}

// Main: maßgeblicher Hauptfall (Klon der Default-Gestalt, Naming-Konvention sprint-09).
export const Main = {
  render: () => <div data-ui="organism.sprint-details.main"><SprintDetails data={DATA} /></div>,
}
