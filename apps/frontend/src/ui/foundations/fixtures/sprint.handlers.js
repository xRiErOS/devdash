/**
 * MSW-Handler für die Sprint-Entität.
 * Demo-Template — zeigt das Muster für alle anderen Entitäten.
 *
 * Verwendung in einer Story:
 *
 *   import { sprintHandlers } from '../foundations/fixtures/sprint.handlers.js'
 *
 *   export const Default = {
 *     parameters: { msw: { handlers: sprintHandlers } },
 *   }
 *
 * Routen-Wahrheit: BackendContract.mdx → Sprint-Abschnitt
 *   GET /api/sprints          → Liste (sprint-list.json)
 *   GET /api/sprints/:key     → Detail (sprint.json)
 */
import { http, HttpResponse } from 'msw'
import sprintList from './sprint-list.json'
import sprint from './sprint.json'

export const sprintHandlers = [
  // Liste aller Sprints (optional: query-param ?project_id filtern)
  http.get('/api/sprints', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    const result = projectId
      ? sprintList.filter((s) => String(s.project_id) === projectId)
      : sprintList
    return HttpResponse.json(result)
  }),

  // Sprint-Detail by key (z.B. "DD2#49")
  http.get('/api/sprints/:key', ({ params }) => {
    if (sprint.key === params.key) return HttpResponse.json(sprint)
    return new HttpResponse(null, { status: 404 })
  }),
]
