import { fn } from 'storybook/test'
import ProjectPagesTabShell from '../../../components/ui/organisms/ProjectPagesTabShell.jsx'

const PROJECT = { id: 2, key: 'DD', title: 'DeveloperDashboard', goal: 'Sprint-/Backlog-/Review-Tool' }
const HOME = {
  project: PROJECT,
  meta: [{ label: 'Prefix', value: 'DD' }, { label: 'Offene Issues', value: 12 }],
  activeMilestone: { id: 'MS-2', title: 'M2 Roadmap Foundation', goal: 'Schema + UI', pills: [{ k: 'status', value: 'aktiv' }] },
  activeSprint: { id: 'DD#41', title: 'Review-V2', goal: 'ReviewFlow', pills: [{ k: 'status', value: 'läuft' }] },
  priorityBacklog: [{ key: 'DD-375', label: 'Capture-Host Allowlist', status: 'refined' }],
}
// S3 T2: Fixtures der drei übrigen Tabs (präsentational; Live = Backend-Track T-be1/T-be2).
const SSTD = {
  slots: [
    { key: 'architecture', label: 'Architecture', contentMd: 'Express 5 + better-sqlite3, Multi-Tenant via `project_id`.' },
    { key: 'sprint_state', label: 'Sprint State', contentMd: 'ProjectPages **S3** — Tabs verdrahtet.' },
    { key: 'roadmap', label: 'Roadmap', contentMd: '' },
  ],
  journal: ['S3 T1 SopCollectionsView committet', 'S3 T2 Tabs verdrahtet'],
}
const SESSIONNOTES = {
  notes: [
    { id: 'SN-1', title: 'TabShell-Verdrahtung', detailMd: 'Alle 4 Tabs befüllt.', sprints: ['DD#41'], issues: ['DD-375'] },
    { id: 'SN-2', title: 'SOP-Collections D-E', detailMd: 'Fünf Funktionen präsentational.' },
  ],
}
const SOPS = {
  sops: [
    { key: 'issues-erfassen', title: 'Issues erfassen' },
    { key: 'issue-refinement', title: 'Issue-Refinement' },
    { key: 'sprint-durchfuehrung', title: 'Sprint-Durchführung' },
  ],
  collections: [
    { id: 'backlog', name: 'Backlog-Pflege', sopKeys: ['issues-erfassen', 'issue-refinement'] },
    { id: 'sprint', name: 'Sprint-Flow', sopKeys: ['sprint-durchfuehrung'] },
  ],
}
const ALL_TABS = { home: HOME, sstd: SSTD, sessionnotes: SESSIONNOTES, sops: SOPS }

export default {
  title: '06 FEATURES/06.10 Projects/ProjectPagesTabShell',
  component: ProjectPagesTabShell,
  tags: ['status:stable', 'domain:projects', 'design_version:v2', 'qa_behavioral:n/a', 'qa_checklist:done'],
  parameters: { layout: 'fullscreen' },
  args: { onTabChange: fn() },
}

// Default = Root-Minimal (Checkliste §2): leerer Home-Tab (nur Projekt), kein aktiver MS/Sprint.
export const Default = { name: 'ProjectPages TabShell (Root-Minimal)', render: (a) => <div data-ui="organism.project-pages.default"><ProjectPagesTabShell {...a} /></div>, args: { project: PROJECT, home: { project: PROJECT }, activeTab: 'home' } }
// Main = realistischer Hauptfall (Home voll befüllt, alle Tabs mit Fixtures).
export const Main = { name: 'ProjectPages TabShell (Home aktiv)', render: (a) => <div data-ui="organism.project-pages.main"><ProjectPagesTabShell {...a} /></div>, args: { project: PROJECT, ...ALL_TABS, activeTab: 'home' } }
// Tab-Varianten (S3 T2): jeder befüllte Tab als eigene Ansicht.
export const Variant_SstdTab = { name: 'Variant — SSTD-Tab', render: (a) => <div data-ui="organism.project-pages.variant-sstd-tab"><ProjectPagesTabShell {...a} /></div>, args: { project: PROJECT, ...ALL_TABS, activeTab: 'sstd' } }
export const Variant_SessionNotesTab = { name: 'Variant — Session-Notes-Tab', render: (a) => <div data-ui="organism.project-pages.variant-sessionnotes-tab"><ProjectPagesTabShell {...a} /></div>, args: { project: PROJECT, ...ALL_TABS, activeTab: 'sessionnotes' } }
export const Variant_SopsTab = { name: 'Variant — SOPs-Tab', render: (a) => <div data-ui="organism.project-pages.variant-sops-tab"><ProjectPagesTabShell {...a} /></div>, args: { project: PROJECT, ...ALL_TABS, activeTab: 'sops' } }
