import { fn } from 'storybook/test'
import ProjectHome from '../../../components/ui/organisms/ProjectHome.jsx'

const PROJECT = { id: 2, key: 'DD', title: 'DeveloperDashboard', goal: 'Sprint-/Backlog-/Review-Tool', status: 'active' }
const META = [
  { label: 'Prefix', value: 'DD' },
  { label: 'Offene Issues', value: 12 },
  { label: 'Aktive Sprints', value: 1 },
  { label: 'Meilensteine', value: 7 },
  { label: 'Erinnerungen', value: 23 },
]
const ACTIVE_MS = { id: 'MS-2', title: 'M2 Roadmap Foundation', goal: 'Schema + UI für Roadmap-Boards', pills: [{ k: 'status', value: 'aktiv' }] }
const ACTIVE_SP = { id: 'DD#41', title: 'Sprint Review-V2', goal: 'ReviewFlow + Components auf main', pills: [{ k: 'status', value: 'läuft' }] }
const BACKLOG = [
  { key: 'DD-375', label: 'Capture-Host Allowlist', status: 'refined' },
  { key: 'DD-678', label: 'project_todos Routing', status: 'refined' },
]
// Single-Item (kein Multi → keine neuen intra-render data-ui-Dups in ProjectHome).
const TODOS = [{ id: 1, label: 'Capture-Host Allowlist refinen', done: false, tags: ['security'], descriptionMd: 'Allowlist **härten**.' }]

export default {
  title: '06 FEATURES/06.10 Projects/ProjectHome',
  component: ProjectHome,
  tags: ['status:stable', 'domain:projects', 'design_version:v2', 'qa_behavioral:n/a', 'qa_checklist:done'],
  parameters: { layout: 'fullscreen' },
  args: { onCopyMeta: fn(), onNavigate: fn() },
}

// Default = Root-Minimal (Checkliste §2): nur Projekt + minimale Meta, kein aktiver MS/Sprint.
export const Default = { name: 'ProjectHome (Root-Minimal)', render: (a) => <div data-ui="organism.project-home.default"><ProjectHome {...a} /></div>, args: { project: PROJECT, meta: [{ label: 'Prefix', value: 'DD' }] } }
// Main = realistischer Hauptfall (voll befüllt).
export const Main = { name: 'ProjectHome (Hauptfall)', render: (a) => <div data-ui="organism.project-home.main"><ProjectHome {...a} /></div>, args: { project: PROJECT, meta: META, activeMilestone: ACTIVE_MS, activeSprint: ACTIVE_SP, priorityBacklog: BACKLOG, todos: TODOS } }
export const State_Empty = { name: 'ProjectHome (leeres Projekt)', render: (a) => <div data-ui="organism.project-home.state-empty"><ProjectHome {...a} /></div>, args: { project: { ...PROJECT, goal: '' }, meta: [], activeMilestone: null, activeSprint: null, priorityBacklog: [] } }
