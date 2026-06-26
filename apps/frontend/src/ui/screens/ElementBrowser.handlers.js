/**
 * ElementBrowser MSW-Handler — fängt die echten Endpunkte ab, die
 * `useElementBrowser` ruft, und antwortet aus den eingefrorenen Fixtures
 * (`foundations/fixtures/*-list.json`). So beweist die Connected-Story den
 * vollen Roundtrip (Fetch → MSW → Adapter → Render) ohne laufendes Backend.
 *
 * Reuse: Backlog-/SprintReview-Screen adoptieren dieselben Handler später.
 */
import { http, HttpResponse } from 'msw'
import backlogList from '../foundations/fixtures/backlog-list.json'
import sprintList from '../foundations/fixtures/sprint-list.json'

/**
 * @param {{ onBulk?: (body:object)=>void }} [opts] - onBulk: Payload-Capture für play-Assertions.
 */
export function elementBrowserHandlers({ onBulk } = {}) {
  return [
    // GET /api/backlog (+ ?search= server-seitig nachgebildet)
    http.get('/api/backlog', ({ request }) => {
      const url = new URL(request.url)
      const search = (url.searchParams.get('search') || '').trim().toLowerCase()
      const rows = search
        ? backlogList.filter((b) => b.title.toLowerCase().includes(search))
        : backlogList
      return HttpResponse.json(rows)
    }),

    // GET /api/sprints (Filter-Optionen + Bulk-Ziele)
    http.get('/api/sprints', () => HttpResponse.json(sprintList)),

    // PATCH /api/backlog/bulk → { ok, failed }
    http.patch('/api/backlog/bulk', async ({ request }) => {
      const body = await request.json()
      onBulk?.(body)
      return HttpResponse.json({ ok: body.ids ?? [], failed: [] }, { status: 200 })
    }),
  ]
}
