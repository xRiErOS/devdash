/**
 * MSW-Handler für das RoadmapBoard. Bedient die Endpunkte, die der spätere
 * Connected-Wrapper (Phase 3) ruft, aus eingefrorenen Fixtures — Roundtrip-
 * Beweis ohne Backend. Im Mockup (Phase 1+2) rendern die Stories presentational
 * (Props), diese Handler liegen für die Connected-Story / Phase 3 bereit.
 *
 * Routen (BackendContract → Milestone/Sprint):
 *   GET   /api/milestones                    → Liste mit genesteten sprints[]
 *   GET   /api/milestones/:id/dependencies   → { predecessor_id, successor_id }[]
 *   GET   /api/sprints?milestone_id=none     → nicht zugeordnete Sprints
 *   PATCH /api/milestones/reorder            → 200 Echo
 *   PUT   /api/sprints/:id                   → 200 Echo
 */
import { http, HttpResponse } from 'msw'
import milestoneList from './milestone-list.json'
import milestoneDeps from './milestone-deps.json'
import unassigned from './roadmap-unassigned.json'

export const roadmapHandlers = [
  http.get('/api/milestones', () => HttpResponse.json(milestoneList)),

  http.get('/api/milestones/:id/dependencies', () => HttpResponse.json(milestoneDeps)),

  http.get('/api/sprints', ({ request }) => {
    const url = new URL(request.url)
    return HttpResponse.json(url.searchParams.get('milestone_id') === 'none' ? unassigned : [])
  }),

  http.patch('/api/milestones/reorder', async ({ request }) => HttpResponse.json(await request.json())),

  http.put('/api/sprints/:id', async ({ request }) => HttpResponse.json(await request.json())),
]
