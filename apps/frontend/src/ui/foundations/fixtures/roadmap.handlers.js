/**
 * MSW-Handler für das RoadmapBoard. Bedient die Endpunkte, die der spätere
 * Connected-Wrapper (Phase 3) ruft, aus eingefrorenen Fixtures — Roundtrip-
 * Beweis ohne Backend. Im Mockup (Phase 1+2) rendern die Stories presentational
 * (Props), diese Handler liegen für die Connected-Story / Phase 3 bereit.
 *
 * Routen (BackendContract → Milestone/Sprint):
 *   GET   /api/milestones                    → Liste mit genesteten sprints[]
 *   GET   /api/milestones/:id/dependencies   → { predecessors, successors } (Live-Shape, s.u.)
 *   GET   /api/sprints?milestone_id=none     → nicht zugeordnete Sprints
 *   PATCH /api/milestones/reorder            → 200 Echo
 *   PUT   /api/sprints/:id                   → 200 Echo
 *
 * G3 (Live-Augenschein 2026-06-26): /dependencies liefert pro Milestone ein Objekt
 * `{ predecessors:[{id,name,dependency_id}], successors:[…] }` (id = anderes Milestone,
 * dependency_id = Kanten-id). Der Handler projiziert die flachen Kanten aus
 * `milestone-deps.json` ({ id, predecessor_id, successor_id }) realitätsnah auf diese
 * Shape — so durchläuft die Connected-Story denselben Pfad wie Prod (normalizeDependencyResponse).
 */
import { http, HttpResponse, delay } from 'msw'
import milestoneList from './milestone-list.json'
import milestoneDeps from './milestone-deps.json'
import unassigned from './roadmap-unassigned.json'

const nameOf = (id) => milestoneList.find((m) => m.id === id)?.name ?? null

// Flache Kanten → { predecessors, successors } für einen Milestone (Live-Shape).
const depsForMilestone = (id) => ({
  predecessors: milestoneDeps
    .filter((e) => e.successor_id === id)
    .map((e) => ({ id: e.predecessor_id, name: nameOf(e.predecessor_id), dependency_id: e.id })),
  successors: milestoneDeps
    .filter((e) => e.predecessor_id === id)
    .map((e) => ({ id: e.successor_id, name: nameOf(e.successor_id), dependency_id: e.id })),
})

export const roadmapHandlers = [
  http.get('/api/milestones', () => HttpResponse.json(milestoneList)),

  http.get('/api/milestones/:id/dependencies', ({ params }) => HttpResponse.json(depsForMilestone(Number(params.id)))),

  http.get('/api/sprints', ({ request }) => {
    const url = new URL(request.url)
    return HttpResponse.json(url.searchParams.get('milestone_id') === 'none' ? unassigned : [])
  }),

  http.patch('/api/milestones/reorder', async ({ request }) => HttpResponse.json(await request.json())),

  http.put('/api/sprints/:id', async ({ request }) => HttpResponse.json(await request.json())),
]

// Fehlerpfad (Connected-Story `ConnectedError`): GET /api/milestones → 500.
// fetchRoadmap wirft → der Wrapper hebt den Error-State (EmptyState variant="error").
export const roadmapErrorHandlers = [
  http.get('/api/milestones', () => new HttpResponse(null, { status: 500 })),
  http.get('/api/sprints', () => new HttpResponse(null, { status: 500 })),
]

// Verzögerter Happy-Path (Connected-Story `ConnectedLoading`): hält den Skeleton
// sichtbar. Permanenter Delay (`infinity`) → der Ladezustand bleibt im Storybook stehen.
export const roadmapLoadingHandlers = [
  http.get('/api/milestones', async () => { await delay('infinite'); return HttpResponse.json(milestoneList) }),
  http.get('/api/milestones/:id/dependencies', ({ params }) => HttpResponse.json(depsForMilestone(Number(params.id)))),
  http.get('/api/sprints', async () => { await delay('infinite'); return HttpResponse.json(unassigned) }),
]
