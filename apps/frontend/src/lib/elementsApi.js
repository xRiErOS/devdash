/**
 * elementsApi — Daten-Adapter für den ElementBrowser (DD2-12, Promote T03).
 *
 * Übersetzt zwischen Backend (`apps/backend/src/api.js`) und der presentational
 * Row-Form, die `ElementRow`/`ElementList` erwarten. Eine Schicht, ein Ort für
 * URL/Query/Mapping — die Komponenten bleiben domänenfrei (props-driven).
 *
 * Projekt-Scope: Header `X-Project-Id` (Backend `currentProjectId`: Header >
 * Query `?project_id=` > Body > Default 1). Backlog/Sprints sind project-gescopt.
 *
 * Bulk-Mapping (UI-Action → Backend-Action, `PATCH /api/backlog/bulk`):
 *   status → set_status (payload.status) · sprint → set_sprint (payload.sprint_id)
 *   delete → cancel (DD-524: Soft-Delete = cancelled-Status)
 *   priority → KEIN Backend-Endpunkt (set_priority fehlt) → wirft bewusst.
 *
 * Enums (BackendContract): ISSUE_TYPES bug|feature|improvement|core ·
 * ISSUE_STATUSES new|refined|planned|in_progress|to_review|passed|rejected|done|cancelled.
 */

const projectHeaders = (projectId) =>
  projectId != null ? { 'X-Project-Id': String(projectId) } : {}

async function getJson(url, opts) {
  const res = await fetch(url, opts)
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`)
  return res.json()
}

// Compact-List-Endpunkte liefern entweder ein Array oder { items: [] } (sendList).
const asList = (data) => (Array.isArray(data) ? data : data?.items ?? [])

/**
 * GET /api/backlog — Issue-Rows des aktiven Projekts.
 * @param {{projectId?:number, search?:string, status?:string, sprint_id?:string|number, type?:string, priority?:string|number}} [opts]
 */
export async function fetchIssues({ projectId, ...filters } = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) {
    if (v != null && v !== '') qs.set(k, String(v))
  }
  const q = qs.toString()
  const data = await getJson(`/api/backlog${q ? `?${q}` : ''}`, { headers: projectHeaders(projectId) })
  return asList(data)
}

/** GET /api/sprints — Sprints des aktiven Projekts (Filter-Optionen + Bulk-Ziele). */
export async function fetchSprints({ projectId, status } = {}) {
  const qs = new URLSearchParams()
  if (status) qs.set('status', status)
  const q = qs.toString()
  const data = await getJson(`/api/sprints${q ? `?${q}` : ''}`, { headers: projectHeaders(projectId) })
  return asList(data)
}

/** GET /api/milestones — Meilensteine (eingebettete sprints[] für Nesting). */
export async function fetchMilestones({ projectId } = {}) {
  const data = await getJson('/api/milestones', { headers: projectHeaders(projectId) })
  return asList(data)
}

/** GET /api/backlog/:id — voller Issue-Datensatz (Preview-Detail). */
export async function fetchIssue({ projectId, id }) {
  return getJson(`/api/backlog/${id}`, { headers: projectHeaders(projectId) })
}

const BULK_ACTION = { status: 'set_status', sprint: 'set_sprint', delete: 'cancel' }

/**
 * PATCH /api/backlog/bulk — Massen-Operation. → { ok:number[], failed:[] }.
 * @param {{projectId?:number, ids:Array<number|string>, action:'status'|'sprint'|'delete', payload?:object}} opts
 */
export async function bulkUpdateIssues({ projectId, ids, action, payload = {} }) {
  const apiAction = BULK_ACTION[action]
  if (!apiAction) {
    // 'priority' hat (noch) keinen Backend-Bulk-Endpunkt — bewusst hart, nicht still schlucken.
    throw new Error(`bulk action '${action}' nicht unterstützt (Backend kennt set_status|set_sprint|cancel)`)
  }
  const numericIds = ids.map(Number).filter(Number.isFinite)
  return getJson('/api/backlog/bulk', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...projectHeaders(projectId) },
    body: JSON.stringify({ ids: numericIds, action: apiAction, payload }),
  })
}

// ---- Mapper: API-Row → presentational Row (kind/entityId/title/status/priority/issueType) ----

const toPriority = (p) => (p == null ? undefined : Number(p))

/** Backlog-Row → Issue-Zeile. Assignee bewusst weggelassen (kein Backlog-Feld). */
export function mapIssueRow(api) {
  return {
    id: String(api.id),
    kind: 'issue',
    issueType: api.type,
    entityId: api.key,
    title: api.title,
    status: api.status,
    priority: toPriority(api.priority),
  }
}

/** Sprint-Row → Sprint-Zeile (Key `DD#n`, Name als Titel). */
export function mapSprintRow(api) {
  return {
    id: `s${api.id}`,
    kind: 'sprint',
    entityId: api.key,
    title: api.name,
    status: api.status,
  }
}

/** Milestone-Row → Milestone-Zeile. EntityId synthetisch (`M<id>`) — kein prefix-key im Backend. */
export function mapMilestoneRow(api) {
  return {
    id: `m${api.id}`,
    kind: 'milestone',
    entityId: `M${api.id}`,
    title: api.name,
    status: api.status,
  }
}

/**
 * Baut den 3-Ebenen-Baum (Milestone > Sprint > Issue) aus den drei Listen.
 * Sprints hängen an `milestone_id`, Issues an `assigned_sprint`. Waisen-Sprints
 * (ohne Milestone) und Waisen-Issues (ohne Sprint) werden NICHT eingehängt —
 * der flache Backlog-View zeigt sie; der Baum ist die hierarchische Sicht.
 */
export function buildElementTree({ milestones = [], sprints = [], issues = [] }) {
  const issuesBySprint = new Map()
  for (const i of issues) {
    if (i.assigned_sprint == null) continue
    const arr = issuesBySprint.get(i.assigned_sprint) || []
    arr.push(mapIssueRow(i))
    issuesBySprint.set(i.assigned_sprint, arr)
  }
  const sprintsByMilestone = new Map()
  for (const s of sprints) {
    if (s.milestone_id == null) continue
    const row = { ...mapSprintRow(s), children: issuesBySprint.get(s.id) || [] }
    const arr = sprintsByMilestone.get(s.milestone_id) || []
    arr.push(row)
    sprintsByMilestone.set(s.milestone_id, arr)
  }
  return milestones.map((m) => ({
    ...mapMilestoneRow(m),
    children: sprintsByMilestone.get(m.id) || [],
  }))
}
