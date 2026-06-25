import { fn } from 'storybook/test'
import MemoryBrowse from '../../../components/ui/organisms/memory/MemoryBrowse.jsx'

// SOLL-Fixtures — echte project_memories-Shapes (Recherche 2026-06-21). 6 Erinnerungen über alle
// Kategorien, eine angeheftet, eine mit Supersede-Kette.
const MEMORIES = [
  {
    id: 561, category: 'architecture_decision', anchor: 'GF2-REVIEW-V2-BAND',
    summary: 'Review-V2 realisiert auf main, Band 06.80 Deps & Review, status:stable',
    content: 'Branch feat/gf2-sprint-review-v2 (17 Commits) gemergt + final verortet. Stories alle status:stable.',
    importance: 1, pinned: 1, stability: 'stable', tags: 'gf-2 review storybook',
    source_type: 'commit', source_ref: 'ceee67b', created_at: '2026-06-21 09:45', updated_at: '2026-06-21 09:45',
    relations: { supersededBy: null, supersedes: [] },
  },
  {
    id: 562, category: 'convention', anchor: 'GF2-STORYBOOK-ISLAND-CURATION',
    summary: 'Storybook-Hauptkatalog = nur kuratierte Insel src/storybook/**',
    content: 'Die 122 co-located archive-Stories bleiben raus; Voll-Katalog on-demand via npm run storybook:archive.',
    importance: 2, pinned: 0, stability: 'stable', tags: 'storybook curation',
    source_type: 'commit', source_ref: '77a1195', created_at: '2026-06-21 09:45', updated_at: '2026-06-21 09:46',
    relations: { supersededBy: null, supersedes: [] },
  },
  {
    id: 540, category: 'architecture_decision', anchor: 'ENTITYDETAIL-SLOTS',
    summary: 'EntityDetail 2:1-Accordion-Slot-Vertrag (D-C Spalten-Vertrag)',
    content: 'L=Inhalt/Listen, R=Meta/Status. Ersetzt das frühere 3x3-Grid-SOLL.',
    importance: 1, pinned: 0, stability: 'stable', tags: 'design entity-detail',
    source_type: 'manual', source_ref: null, created_at: '2026-06-20 14:00', updated_at: '2026-06-21 08:00',
    relations: { supersededBy: null, supersedes: [{ id: 410, summary: '3x3-Grid-Slot-Map (verworfen, D-A)' }] },
  },
  {
    id: 327, category: 'bug_pattern', anchor: 'GF-327',
    summary: 'GF-327 war Migration-054-Drift, kein Node-26-Problem',
    content: 'better-sqlite3 lief immer; nach Reconcile Backend-Suite grün.',
    importance: 2, pinned: 0, stability: 'volatile', tags: 'backend tooling',
    source_type: 'review', source_ref: 'D-M', created_at: '2026-06-21 07:00', updated_at: '2026-06-21 07:30',
    relations: { supersededBy: null, supersedes: [] },
  },
  {
    id: 233, category: 'external_constraint', anchor: 'NAS-DEPLOY',
    summary: 'KI deployt NIE auf NAS — Prod-Deploy exklusiv PO via Portainer',
    content: 'KI-Arbeit endet mit PR-Merge auf main; Deploy-Bedarf nur flaggen.',
    importance: 1, pinned: 1, stability: 'stable', tags: 'deploy governance',
    source_type: 'manual', source_ref: 'PO 2026-06-15', created_at: '2026-06-15 10:00', updated_at: '2026-06-15 10:00',
    relations: { supersededBy: null, supersedes: [] },
  },
  {
    id: 563, category: 'session_note', anchor: null,
    summary: 'Session 2026-06-21: Wave C + Cleanup + Review-V2-Merge',
    content: 'Lange Session, alles auf main gepusht, Gates durchgängig grün.',
    importance: 2, pinned: 0, stability: 'volatile', tags: '',
    source_type: 'manual', source_ref: null, created_at: '2026-06-21 09:46', updated_at: '2026-06-21 09:46',
    relations: { supersededBy: null, supersedes: [] },
  },
]

export default {
  title: '06 FEATURES/06.15 Memory/MemoryBrowse',
  component: MemoryBrowse,
  tags: ['status:stable', 'qa_behavioral:open', 'domain:memory', 'design_version:v2'],
  parameters: { layout: 'fullscreen' },
  args: { projectKey: 'DD', projectTitle: 'Erinnerungen — DevDashboard', onSelect: fn(), onCopySnapshot: fn() },
}

export const Default = {
  name: 'Memory-Browser (SOLL)',
  render: (args) => <div data-ui="feature.memory-browse.default"><MemoryBrowse {...args} /></div>,
  args: { memories: MEMORIES },
}

// Hauptfall (Gate gf-tier-story-names: Default + Main Pflicht) — realistisch befüllter Browser.
export const Main = {
  name: 'Memory-Browser (Hauptfall)',
  render: (args) => <div data-ui="feature.memory-browse.main"><MemoryBrowse {...args} /></div>,
  args: { memories: MEMORIES, selectedId: 540 },
}

export const State_Empty = {
  name: 'Leer (keine Erinnerungen)',
  render: (args) => <div data-ui="feature.memory-browse.state-empty"><MemoryBrowse {...args} /></div>,
  args: { memories: [] },
}
