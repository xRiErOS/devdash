/**
 * roadmapApi — Connected-Daten-Adapter für das RoadmapBoard (Phase 3, erster
 * Connected-Wrapper im Repo). Übersetzt zwischen Backend (`apps/backend/src/api.js`)
 * und der presentational Prop-Form, die `RoadmapBoard` erwartet
 * (`{ milestones, deps, unassignedSprints }`).
 *
 * Eine Schicht, ein Ort für URL/Query/Validierung/Mapping — der Organismus bleibt
 * domänenfrei (props-driven). Die Response wird VOR dem Durchreichen gegen die
 * Zod-Read-Contracts (`@devd/api-types/milestone-sprint.contracts.js`) geprüft;
 * eine kaputte Response degradiert zu `[]` + `console.warn` statt die UI zu reißen
 * (doc-promote-loop, Fallstrick „Backend-Response lässt UI abstürzen").
 *
 * Projekt-Scope: Header `X-Project-Id` (Backend `currentProjectId`: Header > Query >
 * Body > Default 1).
 *
 * Backend-Gaps (RoadmapBoard.mdx D08, gegen Live-Backend 2026-06-26 verifiziert):
 *   G1 Milestone hat kein `goal`, nur `description` → `goal ?? description`.
 *   G2 Count-Semantik divergiert: genestet `/api/milestones` = issue_total/issue_done,
 *      flach `/api/sprints` ggf. item_count/done_count → hier auf issue_total/issue_done normalisiert.
 *   G3 `/api/milestones/:id/dependencies` liefert LIVE `{ predecessors, successors }`
 *      (Entry `{ id, name, dependency_id }`), NICHT ein flaches Kanten-Array. Wird in
 *      `normalizeDependencyResponse` aus `successors` zu `{ id, predecessor_id, successor_id }`
 *      projiziert (jede Kante genau einmal: successor von ihrem Vorgänger), dann dedupliziert.
 */
import {
  milestoneListReadContract,
  milestoneDependencyListReadContract,
  sprintListReadContract,
  sprintSetMilestoneContract,
  sprintReorderContract,
} from '@devd/api-types/milestone-sprint.contracts.js'

const projectHeaders = (projectId) =>
  projectId != null ? { 'X-Project-Id': String(projectId) } : {}

async function getJson(url, opts) {
  const res = await fetch(url, opts)
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${url}`)
  return res.json()
}

// safeParse gegen einen Listen-Contract; bei Fehler [] + Warnung (kein Throw).
function safeList(schema, raw, label) {
  const r = schema.safeParse(raw)
  if (!r.success) {
    console.warn(`[roadmapApi] ${label}: Response verworfen (Contract-Verletzung)`, r.error?.issues)
    return []
  }
  return r.data
}

const num = (v, fallback = 0) => (v == null ? fallback : Number(v))

// — Mapper (rein, unit-getestet) —

/** Genesteter/loser Sprint → Board-Sprint. G2: Counts auf issue_total/issue_done normalisiert. */
export function mapSprint(s) {
  return {
    id: s.id,
    key: s.key ?? null,
    name: s.name ?? '',
    status: s.status ?? 'new',
    milestone_id: s.milestone_id ?? null,
    position: num(s.position),
    issue_total: num(s.issue_total ?? s.item_count),
    issue_done: num(s.issue_done ?? s.done_count),
    issue_cancelled: num(s.issue_cancelled),
    issues: s.issues ?? [],
  }
}

/** Milestone → Board-Spalte. G1: goal ?? description. */
export function mapMilestone(m) {
  return {
    id: m.id,
    name: m.name ?? '',
    goal: m.goal ?? m.description ?? '',
    description: m.description ?? '',
    target_date: m.target_date ?? null,
    status: m.status ?? 'new',
    position: num(m.position),
    dod_total: num(m.dod_total),
    issue_total: num(m.issue_total),
    issue_done: num(m.issue_done),
    sprints: (m.sprints ?? []).map(mapSprint),
  }
}

/** Dependency → { id, predecessor_id, successor_id }. G3: id ?? dependency_id ?? synthetisch. */
export function mapDep(d, index = 0) {
  return {
    id: d.id ?? d.dependency_id ?? index + 1,
    predecessor_id: d.predecessor_id,
    successor_id: d.successor_id,
  }
}

/**
 * Projiziert die Live-Dependency-Response eines Milestones auf flache Kanten.
 * LIVE-Shape (verifiziert): `{ predecessors:[{id,name,dependency_id}], successors:[…] }`
 * — `successors[i].id` ist das NACHFOLGER-Milestone, `dependency_id` die Kanten-id.
 * Wir bauen NUR aus `successors` (jede Kante erscheint genau einmal als successor
 * ihres Vorgängers), die Aggregation über alle Milestones ergibt das volle Set.
 * Fällt auf flaches Array zurück (MSW-/Legacy-Fixture-Shape).
 * @param {number} milestoneId - der abgefragte (= Vorgänger-)Milestone
 * @param {unknown} resp
 * @returns {Array<{id:number|null, predecessor_id:number, successor_id:number}>}
 */
export function normalizeDependencyResponse(milestoneId, resp) {
  if (resp && (Array.isArray(resp.successors) || Array.isArray(resp.predecessors))) {
    return (resp.successors ?? []).map((e) => ({
      id: e.dependency_id ?? null,
      predecessor_id: milestoneId,
      successor_id: e.id,
    }))
  }
  if (Array.isArray(resp)) {
    // Legacy/Fixture: bereits flache Kanten { (id), predecessor_id, successor_id }.
    return resp.map((d) => ({ id: d.id ?? d.dependency_id ?? null, predecessor_id: d.predecessor_id, successor_id: d.successor_id }))
  }
  return []
}

/** Entfernt doppelte predecessor→successor-Kanten (Aggregation über mehrere Milestones). */
export function dedupeDeps(deps) {
  const seen = new Set()
  const out = []
  for (const d of deps) {
    const k = `${d.predecessor_id}->${d.successor_id}`
    if (seen.has(k)) continue
    seen.add(k)
    out.push(d)
  }
  return out
}

/**
 * Validiert + mappt die drei Roh-Responses auf die Board-Props.
 * @param {{milestones?:unknown, deps?:unknown, unassigned?:unknown}} raw
 * @returns {{milestones:Array, deps:Array, unassignedSprints:Array}}
 */
export function toBoardData({ milestones, deps, unassigned } = {}) {
  const ms = safeList(milestoneListReadContract, milestones, 'milestones').map(mapMilestone)
  const ds = dedupeDeps(safeList(milestoneDependencyListReadContract, deps, 'dependencies').map(mapDep))
  const us = safeList(sprintListReadContract, unassigned, 'unassigned-sprints')
    .map((s) => ({ ...mapSprint(s), milestone_id: null }))
  return { milestones: ms, deps: ds, unassignedSprints: us }
}

/**
 * Lädt den kompletten Roadmap-Datensatz: Milestones (mit genesteten Sprints),
 * deren Dependencies (pro Milestone aggregiert + dedupliziert) und die nicht
 * zugeordneten Sprints. Liefert die fertigen Board-Props.
 * @param {{projectId?:number}} [opts]
 */
export async function fetchRoadmap({ projectId } = {}) {
  const headers = projectHeaders(projectId)
  const [milestonesRaw, unassignedRaw] = await Promise.all([
    getJson('/api/milestones', { headers }),
    getJson('/api/sprints?milestone_id=none', { headers }),
  ])
  // Deps liegen pro Milestone (`/api/milestones/:id/dependencies`, Live-Shape
  // { predecessors, successors }) — pro Milestone auf flache Kanten projizieren,
  // über alle einsammeln; toBoardData dedupliziert.
  const ids = Array.isArray(milestonesRaw) ? milestonesRaw.map((m) => m?.id).filter((id) => id != null) : []
  const depLists = await Promise.all(
    ids.map((id) =>
      getJson(`/api/milestones/${id}/dependencies`, { headers })
        .then((resp) => normalizeDependencyResponse(id, resp))
        .catch(() => []),
    ),
  )
  const depsRaw = depLists.flat()
  return toBoardData({ milestones: milestonesRaw, deps: depsRaw, unassigned: unassignedRaw })
}

/**
 * PATCH /api/milestones/reorder — Spalten-Reihenfolge persistieren.
 * Verdrahtet den `onReorder`-Callback des Organismus.
 * @param {{ordered_ids:number[]}} payload
 * @param {{projectId?:number}} [opts]
 */
export async function reorderMilestones(payload, { projectId } = {}) {
  const body = sprintReorderContract.parse(payload) // gleiche { ordered_ids:int[] }-Form
  return getJson('/api/milestones/reorder', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...projectHeaders(projectId) },
    body: JSON.stringify(body),
  })
}

/**
 * PUT /api/sprints/:id — Sprint einem Milestone zuordnen / lösen (Card-Move).
 * Verdrahtet den `onCardMove`-Callback des Organismus.
 * @param {number} sprintId
 * @param {{milestone_id:number|null, position?:number}} move
 * @param {{projectId?:number}} [opts]
 */
export async function moveSprint(sprintId, move, { projectId } = {}) {
  // milestone_id gegen den dedizierten Contract prüfen; position lenient durchreichen.
  const { milestone_id } = sprintSetMilestoneContract.parse({ milestone_id: move.milestone_id })
  const body = { milestone_id, ...(move.position != null ? { position: move.position } : {}) }
  return getJson(`/api/sprints/${sprintId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...projectHeaders(projectId) },
    body: JSON.stringify(body),
  })
}
