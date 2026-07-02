#!/usr/bin/env node
/**
 * devd-mcp.js — MCP Server for DevDashboard
 *
 * AI agents in external project repos can call DevDash tools directly
 * without knowing CLI syntax or API routes.
 *
 * Config (ENV):
 *   DEVD_API_URL    default http://100.71.39.53:3001 (NAS Tailscale)
 *   DEVD_PROJECT_ID optional default for X-Project-Id header.
 *   DEVD_API_TOKEN  optional — DD-285 Defense-in-Depth token; sent as
 *                   X-Devd-Token header on every request when set.
 *                   If unset, every tool requires explicit project_id parameter
 *                   (except devd_project_list / devd_project_show).
 *
 * Start:  node mcp/devd-mcp.js
 * Or via: npm run mcp:devd
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { writeFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
// DD-557: Zod-Contracts als Single Source — inputSchema-Shapes leiten hieraus ab.
import {
  milestoneCreateContract,
  milestoneStatusContract,
  milestoneUpdateContract,
  milestoneDependencyContract,
  sprintSetMilestoneContract,
} from '@devd/api-types/milestone-sprint.contracts.js'
// DD-611: toleranter Key-Parser (dd-77 ≡ DD#77 ≡ dd77 ≡ 77) — geteilt mit der CLI.
import { parseRef } from '@devd/api-types/keys.js'
// DD-560: Single Source der issue-type-Enum (war 5× inline in diesem File abgetippt).
// DD-621: Bulk-Action-Enum aus demselben Contract.
import { ISSUE_TYPES, BULK_ACTIONS } from '@devd/api-types/backlog.contracts.js'
// DD-624: Tag-Farben Single Source (Contract).
import { TAG_COLORS } from '@devd/api-types/tag.contracts.js'
// DD-562: NICHT dedupliziert — die todo-status- (2×) + link-typ-Enum (1×) bleiben hier
// bewusst inline. tests/m03-s01/t10-todo-cli-mcp.js pinnt die exakte Inline-Literal-Form
// (z.enum(['spec','issue','vault','url']) / z.enum(['open','done','cancelled'])) als
// Source-Grep-Regression-Guard. Single Source der Werte ist dennoch contracts/todo.contracts.js
// (Lib importiert sie); die Werte sind 1:1 identisch.

const API_URL = process.env.DEVD_API_URL ?? 'http://100.71.39.53:3001'
const DEFAULT_PROJECT_ID = process.env.DEVD_PROJECT_ID ?? null
const DEVD_API_TOKEN = process.env.DEVD_API_TOKEN ?? null

// DD-623: Generischer Response-Cap. Tool-Ergebnisse über der Schwelle werden in eine
// lokale Datei geschrieben; der Tool-Output trägt dann nur Pointer + Kurz-Summary statt
// des Rohinhalts → schützt ALLE Tools (auch künftige, und solche ohne Compact-Pfad wie
// Volltext-Suche) generisch vor dem MCP-Token-Cap. Override per ENV.
const MCP_RESPONSE_CAP = Number(process.env.DEVD_MCP_RESPONSE_CAP || 50000)
const MCP_OVERFLOW_DIR = process.env.DEVD_MCP_OVERFLOW_DIR || join(tmpdir(), 'devd-mcp-overflow')
let _overflowSeq = 0

const PROJECT_ID_PARAM = z
  .union([z.string(), z.number().int()])
  .optional()
  .describe(
    'Project id or slug for X-Project-Id header (e.g. "7", "devd"). ' +
      'Falls back to DEVD_PROJECT_ID env if unset. Required when env is unset.',
  )

// MEM-10: project_memories categories (mirror of migration 041 CHECK).
// DD-563: BEWUSST inline gelassen (NICHT aus contracts/project-memory.contracts.js
// importiert). tests/mem10-cli-mcp/cliMcpWiring.test.js source-greppt diese Datei per
// `expect(mcp).toContain(c)` über alle Kategorie-Literale. Single Source der Werte liegt in
// der REST-Lib + im Contract; das MCP-Inline-Literal bleibt als Source-Shape-Anker erhalten
// (DD-562-Lesson: t10-Muster). DD2-19: session_note -> session_log + knowledge ergänzt.
const MEMORY_CATEGORIES = ['architecture_decision', 'dead_end', 'bug_pattern', 'convention', 'external_constraint', 'session_log', 'knowledge']

function resolveProjectId(p) {
  const v = p ?? DEFAULT_PROJECT_ID
  if (v === null || v === undefined || v === '') {
    return { error: true, message: 'project_id required (no DEVD_PROJECT_ID env default). Pass project_id parameter, or call devd_project_list to see available projects.' }
  }
  return String(v)
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function apiRequest(method, path, body = null, projectId = null) {
  const url = `${API_URL}${path}`
  const headers = {
    'Content-Type': 'application/json',
  }
  if (projectId !== null && projectId !== undefined && projectId !== '') {
    headers['X-Project-Id'] = String(projectId)
  } else if (DEFAULT_PROJECT_ID) {
    headers['X-Project-Id'] = DEFAULT_PROJECT_ID
  }
  // DD-285: Defense-in-Depth Token-Header. Backend matched gegen ENV
  // DEVD_API_TOKEN; bei No-Op-Bypass schadet der Header nicht.
  if (DEVD_API_TOKEN) {
    headers['X-Devd-Token'] = DEVD_API_TOKEN
  }
  const options = { method, headers }
  if (body !== null) {
    options.body = JSON.stringify(body)
  }

  try {
    const res = await fetch(url, options)
    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
    if (!res.ok) {
      return { error: true, status: res.status, body: data }
    }
    return data
  } catch (err) {
    return { error: true, message: err.message }
  }
}

function ok(data) {
  const text = JSON.stringify(data, null, 2)
  // DD-623: unter dem Cap → Rohinhalt; darüber → Datei-Pointer + Summary.
  if (text.length <= MCP_RESPONSE_CAP) {
    return { content: [{ type: 'text', text }] }
  }
  return { content: [{ type: 'text', text: JSON.stringify(spillToFile(data, text), null, 2) }] }
}

// Schreibt den Rohinhalt in eine Datei und baut eine token-arme Summary mit Shape-Hinweis,
// Größe, Pointer und 2k-Preview. Schlägt das Schreiben fehl, bleibt es bei Preview + Hinweis.
function spillToFile(data, text) {
  let file = null
  let writeError = null
  try {
    mkdirSync(MCP_OVERFLOW_DIR, { recursive: true })
    file = join(MCP_OVERFLOW_DIR, `resp-${Date.now()}-${_overflowSeq++}.json`)
    writeFileSync(file, text, 'utf8')
  } catch (e) {
    writeError = e.message
  }
  let shape
  if (Array.isArray(data)) {
    const keys = data.length && data[0] && typeof data[0] === 'object' ? Object.keys(data[0]) : []
    shape = `array[${data.length}]${keys.length ? ` item-keys: ${keys.join(', ')}` : ''}`
  } else if (data && typeof data === 'object') {
    shape = `object keys: ${Object.keys(data).join(', ')}`
  } else {
    shape = typeof data
  }
  return {
    _truncated: true,
    note: file
      ? `Result (${text.length} chars) exceeded the MCP response cap (${MCP_RESPONSE_CAP}). Full JSON written to the file below — Read it, or narrow the call (server-side filters, fields=compact, limit/offset).`
      : `Result (${text.length} chars) exceeded the MCP response cap (${MCP_RESPONSE_CAP}) and the overflow file could not be written (${writeError}). Showing a preview only — narrow the call.`,
    shape,
    bytes: text.length,
    file,
    preview: text.slice(0, 2000),
  }
}

// ---------------------------------------------------------------------------
// Resolve id_or_key → numeric backlog id
// Accepts numeric string ("42"), or issue key ("DD-42", "MBT-7")
// We resolve keys by fetching the backlog and searching by project_number + prefix.
// ---------------------------------------------------------------------------

async function resolveIssueId(idOrKey, projectId = null) {
  // DD-611: tolerant via parseRef — "DD-42", "dd42", "dd-42", numerisch.
  const ref = parseRef(idOrKey)
  if (!ref) return String(idOrKey) // pass through, let API fail with 404
  if (ref.id != null) return String(ref.id)
  if (!ref.prefix) return String(idOrKey) // Issue braucht Prefix

  // Fetch all items and find matching key
  const items = await apiRequest('GET', `/api/backlog`, null, projectId)
  if (!Array.isArray(items)) return String(idOrKey)

  const found = items.find(
    (i) =>
      String(i.project_number) === String(ref.number) &&
      String(i.project_prefix).toUpperCase() === ref.prefix,
  )
  return found ? String(found.id) : String(idOrKey)
}

// ---------------------------------------------------------------------------
// Resolve sprint_key → sprint id
// Accepts numeric string or sprint key like "DD#20"
// ---------------------------------------------------------------------------

async function resolveSprintId(keyOrId, projectId = null) {
  // DD-611: tolerant via parseRef — "DD#20", "DD-20", "dd-20", "dd20", "#20", numerisch.
  const ref = parseRef(keyOrId)
  if (!ref) return String(keyOrId)
  if (ref.id != null) return String(ref.id)

  const sprints = await apiRequest('GET', `/api/sprints`, null, projectId)
  if (!Array.isArray(sprints)) return String(keyOrId)

  const found = sprints.find(
    (s) =>
      String(s.project_number) === String(ref.number) &&
      (!ref.prefix || String(s.project_prefix).toUpperCase() === ref.prefix),
  )
  return found ? String(found.id) : String(keyOrId)
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: 'devd-mcp',
  version: '1.0.0',
})

// ---------------------------------------------------------------------------
// READ — Projects
// ---------------------------------------------------------------------------

server.tool(
  'devd_project_list',
  'List all projects in DevDashboard. Global — no project_id required. Compact by default (DD-622, no prose fields); fields=full for everything. Read-only.',
  {
    include_archived: z.boolean().optional().describe('Include archived projects (default false)'),
    fields: z.enum(['compact', 'full']).optional().describe('DD-622: compact (default, token-safe) or full'),
  },
  async ({ include_archived, fields }) => {
    const params = new URLSearchParams()
    if (include_archived) params.set('include_archived', '1')
    if (fields) params.set('fields', fields)
    const qs = params.toString() ? `?${params.toString()}` : ''
    const data = await apiRequest('GET', `/api/projects${qs}`)
    return ok(data)
  },
)

server.tool(
  'devd_project_show',
  'Get a single project by numeric id or slug. Read-only.',
  {
    id_or_slug: z
      .union([z.string(), z.number().int()])
      .describe('Numeric project id or slug string (e.g. "devd", "2", 2) — mirrors the project_id header\'s anyOf[string,int] shape (DD2-267)'),
  },
  async ({ id_or_slug }) => {
    const data = await apiRequest('GET', `/api/projects/${encodeURIComponent(String(id_or_slug))}`)
    return ok(data)
  },
)

// ---------------------------------------------------------------------------
// READ — Sprints
// ---------------------------------------------------------------------------

server.tool(
  'devd_sprint_list',
  'List sprints for a specific project. Server-side status + milestone filter. Each sprint has `key` field (e.g. "DD#20"). Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    status: z
      .string()
      .optional()
      .describe('Filter by status. Single (in_progress) or comma-list (in_progress,to_review). Valid: new | planned | in_progress | to_review | completed | cancelled'),
    milestone_id: z
      .union([z.coerce.number().int().positive(), z.literal('none'), z.literal('null')])
      .optional()
      .describe('DD-554: Filter by milestone. A numeric id, or "none"/"null" for sprints WITHOUT a milestone (unassigned).'),
    fields: z.enum(['compact', 'full']).optional().describe('DD-620: compact (default — identity/status fields + counts, token-safe) or full (incl. notes etc.; use devd_sprint_show for one sprint).'),
    limit: z.number().int().min(1).optional().describe('DD-622: max rows returned'),
    offset: z.number().int().min(0).optional().describe('DD-622: skip the first N rows (pagination)'),
  },
  async ({ project_id, status, milestone_id, fields, limit, offset }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (milestone_id !== undefined && milestone_id !== null) params.set('milestone_id', String(milestone_id))
    if (fields) params.set('fields', fields)
    if (limit !== undefined) params.set('limit', String(limit))
    if (offset !== undefined) params.set('offset', String(offset))
    const qs = params.toString() ? `?${params.toString()}` : ''
    const data = await apiRequest('GET', `/api/sprints${qs}`, null, pid)
    return ok(data)
  },
)

server.tool(
  'devd_sprint_context',
  'Get full sprint context bundle formatted as Markdown — all issue fields plus per-issue user-stories (incl. QA) and issue/sprint dependencies. Ideal for AI agents before starting work, no extra calls needed. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    sprint_key: z.string().describe('Sprint key (e.g. "DD#20") or numeric sprint id'),
  },
  async ({ project_id, sprint_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveSprintId(sprint_key, pid)
    const data = await apiRequest('GET', `/api/sprints/${id}/context?format=markdown`, null, pid)
    return ok(data)
  },
)

server.tool(
  'devd_sprint_rev_results',
  'Get review results for all issues in a sprint (passed/not_passed/pending). Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    sprint_key: z.string().describe('Sprint key (e.g. "DD#20") or numeric sprint id'),
  },
  async ({ project_id, sprint_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveSprintId(sprint_key, pid)
    const data = await apiRequest('GET', `/api/sprints/${id}/rev-results`, null, pid)
    return ok(data)
  },
)

// ---------------------------------------------------------------------------
// READ — Backlog / Issues
// ---------------------------------------------------------------------------

server.tool(
  'devd_issue_list',
  'List backlog issues for a specific project. Server-side filters: status, type, sprint, search. Each item has `key` (e.g. "DD-42"). Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    sprint_key: z
      .string()
      .optional()
      .describe('Filter by sprint key (e.g. "DD#20"), numeric id, or "null"/"none" for unassigned'),
    status: z
      .string()
      .optional()
      .describe(
        'Filter by issue status. Single value (new) or comma-list (new,refined). Valid: new | refined | planned | in_progress | to_review | passed | rejected | completed | cancelled',
      ),
    type: z
      .enum(ISSUE_TYPES)
      .optional()
      .describe('Filter by issue type'),
    search: z.string().optional().describe('Full-text search across title, context_notes, goal, background'),
    fields: z.enum(['compact', 'full']).optional().describe('DD-620: compact (default — identity/status fields only, token-safe) or full (every field; use devd_issue_show for one issue instead).'),
    limit: z.number().int().min(1).optional().describe('DD-622: max rows returned'),
    offset: z.number().int().min(0).optional().describe('DD-622: skip the first N rows (pagination)'),
  },
  async ({ project_id, sprint_key, status, type, search, fields, limit, offset }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const params = new URLSearchParams()
    if (sprint_key) {
      if (sprint_key === 'null' || sprint_key === 'none') {
        params.set('sprint_id', 'null')
      } else {
        const sprintId = await resolveSprintId(sprint_key, pid)
        params.set('sprint_id', sprintId)
      }
    }
    if (status) params.set('status', status)
    if (type) params.set('type', type)
    if (search) params.set('search', search)
    if (fields) params.set('fields', fields)
    if (limit !== undefined) params.set('limit', String(limit))
    if (offset !== undefined) params.set('offset', String(offset))
    const qs = params.toString() ? `?${params.toString()}` : ''
    const data = await apiRequest('GET', `/api/backlog${qs}`, null, pid)
    return ok(data)
  },
)

server.tool(
  'devd_backlog_list',
  'DD2-110: List the REAL backlog of a project — open, unplanned work only. Backlog = status "new" OR (status "planned" AND no sprint assigned), mirroring the TUI backlog view (messages.go). Unlike devd_issue_list (which returns ALL issues when unfiltered), this captures the backlog semantics in one call (two backend queries, merged + deduped). refined is excluded (roadmap/milestone-managed). Each item has `key`. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    type: z.enum(ISSUE_TYPES).optional().describe('Filter by issue type'),
    search: z.string().optional().describe('Full-text search across title, context_notes, goal, background'),
    fields: z.enum(['compact', 'full']).optional().describe('compact (default — token-safe) or full'),
    limit: z.number().int().min(1).optional().describe('Max rows returned (applied after merge)'),
  },
  async ({ project_id, type, search, fields, limit }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    // Backlog-Semantik (TUI-autoritativ): status=new ∪ (status=planned ∧ sprint=null).
    // Backend /api/backlog komponiert status+sprint_id mit AND → zwei Calls + Merge.
    const base = new URLSearchParams()
    if (type) base.set('type', type)
    if (search) base.set('search', search)
    if (fields) base.set('fields', fields)
    const qNew = new URLSearchParams(base)
    qNew.set('status', 'new')
    const qPlanned = new URLSearchParams(base)
    qPlanned.set('status', 'planned')
    qPlanned.set('sprint_id', 'null')
    const [newItems, plannedItems] = await Promise.all([
      apiRequest('GET', `/api/backlog?${qNew.toString()}`, null, pid),
      apiRequest('GET', `/api/backlog?${qPlanned.toString()}`, null, pid),
    ])
    if (newItems && newItems.error) return ok(newItems)
    if (plannedItems && plannedItems.error) return ok(plannedItems)
    // Merge + Dedup nach key (Status-disjunkt → Dedup nur Sicherheitsnetz). new zuerst.
    const seen = new Set()
    const merged = []
    for (const it of [...(newItems || []), ...(plannedItems || [])]) {
      const k = it.key ?? it.id
      if (seen.has(k)) continue
      seen.add(k)
      merged.push(it)
    }
    return ok(limit !== undefined ? merged.slice(0, limit) : merged)
  },
)

server.tool(
  'devd_issue_lost',
  'DD-555: Find lost issues — non-terminal issues (status ∉ completed/passed/cancelled) still assigned to a COMPLETED sprint. Data-hygiene query, project-scoped. Each hit has issue key, sprint key and status. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
  },
  async ({ project_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('GET', '/api/backlog/lost', null, pid)
    return ok(data)
  },
)

server.tool(
  'devd_issue_show',
  'Get full details of a single issue including tasks, feedback, attachments, tags. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z
      .string()
      .describe('Issue key (e.g. "DD-42", "MBT-7") or numeric backlog id'),
  },
  async ({ project_id, id_or_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveIssueId(id_or_key, pid)
    const data = await apiRequest('GET', `/api/backlog/${id}`, null, pid)
    return ok(data)
  },
)

// ---------------------------------------------------------------------------
// WRITE — Sprints
// ---------------------------------------------------------------------------

server.tool(
  'devd_sprint_create',
  'WRITE: Create a new sprint in a specific project. Status starts as "new". Response includes `key` (e.g. "DD#20").',
  {
    project_id: PROJECT_ID_PARAM,
    name: z.string().describe('Sprint name (required)'),
    goal: z.string().optional().describe('Sprint goal — separate column'),
    notes: z.string().optional().describe('Free-text notes'),
    start_date: z.string().optional().describe('ISO date YYYY-MM-DD'),
    end_date: z.string().optional().describe('ISO date YYYY-MM-DD'),
    capacity: z.number().int().optional().describe('Capacity in hours/points'),
    wip_limit: z.number().int().optional().describe('Max parallel in_progress issues'),
    milestone_id: z.number().int().optional().describe('Optional milestone link'),
  },
  async ({ project_id, name, goal, notes, start_date, end_date, capacity, wip_limit, milestone_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const body = { name }
    if (goal) body.goal = goal
    if (notes) body.notes = notes
    if (start_date) body.start_date = start_date
    if (end_date) body.end_date = end_date
    if (capacity !== undefined) body.capacity = capacity
    if (wip_limit !== undefined) body.wip_limit = wip_limit
    if (milestone_id !== undefined) body.milestone_id = milestone_id
    const data = await apiRequest('POST', '/api/sprints', body, pid)
    return ok(data)
  },
)

server.tool(
  'devd_sprint_show',
  'Get a single sprint with nested items (full backlog rows + review_status + screenshots). Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    sprint_key: z.string().describe('Sprint key (e.g. "DD#20") or numeric sprint id'),
  },
  async ({ project_id, sprint_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveSprintId(sprint_key, pid)
    const data = await apiRequest('GET', `/api/sprints/${id}`, null, pid)
    return ok(data)
  },
)

server.tool(
  'devd_sprint_start',
  'WRITE: Transition a sprint from new → in_progress. Wraps PATCH /api/sprints/:id/status.',
  {
    project_id: PROJECT_ID_PARAM,
    sprint_key: z.string().describe('Sprint key (e.g. "DD#20") or numeric sprint id'),
  },
  async ({ project_id, sprint_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveSprintId(sprint_key, pid)
    const data = await apiRequest('PATCH', `/api/sprints/${id}/status`, { to: 'in_progress' }, pid)
    return ok(data)
  },
)

// ProjectPages T-be1 (D-D, Modell B): user_notes — NEUE separate Rich-Entity (user-verfasste
// Notizen, UserNotesWidget). KEIN Ersatz des Session-Log-Auto-Journals (project_memory bleibt
// project_memories). project-gescopt (X-Project-Id via project_id).
server.tool(
  'devd_user_note_list',
  'List user-notes of a project (id DESC). Optional FTS search over title+details. Read-only.',
  { project_id: PROJECT_ID_PARAM, search: z.string().optional().describe('FTS query over title+details') },
  async ({ project_id, search }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const qs = search ? `?search=${encodeURIComponent(search)}` : ''
    return ok(await apiRequest('GET', `/api/user-notes${qs}`, null, pid))
  },
)

server.tool(
  'devd_user_note_get',
  'Get one user-note by id (project-scoped, with parsed sprints[]/issues[]). Read-only.',
  { project_id: PROJECT_ID_PARAM, id: z.number().int().positive() },
  async ({ project_id, id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('GET', `/api/user-notes/${id}`, null, pid))
  },
)

server.tool(
  'devd_user_note_create',
  'WRITE: Create a user-note (rich entity for UserNotesWidget — NOT the SSTD auto-journal). title required; details (≤500), pr_url, sprints[], issues[] optional.',
  {
    project_id: PROJECT_ID_PARAM,
    title: z.string().describe('Note title'),
    details: z.string().optional().describe('Markdown body, ≤500 chars'),
    pr_url: z.string().optional().describe('Pull-request URL'),
    sprints: z.array(z.string()).optional().describe('Sprint keys, e.g. ["DD#47"]'),
    issues: z.array(z.string()).optional().describe('Issue keys, e.g. ["DD-678","GF-433"]'),
  },
  async ({ project_id, title, details, pr_url, sprints, issues }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('POST', '/api/user-notes', { title, details, pr_url, sprints, issues }, pid))
  },
)

server.tool(
  'devd_user_note_update',
  'WRITE: Partial update of a user-note (at least one field). PUT /api/user-notes/:id.',
  {
    project_id: PROJECT_ID_PARAM,
    id: z.number().int().positive(),
    title: z.string().optional(),
    details: z.string().optional(),
    pr_url: z.string().nullable().optional(),
    sprints: z.array(z.string()).optional(),
    issues: z.array(z.string()).optional(),
  },
  async ({ project_id, id, ...patch }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('PUT', `/api/user-notes/${id}`, patch, pid))
  },
)

server.tool(
  'devd_user_note_delete',
  'WRITE: Delete a user-note by id (project-scoped). DELETE /api/user-notes/:id.',
  { project_id: PROJECT_ID_PARAM, id: z.number().int().positive() },
  async ({ project_id, id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('DELETE', `/api/user-notes/${id}`, null, pid))
  },
)


// DD-628: Lean Read-Context-Tools — AI-Kontext in einem Call. Read-only. Der generische
// Response-Cap (DD-623) schützt diese potenziell großen Outputs automatisch.

// Markdown-/CSV-Text direkt durchreichen (apiRequest liefert bei text/* einen String);
// Fehlerobjekte als JSON.
function okTextOrError(data) {
  if (data && typeof data === 'object' && data.error) return ok(data)
  return { content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] }
}

server.tool(
  'devd_backlog_export',
  'READ: Export the project backlog in an LLM-friendly format — md (default) | json | yaml. Default status filter is new,refined (sprint-bound status excluded); narrow further via status (single or comma-list). Full triage context in one call. GET /api/backlog-export. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    format: z.enum(['md', 'json', 'yaml']).optional().describe('Export format (default md)'),
    status: z.string().optional().describe('Status filter (single or comma-list); default new,refined'),
    search: z.string().optional().describe('Full-text filter'),
  },
  async ({ project_id, format, status, search }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const params = new URLSearchParams()
    if (format) params.set('format', format)
    if (status) params.set('status', status)
    if (search) params.set('search', search)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return okTextOrError(await apiRequest('GET', `/api/backlog-export${qs}`, null, pid))
  },
)

// DD2-6: Sprint-Export (CSV/MD) zugänglich machen. Backlog-CSV bleibt entfernt
// (DD2-123, schlecht für LLM-Parsing) — Sprint-Export behält CSV für Tabellen-Tools.
server.tool(
  'devd_sprint_export',
  'READ: Export one sprint (its issues) as CSV or Markdown. csv columns: id,key,title,status,type,priority,tags,completed_at. md groups issues by status. GET /api/sprints/:id/export. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    sprint_key: z.string().describe('Sprint key (e.g. "DD2#22") or numeric sprint id'),
    format: z.enum(['csv', 'md']).optional().describe('Export format (default md)'),
  },
  async ({ project_id, sprint_key, format }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveSprintId(sprint_key, pid)
    const qs = format ? `?format=${format}` : ''
    return okTextOrError(await apiRequest('GET', `/api/sprints/${id}/export${qs}`, null, pid))
  },
)

// DD2-21: Dokumenten-Subsystem (Markdown-Docs an Meilensteine/Sprints, DB-Blob).
// Owner = milestone_id ODER sprint_key (genau einer). project_id nur für sprint_key-Resolve.
const DOC_OWNER_PARAMS = {
  project_id: PROJECT_ID_PARAM,
  milestone_id: z.number().int().positive().optional().describe('Owner: Meilenstein-id (ODER sprint_key)'),
  sprint_key: z.string().optional().describe('Owner: Sprint-Key/-id (ODER milestone_id)'),
}
async function docOwnerBase(milestone_id, sprint_key, pid) {
  if (milestone_id != null) return `/api/milestones/${milestone_id}`
  if (sprint_key != null) return `/api/sprints/${await resolveSprintId(sprint_key, pid)}`
  return null
}
const DOC_OWNER_ERR = { error: true, message: 'Owner erforderlich: milestone_id ODER sprint_key' }

server.tool(
  'devd_document_list',
  'READ: List markdown documents attached to a milestone or sprint (id DESC). Owner = milestone_id OR sprint_key. Read-only.',
  DOC_OWNER_PARAMS,
  async ({ project_id, milestone_id, sprint_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const base = await docOwnerBase(milestone_id, sprint_key, pid)
    if (!base) return ok(DOC_OWNER_ERR)
    return ok(await apiRequest('GET', `${base}/documents`, null, pid))
  },
)

server.tool(
  'devd_document_get',
  'READ: Get one document (with markdown body) by id, scoped to its milestone/sprint owner. Read-only.',
  { ...DOC_OWNER_PARAMS, doc_id: z.number().int().positive() },
  async ({ project_id, milestone_id, sprint_key, doc_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const base = await docOwnerBase(milestone_id, sprint_key, pid)
    if (!base) return ok(DOC_OWNER_ERR)
    return ok(await apiRequest('GET', `${base}/documents/${doc_id}`, null, pid))
  },
)

server.tool(
  'devd_document_create',
  'WRITE: Attach a markdown document to a milestone or sprint. title required; body (markdown, DB-blob) + file_path optional.',
  {
    ...DOC_OWNER_PARAMS,
    title: z.string().describe('Document title'),
    body: z.string().optional().describe('Markdown body (stored as DB-blob)'),
    file_path: z.string().nullable().optional().describe('Optional repo-relative origin hint'),
  },
  async ({ project_id, milestone_id, sprint_key, title, body, file_path }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const base = await docOwnerBase(milestone_id, sprint_key, pid)
    if (!base) return ok(DOC_OWNER_ERR)
    return ok(await apiRequest('POST', `${base}/documents`, { title, body, file_path }, pid))
  },
)

server.tool(
  'devd_document_update',
  'WRITE: Partial update of a document (at least one of title/body/file_path). PUT /api/{milestones|sprints}/:id/documents/:docId. milestone_id/sprint_key are OPTIONAL here (DD2-261) — doc_id already identifies the document uniquely; when omitted the owner is derived via the project-wide document list. Still required for devd_document_create (new document has no id yet).',
  {
    ...DOC_OWNER_PARAMS,
    doc_id: z.number().int().positive(),
    title: z.string().optional(),
    body: z.string().optional(),
    file_path: z.string().nullable().optional(),
  },
  async ({ project_id, milestone_id, sprint_key, doc_id, ...patch }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    let base = await docOwnerBase(milestone_id, sprint_key, pid)
    if (!base) {
      // DD2-261: no owner given — derive it from doc_id via the project-wide doc list.
      const all = await apiRequest('GET', `/api/projects/${encodeURIComponent(pid)}/documents`, null, pid)
      if (all && all.error) return ok(all)
      const found = Array.isArray(all) ? all.find((d) => d.id === doc_id) : null
      if (!found) return ok({ error: true, message: `Dokument ${doc_id} nicht gefunden — Owner weder angegeben noch auflösbar` })
      base = found.milestone_id != null ? `/api/milestones/${found.milestone_id}` : `/api/sprints/${found.sprint_id}`
    }
    return ok(await apiRequest('PUT', `${base}/documents/${doc_id}`, patch, pid))
  },
)

server.tool(
  'devd_document_delete',
  'WRITE: Delete a document by id (scoped to its milestone/sprint owner).',
  { ...DOC_OWNER_PARAMS, doc_id: z.number().int().positive() },
  async ({ project_id, milestone_id, sprint_key, doc_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const base = await docOwnerBase(milestone_id, sprint_key, pid)
    if (!base) return ok(DOC_OWNER_ERR)
    return ok(await apiRequest('DELETE', `${base}/documents/${doc_id}`, null, pid))
  },
)

server.tool(
  'devd_dashboard_home',
  'READ: Global home dashboard — one tile row per non-archived project (open sprints/milestones/issues counts). GET /api/dashboard/home. Global, read-only.',
  {},
  async () => ok(await apiRequest('GET', '/api/dashboard/home')),
)

server.tool(
  'devd_dependencies_graph',
  'READ: Issue dependency graph for a project ({nodes, edges}); optionally scoped to one sprint. GET /api/dependencies/graph. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    sprint_key: z.string().optional().describe('Optional sprint key/id to scope the graph'),
  },
  async ({ project_id, sprint_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const params = new URLSearchParams()
    if (sprint_key) params.set('sprint_id', String(await resolveSprintId(sprint_key, pid)))
    const qs = params.toString() ? `?${params.toString()}` : ''
    return ok(await apiRequest('GET', `/api/dependencies/graph${qs}`, null, pid))
  },
)

server.tool(
  'devd_sprint_review',
  'WRITE: Transition a sprint from in_progress → to_review (triggers PO review phase). Sprint completion (to_review → completed) is exclusive to the PO.',
  {
    project_id: PROJECT_ID_PARAM,
    sprint_key: z.string().describe('Sprint key (e.g. "DD#20") or numeric sprint id'),
  },
  async ({ project_id, sprint_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveSprintId(sprint_key, pid)
    const data = await apiRequest('PATCH', `/api/sprints/${id}/status`, { to: 'to_review' }, pid)
    return ok(data)
  },
)

server.tool(
  'devd_sprint_cancel',
  'WRITE: Cancel a sprint with mandatory notes. Wraps PATCH /api/sprints/:id/status with to=cancelled.',
  {
    project_id: PROJECT_ID_PARAM,
    sprint_key: z.string().describe('Sprint key (e.g. "DD#20") or numeric sprint id'),
    notes: z.string().describe('Cancellation reason (required)'),
  },
  async ({ project_id, sprint_key, notes }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveSprintId(sprint_key, pid)
    const data = await apiRequest('PATCH', `/api/sprints/${id}/status`, {
      to: 'cancelled',
      cancellationNotes: notes,
    }, pid)
    return ok(data)
  },
)

// DD-626: Sprint-Verb-Vervollständigung — update/reorder/delete (REST existierte).
server.tool(
  'devd_sprint_update',
  'WRITE: Update sprint fields (name/goal/notes/dates/capacity/wip_limit). Only provided fields change. PUT /api/sprints/:id. Use devd_sprint_set_milestone for milestone, the status verbs for lifecycle.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string().describe('Sprint key (e.g. "DD#20") or numeric sprint id — mirrors devd_issue_update\'s id_or_key (DD2-260)'),
    name: z.string().optional(),
    goal: z.string().optional(),
    notes: z.string().optional(),
    start_date: z.string().optional().describe('ISO date YYYY-MM-DD'),
    end_date: z.string().optional().describe('ISO date YYYY-MM-DD'),
    capacity: z.number().int().optional(),
    wip_limit: z.number().int().optional(),
  },
  async ({ project_id, id_or_key, ...fields }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveSprintId(id_or_key, pid)
    return ok(await apiRequest('PUT', `/api/sprints/${id}`, fields, pid))
  },
)

server.tool(
  'devd_sprint_reorder',
  'WRITE: Set the display order of sprints by passing all sprint ids in the desired order. PATCH /api/sprints/reorder {ordered_ids}.',
  {
    project_id: PROJECT_ID_PARAM,
    ordered_ids: z.array(z.number().int()).describe('Sprint ids in the new order'),
  },
  async ({ project_id, ordered_ids }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('PATCH', '/api/sprints/reorder', { ordered_ids }, pid))
  },
)

server.tool(
  'devd_sprint_delete',
  'WRITE: Hard-delete a sprint. cascade=true (default) also deletes the sprint\'s issues incl. their children (no dangling rows). cascade=false keeps the old guard: 409 if issues are still assigned (unassign/move first). DELETE /api/sprints/:id[?cascade=1]. Note: cancelled is a soft state that stays in the DB — this is the hard delete.',
  {
    project_id: PROJECT_ID_PARAM,
    sprint_key: z.string().describe('Sprint key or numeric id'),
    cascade: z.boolean().optional().default(true).describe('Also delete the sprint\'s issues (default true). false → 409 when issues exist.'),
  },
  async ({ project_id, sprint_key, cascade = true }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveSprintId(sprint_key, pid)
    return ok(await apiRequest('DELETE', `/api/sprints/${id}${cascade ? '?cascade=1' : ''}`, null, pid))
  },
)

server.tool(
  'devd_milestone_delete',
  'WRITE: Hard-delete a milestone. cascade=true (default) also deletes all of the milestone\'s sprints and their issues incl. children (no dangling rows). cascade=false only deletes the milestone and detaches its sprints (milestone_id → NULL). DELETE /api/milestones/:id[?cascade=1]. Note: cancelled is a soft state that stays in the DB — this is the hard delete.',
  {
    project_id: PROJECT_ID_PARAM,
    milestone_id: z.coerce.number().int().positive().describe('Numeric milestone id'),
    cascade: z.boolean().optional().default(true).describe('Also delete the milestone\'s sprints + their issues (default true). false → detach sprints only.'),
  },
  async ({ project_id, milestone_id, cascade = true }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('DELETE', `/api/milestones/${milestone_id}${cascade ? '?cascade=1' : ''}`, null, pid))
  },
)

server.tool(
  'devd_sprint_set_milestone',
  'WRITE: Assign a sprint to a milestone, or unassign (milestone_id=null). Routes PUT /api/sprints/:id {milestone_id}. DD-173: assigning to a completed milestone → 422 (passed through). milestone_id from a different project → 400.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string().describe('Sprint key (e.g. "DD#20") or numeric sprint id — mirrors devd_issue_update\'s id_or_key (DD2-260)'),
    ...sprintSetMilestoneContract.shape,
  },
  async ({ project_id, id_or_key, milestone_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveSprintId(id_or_key, pid)
    const data = await apiRequest('PUT', `/api/sprints/${id}`, { milestone_id }, pid)
    return ok(data)
  },
)

// ---------------------------------------------------------------------------
// Milestones (DD-553 Lifecycle/CRUD, DD-556 Edit/Deps) — Shapes aus DD-557-Contract
// ---------------------------------------------------------------------------

server.tool(
  'devd_milestone_list',
  'List milestones for a project. status filter: open (default) | new | planned | in_progress | completed | cancelled | all. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    status: z.string().optional().describe('Filter: open (default) | new | planned | in_progress | completed | cancelled | all'),
  },
  async ({ project_id, status }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    const data = await apiRequest('GET', `/api/milestones${qs}`, null, pid)
    return ok(data)
  },
)

server.tool(
  'devd_milestone_show',
  'Get a single milestone with sprints, dependencies (in/out), DoD-items and issue counts. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    milestone_id: z.coerce.number().int().positive().describe('Numeric milestone id'),
  },
  async ({ project_id, milestone_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('GET', `/api/milestones/${milestone_id}`, null, pid)
    return ok(data)
  },
)

server.tool(
  'devd_milestone_create',
  'WRITE: Create a milestone. name required; target_date auto-defaults (now+90d) when omitted; status defaults to new.',
  {
    project_id: PROJECT_ID_PARAM,
    ...milestoneCreateContract.shape,
  },
  async ({ project_id, name, description, target_date, status }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('POST', '/api/milestones', { name, description, target_date, status }, pid)
    return ok(data)
  },
)

server.tool(
  'devd_milestone_status',
  'WRITE: Transition a milestone status (new|planned|in_progress|completed|cancelled, incl. sanctioned reopen paths completed→in_progress / cancelled→new). Routes PUT /api/milestones/:id {status}. Lifecycle errors (e.g. 422 SPRINTS_NOT_DONE) are passed through. notes required by the lifecycle on →cancelled (mirrors devd_issue_status/devd_sprint_cancel, DD2-268 — mapped to the API\'s cancellation_notes field internally).',
  {
    project_id: PROJECT_ID_PARAM,
    milestone_id: z.coerce.number().int().positive().describe('Numeric milestone id'),
    status: milestoneStatusContract.shape.status,
    notes: z.string().optional().describe('Cancellation reason (required by the lifecycle on →cancelled)'),
  },
  async ({ project_id, milestone_id, status, notes }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const body = { status }
    if (notes) body.cancellation_notes = notes
    const data = await apiRequest('PUT', `/api/milestones/${milestone_id}`, body, pid)
    return ok(data)
  },
)

server.tool(
  'devd_milestone_update',
  'WRITE: Update milestone master data (name / description / target_date). Routes PUT /api/milestones/:id. Empty name → 400; target_date clear → auto-default. Status changes use devd_milestone_status instead.',
  {
    project_id: PROJECT_ID_PARAM,
    milestone_id: z.coerce.number().int().positive().describe('Numeric milestone id'),
    ...milestoneUpdateContract.shape,
  },
  async ({ project_id, milestone_id, name, description, target_date }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const body = {}
    if (name !== undefined) body.name = name
    if (description !== undefined) body.description = description
    if (target_date !== undefined) body.target_date = target_date
    const data = await apiRequest('PUT', `/api/milestones/${milestone_id}`, body, pid)
    return ok(data)
  },
)

// DD-627: Milestone-Verb-Vervollständigung — reorder, dod-items CRUD, close-with-issues.
server.tool(
  'devd_milestone_reorder',
  'WRITE: Set the display order of milestones by passing all milestone ids in the desired order (own project only). PATCH /api/milestones/reorder {ordered_ids}.',
  {
    project_id: PROJECT_ID_PARAM,
    ordered_ids: z.array(z.coerce.number().int().positive()).describe('Milestone ids in the new order'),
  },
  async ({ project_id, ordered_ids }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('PATCH', '/api/milestones/reorder', { ordered_ids }, pid))
  },
)

server.tool(
  'devd_milestone_close',
  'WRITE: Close a milestone, handling its still-open issues. target_status applies to the open issues (e.g. cancelled); assignments optionally re-homes them. POST /api/milestones/:id/close-with-issues.',
  {
    project_id: PROJECT_ID_PARAM,
    milestone_id: z.coerce.number().int().positive().describe('Numeric milestone id'),
    target_status: z.string().optional().describe('Status to apply to still-open issues'),
    assignments: z.any().optional().describe('Optional per-issue re-assignment payload (see close-with-issues)'),
  },
  async ({ project_id, milestone_id, target_status, assignments }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const body = {}
    if (target_status !== undefined) body.target_status = target_status
    if (assignments !== undefined) body.assignments = assignments
    return ok(await apiRequest('POST', `/api/milestones/${milestone_id}/close-with-issues`, body, pid))
  },
)

server.tool(
  'devd_milestone_dod_list',
  'List a milestone Definition-of-Done items (id, label, done, position). GET /api/milestones/:id/dod-items. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    milestone_id: z.coerce.number().int().positive().describe('Numeric milestone id'),
  },
  async ({ project_id, milestone_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('GET', `/api/milestones/${milestone_id}/dod-items`, null, pid))
  },
)

server.tool(
  'devd_milestone_dod_add',
  'WRITE: Add a Definition-of-Done item to a milestone. POST /api/milestones/:id/dod-items {label}.',
  {
    project_id: PROJECT_ID_PARAM,
    milestone_id: z.coerce.number().int().positive().describe('Numeric milestone id'),
    label: z.string().describe('DoD item label'),
  },
  async ({ project_id, milestone_id, label }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('POST', `/api/milestones/${milestone_id}/dod-items`, { label }, pid))
  },
)

server.tool(
  'devd_milestone_dod_set',
  'WRITE: Update a DoD item (label and/or done). PATCH /api/dod-items/:id.',
  {
    project_id: PROJECT_ID_PARAM,
    item_id: z.coerce.number().int().positive().describe('DoD item id'),
    label: z.string().optional(),
    done: z.boolean().optional(),
  },
  async ({ project_id, item_id, label, done }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const body = {}
    if (label !== undefined) body.label = label
    if (done !== undefined) body.done = done
    return ok(await apiRequest('PATCH', `/api/dod-items/${item_id}`, body, pid))
  },
)

server.tool(
  'devd_milestone_dod_reorder',
  'WRITE: Reorder a milestone DoD items by passing item ids in the desired order. PATCH /api/milestones/:id/dod-items/reorder {order}.',
  {
    project_id: PROJECT_ID_PARAM,
    milestone_id: z.coerce.number().int().positive().describe('Numeric milestone id'),
    order: z.array(z.coerce.number().int().positive()).describe('DoD item ids in the new order'),
  },
  async ({ project_id, milestone_id, order }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('PATCH', `/api/milestones/${milestone_id}/dod-items/reorder`, { order }, pid))
  },
)

server.tool(
  'devd_milestone_dod_delete',
  'WRITE: Delete a DoD item. DELETE /api/dod-items/:id.',
  {
    project_id: PROJECT_ID_PARAM,
    item_id: z.coerce.number().int().positive().describe('DoD item id'),
  },
  async ({ project_id, item_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('DELETE', `/api/dod-items/${item_id}`, null, pid)
    if (data && data.error) return ok(data)
    return ok({ deleted: true, item_id })
  },
)

server.tool(
  'devd_milestone_dep_add',
  'WRITE: Add a milestone dependency (predecessor must finish before successor). Routes POST /api/milestone-dependencies. DFS cycle-detection — a cycle is rejected 409 and passed through 1:1.',
  {
    project_id: PROJECT_ID_PARAM,
    ...milestoneDependencyContract.shape,
  },
  async ({ project_id, predecessor_id, successor_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('POST', '/api/milestone-dependencies', { predecessor_id, successor_id }, pid)
    return ok(data)
  },
)

server.tool(
  'devd_milestone_dep_list',
  'List a milestone dependencies: { predecessors, successors } with dependency edge id. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    milestone_id: z.coerce.number().int().positive().describe('Numeric milestone id'),
  },
  async ({ project_id, milestone_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('GET', `/api/milestones/${milestone_id}/dependencies`, null, pid)
    return ok(data)
  },
)

server.tool(
  'devd_milestone_dep_remove',
  'WRITE: Remove a milestone dependency edge by its dependency id (from devd_milestone_dep_list). Routes DELETE /api/milestone-dependencies/:id.',
  {
    project_id: PROJECT_ID_PARAM,
    dependency_id: z.coerce.number().int().positive().describe('Dependency edge id (dep# from dep_list)'),
  },
  async ({ project_id, dependency_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    await apiRequest('DELETE', `/api/milestone-dependencies/${dependency_id}`, null, pid)
    return ok({ ok: true, removed: dependency_id })
  },
)

// ---------------------------------------------------------------------------
// WRITE — Issues
// ---------------------------------------------------------------------------

server.tool(
  'devd_issue_create',
  'WRITE: Create a new issue in a specific project backlog.',
  {
    project_id: PROJECT_ID_PARAM,
    title: z.string().describe('Issue title (required)'),
    type: z
      .enum(ISSUE_TYPES)
      .describe('Issue type (required)'),
    priority: z
      .number()
      .int()
      .min(1)
      .max(5)
      .optional()
      .describe('Priority 1 (highest) to 5 (lowest)'),
    goal: z.string().optional().describe('Issue goal — primary refinement field'),
    po_notes: z.string().optional().describe('PO free-text notes — the PO-facing free-text field (replaces the removed description field, DD2-131/132).'),
  },
  async ({ project_id, title, type, priority, goal, po_notes }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const body = { title, type }
    if (priority !== undefined) body.priority = priority
    if (goal) body.goal = goal
    if (po_notes) body.po_notes = po_notes
    const data = await apiRequest('POST', '/api/backlog', body, pid)
    return ok(data)
  },
)

server.tool(
  'devd_issue_update',
  'WRITE: Update editable fields of an issue (title, goal, background, context_notes, relevant_files, priority, type, po_notes). po_notes is the PO-facing free-text field (replaces the removed description field, DD2-131/132). E01/D09: per-issue acceptance_criteria + test_instruction are replaced by user_stories[].qa — manage them via devd_user_story_*. Does NOT change status or sprint assignment — use devd_issue_status for status transitions.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string().describe('Issue key (e.g. "DD-42") or numeric backlog id'),
    title: z.string().optional(),
    goal: z.string().optional(),
    background: z.string().optional(),
    context_notes: z.string().optional(),
    relevant_files: z.string().optional(),
    priority: z.number().int().min(1).max(5).optional(),
    type: z.enum(ISSUE_TYPES).optional(),
    po_notes: z.string().optional(),
  },
  async ({ project_id, id_or_key, ...fields }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveIssueId(id_or_key, pid)
    // Use PUT for full field edits (PATCH only handles po_notes/notes)
    const data = await apiRequest('PUT', `/api/backlog/${id}`, fields, pid)
    return ok(data)
  },
)

server.tool(
  'devd_issue_status',
  'WRITE: Transition an issue to a new status. Full lifecycle: new → refined → planned → in_progress → to_review → passed → completed. Also: rejected → in_progress (re-open after review); cancelled (from any non-completed state). Notes are required when cancelling.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string().describe('Issue key (e.g. "DD-42") or numeric backlog id'),
    status: z
      .string()
      .describe(
        'Target status: new | refined | planned | in_progress | to_review | passed | rejected | completed | cancelled',
      ),
    notes: z.string().optional().describe('Transition notes (required when cancelling)'),
  },
  async ({ project_id, id_or_key, status, notes }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveIssueId(id_or_key, pid)
    const body = { status }
    if (notes) body.notes = notes
    const data = await apiRequest('PATCH', `/api/backlog/${id}/status`, body, pid)
    return ok(data)
  },
)

server.tool(
  'devd_issue_assign_sprint',
  'WRITE: Assign an issue to a sprint, or unassign (sprint_key=null). Wraps PATCH /api/backlog/:id/sprint.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string().describe('Issue key (e.g. "DD-42") or numeric backlog id'),
    sprint_key: z
      .string()
      .nullable()
      .describe('Sprint key (e.g. "DD#20"), numeric sprint id, or null to unassign'),
  },
  async ({ project_id, id_or_key, sprint_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const issueId = await resolveIssueId(id_or_key, pid)
    let sprintId = null
    if (sprint_key !== null && sprint_key !== undefined && sprint_key !== '') {
      sprintId = Number(await resolveSprintId(sprint_key, pid))
      if (!Number.isFinite(sprintId)) {
        return ok({ error: true, message: `Could not resolve sprint_key=${sprint_key}` })
      }
    }
    const data = await apiRequest('PATCH', `/api/backlog/${issueId}/sprint`, {
      sprint_id: sprintId,
    }, pid)
    return ok(data)
  },
)

// ---------------------------------------------------------------------------
// Subtasks (DD-45 R07) — CRUD via /api/backlog/:id/subtasks + /api/subtasks/:id
// ---------------------------------------------------------------------------
// DD-565 (Triplet 6/6): bewusst KEIN Import aus contracts/subtask.contracts.js. Die
// devd_subtask_*-Tools tragen kein dedupbares Enum/Konstanten-Literal — Status ist als fixes
// `{ status: 'done' }` im done-Handler hartkodiert. tests/sma-mcp-parity/subtasks.test.js ist
// zudem ein Source-Shape-Guard, der den Klartext dieses Blocks (title/qa_criteria/done/id_or_key
// + Route-Strings) assertet. Die Single Source der Subtask-Werte liegt in
// contracts/subtask.contracts.js + server/lib/subtasks.js.
//
// DD2-97: Input-Boundary gehärtet (klare Fehler an der MCP-Grenze statt Round-Trip): id_or_key
// non-empty, title non-empty (trim+min(1), spiegelt 'title ist Pflichtfeld'), subtask_id positive
// Ganzzahl. Bewusst inline (Contract-Entscheidung DD-562/563/564: kein Contract-Import in MCP) —
// und KEINE künstlichen Längen-Caps, da die REST-Lib keine hat (sonst MCP/REST-Drift). Die
// werfende Business-Autorität (qa_criteria-auf-done 422, status-nur-open-beim-Anlegen 400,
// Parent-Existenz 404) bleibt in server/lib/subtasks.js.

server.tool(
  'devd_subtask_list',
  'READ: List all subtasks for an issue. Returns id, title, qa_criteria, status, position.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string({ error: 'id_or_key ist Pflichtfeld' }).trim().min(1, { error: 'id_or_key darf nicht leer sein' }).describe('Issue key (e.g. "DD-42") or numeric backlog id'),
  },
  async ({ project_id, id_or_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const issueId = await resolveIssueId(id_or_key, pid)
    const data = await apiRequest('GET', `/api/backlog/${issueId}/subtasks`, null, pid)
    return ok(data)
  },
)

server.tool(
  'devd_subtask_add',
  'WRITE: Add a subtask to an issue. title is required. qa_criteria is recommended (required before marking done).',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string({ error: 'id_or_key ist Pflichtfeld' }).trim().min(1, { error: 'id_or_key darf nicht leer sein' }).describe('Issue key (e.g. "DD-42") or numeric backlog id'),
    title: z.string({ error: 'title ist Pflichtfeld' }).trim().min(1, { error: 'title ist Pflichtfeld' }).describe('Subtask title (required)'),
    qa_criteria: z.string().optional().describe('Acceptance / QA criteria — required before marking done'),
    position: z.number().int({ error: 'position muss eine Ganzzahl sein' }).optional().describe('Sort position (default appended at end)'),
  },
  async ({ project_id, id_or_key, title, qa_criteria, position }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const issueId = await resolveIssueId(id_or_key, pid)
    const body = { title }
    if (qa_criteria !== undefined) body.qa_criteria = qa_criteria
    if (position !== undefined) body.position = position
    const data = await apiRequest('POST', `/api/backlog/${issueId}/subtasks`, body, pid)
    return ok(data)
  },
)

server.tool(
  'devd_subtask_done',
  'WRITE: Mark a subtask as done. The subtask must have qa_criteria set (enforced server-side).',
  {
    project_id: PROJECT_ID_PARAM,
    subtask_id: z.number().int().positive({ error: 'subtask_id muss eine positive Ganzzahl sein' }).describe('Numeric subtask id (ST-<id>)'),
  },
  async ({ project_id, subtask_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('PATCH', `/api/subtasks/${subtask_id}/status`, { status: 'done' }, pid)
    return ok(data)
  },
)

server.tool(
  'devd_subtask_edit',
  'WRITE: Update title, qa_criteria, or position of a subtask.',
  {
    project_id: PROJECT_ID_PARAM,
    subtask_id: z.number().int().positive({ error: 'subtask_id muss eine positive Ganzzahl sein' }).describe('Numeric subtask id (ST-<id>)'),
    title: z.string().trim().min(1, { error: 'title darf nicht leer sein' }).optional().describe('New title'),
    qa_criteria: z.string().optional().describe('New QA criteria'),
    position: z.number().int({ error: 'position muss eine Ganzzahl sein' }).optional().describe('New sort position'),
  },
  async ({ project_id, subtask_id, title, qa_criteria, position }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const body = {}
    if (title !== undefined) body.title = title
    if (qa_criteria !== undefined) body.qa_criteria = qa_criteria
    if (position !== undefined) body.position = position
    const data = await apiRequest('PATCH', `/api/subtasks/${subtask_id}`, body, pid)
    return ok(data)
  },
)

server.tool(
  'devd_subtask_remove',
  'WRITE: Delete a subtask permanently.',
  {
    project_id: PROJECT_ID_PARAM,
    subtask_id: z.number().int().positive({ error: 'subtask_id muss eine positive Ganzzahl sein' }).describe('Numeric subtask id (ST-<id>)'),
  },
  async ({ project_id, subtask_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('DELETE', `/api/subtasks/${subtask_id}`, null, pid)
    return ok(data)
  },
)

// ---------------------------------------------------------------------------
// User Stories (E01.4) — Pruefgrundlage je Issue. us_verdict {open,accepted,rejected}
// (Backend-B02: NICHT `verdict` — Kollisions-Schutz ggue Issue-review_status). qa = D09
// per-US-Pruefgrundlage (loest issue-level acceptance_criteria + test_instruction ab).
// Schemas aus contracts/userStory.contracts.js abgeleitet (kein Triplizieren).
// ---------------------------------------------------------------------------

server.tool(
  'devd_user_story_list',
  'READ: List all user stories for an issue. Returns id, key (US-<id>), title, details, qa, us_verdict, position.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string().describe('Issue key (e.g. "DD-42") or numeric backlog id'),
  },
  async ({ project_id, id_or_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const issueId = await resolveIssueId(id_or_key, pid)
    const data = await apiRequest('GET', `/api/backlog/${issueId}/user-stories`, null, pid)
    return ok(data)
  },
)

server.tool(
  'devd_user_story_add',
  'WRITE: Add a user story (Pruefgrundlage) to an issue. title is required. qa is the per-story acceptance/QA criteria (replaces the old issue-level acceptance_criteria/test_instruction, D09). us_verdict starts at open.',
  {
    project_id: PROJECT_ID_PARAM,
    issue_id_or_key: z.string().describe('Parent issue key (e.g. "DD-42") or numeric backlog id (DD2-262: was id_or_key, ambiguous — this tool addresses the PARENT issue, not the story itself)'),
    title: z.string().describe('User story title (required)'),
    details: z.string().optional().describe('Optional detail / narrative of the story'),
    qa: z.string().optional().describe('Per-story acceptance / QA criteria (D09 Pruefgrundlage)'),
    position: z.number().int().optional().describe('Sort position (default appended at end)'),
  },
  async ({ project_id, issue_id_or_key, title, details, qa, position }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const issueId = await resolveIssueId(issue_id_or_key, pid)
    const body = { title }
    if (details !== undefined) body.details = details
    if (qa !== undefined) body.qa = qa
    if (position !== undefined) body.position = position
    const data = await apiRequest('POST', `/api/backlog/${issueId}/user-stories`, body, pid)
    return ok(data)
  },
)

server.tool(
  'devd_user_story_edit',
  'WRITE: Update title, details, qa, position, or us_verdict (open|accepted|rejected) of a user story.',
  {
    project_id: PROJECT_ID_PARAM,
    user_story_id: z.number().int().describe('Numeric user story id (US-<id>)'),
    title: z.string().optional().describe('New title'),
    details: z.string().optional().describe('New details'),
    qa: z.string().optional().describe('New per-story QA criteria'),
    us_verdict: z.enum(['open', 'accepted', 'rejected']).optional().describe('Story-level verdict badge'),
    position: z.number().int().optional().describe('New sort position'),
  },
  async ({ project_id, user_story_id, title, details, qa, us_verdict, position }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const body = {}
    if (title !== undefined) body.title = title
    if (details !== undefined) body.details = details
    if (qa !== undefined) body.qa = qa
    if (us_verdict !== undefined) body.us_verdict = us_verdict
    if (position !== undefined) body.position = position
    const data = await apiRequest('PATCH', `/api/user-stories/${user_story_id}`, body, pid)
    return ok(data)
  },
)

server.tool(
  'devd_user_story_verdict',
  'WRITE: Set the story-level verdict (open|accepted|rejected) of a user story (review context, per-US toggle).',
  {
    project_id: PROJECT_ID_PARAM,
    user_story_id: z.number().int().describe('Numeric user story id (US-<id>)'),
    us_verdict: z.enum(['open', 'accepted', 'rejected']).describe('Story-level verdict'),
  },
  async ({ project_id, user_story_id, us_verdict }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('PATCH', `/api/user-stories/${user_story_id}/verdict`, { us_verdict }, pid)
    return ok(data)
  },
)

server.tool(
  'devd_user_story_remove',
  'WRITE: Delete a user story permanently.',
  {
    project_id: PROJECT_ID_PARAM,
    user_story_id: z.number().int().describe('Numeric user story id (US-<id>)'),
  },
  async ({ project_id, user_story_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('DELETE', `/api/user-stories/${user_story_id}`, null, pid)
    return ok(data)
  },
)

server.tool(
  'devd_issue_create_full',
  'WRITE: Create an issue with refinement fields (goal, background, context_notes, relevant_files, po_notes), optional sprint-assign and target_status — in ONE atomic API call. po_notes is the PO-facing free-text field (replaces the removed description field, DD2-131/132). E01/D09: per-issue acceptance_criteria + test_instruction are replaced by user_stories[].qa — add them after creation via devd_user_story_add.',
  {
    project_id: PROJECT_ID_PARAM,
    title: z.string().describe('Issue title (required)'),
    type: z
      .enum(ISSUE_TYPES)
      .describe('Issue type (required)'),
    priority: z.number().int().min(1).max(5).optional().describe('1 (highest) – 5 (lowest)'),
    goal: z.string().optional().describe('What outcome — pflicht für status=refined'),
    background: z.string().optional().describe('Why — pflicht für status=refined'),
    context_notes: z
      .string()
      .optional()
      .describe('Implementation context and notes. Per-US QA goes into user_stories[].qa (devd_user_story_add).'),
    relevant_files: z
      .string()
      .optional()
      .describe('JSON array or comma-list of file paths'),
    po_notes: z.string().optional(),
    tag_ids: z.array(z.number().int()).optional().describe('Tag ids to attach'),
    sprint_key: z
      .string()
      .optional()
      .describe('Sprint key (e.g. "DD#20") to assign right away'),
    target_status: z
      .enum(['new', 'refined'])
      .optional()
      .describe('Target status after creation (default new). refined requires goal+background.'),
  },
  async ({
    project_id,
    title,
    type,
    priority,
    goal,
    background,
    context_notes,
    relevant_files,
    po_notes,
    tag_ids,
    sprint_key,
    target_status,
  }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    if (target_status === 'refined' && (!goal || !background)) {
      return ok({
        error: true,
        message: 'target_status=refined requires goal AND background',
      })
    }

    let sprintId = null
    if (sprint_key) {
      sprintId = Number(await resolveSprintId(sprint_key, pid))
      if (!Number.isFinite(sprintId)) {
        return ok({ error: true, message: `Could not resolve sprint_key=${sprint_key}` })
      }
    }

    // Backend POST /api/backlog akzeptiert seit DD-Erweiterung 2026-05-07 alle
    // Refinement-Felder + sprint_id atomar (siehe ADR MCP
    // Tools 2026-05-07). Ein Call genügt — keine PUT/PATCH-Follow-ups mehr.
    const createBody = { title, type }
    if (priority !== undefined) createBody.priority = priority
    if (goal) createBody.goal = goal
    if (background) createBody.background = background
    if (context_notes) createBody.context_notes = context_notes
    if (relevant_files) createBody.relevant_files = relevant_files
    if (po_notes) createBody.po_notes = po_notes
    if (Array.isArray(tag_ids) && tag_ids.length) createBody.tag_ids = tag_ids
    if (sprintId !== null) createBody.sprint_id = sprintId
    if (target_status === 'refined' && sprintId === null) createBody.status = 'refined'

    const created = await apiRequest('POST', '/api/backlog', createBody, pid)
    if (created?.error) return ok(created)
    const result = {
      id: created.id,
      key: `${created.project_prefix}-${created.project_number}`,
      status: created.status,
      assigned_sprint: created.assigned_sprint,
      item: created,
    }
    return ok(result)
  },
)

server.tool(
  'devd_issue_bulk_create',
  'WRITE: Create many issues in ONE project. Each item is a single atomic POST (devd_issue_create_full semantics). Returns per-item { index, id, key, status, assigned_sprint } or { index, error, title }. Per-item failures are non-fatal — iteration continues.',
  {
    project_id: PROJECT_ID_PARAM,
    issues: z
      .array(
        z.object({
          title: z.string(),
          type: z.enum(ISSUE_TYPES),
          priority: z.number().int().min(1).max(5).optional(),
          goal: z.string().optional(),
          background: z.string().optional(),
          context_notes: z.string().optional(),
          relevant_files: z.string().optional(),
          po_notes: z.string().optional(),
          tag_ids: z.array(z.number().int()).optional(),
          sprint_key: z.string().optional(),
          target_status: z.enum(['new', 'refined']).optional(),
        }),
      )
      .min(1)
      .describe('Array of issue payloads'),
  },
  async ({ project_id, issues }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const results = []
    for (let i = 0; i < issues.length; i++) {
      const it = issues[i]
      try {
        if (it.target_status === 'refined' && (!it.goal || !it.background)) {
          results.push({ index: i, error: 'refined requires goal+background', title: it.title })
          continue
        }

        let sprintId = null
        if (it.sprint_key) {
          sprintId = Number(await resolveSprintId(it.sprint_key, pid))
          if (!Number.isFinite(sprintId)) {
            results.push({ index: i, error: `unresolved sprint_key=${it.sprint_key}`, title: it.title })
            continue
          }
        }

        // Single POST — Backend akzeptiert seit 2026-05-07 alle Felder atomar.
        const createBody = { title: it.title }
        for (const f of [
          'type',
          'priority',
          'goal',
          'background',
          'context_notes',
          'relevant_files',
          'po_notes',
        ]) {
          if (it[f] !== undefined) createBody[f] = it[f]
        }
        if (Array.isArray(it.tag_ids) && it.tag_ids.length) createBody.tag_ids = it.tag_ids
        if (sprintId !== null) createBody.sprint_id = sprintId
        if (it.target_status === 'refined' && sprintId === null) createBody.status = 'refined'

        const created = await apiRequest('POST', '/api/backlog', createBody, pid)
        if (created?.error) {
          results.push({ index: i, error: created, title: it.title })
          continue
        }
        results.push({
          index: i,
          id: created.id,
          key: `${created.project_prefix}-${created.project_number}`,
          status: created.status,
          assigned_sprint: created.assigned_sprint,
        })
      } catch (err) {
        results.push({ index: i, error: String(err?.message || err), title: it.title })
      }
    }
    const summary = {
      total: issues.length,
      ok: results.filter((r) => r.id && !r.error).length,
      partial: 0,
      failed: results.filter((r) => r.error && !r.id).length,
    }
    const out = { summary, results }
    return ok(out)
  },
)

// ---------------------------------------------------------------------------
// WRITE — Reviews
// ---------------------------------------------------------------------------

server.tool(
  'devd_review_create',
  'WRITE: Create a review round with verdict in ONE atomic POST (Backend nimmt review_status + comment direkt). Auto-Transitions: passed → issue passed (aus to_review/rejected); not_passed → issue rejected (aus to_review ODER passed — das Verdict führt, ein bereits-passed Issue wird zurückgezogen, DD#81-Trap-Rest-Fix). Comment Pflicht bei not_passed.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string().describe('Issue key (e.g. "DD-42") or numeric backlog id'),
    verdict: z
      .enum(['passed', 'not_passed'])
      .describe('Review verdict (binär seit DD-506 — partially_passed abgeschafft)'),
    comment: z
      .string()
      .optional()
      .describe('Review comment (required for not_passed)'),
    notes: z
      .string()
      .optional()
      .describe('Optional review-round notes (separate from comment)'),
  },
  async ({ project_id, id_or_key, verdict, comment, notes }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveIssueId(id_or_key, pid)
    const body = { review_status: verdict }
    if (comment) body.comment = comment
    if (notes) body.notes = notes
    const data = await apiRequest('POST', `/api/backlog/${id}/reviews`, body, pid)
    return ok(data)
  },
)

server.tool(
  'devd_review_reopen',
  'WRITE: Reopen the review of a to_review issue whose last round is already decided — opens a fresh pending round and clears the sprint review-submitted marker so devd_review_create works again (no 409). Idempotent: no new round if the last round is already open. Fixes the DD#81 trap where a verdict-less sprint-review-submit locked issues in to_review with only the UI Rework button as an escape. DD-186 unchanged: adds API surface only, no permission change — setting the verdict stays a PO action.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string().describe('Issue key (e.g. "DD-42") or numeric backlog id — must be in status to_review'),
  },
  async ({ project_id, id_or_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveIssueId(id_or_key, pid)
    const data = await apiRequest('POST', `/api/backlog/${id}/review/reopen`, {}, pid)
    return ok(data)
  },
)

// ---------------------------------------------------------------------------
// ToDos (DD-308) — Project-Home ToDo-Liste mit eigenem Lifecycle (open|done|cancelled).
// ---------------------------------------------------------------------------

server.tool(
  'devd_todo_list',
  'List project todos. Optional status filter (open|done|cancelled). Returns each todo with its links inline. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    status: z.enum(['open', 'done', 'cancelled']).optional().describe('Filter by todo status'),
  },
  async ({ project_id, status }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const qs = status ? `?status=${status}` : ''
    const data = await apiRequest('GET', `/api/projects/${encodeURIComponent(pid)}/todos${qs}`, null, pid)
    return ok(data)
  },
)

server.tool(
  'devd_todo_show',
  'Get a single todo with links. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    id: z.number().int().describe('Numeric todo id'),
  },
  async ({ project_id, id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const todos = await apiRequest('GET', `/api/projects/${encodeURIComponent(pid)}/todos`, null, pid)
    const todo = Array.isArray(todos) ? todos.find(t => t.id === id) : null
    if (!todo) return ok({ error: true, message: `Todo ${id} not found in project ${pid}` })
    return ok(todo)
  },
)

server.tool(
  'devd_todo_create',
  'WRITE: Create a new project todo. position = MAX+1 atomic. status defaults to "open".',
  {
    project_id: PROJECT_ID_PARAM,
    label: z.string().min(1).max(280).describe('Todo title (1-280 chars)'),
    details: z.string().max(8000).optional().describe('Optional markdown details'),
  },
  async ({ project_id, label, details }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const body = { label }
    if (details) body.details = details
    const data = await apiRequest('POST', `/api/projects/${encodeURIComponent(pid)}/todos`, body, pid)
    return ok(data)
  },
)

server.tool(
  'devd_todo_update',
  'WRITE: Update label / status / details. status must be open|done|cancelled (NOT issue lifecycle).',
  {
    project_id: PROJECT_ID_PARAM,
    id: z.number().int(),
    label: z.string().min(1).max(280).optional(),
    status: z.enum(['open', 'done', 'cancelled']).optional(),
    details: z.union([z.string().max(8000), z.null()]).optional().describe('Set to null to clear'),
  },
  async ({ project_id, id, label, status, details }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const body = {}
    if (label !== undefined) body.label = label
    if (status !== undefined) body.status = status
    if (details !== undefined) body.details = details
    const data = await apiRequest('PATCH', `/api/projects/${encodeURIComponent(pid)}/todos/${id}`, body, pid)
    return ok(data)
  },
)

server.tool(
  'devd_todo_delete',
  'WRITE: Delete a todo. CASCADE removes all links.',
  {
    project_id: PROJECT_ID_PARAM,
    id: z.number().int(),
  },
  async ({ project_id, id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('DELETE', `/api/projects/${encodeURIComponent(pid)}/todos/${id}`, null, pid)
    return ok({ deleted: true, id, response: data })
  },
)

server.tool(
  'devd_todo_link',
  'WRITE: Attach a link to a todo. type must be spec|issue|vault|url. target is validated per type (URL pattern, issue key DD-123, path-traversal reject for spec, [[/]]-reject for vault).',
  {
    project_id: PROJECT_ID_PARAM,
    id: z.number().int().describe('Numeric todo id (matches devd_todo_delete/show/update, DD2-266)'),
    type: z.enum(['spec', 'issue', 'vault', 'url']),
    target: z.string().min(1).max(2000),
  },
  async ({ project_id, id, type, target }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('POST', `/api/projects/${encodeURIComponent(pid)}/todos/${id}/links`, { type, target }, pid)
    return ok(data)
  },
)

// ---------------------------------------------------------------------------
// Project-Memory (MEM-10) — projektgebundenes Wissen, FTS5-first
// ---------------------------------------------------------------------------

server.tool(
  'devd_project_memory_log',
  'WRITE: Log a project-bound memory (architecture_decision | dead_end | bug_pattern | convention | external_constraint | session_log | knowledge) into project_memories. Append-only; corrections via the supersede endpoint. Decoupled from the global ~/.claude memory.',
  {
    project_id: PROJECT_ID_PARAM,
    category: z.enum(MEMORY_CATEGORIES).describe('Memory category'),
    summary: z.string().describe('Short one-line gist (required)'),
    content: z.string().optional().describe('Full detail / context'),
    tags: z.union([z.string(), z.array(z.string())]).optional().describe('Tags as array or space/comma string'),
    importance: z.number().int().min(1).max(3).optional().describe('1=high, 2=normal (default), 3=low'),
    pinned: z.boolean().optional().describe('Pin to top of lists/snapshots'),
    anchor: z.string().optional().describe('Stable addressable code (e.g. "D01") for section-patch (MEM-11)'),
    stability: z.enum(['stable', 'volatile']).optional().describe('stable=project rules (cache-warm prefix), volatile=task context'),
    source_type: z.string().optional().describe('e.g. review | commit | manual'),
    source_ref: z.string().optional().describe('Reference to origin (e.g. "MEM §4 D05", issue key, commit sha)'),
  },
  async ({ project_id, ...body }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('POST', '/api/project-memories', body, pid)
    return ok(data)
  },
)

server.tool(
  'devd_project_memory_query',
  'FTS5 search over the project-bound memory store. Returns active rows (not deleted/superseded) ranked by relevance + recency, each with source_ref + validity. Special chars in the query are hardened automatically. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    q: z.string().describe('Search query (FTS5 over summary/content/tags)'),
    category: z.enum(MEMORY_CATEGORIES).optional().describe('Restrict to one category'),
    limit: z.number().int().min(1).max(100).optional().describe('Max hits (default 25)'),
  },
  async ({ project_id, q, category, limit }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const params = new URLSearchParams({ q })
    if (category) params.set('category', category)
    if (limit) params.set('limit', String(limit))
    const data = await apiRequest('GET', `/api/project-memories/search?${params.toString()}`, null, pid)
    return ok(data)
  },
)

server.tool(
  'devd_project_memory_list',
  'List project-bound memories (active only), optionally filtered by category. Compact by default (DD-622, no 64k content field); fields=full for everything, or devd_project_memory_show for one. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    category: z.enum(MEMORY_CATEGORIES).optional().describe('Restrict to one category'),
    fields: z.enum(['compact', 'full']).optional().describe('DD-622: compact (default, token-safe) or full (incl. content)'),
    limit: z.number().int().min(1).optional().describe('DD-622: max rows'),
    offset: z.number().int().min(0).optional().describe('DD-622: skip first N rows'),
  },
  async ({ project_id, category, fields, limit, offset }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (fields) params.set('fields', fields)
    if (limit !== undefined) params.set('limit', String(limit))
    if (offset !== undefined) params.set('offset', String(offset))
    const qs = params.toString() ? `?${params.toString()}` : ''
    const data = await apiRequest('GET', `/api/project-memories${qs}`, null, pid)
    return ok(data)
  },
)

server.tool(
  'devd_project_memory_show',
  'Get a single project-bound memory by numeric id. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    id: z.number().int().describe('project_memories row id'),
  },
  async ({ project_id, id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('GET', `/api/project-memories/${id}`, null, pid)
    return ok(data)
  },
)

// DD-625: project-memory Write-Vollständigkeit — update/supersede/delete + anchor get/patch.
// REST-Routen existierten (PATCH/:id, DELETE/:id, POST/:id/supersede, GET/PATCH anchor/:anchor);
// hier als MCP gespiegelt (CLI-Pendants in bin/devd-cli.js). Enum-Inline z.enum(MEMORY_CATEGORIES)
// wie devd_project_memory_log (Source-Grep-Parität, project_memory MCP-ENUM-SOURCEGREP #304).
// Geteilte Editier-Felder (alle optional — PATCH-Semantik). category-Enum identisch zu log.
const MEMORY_EDIT_FIELDS = {
  category: z.enum(MEMORY_CATEGORIES).optional().describe('Memory category'),
  summary: z.string().optional().describe('Short one-line gist'),
  content: z.string().optional().describe('Full detail / context'),
  tags: z.union([z.string(), z.array(z.string())]).optional().describe('Tags as array or space/comma string'),
  importance: z.number().int().min(1).max(3).optional().describe('1=high, 2=normal, 3=low'),
  pinned: z.boolean().optional().describe('Pin to top of lists/snapshots'),
  anchor: z.string().optional().describe('Stable addressable code (e.g. "D01")'),
  stability: z.enum(['stable', 'volatile']).optional().describe('stable=project rules, volatile=task context'),
  source_type: z.string().optional().describe('e.g. review | commit | manual'),
  source_ref: z.string().optional().describe('Reference to origin'),
}

server.tool(
  'devd_project_memory_update',
  'WRITE: Update an existing project-memory in place (PATCH /api/project-memories/:id). Only provided fields change. For append-only corrections that preserve history, use devd_project_memory_supersede instead.',
  {
    project_id: PROJECT_ID_PARAM,
    id: z.number().int().describe('project_memories row id'),
    ...MEMORY_EDIT_FIELDS,
  },
  async ({ project_id, id, ...body }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('PATCH', `/api/project-memories/${id}`, body, pid)
    return ok(data)
  },
)

server.tool(
  'devd_project_memory_supersede',
  'WRITE: Append-only correction — creates a NEW memory row and points the old one at it via superseded_by (history preserved). POST /api/project-memories/:id/supersede. Unset fields are inherited from the existing row.',
  {
    project_id: PROJECT_ID_PARAM,
    id: z.number().int().describe('project_memories row id to supersede'),
    ...MEMORY_EDIT_FIELDS,
  },
  async ({ project_id, id, ...body }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('POST', `/api/project-memories/${id}/supersede`, body, pid)
    return ok(data)
  },
)

server.tool(
  'devd_project_memory_delete',
  'WRITE: Soft-delete a project-memory (sets deleted_at; DELETE /api/project-memories/:id). Excluded from list/query/snapshot afterwards.',
  {
    project_id: PROJECT_ID_PARAM,
    id: z.number().int().describe('project_memories row id'),
  },
  async ({ project_id, id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('DELETE', `/api/project-memories/${id}`, null, pid)
    if (data && data.error) return ok(data)
    return ok({ deleted: true, id })
  },
)

// ---------------------------------------------------------------------------
// MEM-25: memory_tags — kuratiertes Stichwort-Register (Controlled Vocabulary).
// Grill 2026-06-21 D06-D11. Tags an Memories validieren hart gegen dieses Register
// (self-activating: leeres Register = keine Prüfung). Drift-Killer für die 509-Tag-Lage.
// ---------------------------------------------------------------------------

server.tool(
  'devd_memory_tag_list',
  'List the curated tag register for a project (Controlled Vocabulary for project_memories tags). Optional FTS filter. Each row carries usage_count (active memories using it). Use this to pick valid tags BEFORE logging a memory. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    query: z.string().optional().describe('FTS filter over tag names (substring/fuzzy)'),
  },
  async ({ project_id, query }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const qs = query ? `?query=${encodeURIComponent(query)}` : ''
    return ok(await apiRequest('GET', `/api/project-memory-tags${qs}`, null, pid))
  },
)

server.tool(
  'devd_memory_tag_create',
  'WRITE: Register a new allowed tag (Controlled Vocabulary). Required before a memory may use it once the register is non-empty (hard-block enforcement). Check devd_memory_tag_list first to avoid synonyms.',
  {
    project_id: PROJECT_ID_PARAM,
    tag: z.string().describe('Tag token (alphanumeric start, . _ - allowed, NO spaces, max 40)'),
    description: z.string().optional().describe('What this tag means / when to use it'),
  },
  async ({ project_id, tag, description }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('POST', '/api/project-memory-tags', { tag, description }, pid))
  },
)

server.tool(
  'devd_memory_tag_rename',
  'WRITE: Rename a register tag, doubling as MERGE: folds <old> into <new> across all memories (repoints + dedupes tokens). If <new> already exists it merges; otherwise it renames. Use for synonym cleanup (gf2/GF-2/greenfield → gf-2).',
  {
    project_id: PROJECT_ID_PARAM,
    old: z.string().describe('Existing register tag to fold away'),
    new: z.string().describe('Canonical target tag (created if missing)'),
  },
  async ({ project_id, old: oldTag, new: newTag }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('POST', '/api/project-memory-tags/rename', { old: oldTag, new: newTag }, pid))
  },
)

server.tool(
  'devd_memory_tag_delete',
  'WRITE: Remove a tag from the register. Returns usage_count (how many active memories still carry it) as a guard — those memories keep the literal token but it will fail re-validation on next edit.',
  {
    project_id: PROJECT_ID_PARAM,
    tag: z.string().describe('Register tag to delete'),
  },
  async ({ project_id, tag }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('DELETE', `/api/project-memory-tags/${encodeURIComponent(tag)}`, null, pid))
  },
)

server.tool(
  'devd_memory_tag_prune',
  'WRITE: Strip every token that is NOT in the register from all active memories (migration cleanup for the singleton-drop decision). Idempotent. Returns { touched }. Run AFTER seeding the register + folding synonyms via devd_memory_tag_rename.',
  {
    project_id: PROJECT_ID_PARAM,
  },
  async ({ project_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('POST', '/api/project-memory-tags/prune', {}, pid))
  },
)

server.tool(
  'devd_project_memory_anchor_get',
  'Get the active project-memory row addressed by its anchor (D-code), e.g. "D01" / "CONTRACT-GATEWAY-PATTERN". GET /api/project-memories/anchor/:anchor. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    anchor: z.string().describe('Anchor code (e.g. "D01")'),
  },
  async ({ project_id, anchor }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('GET', `/api/project-memories/anchor/${encodeURIComponent(anchor)}`, null, pid)
    return ok(data)
  },
)

server.tool(
  'devd_project_memory_anchor_patch',
  'WRITE: Patch the active project-memory addressed by its anchor (D-code) without knowing its numeric id. PATCH /api/project-memories/anchor/:anchor. Only provided fields change.',
  {
    project_id: PROJECT_ID_PARAM,
    anchor: z.string().describe('Anchor code (e.g. "D01")'),
    ...MEMORY_EDIT_FIELDS,
  },
  async ({ project_id, anchor, ...body }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('PATCH', `/api/project-memories/anchor/${encodeURIComponent(anchor)}`, body, pid)
    return ok(data)
  },
)

// ---------------------------------------------------------------------------
// Tags (DD-624) — REST existierte (4 Tag-Routen + PUT backlog/:id/tags); CLI+MCP gespiegelt.
// ---------------------------------------------------------------------------

// Tag-Namen (Array oder comma-String) gegen GET /api/tags auf tag_ids auflösen.
async function resolveTagIds(names, pid) {
  const list = Array.isArray(names) ? names : String(names).split(',')
  const wanted = list.map(s => String(s).trim()).filter(Boolean)
  const all = await apiRequest('GET', '/api/tags', null, pid)
  if (all && all.error) return { error: all }
  const byName = new Map((all || []).map(t => [String(t.name).toLowerCase(), t.id]))
  const ids = []
  const missing = []
  for (const n of wanted) {
    const id = byName.get(n.toLowerCase())
    if (id) ids.push(id)
    else missing.push(n)
  }
  return { ids, missing }
}

server.tool(
  'devd_tag_list',
  'List tags of the active project with usage counts. Read-only.',
  { project_id: PROJECT_ID_PARAM },
  async ({ project_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('GET', '/api/tags', null, pid))
  },
)

server.tool(
  'devd_tag_create',
  'WRITE: Create a tag in the active project. POST /api/tags.',
  {
    project_id: PROJECT_ID_PARAM,
    name: z.string().describe('Tag name (unique per project)'),
    color: z.enum(TAG_COLORS).optional().describe('Tag color (default mauve)'),
  },
  async ({ project_id, name, color }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const body = { name }
    if (color) body.color = color
    return ok(await apiRequest('POST', '/api/tags', body, pid))
  },
)

server.tool(
  'devd_tag_update',
  'WRITE: Rename a tag or change its color. PUT /api/tags/:id.',
  {
    project_id: PROJECT_ID_PARAM,
    id: z.number().int().describe('tag id'),
    name: z.string().optional().describe('New name'),
    color: z.enum(TAG_COLORS).optional().describe('New color'),
  },
  async ({ project_id, id, name, color }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const body = {}
    if (name !== undefined) body.name = name
    if (color !== undefined) body.color = color
    return ok(await apiRequest('PUT', `/api/tags/${id}`, body, pid))
  },
)

server.tool(
  'devd_tag_delete',
  'WRITE: Delete a tag (cascades — removes it from all issues). DELETE /api/tags/:id.',
  {
    project_id: PROJECT_ID_PARAM,
    id: z.number().int().describe('tag id'),
  },
  async ({ project_id, id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('DELETE', `/api/tags/${id}`, null, pid))
  },
)

server.tool(
  'devd_issue_tag_set',
  'WRITE: Replace ALL tags on an issue with the given tag names (full set; empty array clears). Names are resolved to ids against the project tags; unknown names are reported, not auto-created. PUT /api/backlog/:id/tags.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string().describe('Issue key or numeric id'),
    tags: z.union([z.string(), z.array(z.string())]).describe('Tag names (array or comma string); [] / "" clears all'),
  },
  async ({ project_id, id_or_key, tags }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const issueId = await resolveIssueId(id_or_key, pid)
    const empty = (Array.isArray(tags) ? tags.length === 0 : String(tags).trim() === '')
    let tagIds = []
    if (!empty) {
      const r = await resolveTagIds(tags, pid)
      if (r.error) return ok(r.error)
      if (r.missing.length) return ok({ error: true, code: 'UNKNOWN_TAGS', missing: r.missing, note: 'Create them first with devd_tag_create.' })
      tagIds = r.ids
    }
    return ok(await apiRequest('PUT', `/api/backlog/${issueId}/tags`, { tag_ids: tagIds }, pid))
  },
)

server.tool(
  'devd_issue_tag_remove',
  'WRITE: Remove the given tag names from an issue (keeps the rest). Fetches the current tags, subtracts, and writes the remaining set. PUT /api/backlog/:id/tags.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string().describe('Issue key or numeric id'),
    tags: z.union([z.string(), z.array(z.string())]).describe('Tag names to remove (array or comma string)'),
  },
  async ({ project_id, id_or_key, tags }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const issueId = await resolveIssueId(id_or_key, pid)
    const list = Array.isArray(tags) ? tags : String(tags).split(',')
    const remove = new Set(list.map(s => String(s).trim().toLowerCase()).filter(Boolean))
    const item = await apiRequest('GET', `/api/backlog/${issueId}`, null, pid)
    if (item && item.error) return ok(item)
    const keep = (item.tags || []).filter(t => !remove.has(String(t.name).toLowerCase()))
    return ok(await apiRequest('PUT', `/api/backlog/${issueId}/tags`, { tag_ids: keep.map(t => t.id) }, pid))
  },
)

// ---------------------------------------------------------------------------
// GF-2 Wave D / D1: Sprint + Milestone Tags (mirror devd_issue_tag_set/remove).
// Additive Junctions sprint_tags/milestone_tags. Numerische Entity-ids (wie devd_*_dep_*).
// Shared replace/remove-Logik; pro Tool explizit registriert (grep-bare Tool-Namen).
async function setEntityTags(pid, basePath, id, tags) {
  const empty = (Array.isArray(tags) ? tags.length === 0 : String(tags).trim() === '')
  let tagIds = []
  if (!empty) {
    const r = await resolveTagIds(tags, pid)
    if (r.error) return r.error
    if (r.missing.length) return { error: true, code: 'UNKNOWN_TAGS', missing: r.missing, note: 'Create them first with devd_tag_create.' }
    tagIds = r.ids
  }
  return apiRequest('PUT', `${basePath}/${id}/tags`, { tag_ids: tagIds }, pid)
}
async function removeEntityTags(pid, basePath, id, tags) {
  const list = Array.isArray(tags) ? tags : String(tags).split(',')
  const remove = new Set(list.map(s => String(s).trim().toLowerCase()).filter(Boolean))
  const cur = await apiRequest('GET', `${basePath}/${id}/tags`, null, pid)
  if (cur && cur.error) return cur
  const keep = (cur.tags || []).filter(t => !remove.has(String(t.name).toLowerCase()))
  return apiRequest('PUT', `${basePath}/${id}/tags`, { tag_ids: keep.map(t => t.id) }, pid)
}

server.tool(
  'devd_sprint_tag_set',
  'WRITE: Replace ALL tags on a sprint with the given tag names (full set; empty clears). Unknown names reported, not auto-created. PUT /api/sprints/:id/tags.',
  {
    project_id: PROJECT_ID_PARAM,
    sprint_key: z.string().describe('Sprint key (e.g. "DD#20") or numeric sprint id (DD2-264: was strict-numeric sprint_id)'),
    tags: z.union([z.string(), z.array(z.string())]).describe('Tag names (array or comma string); [] / "" clears all'),
  },
  async ({ project_id, sprint_key, tags }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveSprintId(sprint_key, pid)
    return ok(await setEntityTags(pid, '/api/sprints', id, tags))
  },
)
server.tool(
  'devd_sprint_tag_remove',
  'WRITE: Remove the given tag names from a sprint (keeps the rest). PUT /api/sprints/:id/tags.',
  {
    project_id: PROJECT_ID_PARAM,
    sprint_key: z.string().describe('Sprint key (e.g. "DD#20") or numeric sprint id (DD2-264: was strict-numeric sprint_id)'),
    tags: z.union([z.string(), z.array(z.string())]).describe('Tag names to remove (array or comma string)'),
  },
  async ({ project_id, sprint_key, tags }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveSprintId(sprint_key, pid)
    return ok(await removeEntityTags(pid, '/api/sprints', id, tags))
  },
)
server.tool(
  'devd_milestone_tag_set',
  'WRITE: Replace ALL tags on a milestone with the given tag names (full set; empty clears). Unknown names reported, not auto-created. PUT /api/milestones/:id/tags.',
  {
    project_id: PROJECT_ID_PARAM,
    milestone_id: z.coerce.number().int().positive().describe('Numeric milestone id'),
    tags: z.union([z.string(), z.array(z.string())]).describe('Tag names (array or comma string); [] / "" clears all'),
  },
  async ({ project_id, milestone_id, tags }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await setEntityTags(pid, '/api/milestones', milestone_id, tags))
  },
)
server.tool(
  'devd_milestone_tag_remove',
  'WRITE: Remove the given tag names from a milestone (keeps the rest). PUT /api/milestones/:id/tags.',
  {
    project_id: PROJECT_ID_PARAM,
    milestone_id: z.coerce.number().int().positive().describe('Numeric milestone id'),
    tags: z.union([z.string(), z.array(z.string())]).describe('Tag names to remove (array or comma string)'),
  },
  async ({ project_id, milestone_id, tags }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await removeEntityTags(pid, '/api/milestones', milestone_id, tags))
  },
)

// ---------------------------------------------------------------------------
// GF-2 Wave D / D2 (T01): Sprint-Dependencies (mirror devd_milestone_dep_*).
server.tool(
  'devd_sprint_dep_add',
  'WRITE: Add a sprint dependency (predecessor must finish before successor). Routes POST /api/sprint-dependencies. DFS cycle-detection — a cycle is rejected 409 and passed through 1:1. Accepts sprint keys (e.g. "DD2#34") or numeric ids (DD2-264: was strict-numeric only).',
  {
    project_id: PROJECT_ID_PARAM,
    predecessor_id: z.union([z.string(), z.number()]).describe('Predecessor sprint key or numeric id'),
    successor_id: z.union([z.string(), z.number()]).describe('Successor sprint key or numeric id'),
  },
  async ({ project_id, predecessor_id, successor_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const predId = Number(await resolveSprintId(String(predecessor_id), pid))
    const succId = Number(await resolveSprintId(String(successor_id), pid))
    return ok(await apiRequest('POST', '/api/sprint-dependencies', { predecessor_id: predId, successor_id: succId }, pid))
  },
)
server.tool(
  'devd_sprint_dep_list',
  'List a sprint dependencies: { predecessors, successors } with dependency edge id. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    sprint_key: z.string().describe('Sprint key (e.g. "DD#20") or numeric sprint id (DD2-264: was strict-numeric sprint_id)'),
  },
  async ({ project_id, sprint_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveSprintId(sprint_key, pid)
    return ok(await apiRequest('GET', `/api/sprints/${id}/dependencies`, null, pid))
  },
)
server.tool(
  'devd_sprint_dep_remove',
  'WRITE: Remove a sprint dependency edge by its dependency id (from devd_sprint_dep_list). Routes DELETE /api/sprint-dependencies/:id.',
  {
    project_id: PROJECT_ID_PARAM,
    dependency_id: z.coerce.number().int().positive().describe('Dependency edge id (dep# from dep_list)'),
  },
  async ({ project_id, dependency_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    await apiRequest('DELETE', `/api/sprint-dependencies/${dependency_id}`, null, pid)
    return ok({ ok: true, removed: dependency_id })
  },
)

// ---------------------------------------------------------------------------
// GF-2 Wave D / D4 (T03, D-L): Sprint-Completeness (computed, issues-only).
server.tool(
  'devd_sprint_completeness',
  'READ: Sprint completion — issues passed/total + percent (issues-only; no story-points in the data model). GET /api/sprints/:id/completeness.',
  {
    project_id: PROJECT_ID_PARAM,
    sprint_key: z.string().describe('Sprint key (e.g. "DD#20") or numeric sprint id (DD2-264: was strict-numeric sprint_id)'),
  },
  async ({ project_id, sprint_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveSprintId(sprint_key, pid)
    return ok(await apiRequest('GET', `/api/sprints/${id}/completeness`, null, pid))
  },
)

// GF-2 Wave D / D3 (T04): Activity-Read für Sprint + Milestone (mirror devd_issue_activity).
server.tool(
  'devd_sprint_activity',
  'READ: Sprint audit-log activity (newest first). Reconciles table_name drift (sprint/sprints). GET /api/sprints/:id/activity.',
  {
    project_id: PROJECT_ID_PARAM,
    sprint_key: z.string().describe('Sprint key (e.g. "DD#20") or numeric sprint id (DD2-264: was strict-numeric sprint_id)'),
    limit: z.coerce.number().int().min(1).max(200).optional().describe('Max rows (default 100)'),
  },
  async ({ project_id, sprint_key, limit }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveSprintId(sprint_key, pid)
    const qs = limit ? `?limit=${limit}` : ''
    return ok(await apiRequest('GET', `/api/sprints/${id}/activity${qs}`, null, pid))
  },
)
server.tool(
  'devd_milestone_activity',
  'READ: Milestone audit-log activity (newest first). GET /api/milestones/:id/activity.',
  {
    project_id: PROJECT_ID_PARAM,
    milestone_id: z.coerce.number().int().positive().describe('Numeric milestone id'),
    limit: z.coerce.number().int().min(1).max(200).optional().describe('Max rows (default 100)'),
  },
  async ({ project_id, milestone_id, limit }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const qs = limit ? `?limit=${limit}` : ''
    return ok(await apiRequest('GET', `/api/milestones/${milestone_id}/activity${qs}`, null, pid))
  },
)

// ---------------------------------------------------------------------------
// Backlog Audit-Gap-Verben (DD-621) — REST existierte (bulk/delete/move/activity).
// ---------------------------------------------------------------------------

server.tool(
  'devd_issue_bulk',
  'WRITE: Bulk action on many issues. action ∈ set_status | set_sprint | cancel | soft_delete | add_tags | remove_tags. ids accept keys or numeric ids (resolved). Per action: set_status→status; set_sprint→sprint_key; cancel→notes; add_tags/remove_tags→tags (names). Lifecycle/ownership validated server-side; returns {ok, failed}.',
  {
    project_id: PROJECT_ID_PARAM,
    ids: z.array(z.union([z.string(), z.number()])).describe('Issue keys or numeric ids'),
    action: z.enum(BULK_ACTIONS).describe('Bulk action'),
    status: z.string().optional().describe('set_status: target status'),
    sprint_key: z.string().optional().describe('set_sprint: sprint key/id, or "null"/"none" to unassign'),
    notes: z.string().optional().describe('cancel: cancellation note'),
    tags: z.union([z.string(), z.array(z.string())]).optional().describe('add_tags/remove_tags: tag names'),
  },
  async ({ project_id, ids, action, status, sprint_key, notes, tags }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const numericIds = []
    for (const ref of ids) numericIds.push(Number(await resolveIssueId(ref, pid)))
    const payload = {}
    if (status !== undefined) payload.status = status
    if (notes !== undefined) payload.notes = notes
    if (sprint_key !== undefined) {
      payload.sprint_id = (sprint_key === 'null' || sprint_key === 'none') ? null : Number(await resolveSprintId(sprint_key, pid))
    }
    if (tags !== undefined) {
      const r = await resolveTagIds(tags, pid)
      if (r.error) return ok(r.error)
      if (r.missing.length) return ok({ error: true, code: 'UNKNOWN_TAGS', missing: r.missing })
      payload.tag_ids = r.ids
    }
    return ok(await apiRequest('PATCH', '/api/backlog/bulk', { ids: numericIds, action, payload }, pid))
  },
)

server.tool(
  'devd_issue_delete',
  'WRITE: Delete an issue. Without force the backend returns 409 (use status=cancelled instead). force=true hard-deletes (cascades dependencies + reviews). DELETE /api/backlog/:id.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string().describe('Issue key or numeric id'),
    force: z.boolean().optional().describe('Hard-delete (default false → 409 with a hint to cancel)'),
  },
  async ({ project_id, id_or_key, force }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const issueId = await resolveIssueId(id_or_key, pid)
    const data = await apiRequest('DELETE', `/api/backlog/${issueId}${force ? '?force=1' : ''}`, null, pid)
    if (data && data.error) return ok(data)
    return ok({ deleted: true, id_or_key, forced: !!force })
  },
)

server.tool(
  'devd_issue_move',
  'WRITE: Move an issue to another project (gets a new project_number/key there). Blocked while in_progress/to_review. POST /api/backlog/:id/move.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string().describe('Issue key or numeric id'),
    target_project: z.union([z.string(), z.number()]).describe('Target project id or slug'),
  },
  async ({ project_id, id_or_key, target_project }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    // Ziel-Projekt auf numerische id auflösen — der move-Endpoint will target_project_id
    // numerisch. GET /api/projects/:id resolved id ODER slug (DD-390).
    const target = await apiRequest('GET', `/api/projects/${encodeURIComponent(String(target_project))}`)
    if (target && target.error) return ok(target)
    const issueId = await resolveIssueId(id_or_key, pid)
    return ok(await apiRequest('POST', `/api/backlog/${issueId}/move`, { target_project_id: target.id }, pid))
  },
)

server.tool(
  'devd_issue_activity',
  'Audit-log activity for an issue (newest first): timestamp, agent_id, action, old/new value. GET /api/backlog/:id/activity. Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string().describe('Issue key or numeric id'),
    limit: z.number().int().min(1).max(200).optional().describe('Max rows (default 100)'),
  },
  async ({ project_id, id_or_key, limit }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const issueId = await resolveIssueId(id_or_key, pid)
    const qs = limit !== undefined ? `?limit=${limit}` : ''
    return ok(await apiRequest('GET', `/api/backlog/${issueId}/activity${qs}`, null, pid))
  },
)

// ---------------------------------------------------------------------------
// Issue-Dependencies (MEM-14) — REST + Zyklus-Schutz existieren; dies wrappt sie
// ---------------------------------------------------------------------------

server.tool(
  'devd_issue_dep_add',
  'WRITE: Add a dependency edge — issue depends_on another issue (depends_on must finish first → it blocks issue). Self-reference, duplicate and cycles are rejected by the backend. Same-project only (keys resolve within the project). Accepts issue keys (e.g. "MEM-9") or numeric ids — same "either representation" pattern as sprint/milestone deps (predecessor_id/successor_id), just resolved client-side (DD2-259).',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.union([z.string(), z.number()]).describe('The dependent issue (key or numeric id)'),
    depends_on: z.union([z.string(), z.number()]).describe('The issue it depends on / is blocked by (key or numeric id)'),
    note: z.string().optional().describe('Optional note on the edge'),
  },
  async ({ project_id, id_or_key, depends_on, note }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const issueId = await resolveIssueId(String(id_or_key), pid)
    const onId = await resolveIssueId(String(depends_on), pid)
    const body = { depends_on_id: Number(onId) }
    if (note !== undefined) body.note = note
    const data = await apiRequest('POST', `/api/backlog/${issueId}/dependencies`, body, pid)
    return ok(data)
  },
)

server.tool(
  'devd_issue_dep_list',
  'List dependencies of an issue: blockers (issues it depends on) + blocked_by (issues that depend on it). Read-only.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string().describe('Issue key or numeric id'),
  },
  async ({ project_id, id_or_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const issueId = await resolveIssueId(id_or_key, pid)
    const data = await apiRequest('GET', `/api/backlog/${issueId}/dependencies`, null, pid)
    return ok(data)
  },
)

server.tool(
  'devd_issue_dep_remove',
  'WRITE: Remove the dependency edge issue→depends_on. Resolves the edge id internally. Same-project only. Accepts keys or numeric ids.',
  {
    project_id: PROJECT_ID_PARAM,
    id_or_key: z.string().describe('The dependent issue (key or numeric id)'),
    depends_on: z.string().describe('The depended-on issue (key or numeric id)'),
  },
  async ({ project_id, id_or_key, depends_on }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const issueId = await resolveIssueId(id_or_key, pid)
    const onId = await resolveIssueId(depends_on, pid)
    const deps = await apiRequest('GET', `/api/backlog/${issueId}/dependencies`, null, pid)
    if (deps && deps.error) return ok(deps)
    const edge = (deps.blockers || []).find((b) => b.id === Number(onId))
    if (!edge) return ok({ error: true, message: `Keine Dependency ${id_or_key} → ${depends_on}` })
    const data = await apiRequest('DELETE', `/api/dependencies/${edge.dep_id}`, null, pid)
    return ok({ removed: true, id_or_key, depends_on, dep_id: edge.dep_id, response: data })
  },
)

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport()
await server.connect(transport)
