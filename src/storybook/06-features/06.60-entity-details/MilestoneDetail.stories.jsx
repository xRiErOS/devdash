/**
 * MilestoneDetails — Organism-Story (05.70). Milestone-Variante der EntityDetail V2.
 * Demo-Daten; Section-Inhalte Platzhalter (D01 deferred). DoD ist MS-exklusive Sektion.
 */
import MilestoneDetails from '../../../components/ui/organisms/MilestoneDetails.jsx'

const noop = () => {}

// B3-T1 Fixture (korrekte Shapes; Fortschritt in meta gefaltet, D-C; tags {value,label,color};
// dependencies backend-real via devd_milestone_dep_*; dod {id,label,done,details}).
const DATA = {
  id: 'M-Core',
  title: 'Foundation',
  goal: 'Kern-Fundament des Frontend-Rebuilds — Atome, Moleküle, Detail-Shell.',
  status: 'active',
  target: '2026-07-01',
  description: [{ key: 'desc', label: 'Beschreibung', value: 'Atom/Molekül/Organism-Fundus + EntityDetail-Shell als Frontend-Vertrag.' }],
  contextNotes: [{ key: 'ctx', label: 'Kontext', value: 'Storybook-first; Cutover erst bei Parität. NAS-Live unberührt.' }],
  // Fortschritt in meta gefaltet (D-C)
  meta: [['Name', 'M-Core'], ['Ziel', '2026-07-01'], ['Status', 'active'], ['Sprints', '3'], ['Done', '1 / 3'], ['DoD', '1 / 3 erfüllt']],
  transitions: [
    { key: 'completed', label: 'Abschließen', variant: 'success' },
    { key: 'cancelled', label: 'Abbrechen', variant: 'ghost' },
  ],
  sprints: [
    { key: 'DD#55', label: 'DD#55 · Shell', status: 'completed' },
    { key: 'DD#56', label: 'DD#56 · Frontend-Rework', status: 'active' },
    { key: 'DD#57', label: 'DD#57 · Boards', status: 'planning' },
  ],
  // Milestone-Deps backend-real (devd_milestone_dep_*) — {key,label?,status?}
  dependencies: {
    predecessors: [{ key: 'M-Spike', label: 'Token-Spike', status: 'completed' }],
    successors: [{ key: 'M-Polish', label: 'Polish & Cutover', status: 'planning' }],
  },
  tags: [{ value: 'foundation', label: 'foundation', color: 'blue' }, { value: 'gf-2', label: 'gf-2', color: 'mauve' }],
  tagOptions: [{ value: 'design', label: 'design', color: 'peach' }],
  activity: [
    { id: 1, action: 'status_change', new_value: 'active', timestamp: '2026-06-16T08:00:00', agent_id: 'M-Core' },
    { id: 2, action: 'sprint_added', timestamp: '2026-06-15T09:00:00', agent_id: 'DD#57' },
  ],
  dod: [
    { id: 1, label: 'Alle Sprints des Milestones abgeschlossen', done: 1, details: 'DD#55 done; DD#56/57 offen.' },
    { id: 2, label: 'Akzeptanzkriterien aller Issues erfüllt', done: 0 },
    { id: 3, label: 'Doku + Changelog aktualisiert', done: 0 },
  ],
  onNavigate: noop, onDodToggle: noop, onDodCreate: noop, onDodPatch: noop,
}

const meta = {
  title: '06 FEATURES/06.60 Entity Details/MilestoneDetail',
  component: MilestoneDetails,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v2', 'domain:milestone'],
  parameters: { layout: 'fullscreen' },
}
export default meta

export const Default = {
  render: () => <div data-ui="organism.milestone-details.default"><MilestoneDetails /></div>,
}

// Main: maßgeblicher Hauptfall (Klon der Default-Gestalt, Naming-Konvention sprint-09).
export const Main = {
  render: () => <div data-ui="organism.milestone-details.main"><MilestoneDetails data={DATA} /></div>,
}
