import { fn } from 'storybook/test'
import SopCollectionsView from '../../../components/ui/organisms/SopCollectionsView.jsx'

// Fixtures (D-E) — Live = Backend-Track T-be2 (Collections-Schema + Export/Copy).
const SOPS = [
  { key: 'issues-erfassen', title: 'Issues erfassen', collection: 'c1' },
  { key: 'issue-refinement', title: 'Issue auf refined heben', collection: 'c1' },
  { key: 'sprint-durchfuehrung', title: 'Sprint planning→review', collection: 'c2' },
  { key: 'issue-ad-hoc', title: 'Einzel-Issue im ad-hoc Sprint', collection: 'c2' },
  { key: 'neues-projekt-aufsetzen', title: 'Neues Projekt aufsetzen' },
]
const COLLECTIONS = [
  { id: 'c1', name: 'Backlog-Pflege', sopKeys: ['issues-erfassen', 'issue-refinement'] },
  { id: 'c2', name: 'Sprint-Flow', sopKeys: ['sprint-durchfuehrung', 'issue-ad-hoc'] },
  { id: 'c3', name: 'Setup (leer)', sopKeys: [] },
]

export default {
  title: '05 ORGANISMS/05.30 Widgets/SopCollectionsView',
  component: SopCollectionsView,
  tags: ['status:stable', 'domain:projects', 'design_version:v2', 'qa_behavioral:n/a', 'qa_checklist:done'],
  parameters: { layout: 'padded' },
  args: {
    onCreateSop: fn(),
    onAssignCollection: fn(),
    onExportList: fn(),
    onCopyCollection: fn(),
    onCopyLinkList: fn(),
  },
}

// Default = Root-Minimal: eine Collection mit einer SOP.
export const Default = {
  name: 'SopCollectionsView (Root-Minimal)',
  render: (a) => <div data-ui="organism.sop-collections.default"><SopCollectionsView {...a} /></div>,
  args: {
    sops: [{ key: 'issues-erfassen', title: 'Issues erfassen', collection: 'c1' }],
    collections: [{ id: 'c1', name: 'Backlog-Pflege', sopKeys: ['issues-erfassen'] }],
  },
}

// Main = realistischer Hauptfall: mehrere Collections, je SOPs, eine leere Sammlung.
export const Main = {
  name: 'SopCollectionsView (Hauptfall)',
  render: (a) => <div data-ui="organism.sop-collections.main"><SopCollectionsView {...a} /></div>,
  args: { sops: SOPS, collections: COLLECTIONS },
}

export const State_Empty = {
  name: 'SopCollectionsView (keine Collections)',
  render: (a) => <div data-ui="organism.sop-collections.state-empty"><SopCollectionsView {...a} /></div>,
  args: { sops: [], collections: [] },
}
