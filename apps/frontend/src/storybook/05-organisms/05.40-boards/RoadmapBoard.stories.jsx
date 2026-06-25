/**
 * GF-260 — RoadmapBoard (05.40 Boards, OR-13). Milestone-Spalten × SprintCards
 * (EntityItem). Reflow-Vertrag (D10-G): Grid Auto-Fit, Spalten brechen intrinsisch um
 * (kein Viewport-Breakpoint, kein @container var(), LL16). Präsentational.
 *
 * Ebene-6-Gegencheck (OR-13, 6 Caps): milestone-list/reorder/assign-sprint/
 * deferred-stats, sprint-create/reorder (_ebene6.md).
 */
import RoadmapBoard from '../../../components/ui/organisms/RoadmapBoard.jsx'

const MILESTONES = [
  { key: 'm1', name: 'M-Core · Foundation', status: 'active',
    description: 'Kern-Fundament des Frontend-Rebuilds (Atome → Organismen).',
    target: '2026-10-15', progress: { value: 1, max: 50 }, counts: '9 Sp · 1/50 Iss',
    sprints: [
      { key: 's1', name: 'DD#56 · Frontend-Rework', status: 'active', issues: [
        { key: 'DD-251', name: 'MetaCard', status: 'done' },
        { key: 'DD-252', name: 'Boards', status: 'active' },
      ] },
      { key: 's2', name: 'DD#57 · Boards', status: 'planning', issues: [
        { key: 'DD-260', name: 'RoadmapBoard', status: 'refined' },
      ] },
    ] },
  { key: 'm2', name: 'M-Auth', status: 'planning',
    description: 'Login + Authelia-Integration.', target: '2026-11-01',
    progress: { value: 0, max: 20 }, counts: '5 Sp · 0/20 Iss',
    sprints: [
      { key: 's3', name: 'DD#58 · Login', status: 'planning', issues: [] },
    ] },
  { key: 'm3', name: 'M-Search', status: 'planning', target: '2026-12-01', counts: '0 Sp · 0/0 Iss', sprints: [] },
]

const meta = {
  title: '05 ORGANISMS/05.40 Boards/RoadmapBoard',
  component: RoadmapBoard,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v1'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    columnMin: { control: 'text', description: 'Auto-Fit-Spaltenbreite = Reflow-Schwelle.' },
    expandable: { control: 'boolean', description: 'SprintCards aufklappbar → nested Child-Issues (GF-317).' },
  },
  args: {
    milestones: MILESTONES,
    columnMin: '16rem',
    expandable: true,
    defaultOpenKey: 's1',
  },
}
export default meta

// Default = minimaler No-Args/Default-Props-Zustand: Board ohne Demo-Daten
// (leere Milestone-Liste), rendert den Default-Look ohne befüllte Spalten.
export const Default = {
  render: () => (
    <div data-ui="organism.roadmap-board.default" className="p-4">
      <RoadmapBoard milestones={[]} />
    </div>
  ),
}

// Main = maßgeblicher Hauptfall = die voll befüllte Rich-Variante (Klon der Default-
// Story, GF-382 Naming): volle Milestone-Spalten mit aufklappbaren Sprint-Cards.
export const Main = {
  render: (args) => (
    <div data-ui="organism.roadmap-board.main" className="p-4">
      <RoadmapBoard {...args} />
    </div>
  ),
}

// Variant_WithDeferred: Milestone mit deferred-Zähler + sprintlose Spalte (Column-Hinweis).
export const Variant_WithDeferred = {
  render: () => (
    <div data-ui="organism.roadmap-board.with-deferred" className="p-4">
      <RoadmapBoard
        milestones={[
          { key: 'm1', name: 'M-Core', status: 'active', deferred: 2, sprints: [
            { key: 's1', name: 'DD#56', status: 'active' },
          ] },
          { key: 'm9', name: 'M-Backlog', status: 'planning', sprints: [] },
        ]}
             />
    </div>
  ),
}

// Variant_Nested: SprintCards aufklappbar — die erste Zeile offen, listet die Child-Issues
// nested (GF-317). Chevron toggelt; Header der Spalte klar als Header erkennbar (GF-316).
export const Variant_Nested = {
  render: () => (
    <div data-ui="organism.roadmap-board.nested" className="p-4">
      <RoadmapBoard milestones={MILESTONES} expandable defaultOpenKey="s1" />
    </div>
  ),
}

// State_Empty: keine Milestones → Board-Leer-Hinweis.
export const State_Empty = {
  render: () => (
    <div data-ui="organism.roadmap-board.empty" className="p-4">
      <RoadmapBoard milestones={[]} />
    </div>
  ),
}
