/**
 * RoadmapBoard — Spalten-Board (Meilenstein=Spalte, Sprint=Card) mit echtem
 * @dnd-kit. Achsen: Befüllung, Loading, aktiver Drag. Presentational im Mockup:
 * Daten als Props (Fixtures); MSW-Handler liegen für Phase 3 bereit. 0 inline / 0 Hex.
 *
 * Live-Drag im Storybook ausprobierbar (Default): Card am Grip in andere Spalte
 * ziehen, Spalte am Header-Grip umsortieren — M1→M2-Abhängigkeit blockt den
 * ungültigen Spalten-Drop.
 */
import { fn } from 'storybook/test'
import RoadmapBoard from './RoadmapBoard.jsx'
import RoadmapBoardConnected from './RoadmapBoardConnected.jsx'
import milestones from '../../foundations/fixtures/milestone-list.json'
import deps from '../../foundations/fixtures/milestone-deps.json'
import unassignedSprints from '../../foundations/fixtures/roadmap-unassigned.json'
import { roadmapHandlers, roadmapErrorHandlers, roadmapLoadingHandlers } from '../../foundations/fixtures/roadmap.handlers.js'

const meta = {
  title: '04 ORGANISMS/RoadmapBoard',
  component: RoadmapBoard,
  tags: ['status:review', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    snap: {
      control: 'inline-radio',
      options: ['mandatory', 'proximity', 'none'],
      description: 'Scroll-Snap der Meilenstein-Reihe: mandatory rastet immer auf eine Column-Kante, proximity nur wenn nahe, none = freies Scrollen.',
    },
  },
  args: { onOpenSprint: fn(), onOpenMilestone: fn(), onReorder: fn(), onCardMove: fn() },
  render: (args) => (
    <div data-ui="organism.roadmapBoard.story" className="bg-[var(--base)] p-[var(--space-4)] min-h-screen">
      <RoadmapBoard {...args} />
    </div>
  ),
}
export default meta

export const Default = {
  args: { milestones, deps, unassignedSprints },
  // Phase-3-Pfad dokumentiert (läuft im Render-Smoke nicht mit, presentational reicht).
  parameters: { msw: { handlers: roadmapHandlers } },
}

export const Empty = {
  args: { milestones: [], unassignedSprints: [], deps: [] },
}

// Keine Unassigned-Sprints → die gepinnte Unassigned-Spalte wird ausgeblendet,
// das Board zeigt nur die Meilenstein-Reihe (2-Spalten-Layout, rechte Zelle leer).
export const NoUnassigned = {
  args: { milestones, deps, unassignedSprints: [] },
}

// Snap-Spielwiese: 6 Meilensteine in der schmalen 3-Column-Reihe → horizontal
// scrollen und im Controls-Panel `snap` zwischen mandatory/proximity/none
// umschalten, um das Snap-Verhalten zu vergleichen.
export const SnapPlayground = {
  args: { milestones, deps, unassignedSprints, snap: "mandatory" },
}

export const Loading = {
  args: { loading: true },
}

// Wide-Mode: breite Spalten, Meilenstein-Detailblock + Sprint-Detailzeile
// (Issue-Chevron je Card). M2 trägt das Dep-Badge (nach M1).
export const Wide = {
  args: { milestones, deps, unassignedSprints, wide: true },
}

// Statischer Drag-Zustand: Spalte M1 wird gezogen, Drop-Ziel ist M3 →
// Drop-Indikator-Linie + isOver-Highlight, Quell-Spalte gedimmt.
export const DragActive = {
  args: {
    milestones,
    deps,
    unassignedSprints,
    initialActiveDrag: { type: 'col', id: 1 },
    initialOverId: 'drop:3',
  },
}

// — Connected (Phase 3): RoadmapBoardConnected fetcht echte Daten via src/lib;
//   MSW bedient die Endpunkte aus Fixtures (Roundtrip-Beweis ohne Backend). —

// Happy-Path: Wrapper lädt, Zod-validiert, rendert das Board.
export const Connected = {
  render: (args) => (
    <div data-ui="organism.roadmapBoard.story.connected" className="bg-[var(--base)] p-[var(--space-4)] min-h-screen">
      <RoadmapBoardConnected {...args} />
    </div>
  ),
  args: { onOpenSprint: fn(), onOpenMilestone: fn() },
  parameters: { msw: { handlers: roadmapHandlers } },
}

// Fehlerpfad: GET → 500 → fetchRoadmap wirft → Error-State (EmptyState variant="error" + Retry).
export const ConnectedError = {
  render: (args) => (
    <div data-ui="organism.roadmapBoard.story.connectedError" className="bg-[var(--base)] p-[var(--space-4)] min-h-screen">
      <RoadmapBoardConnected {...args} />
    </div>
  ),
  args: { onOpenSprint: fn(), onOpenMilestone: fn() },
  parameters: { msw: { handlers: roadmapErrorHandlers } },
}

// Ladezustand: verzögerte Response → Skeleton-Spalten bleiben stehen.
export const ConnectedLoading = {
  render: (args) => (
    <div data-ui="organism.roadmapBoard.story.connectedLoading" className="bg-[var(--base)] p-[var(--space-4)] min-h-screen">
      <RoadmapBoardConnected {...args} />
    </div>
  ),
  args: { onOpenSprint: fn(), onOpenMilestone: fn() },
  parameters: { msw: { handlers: roadmapLoadingHandlers } },
}
