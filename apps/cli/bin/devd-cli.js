#!/usr/bin/env node
/**
 * DevDash CLI — Sprint-, Issue- und Projekt-Kommandos gegen die lokale API.
 *
 * Usage (Sprint-Keys: <PREFIX>#<NR> z.B. DD#20 — alternativ globale ID):
 *   devd-cli project list [--archived]
 *   devd-cli project show <id|slug>
 *   devd-cli project create <slug> --name <text> --prefix <PREFIX>
 *                                  [--color <hex>] [--description <text>] [--path <repo-path>]
 *
 *   devd-cli sprint list [--status <s>]
 *   devd-cli sprint show <key|id>
 *   devd-cli sprint context <key|id> [--format json|markdown]
 *                                  [--screenshots [--output-dir <dir>]]
 *   devd-cli sprint create <name> [--goal <text>]
 *   devd-cli sprint start <key|id>           # new → in_progress
 *   devd-cli sprint review <key|id>          # in_progress → to_review
 *   devd-cli sprint complete <key|id>        # to_review → completed (setzt passed→completed)
 *   devd-cli sprint cancel <key|id> --notes <text>
 *   devd-cli sprint rev-results <key|id>     # PO-Review-Status pro Issue
 *   devd-cli sprint export <key|id> [--format csv|md]   # Sprint-Issues nach stdout
 *
 *   devd-cli issue list [--sprint <key|id>] [--status <s>] [--search <q>]
 *   devd-cli issue show <id|key>
 *   devd-cli issue create <title> [--type <t>] [--priority <n>] [--description <text>]
 *   devd-cli issue update <id|key> [--title|--type|--priority|--goal|--background|
 *                                   --acceptance-criteria|--context-notes|--relevant-files|--po-notes|--description|
 *                                   --test-instruction|--assigned-sprint <val>]
 *                                  [--goal-editor|--background-editor|--context-notes-editor|
 *                                   --po-notes-editor|--description-editor]
 *   devd-cli issue status <id|key> <new-status>
 *   devd-cli issue assign-sprint <id|key> --sprint <key|id|null|none>
 *
 *   devd-cli subtask add <id|key> --title <text> [--qa <text>]
 *   devd-cli subtask list <id|key>
 *   devd-cli subtask done <ST-id|subtask-id>
 *   devd-cli subtask edit <ST-id|subtask-id> [--title <text>] [--qa <text>] [--position <n>]
 *   devd-cli subtask rm <ST-id|subtask-id> [--yes]
 *   devd-cli userstory add|list|edit|verdict|rm  (E01 — user_stories, us_verdict)
 *
 *   devd-cli review create <id|key> <passed|not_passed>
 *                                  [--comment <text>] [--comment-editor]
 *
 *   devd-cli help
 *
 * Env:
 *   DEVD_API_URL      — Default http://100.71.39.53:3001 (Synology NAS via Tailnet)
 *   DEVD_PROJECT_ID   — Default 2 (devd)
 *   DEVD_API_TOKEN    — DD-285 Defense-in-Depth Token; als X-Devd-Token-Header
 *                       bei jeder Anfrage gesendet (Pflicht in Production wenn
 *                       Backend DEVD_API_TOKEN gesetzt hat)
 *   EDITOR            — Editor für die --<feld>-editor-Flows (Default: vi)
 */
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { spawnSync } from 'child_process'
import { tmpdir } from 'os'
import { join } from 'path'
// DD-557: Zod-Contracts als Single Source — CLI-Args werden hier validiert,
// dieselben Schemas treiben MCP-inputSchema + REST-Validation.
import {
  milestoneCreateContract,
  milestoneStatusContract,
  milestoneUpdateContract,
  milestoneDependencyContract,
  sprintDependencyContract,
  sprintSetMilestoneContract,
  sprintCreateContract,
  sprintUpdateContract,
  sprintReorderContract,
  parseOrThrow,
} from '@devd/api-types/milestone-sprint.contracts.js'
// DD-611: toleranter Key-Parser (dd-77 ≡ DD#77 ≡ dd77 ≡ 77) — geteilt mit MCP.
import { parseRef } from '@devd/api-types/keys.js'
// DD-560: backlog/issue-Contracts (Single Source mit REST + MCP).
import {
  issueCreateContract,
  issueUpdateContract,
  issueStatusContract,
  backlogBulkContract,
  backlogMoveContract,
} from '@devd/api-types/backlog.contracts.js'
// DD-562: project-todos/todo-links-Contracts (Single Source mit REST + MCP).
import {
  todoCreateContract,
  todoUpdateContract,
  todoLinkContract,
} from '@devd/api-types/todo.contracts.js'
// DD-563: project-memories-Contracts (Single Source mit REST-Lib + MCP-Enum).
// DD-625: update/supersede-Contracts ergänzt (Write-Vollständigkeit CLI+MCP).
import {
  memoryLogContract,
  memoryUpdateContract,
  memorySupersedeContract,
} from '@devd/api-types/project-memory.contracts.js'
// DD-624: Tag-Contracts (Single Source mit REST + MCP).
import {
  tagCreateContract,
  tagUpdateContract,
  issueTagsContract,
  sprintTagsContract,
  milestoneTagsContract,
} from '@devd/api-types/tag.contracts.js'
// DD-565: Subtask-Contracts (Single Source mit REST-Lib; MCP bleibt inline, kein dedupbares Literal).
import {
  subtaskCreateContract,
  subtaskEditContract,
} from '@devd/api-types/subtask.contracts.js'
// E01.3: User-Story-Contracts (Single Source mit REST-Lib).
import {
  userStoryCreateContract,
  userStoryUpdateContract,
  userStoryVerdictContract,
} from '@devd/api-types/userStory.contracts.js'
// DD-tui-phase1 (D01): geteilter REST-Client — CLI + TUI nutzen einen Client.
import { createApiClient } from '../lib/apiClient.js'

// DevD seit 2026-05-22 auf NAS (Synology, Tailnet-IP). Mac-lokaler Server stillgelegt
// (DD-247). Override per DEVD_API_URL ENV bleibt möglich für lokales Dev-Setup.
const API = process.env.DEVD_API_URL || 'http://100.71.39.53:3001'
const DEVD_UI_URL = (process.env.DEVD_UI_URL || 'https://devdash.familie-riedel.org').replace(/\/$/, '')
const PROJECT_ID = process.env.DEVD_PROJECT_ID || '2'
const DEVD_API_TOKEN = process.env.DEVD_API_TOKEN || ''

// DD-tui-phase1 (D01): geteilter Client; headers()/api() delegieren hierher.
const _client = createApiClient({
  baseUrl: API,
  projectId: PROJECT_ID,
  token: DEVD_API_TOKEN,
})

// DD-519 (D50a): SOP-Bundle ausschliesslich aus dem DB-Store (/api/sops/bundle) — der
// DB-Store ist Master (SOP-D01). Der frühere Filesystem-Fallback aus dem Vault-Pfad
// (DD-214) ist ENTFERNT: kein Vault-Read mehr, damit remote/NAS-Agenten ohne Vault-Mount
// nicht crashen. Bei API-Fehler oder leerem Bundle gibt es einen sauberen stderr-Hinweis
// statt eines Dateisystem-Zugriffs. MCP-Pfad (mcp/devd-mcp.js → fetchSOPText) ist bereits
// API-only und bleibt die Referenz.
async function printSOPBundle(commandKey, sprintRef) {
  try {
    const qs = new URLSearchParams({ trigger: commandKey })
    if (sprintRef) qs.set('sprint', String(sprintRef))
    const bundle = await api('GET', `/api/sops/bundle?${qs.toString()}`)
    if (bundle && Array.isArray(bundle.sops) && bundle.sops.length > 0) {
      console.log('\n' + bundle.rendered + '\n')
      return
    }
    console.error(`\n⚠ Keine SOP im DB-Store für '${commandKey}' getriggert — übersprungen.\n`)
  } catch (err) {
    console.error(`\n⚠ SOP-Bundle konnte nicht aus dem DB-Store geladen werden (${err.message}) — übersprungen.\n`)
  }
}

function headers(extra = {}) {
  return _client.buildHeaders(extra)
}

async function api(method, path, body, projectId) {
  // projectId (optional, 4. Param): überschreibt den X-Project-Id-Header für
  // Header-gescopte Endpoints wie /api/project-memories (sonst globaler PROJECT_ID).
  return _client.request(method, path, body, projectId ? { projectId } : undefined)
}

function parseFlags(args) {
  const out = { _: [] }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = args[i + 1]
      if (next && !next.startsWith('--')) { out[key] = next; i++ }
      else out[key] = true
    } else {
      out._.push(a)
    }
  }
  return out
}

function pad(s, n) { s = String(s ?? ''); return s.length >= n ? s : s + ' '.repeat(n - s.length) }
function trunc(s, n) { s = String(s ?? ''); return s.length <= n ? s : s.slice(0, n - 1) + '…' }

// DD-625: Patch-/Supersede-Body aus Flags bauen (gemeinsam für memory update/supersede/anchor-patch).
// Nur explizit gesetzte Felder landen im Body (PATCH-Semantik). tags als Array (split auf ',').
function memoryEditBody(flags) {
  const body = {}
  if (typeof flags.summary === 'string') body.summary = flags.summary
  if (typeof flags.content === 'string') body.content = flags.content
  if (typeof flags.category === 'string') body.category = flags.category
  if (typeof flags.tags === 'string') body.tags = flags.tags.split(',').map(s => s.trim()).filter(Boolean)
  if (flags.importance !== undefined) body.importance = Number(flags.importance)
  if (flags.pinned !== undefined) body.pinned = flags.pinned
  if (typeof flags.anchor === 'string') body.anchor = flags.anchor
  if (typeof flags.stability === 'string') body.stability = flags.stability
  if (typeof flags['source-type'] === 'string') body.source_type = flags['source-type']
  if (typeof flags['source-ref'] === 'string') body.source_ref = flags['source-ref']
  return body
}

// DD-624: Tag-Namen (comma-list) gegen GET /api/tags auf tag_ids auflösen. Liefert
// gefundene ids + fehlende Namen, damit der Caller bei Unbekannten sauber abbrechen kann.
async function resolveTagIds(names, projectId) {
  const all = await api('GET', '/api/tags', null, projectId)
  const byName = new Map(all.map(t => [String(t.name).toLowerCase(), t.id]))
  const ids = []
  const missing = []
  for (const n of names) {
    const id = byName.get(String(n).toLowerCase())
    if (id) ids.push(id)
    else missing.push(n)
  }
  return { ids, missing, all }
}

// "a, b ,c" → ['a','b','c']
function splitCsv(raw) {
  return String(raw || '').split(',').map(s => s.trim()).filter(Boolean)
}

function formatSprintKey(s) {
  if (!s) return ''
  if (s.project_prefix && s.project_number != null) return `${s.project_prefix}#${s.project_number}`
  return `#${s.id ?? '?'}`
}

function formatIssueKey(it) {
  if (!it) return ''
  if (it.project_prefix && it.project_number != null) return `${it.project_prefix}-${it.project_number}`
  return `#${it.id ?? '?'}`
}

// Resolve <id|slug> → Projekt-Row über die Projektliste (CLI-Default-PROJECT_ID nicht zwingend
// das Ziel-Projekt). Genutzt von den pfad-gescopten Projekt-Subcommands.
async function resolveProject(idOrSlug) {
  const projects = await api('GET', '/api/projects')
  const p = projects.find(x => String(x.id) === String(idOrSlug) || x.slug === idOrSlug)
  if (!p) { console.error(`Projekt ${idOrSlug} nicht gefunden`); process.exit(1) }
  return p
}

// DD-369: prefix → slug Cache für den slug-basierten OSC8-URL-Builder. Sprint-/Issue-/
// Review-Responses tragen project_prefix (nicht slug); die Projektliste mappt prefix→slug.
// Einmaliger Fetch pro Prozess; bei API-Fehler bleibt der Cache leer → Fallback auf
// projekt-lose Legacy-Pfade (D07-Redirect fängt diese auf).
let _projectSlugCache = null
async function ensureSlugCache() {
  if (_projectSlugCache !== null) return _projectSlugCache
  const cache = { byPrefix: new Map(), byId: new Map() }
  try {
    const projects = await api('GET', '/api/projects')
    for (const p of projects) {
      if (!p.slug) continue
      if (p.prefix) cache.byPrefix.set(String(p.prefix).toUpperCase(), p.slug)
      if (p.id != null) cache.byId.set(String(p.id), p.slug)
    }
  } catch {
    // API nicht erreichbar → Cache bleibt leer, Fallback greift.
  }
  _projectSlugCache = cache
  return cache
}

// Slug aus einer API-Response ableiten — ohne Extra-Call pro Link. Bevorzugt das
// project_prefix der Response (prefix→slug), fällt auf project_id zurück
// (Endpoints wie PUT/PATCH backlog liefern keinen project_prefix-Join, aber die
// project_id-Spalte). Einmaliger /api/projects-Fetch wird prozessweit gecacht.
async function slugFromEntity(entity) {
  if (!entity) return null
  const cache = await ensureSlugCache()
  if (entity.project_prefix) {
    const s = cache.byPrefix.get(String(entity.project_prefix).toUpperCase())
    if (s) return s
  }
  if (entity.project_id != null) {
    const s = cache.byId.get(String(entity.project_id))
    if (s) return s
  }
  return null
}

// DD-369: slug-basierter OSC8-Pfad-Builder (RPD DD-347, E01-Option-b + D03/D04).
// View-Plural gemäß D03: 'issues' | 'sprints' | 'review'. Issue-Pfad nutzt
// project_number (D04, menschenlesbares DD-NN-Schema); Sprint/Review nutzen die
// numerische Sprint-PK (konsistent mit den Legacy-Pfaden /sprint/:id, /review/:id).
// Fallback: Slug nicht ermittelbar → projekt-loser Legacy-Pfad (D07-Redirect fängt ihn auf).
async function scopedLink(entity, view, fallbackId, idForPath) {
  const slug = await slugFromEntity(entity)
  const id = idForPath != null ? idForPath : fallbackId
  if (slug && id != null) {
    printLink(`/${slug}/${view}/${id}`)
  } else {
    // Legacy-Singular-Pfade beibehalten (D07-Redirect-Ziele).
    const legacyView = view === 'issues' ? 'issues' : view === 'sprints' ? 'sprint' : 'review'
    printLink(`/${legacyView}/${fallbackId}`)
  }
}

// Subtask-Keys: ST-<db-id>. Globaler Prefix (kein Projekt-Scope) — Subtasks
// hängen am Issue, die DB-PK ist global eindeutig. Akzeptiert "ST-42", "st-42"
// und nackte Zahl "42" als Input.
function subtaskKey(id) { return `ST-${id}` }
function parseSubtaskRef(ref) {
  const s = String(ref ?? '').trim()
  const m = s.match(/^[Ss][Tt]-(\d+)$/)
  if (m) return Number(m[1])
  if (/^\d+$/.test(s)) return Number(s)
  console.error(`Ungültige Subtask-ID: ${ref} (erwartet: ST-<n> oder Zahl)`)
  process.exit(2)
}

// E01.3: User-Story-Refs (US-<n> oder Zahl), analog Subtask.
function userStoryKey(id) { return `US-${id}` }
function parseUserStoryRef(ref) {
  const s = String(ref ?? '').trim()
  const m = s.match(/^[Uu][Ss]-(\d+)$/)
  if (m) return Number(m[1])
  if (/^\d+$/.test(s)) return Number(s)
  console.error(`Ungültige User-Story-ID: ${ref} (erwartet: US-<n> oder Zahl)`)
  process.exit(2)
}

const ANSI = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  peach: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
}

function statusColor(status) {
  if (status === 'done' || status === 'completed') return `${ANSI.green}${status}${ANSI.reset}`
  if (status === 'open') return `${ANSI.peach}${status}${ANSI.reset}`
  return String(status || '-')
}

function printLink(path) {
  const url = `${DEVD_UI_URL}${path}`
  if (process.stdout.isTTY) {
    console.log(`  \x1b]8;;${url}\x07${ANSI.dim}${url}${ANSI.reset}\x1b]8;;\x07`)
  } else {
    console.log(`  ${url}`)
  }
}

function humanError(err) {
  const msg = String(err?.message || err)
  const m = msg.match(/→ \d+: (.+)$/)
  return m ? m[1] : msg
}

// Resolves a sprint reference (key wie "DD#20" oder globale id) zu numerischer id.
// DD-611: tolerant — akzeptiert "DD#20", "DD-20", "dd-20", "dd20", "#20", numerisch.
async function resolveSprintId(input) {
  if (input == null) throw new Error('Sprint-Key oder ID erforderlich')
  const ref = parseRef(input)
  if (!ref) throw new Error(`Sprint-Key ungültig: ${input} (erwartet "DD#20", "dd-20" oder numerische ID)`)
  if (ref.id != null) return ref.id
  const sprints = await api('GET', '/api/sprints')
  const matched = sprints.find(sp =>
    sp.project_number === ref.number && (!ref.prefix || sp.project_prefix?.toUpperCase() === ref.prefix)
  )
  if (!matched) throw new Error(`Sprint ${input} nicht gefunden im Projekt ${PROJECT_ID}`)
  return matched.id
}

// DD2-21: Owner-Basis-URL für doc-Befehle aus --milestone <id> ODER --sprint <key|id>.
async function docOwnerBase(flags) {
  if (typeof flags.milestone === 'string' || typeof flags.milestone === 'number') {
    return { base: `/api/milestones/${Number(flags.milestone)}`, label: `milestone ${flags.milestone}` }
  }
  if (typeof flags.sprint === 'string' || typeof flags.sprint === 'number') {
    const id = await resolveSprintId(flags.sprint)
    return { base: `/api/sprints/${id}`, label: `sprint ${flags.sprint}` }
  }
  console.error('Owner erforderlich: --milestone <id> ODER --sprint <key|id>')
  process.exit(2)
}

// Resolves an issue reference (key wie "DD-161"/"dd161" oder globale id) zu numerischer id.
// DD-611: tolerant via parseRef. Issue-Keys tragen einen Prefix (kein bare "#161").
async function resolveIssueId(input) {
  if (input == null) throw new Error('Issue-Key oder ID erforderlich')
  const ref = parseRef(input)
  if (!ref) throw new Error(`Issue-Key ungültig: ${input} (erwartet "DD-161", "dd161" oder numerische ID)`)
  if (ref.id != null) return ref.id
  if (!ref.prefix) throw new Error(`Issue-Key ungültig: ${input} (Prefix erforderlich, z.B. "DD-161")`)
  const items = await api('GET', '/api/backlog')
  const matched = items.find(it =>
    it.project_number === ref.number && it.project_prefix?.toUpperCase() === ref.prefix && !it.deleted_at
  )
  if (!matched) throw new Error(`Issue ${input} nicht gefunden im Projekt ${PROJECT_ID}`)
  return matched.id
}

// Editor-Helper: öffnet $EDITOR mit aktuellem Wert, gibt aktualisierten Inhalt zurück
// (oder null bei unverändertem/leerem Save → Caller behandelt als "kein Update").
function editInEditor(field, currentValue) {
  const tmpFile = join(tmpdir(), `devd-${field}-${Date.now()}.md`)
  const initial = currentValue ?? ''
  writeFileSync(tmpFile, initial, 'utf8')
  const editor = process.env.EDITOR || 'vi'
  const r = spawnSync(editor, [tmpFile], { stdio: 'inherit' })
  if (r.status !== 0) {
    throw new Error(`Editor-Aufruf für --${field}-editor fehlgeschlagen`)
  }
  if (!existsSync(tmpFile)) return null
  const content = readFileSync(tmpFile, 'utf8')
  if (content === initial) return null
  if (content.trim() === '' && initial.trim() === '') return null
  return content
}

// Normalisiert relevant-files Eingabe: JSON-Array, Komma-Liste, oder Whitespace
// → JSON-Array-String (so wie es das Backend erwartet, vgl. PUT /api/backlog/:id).
function normalizeRelevantFiles(input) {
  if (input == null) return null
  const trimmed = String(input).trim()
  if (!trimmed) return JSON.stringify([])
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return JSON.stringify(parsed.map(String))
  } catch { /* fallthrough */ }
  const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean)
  return JSON.stringify(parts)
}

const COMMANDS = {
  // ---- Projekt ----
  async 'project:list'(flags) {
    // DD-622: compact-Default (ohne große Prosa-Felder). --full / --fields full für Vollobjekte.
    const lp = new URLSearchParams()
    if (flags.full) lp.set('fields', 'full')
    else if (flags.fields) lp.set('fields', String(flags.fields))
    const projects = await api('GET', `/api/projects${lp.toString() ? `?${lp.toString()}` : ''}`)
    const filtered = flags.archived ? projects : projects.filter(p => !p.archived)
    console.log(pad('ID', 4), pad('PREFIX', 7), pad('SLUG', 18), pad('NAME', 28), 'BESCHREIBUNG')
    console.log('─'.repeat(110))
    for (const p of filtered) {
      console.log(
        pad(p.id, 4), pad(p.prefix || '-', 7),
        pad(trunc(p.slug, 16), 18), pad(trunc(p.name, 26), 28),
        trunc(p.description || '', 50),
      )
    }
    console.log(`\n${filtered.length} Projekte${flags.archived ? ' (inkl. archivierte)' : ' (aktiv)'}`)
  },
  async 'project:create'(flags) {
    const slug = flags._[0]
    if (!slug || !flags.name || !flags.prefix) {
      console.error('Usage: devd-cli project create <slug> --name <text> --prefix <PREFIX> [--color <hex>] [--description <text>] [--path <repo-path>]')
      process.exit(2)
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      console.error('slug ungültig: nur a-z 0-9 - erlaubt')
      process.exit(2)
    }
    const prefix = String(flags.prefix).toUpperCase()
    if (!/^[A-Z0-9]{2,6}$/.test(prefix)) {
      console.error('prefix ungültig: 2-6 GROSSBUCHSTABEN/Ziffern erforderlich')
      process.exit(2)
    }
    const body = { slug, name: flags.name, prefix }
    if (flags.color) body.color = flags.color
    if (flags.description) body.description = flags.description
    if (flags.path) body.repo_path = flags.path
    const p = await api('POST', '/api/projects', body)
    console.log(`✓ Projekt #${p.id} angelegt — ${p.prefix} | ${p.slug} | ${p.name}`)
  },
  async 'project:show'(flags) {
    const idOrSlug = flags._[0]
    if (!idOrSlug) { console.error('Usage: devd-cli project show <id|slug>'); process.exit(2) }
    const projects = await api('GET', '/api/projects')
    const p = projects.find(x => String(x.id) === String(idOrSlug) || x.slug === idOrSlug)
    if (!p) throw new Error(`Projekt ${idOrSlug} nicht gefunden`)
    console.log(`Projekt #${p.id} — ${p.name}  [${p.prefix}]`)
    console.log(`Slug: ${p.slug}  Status: ${p.archived ? 'archiviert' : 'aktiv'}`)
    if (p.description) console.log(`\nBeschreibung:\n${p.description}`)
    if (p.color) console.log(`Color: ${p.color}`)
  },

  // ---- Sprint ----
  async 'sprint:list'(flags) {
    // DD-554: --no-milestone listet nur unassigned (milestone_id=null); --milestone <id>
    // filtert auf einen Milestone. Beide kombinierbar mit --status (server-seitig).
    const params = new URLSearchParams()
    if (flags.status) params.set('status', String(flags.status))
    if (flags['no-milestone']) params.set('milestone_id', 'none')
    else if (flags.milestone && flags.milestone !== true) params.set('milestone_id', String(flags.milestone))
    // DD-620/DD-622: compact-Default + --full / --fields full|<whitelist> / --limit / --offset (GOAL bleibt in compact).
    if (flags.full) params.set('fields', 'full')
    else if (flags.fields) params.set('fields', String(flags.fields))
    if (flags.limit) params.set('limit', String(flags.limit))
    if (flags.offset) params.set('offset', String(flags.offset))
    const qs = params.toString() ? `?${params.toString()}` : ''
    const sprints = await api('GET', `/api/sprints${qs}`)
    const filtered = sprints
    console.log(pad('KEY', 8), pad('ID', 5), pad('STATUS', 11), pad('NAME', 40), 'GOAL')
    console.log('─'.repeat(120))
    for (const s of filtered) {
      console.log(
        pad(formatSprintKey(s), 8), pad(s.id, 5),
        pad(s.status, 11), pad(trunc(s.name, 38), 40),
        trunc(s.goal || s.notes || '', 50),
      )
    }
    console.log(`\n${filtered.length} Sprints`)
  },
  async 'sprint:show'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli sprint show <key|id>'); process.exit(2) }
    const id = await resolveSprintId(ref)
    const s = await api('GET', `/api/sprints/${id}`)
    console.log(`${formatSprintKey(s)} (#${s.id}) — ${s.name}`)
    console.log(`Status: ${s.status}  Position: ${s.position}`)
    console.log(`Start: ${s.start_date || '-'}  End: ${s.end_date || '-'}  Capacity: ${s.capacity || '-'}`)
    await scopedLink(s, 'sprints', s.id)
    if (s.goal) console.log(`\nZiel:\n${s.goal}`)
    if (s.notes && s.notes !== s.goal) console.log(`\nNotizen:\n${s.notes}`)
    if (s.items?.length) {
      console.log(`\n${s.items.length} Issues:`)
      for (const it of s.items) {
        console.log(`  ${pad(formatIssueKey(it), 8)} ${pad(it.status, 11)}  P${it.priority}  ${trunc(it.title, 70)}`)
      }
    }
  },
  async 'sprint:create'(flags) {
    const name = flags._[0]
    if (!name) { console.error('Usage: devd-cli sprint create <name> [--goal <text>]'); process.exit(2) }
    await printSOPBundle('sprint:create')
    const body = { name, status: 'new' }
    if (flags.goal) body.goal = flags.goal
    parseOrThrow(sprintCreateContract, body, 'sprint create')   // DD-561: Client-Guard vor API
    const s = await api('POST', '/api/sprints', body)
    console.log(`✓ Sprint ${formatSprintKey(s)} (#${s.id}) angelegt — Status: ${s.status}`)
    await scopedLink(s, 'sprints', s.id)
  },
  async 'sprint:start'(flags) {
    const id = await resolveSprintId(flags._[0])
    await printSOPBundle('sprint:start', id)
    const s = await api('PATCH', `/api/sprints/${id}/status`, { to: 'in_progress' })
    console.log(`✓ Sprint ${formatSprintKey(s)} → ${s.status}`)
    await scopedLink(s, 'sprints', s.id)
  },
  async 'sprint:review'(flags) {
    const id = await resolveSprintId(flags._[0])
    const s = await api('PATCH', `/api/sprints/${id}/status`, { to: 'to_review' })
    console.log(`✓ Sprint ${formatSprintKey(s)} → ${s.status}`)
    await scopedLink(s, 'review', s.id)
  },
  async 'sprint:complete'(flags) {
    const id = await resolveSprintId(flags._[0])
    const s = await api('POST', `/api/sprints/${id}/complete`, flags.force ? { force: true } : undefined)
    console.log(`✓ Sprint ${formatSprintKey(s)} → ${s.status} (alle passed-Items wurden auf completed gesetzt)`)
    await scopedLink(s, 'sprints', s.id)
  },
  async 'sprint:cancel'(flags) {
    const id = await resolveSprintId(flags._[0])
    const notes = flags.notes
    if (!notes) { console.error('Usage: devd-cli sprint cancel <key|id> --notes <begründung>'); process.exit(2) }
    const s = await api('PATCH', `/api/sprints/${id}/status`, { to: 'cancelled', cancellationNotes: notes })
    console.log(`✓ Sprint ${formatSprintKey(s)} → ${s.status}`)
    await scopedLink(s, 'sprints', s.id)
  },
  async 'sprint:context'(flags) {
    const id = await resolveSprintId(flags._[0])

    // DD-184: --screenshots liefert das Screenshot-Bundle als JSON-Array statt
    // des Markdown/JSON-Sprint-Kontexts. Optional --output-dir <dir> speichert
    // die Bilder lokal und ergaenzt 'local_path' pro Eintrag. Reine DB+File-
    // Lese-Operation, keine Browser-Abhaengigkeit (CI-tauglich).
    if (flags.screenshots) {
      const list = await api('GET', `/api/sprints/${id}/screenshots`)
      const outDir = flags['output-dir']
      if (outDir) {
        const { mkdirSync } = await import('fs')
        mkdirSync(outDir, { recursive: true })
        for (const item of list) {
          try {
            const r = await fetch(`${API}${item.url}`, { headers: headers() })
            if (!r.ok) { item.download_error = `HTTP ${r.status}`; continue }
            const buf = Buffer.from(await r.arrayBuffer())
            const localPath = join(outDir, item.filename)
            writeFileSync(localPath, buf)
            item.local_path = localPath
          } catch (e) {
            item.download_error = String(e?.message || e)
          }
        }
      }
      console.log(JSON.stringify(list, null, 2))
      return
    }

    const s = await api('GET', `/api/sprints/${id}`)
    if (flags.format === 'json') {
      console.log(JSON.stringify(s, null, 2))
      return
    }
    const lines = []
    lines.push(`# ${formatSprintKey(s)} — ${s.name}`)
    lines.push('')
    lines.push(`Status: ${s.status} | Position: ${s.position} | Start: ${s.start_date || '-'} | End: ${s.end_date || '-'}`)
    lines.push('')
    if (s.goal) { lines.push('## Sprintziel'); lines.push(''); lines.push(s.goal); lines.push('') }
    if (s.notes && s.notes !== s.goal) { lines.push('## Notizen'); lines.push(''); lines.push(s.notes); lines.push('') }
    lines.push(`## Issues (${s.items?.length || 0})`)
    lines.push('')
    for (const it of s.items || []) {
      lines.push(`### ${formatIssueKey(it)} — ${it.title}`)
      lines.push(`_Status: ${it.status} | Type: ${it.type} | Priorität: P${it.priority}_`)
      lines.push('')
      if (it.description) { lines.push('**Beschreibung:**'); lines.push(it.description); lines.push('') }
      if (it.goal) { lines.push('**Goal:**'); lines.push(it.goal); lines.push('') }
      if (it.background) { lines.push('**Background:**'); lines.push(it.background); lines.push('') }
      // E01/D09: Acceptance Criteria + Test-Anweisung abgeloest durch user_stories[].qa.
      if (it.context_notes) { lines.push('**Context Notes:**'); lines.push(it.context_notes); lines.push('') }
      if (it.relevant_files) { lines.push(`**Relevant Files:** ${it.relevant_files}`); lines.push('') }
      if (it.po_notes) { lines.push('**PO-Notes:**'); lines.push(it.po_notes); lines.push('') }
      // E01: User Stories (Pruefgrundlage je Issue) inkl. us_verdict + qa.
      if (Array.isArray(it.user_stories) && it.user_stories.length) {
        lines.push(`**User Stories (${it.user_stories.length}):**`)
        for (const us of it.user_stories) {
          const qa = us.qa ? ` — QA: ${us.qa}` : ''
          lines.push(`- [${us.us_verdict}] ${us.key} ${us.title}${qa}`)
        }
        lines.push('')
      }
      if (Array.isArray(it.subtasks) && it.subtasks.length) {
        const doneCount = it.subtasks.filter(s => s.status === 'done').length
        lines.push(`**Sub-Tasks (${doneCount}/${it.subtasks.length}):**`)
        for (const s of it.subtasks) {
          const mark = s.status === 'done' ? '[x]' : '[ ]'
          const qa = s.qa_criteria ? ` — QA: ${s.qa_criteria}` : ''
          lines.push(`- ${mark} ${subtaskKey(s.id)} ${s.title}${qa}`)
        }
        lines.push('')
      }
      lines.push('---')
      lines.push('')
    }
    console.log(lines.join('\n'))
  },
  async 'sprint:rev-results'(flags) {
    const id = await resolveSprintId(flags._[0])
    const s = await api('GET', `/api/sprints/${id}`)
    console.log(`Review-Ergebnisse für ${formatSprintKey(s)} — ${s.name}\n`)
    let counts = { passed: 0, not_passed: 0, pending: 0, none: 0 }
    for (const it of s.items || []) {
      const rev = it.review_status || 'none'
      counts[rev] = (counts[rev] ?? 0) + 1
      console.log(`${pad(formatIssueKey(it), 8)} ${pad(it.status, 11)} review=${pad(rev, 17)} ${trunc(it.title, 60)}`)
      if (it.review_comment) console.log(`  └─ Kommentar: ${trunc(it.review_comment, 100)}`)
      if (it.review_notes) console.log(`  └─ Notes: ${trunc(it.review_notes, 100)}`)
    }
    console.log(`\nSumme: passed=${counts.passed} | not_passed=${counts.not_passed} | pending=${counts.pending} | ohne-Review=${counts.none}`)
  },
  // DD-552: Sprint einem Milestone zuweisen / lösen (none|null). Routet PUT /api/sprints/:id {milestone_id}.
  async 'sprint:set-milestone'(flags) {
    const ref = flags._[0]
    const target = flags._[1]
    if (!ref || target === undefined) { console.error('Usage: devd-cli sprint set-milestone <key|id> <milestone-id|none>'); process.exit(2) }
    const id = await resolveSprintId(ref)
    const milestoneId = (target === 'none' || target === 'null') ? null : Number(target)
    const body = parseOrThrow(sprintSetMilestoneContract, { milestone_id: milestoneId }, 'sprint set-milestone')
    const s = await api('PUT', `/api/sprints/${id}`, { milestone_id: body.milestone_id })
    console.log(`✓ Sprint ${formatSprintKey(s)} → milestone_id=${s.milestone_id ?? 'none'}`)
  },
  // DD-626: Sprint-Verb-Vervollständigung — update/reorder/delete (REST + Contracts DD-561 lagen bereit).
  async 'sprint:update'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli sprint update <key|id> [--name <n>] [--goal <t>] [--notes <t>] [--start-date <d>] [--end-date <d>] [--capacity <n>] [--wip-limit <n>]'); process.exit(2) }
    const id = await resolveSprintId(ref)
    const raw = {}
    if (typeof flags.name === 'string') raw.name = flags.name
    if (typeof flags.goal === 'string') raw.goal = flags.goal
    if (typeof flags.notes === 'string') raw.notes = flags.notes
    if (typeof flags['start-date'] === 'string') raw.start_date = flags['start-date']
    if (typeof flags['end-date'] === 'string') raw.end_date = flags['end-date']
    if (flags.capacity !== undefined) raw.capacity = Number(flags.capacity)
    if (flags['wip-limit'] !== undefined) raw.wip_limit = Number(flags['wip-limit'])
    if (Object.keys(raw).length === 0) { console.error('Nichts zu ändern — mindestens ein Feld-Flag angeben.'); process.exit(2) }
    const body = parseOrThrow(sprintUpdateContract, raw, 'sprint update')
    const s = await api('PUT', `/api/sprints/${id}`, body)
    console.log(`✓ Sprint ${formatSprintKey(s)} aktualisiert`)
  },
  async 'sprint:reorder'(flags) {
    if (!flags.ids) { console.error('Usage: devd-cli sprint reorder --ids 12,9,15   # neue Reihenfolge (Sprint-IDs)'); process.exit(2) }
    const ordered_ids = splitCsv(flags.ids).map(Number).filter(Number.isFinite)
    const body = parseOrThrow(sprintReorderContract, { ordered_ids }, 'sprint reorder')
    await api('PATCH', '/api/sprints/reorder', body)
    console.log(`✓ Sprint-Reihenfolge gesetzt: ${ordered_ids.join(', ')}`)
  },
  async 'sprint:delete'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli sprint delete <key|id>'); process.exit(2) }
    const id = await resolveSprintId(ref)
    const r = await api('DELETE', `/api/sprints/${id}`)
    console.log(`✓ Sprint #${r.deleted_id ?? id} gelöscht`)
  },

  // DD-555: Lost-Issues — nicht-terminale Issues in completed Sprints (Data-Hygiene).
  async 'issue:lost'(flags) {
    const projectId = flags.project ? flags.project : PROJECT_ID
    const rows = await api('GET', '/api/backlog/lost', null, projectId)
    if (!rows.length) {
      console.log('Keine verlorenen Issues — alle Issues in completed Sprints sind terminal.')
      return
    }
    console.log(pad('ISSUE', 9), pad('STATUS', 12), pad('SPRINT', 9), 'TITEL')
    console.log('─'.repeat(90))
    for (const r of rows) {
      console.log(pad(r.key || `#${r.id}`, 9), pad(r.status, 12), pad(r.sprint_key || `#${r.sprint_id}`, 9), trunc(r.title, 55))
    }
    console.log(`\n${rows.length} verlorene Issues (nicht-terminal in completed Sprints, project ${projectId})`)
  },

  // ---- Milestone (DD-553 Lifecycle/CRUD, DD-556 Edit/Deps) — Contract-validiert (DD-557) ----
  async 'milestone:list'(flags) {
    const qs = flags.status ? `?status=${encodeURIComponent(flags.status)}` : ''
    const milestones = await api('GET', `/api/milestones${qs}`)
    console.log(pad('ID', 5), pad('STATUS', 11), pad('TARGET', 12), pad('NAME', 40), 'SPRINTS')
    console.log('─'.repeat(90))
    for (const m of milestones) {
      const sprintCount = Array.isArray(m.sprints) ? m.sprints.length : 0
      console.log(pad(m.id, 5), pad(m.status, 11), pad(m.target_date || '-', 12), pad(trunc(m.name, 38), 40), sprintCount)
    }
    console.log(`\n${milestones.length} Milestones${flags.status ? ` (status=${flags.status})` : ' (offen)'}`)
  },
  async 'milestone:show'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli milestone show <id>'); process.exit(2) }
    const m = await api('GET', `/api/milestones/${id}`)
    console.log(`Milestone #${m.id} — ${m.name}  [${m.status}]`)
    console.log(`Target: ${m.target_date || '-'}  Position: ${m.position ?? '-'}`)
    if (m.description) console.log(`\nBeschreibung:\n${m.description}`)
    if (Array.isArray(m.sprints) && m.sprints.length) {
      console.log(`\n${m.sprints.length} Sprints:`)
      for (const s of m.sprints) console.log(`  ${pad(s.key || `#${s.id}`, 8)} ${pad(s.status, 11)} ${trunc(s.name, 50)}`)
    }
    if (Array.isArray(m.dependencies_in) && m.dependencies_in.length) {
      console.log(`\nVorgänger: ${m.dependencies_in.map(d => `#${d.id} ${d.name}`).join(', ')}`)
    }
    if (Array.isArray(m.dependencies_out) && m.dependencies_out.length) {
      console.log(`Nachfolger: ${m.dependencies_out.map(d => `#${d.id} ${d.name}`).join(', ')}`)
    }
  },
  async 'milestone:create'(flags) {
    const name = flags._[0] || (typeof flags.name === 'string' ? flags.name : undefined)
    if (!name) { console.error('Usage: devd-cli milestone create <name> [--description <text>] [--target-date YYYY-MM-DD] [--status <s>]'); process.exit(2) }
    const body = parseOrThrow(milestoneCreateContract, {
      name,
      description: typeof flags.description === 'string' ? flags.description : undefined,
      target_date: typeof flags['target-date'] === 'string' ? flags['target-date'] : undefined,
      status: typeof flags.status === 'string' ? flags.status : undefined,
    }, 'milestone create')
    const m = await api('POST', '/api/milestones', body)
    console.log(`✓ Milestone #${m.id} angelegt — ${m.name} [${m.status}] target=${m.target_date}`)
  },
  async 'milestone:status'(flags) {
    const id = Number(flags._[0])
    const status = flags._[1]
    if (!id || !status) { console.error('Usage: devd-cli milestone status <id> <new|planned|in_progress|completed|cancelled> [--notes <text>]'); process.exit(2) }
    const payload = parseOrThrow(milestoneStatusContract, {
      status,
      cancellation_notes: typeof flags.notes === 'string' ? flags.notes : undefined,
    }, 'milestone status')
    const body = { status: payload.status }
    if (payload.cancellation_notes) body.cancellation_notes = payload.cancellation_notes
    const m = await api('PUT', `/api/milestones/${id}`, body)
    console.log(`✓ Milestone #${m.id} → ${m.status}`)
  },
  async 'milestone:edit'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli milestone edit <id> [--name <text>] [--description <text>] [--target-date YYYY-MM-DD]'); process.exit(2) }
    const raw = {}
    if (typeof flags.name === 'string') raw.name = flags.name
    if (typeof flags.description === 'string') raw.description = flags.description
    if (typeof flags['target-date'] === 'string') raw.target_date = flags['target-date']
    if (Object.keys(raw).length === 0) { console.error('Mind. ein Feld angeben: --name / --description / --target-date'); process.exit(2) }
    const body = parseOrThrow(milestoneUpdateContract, raw, 'milestone edit')
    const m = await api('PUT', `/api/milestones/${id}`, body)
    console.log(`✓ Milestone #${m.id} aktualisiert — ${m.name} [${m.status}] target=${m.target_date}`)
  },
  async 'milestone:dep-add'(flags) {
    const successorId = Number(flags._[0])
    const predecessorId = Number(flags['depends-on'])
    if (!successorId || !predecessorId) { console.error('Usage: devd-cli milestone dep-add <id> --depends-on <vorgänger-id>'); process.exit(2) }
    const body = parseOrThrow(milestoneDependencyContract, {
      predecessor_id: predecessorId,
      successor_id: successorId,
    }, 'milestone dep-add')
    const dep = await api('POST', '/api/milestone-dependencies', body)
    console.log(`✓ Dependency #${dep.id}: #${dep.predecessor_id} (Vorgänger) → #${dep.successor_id} (Nachfolger)`)
  },
  async 'milestone:dep-list'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli milestone dep-list <id>'); process.exit(2) }
    const { predecessors = [], successors = [] } = await api('GET', `/api/milestones/${id}/dependencies`)
    console.log(`Dependencies für Milestone #${id}:`)
    console.log(`\nVorgänger (müssen vorher fertig sein):`)
    if (!predecessors.length) console.log('  (keine)')
    for (const p of predecessors) console.log(`  dep#${p.dependency_id}  #${p.id} ${p.name}`)
    console.log(`\nNachfolger (warten auf diesen):`)
    if (!successors.length) console.log('  (keine)')
    for (const s of successors) console.log(`  dep#${s.dependency_id}  #${s.id} ${s.name}`)
  },
  async 'milestone:dep-remove'(flags) {
    const depId = Number(flags._[0])
    if (!depId) { console.error('Usage: devd-cli milestone dep-remove <dependency-id>   (dep#-ID aus dep-list)'); process.exit(2) }
    await api('DELETE', `/api/milestone-dependencies/${depId}`)
    console.log(`✓ Dependency #${depId} entfernt`)
  },
  // DD-627: Milestone-Verb-Vervollständigung — reorder + dod-items CRUD + close-with-issues.
  async 'milestone:reorder'(flags) {
    if (!flags.ids) { console.error('Usage: devd-cli milestone reorder --ids 3,1,2   # neue Reihenfolge (Milestone-IDs)'); process.exit(2) }
    const ordered_ids = splitCsv(flags.ids).map(Number).filter(Number.isFinite)
    await api('PATCH', '/api/milestones/reorder', { ordered_ids })
    console.log(`✓ Milestone-Reihenfolge gesetzt: ${ordered_ids.join(', ')}`)
  },
  async 'milestone:close'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli milestone close <id> [--target-status <status für offene Issues>]'); process.exit(2) }
    const body = {}
    if (typeof flags['target-status'] === 'string') body.target_status = flags['target-status']
    const r = await api('POST', `/api/milestones/${id}/close-with-issues`, body)
    console.log(`✓ Milestone #${id} geschlossen${r.closed_issues != null ? ` (${r.closed_issues} offene Issues behandelt)` : ''}`)
  },
  async 'milestone:dod'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli milestone dod <milestone-id>   # DoD-Items listen'); process.exit(2) }
    const items = await api('GET', `/api/milestones/${id}/dod-items`)
    console.log(pad('ID', 5), pad('DONE', 5), 'LABEL')
    console.log('─'.repeat(60))
    for (const it of items) console.log(pad(it.id, 5), pad(it.done ? '✓' : '·', 5), trunc(it.label, 48))
    console.log(`\n${items.length} DoD-Items (Milestone #${id})`)
  },
  async 'milestone:dod-add'(flags) {
    const id = Number(flags._[0])
    if (!id || typeof flags.label !== 'string') { console.error('Usage: devd-cli milestone dod-add <milestone-id> --label "<text>"'); process.exit(2) }
    const it = await api('POST', `/api/milestones/${id}/dod-items`, { label: flags.label })
    console.log(`✓ DoD-Item #${it.id} angelegt: ${it.label}`)
  },
  async 'milestone:dod-set'(flags) {
    const itemId = Number(flags._[0])
    if (!itemId) { console.error('Usage: devd-cli milestone dod-set <item-id> [--label <text>] [--done true|false]'); process.exit(2) }
    const body = {}
    if (typeof flags.label === 'string') body.label = flags.label
    if (flags.done !== undefined) body.done = flags.done
    if (Object.keys(body).length === 0) { console.error('Nichts zu ändern — --label und/oder --done angeben.'); process.exit(2) }
    const it = await api('PATCH', `/api/dod-items/${itemId}`, body)
    console.log(`✓ DoD-Item #${it.id}: done=${it.done ? '✓' : '·'} — ${it.label}`)
  },
  async 'milestone:dod-reorder'(flags) {
    const id = Number(flags._[0])
    if (!id || !flags.order) { console.error('Usage: devd-cli milestone dod-reorder <milestone-id> --order 8,3,5   # DoD-Item-IDs in neuer Reihenfolge'); process.exit(2) }
    const order = splitCsv(flags.order).map(Number).filter(Number.isFinite)
    const r = await api('PATCH', `/api/milestones/${id}/dod-items/reorder`, { order })
    console.log(`✓ DoD-Reihenfolge gesetzt (${(r.items || []).length} Items)`)
  },
  async 'milestone:dod-delete'(flags) {
    const itemId = Number(flags._[0])
    if (!itemId) { console.error('Usage: devd-cli milestone dod-delete <item-id>'); process.exit(2) }
    await api('DELETE', `/api/dod-items/${itemId}`)
    console.log(`✓ DoD-Item #${itemId} gelöscht`)
  },

  // ---- Issue ----
  async 'issue:list'(flags) {
    const params = new URLSearchParams()
    if (flags.search) params.set('search', flags.search)
    if (flags.status) params.set('status', flags.status)
    if (flags.type) params.set('type', flags.type)
    if (flags.sprint) {
      if (flags.sprint === 'null' || flags.sprint === 'none') {
        params.set('sprint_id', 'null')
      } else {
        const sprintId = await resolveSprintId(flags.sprint)
        params.set('sprint_id', sprintId)
      }
    }
    // DD-620/DD-622: Liste ist per Default compact (Token-Schutz). --full / --fields full für
    // Vollobjekte, --fields key,status,title für gezielte Whitelist, --limit/--offset paginieren.
    if (flags.full) params.set('fields', 'full')
    else if (flags.fields) params.set('fields', String(flags.fields))
    if (flags.limit) params.set('limit', String(flags.limit))
    if (flags.offset) params.set('offset', String(flags.offset))
    const qs = params.toString() ? `?${params.toString()}` : ''
    const items = await api('GET', `/api/backlog${qs}`)
    console.log(pad('KEY', 8), pad('STATUS', 11), pad('TYPE', 11), 'P  TITLE')
    console.log('─'.repeat(110))
    for (const it of items) {
      console.log(
        pad(formatIssueKey(it), 8),
        pad(it.status, 11),
        pad(it.type, 11),
        it.priority,
        ' ',
        trunc(it.title, 75),
      )
    }
    console.log(`\n${items.length} Issues`)
  },
  async 'issue:show'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli issue show <id|key>'); process.exit(2) }
    const id = await resolveIssueId(ref)
    const it = await api('GET', `/api/backlog/${id}`)
    let sprintLabel = '-'
    if (it.assigned_sprint) {
      try {
        const sp = await api('GET', `/api/sprints/${it.assigned_sprint}`)
        sprintLabel = `${formatSprintKey(sp)} — ${sp.name}`
      } catch { sprintLabel = `#${it.assigned_sprint}` }
    }
    console.log(`${formatIssueKey(it)}  (#${it.id})  [${it.type} P${it.priority}]`)
    console.log(`Title: ${it.title}`)
    console.log(`Status: ${it.status}  Sprint: ${sprintLabel}  Refined: ${it.refined_at || '-'}`)
    await scopedLink(it, 'issues', it.id, it.project_number)
    if (it.description) console.log(`\nDescription:\n${it.description}`)
    if (it.goal) console.log(`\nGoal:\n${it.goal}`)
    if (it.background) console.log(`\nBackground:\n${it.background}`)
    // E01/D09: Acceptance Criteria + Test-Anweisung abgeloest durch user_stories[].qa.
    if (it.context_notes) console.log(`\nContext:\n${it.context_notes}`)
    if (it.relevant_files) console.log(`\nFiles: ${it.relevant_files}`)
    if (it.po_notes) console.log(`\nPO-Notes:\n${it.po_notes}`)
    const userStories = Array.isArray(it.user_stories) ? it.user_stories : []
    if (userStories.length > 0) {
      console.log(`\nUser Stories (${userStories.length}):`)
      for (const us of userStories) {
        const qa = us.qa ? ` [QA: ${String(us.qa).slice(0, 60)}]` : ''
        console.log(`  [${us.us_verdict}] ${us.key}  ${us.title}${qa}`)
      }
    }
    const subtasks = Array.isArray(it.subtasks) ? it.subtasks : []
    if (subtasks.length > 0) {
      const done = subtasks.filter(s => s.status === 'done').length
      console.log(`\nSub-Tasks (${done}/${subtasks.length}):`)
      for (const s of subtasks) {
        const mark = s.status === 'done' ? '✓' : '·'
        const qa = s.qa_criteria ? ` [QA: ${String(s.qa_criteria).slice(0, 60)}]` : ''
        console.log(`  ${mark} ${subtaskKey(s.id)}  ${s.title}${qa}`)
      }
    }
    if (it.created_by_user) console.log(`\nCreated by: ${it.created_by_user}`)
  },
  async 'issue:create'(flags) {
    const title = flags._[0]
    if (!title) {
      console.error('Usage: devd-cli issue create <title> [--type bug|feature|improvement|core] [--priority 1-5] [--description <text>]')
      process.exit(2)
    }
    await printSOPBundle('issue:create')
    const body = {
      title,
      type: flags.type || 'feature',
      priority: flags.priority ? Number(flags.priority) : 3,
    }
    if (flags.description) body.description = flags.description
    parseOrThrow(issueCreateContract, body, 'issue create')   // DD-560: Client-Guard vor API
    const r = await api('POST', '/api/backlog', body)
    console.log(`✓ ${formatIssueKey(r)} (#${r.id}) angelegt — Status: ${r.status}`)
    await scopedLink(r, 'issues', r.id, r.project_number)
  },
  async 'issue:update'(flags) {
    const ref = flags._[0]
    if (!ref) {
      console.error('Usage: devd-cli issue update <id|key> [--<field> <value>] [--<field>-editor]')
      process.exit(2)
    }
    const id = await resolveIssueId(ref)
    const current = await api('GET', `/api/backlog/${id}`)
    const body = {}

    // Direkt-Felder (--flag <value>)
    if (typeof flags.title === 'string') body.title = flags.title
    if (typeof flags.type === 'string') body.type = flags.type
    if (flags.priority != null && flags.priority !== true) body.priority = Number(flags.priority)

    const textFields = ['goal', 'background', 'acceptance-criteria', 'po-notes', 'context-notes', 'description', 'test-instruction']
    for (const f of textFields) {
      const apiKey = f.replace('-', '_')
      if (typeof flags[f] === 'string') body[apiKey] = flags[f]
      if (flags[`${f}-editor`]) {
        const updated = editInEditor(f, current[apiKey] || '')
        if (updated !== null) body[apiKey] = updated
      }
    }

    if (typeof flags['relevant-files'] === 'string') {
      body.relevant_files = normalizeRelevantFiles(flags['relevant-files'])
    }
    if (flags['relevant-files-editor']) {
      const updated = editInEditor('relevant-files', current.relevant_files || '[]')
      if (updated !== null) body.relevant_files = normalizeRelevantFiles(updated)
    }

    let sprintAssignment = undefined
    if (Object.prototype.hasOwnProperty.call(flags, 'assigned-sprint')) {
      const raw = flags['assigned-sprint']
      if (raw === null || raw === '' || raw === 'null' || raw === false) {
        sprintAssignment = null
      } else if (typeof raw === 'string') {
        sprintAssignment = Number(await resolveSprintId(raw))
        if (!Number.isFinite(sprintAssignment)) {
          console.error(`Konnte Sprint nicht auflösen: ${raw}`)
          process.exit(2)
        }
      }
    }

    if (Object.keys(body).length === 0 && sprintAssignment === undefined) {
      console.error('Mindestens ein --<field>, --<field>-editor oder --assigned-sprint Flag erforderlich.')
      console.error('Felder: --title --type --priority --goal --background --acceptance-criteria --context-notes --relevant-files --po-notes --description --test-instruction --assigned-sprint')
      process.exit(2)
    }

    let updated = current
    if (Object.keys(body).length > 0) {
      parseOrThrow(issueUpdateContract, body, 'issue update')   // DD-560: Client-Guard vor API
      updated = await api('PUT', `/api/backlog/${id}`, body)
    }
    if (sprintAssignment !== undefined) {
      updated = await api('PATCH', `/api/backlog/${id}/sprint`, { sprint_id: sprintAssignment })
    }
    const fieldList = Object.keys(body)
    if (sprintAssignment !== undefined) {
      fieldList.push(sprintAssignment === null ? 'assigned_sprint=NULL' : `assigned_sprint=${sprintAssignment}`)
    }
    console.log(`✓ ${formatIssueKey(updated)} aktualisiert — Felder: ${fieldList.join(', ')}`)
    await scopedLink(updated, 'issues', updated.id, updated.project_number)
  },
  async 'issue:status'(flags) {
    const [ref, status] = flags._
    if (!ref || !status) { console.error('Usage: devd-cli issue status <id|key> <new-status>'); process.exit(2) }
    const id = await resolveIssueId(ref)
    const body = { status }
    if (flags.notes) body.notes = flags.notes
    parseOrThrow(issueStatusContract, body, 'issue status')   // DD-560: Client-Guard vor API
    const r = await api('PATCH', `/api/backlog/${id}/status`, body)
    console.log(`✓ ${formatIssueKey(r)} → ${r.status}`)
    await scopedLink(r, 'issues', r.id, r.project_number)
  },
  async 'issue:assign-sprint'(flags) {
    const ref = flags._[0]
    const sprintArg = flags.sprint
    if (!ref || sprintArg === undefined || sprintArg === true) {
      console.error('Usage: devd-cli issue assign-sprint <id|key> --sprint <key|id|null|none>')
      console.error('  Assign:   devd-cli issue assign-sprint DD-42 --sprint DD#20')
      console.error('  Unassign: devd-cli issue assign-sprint DD-42 --sprint null')
      process.exit(2)
    }
    const id = await resolveIssueId(ref)
    let sprintId = null
    const sprintStr = String(sprintArg)
    if (sprintStr !== 'null' && sprintStr !== 'none') {
      sprintId = await resolveSprintId(sprintStr)
    }
    const r = await api('PATCH', `/api/backlog/${id}/sprint`, { sprint_id: sprintId })
    const sprintLabel = r.sprint_key || (sprintId !== null ? `#${sprintId}` : 'unassigned')
    console.log(`✓ ${formatIssueKey(r)} → sprint: ${sprintLabel}`)
    await scopedLink(r, 'issues', r.id, r.project_number)
  },

  // ---- Subtasks ----
  async 'subtask:add'(flags) {
    const ref = flags._[0]
    const title = flags.title
    if (!ref || !title || title === true) {
      console.error('Usage: devd-cli subtask add <issue-id|key> --title <text> [--qa <text>]')
      process.exit(2)
    }
    const issueId = await resolveIssueId(ref)
    const body = { title }
    if (typeof flags.qa === 'string') body.qa_criteria = flags.qa
    parseOrThrow(subtaskCreateContract, body, 'subtask add')   // DD-565: Client-Guard vor API
    const created = await api('POST', `/api/backlog/${issueId}/subtasks`, body)
    console.log(`✓ Subtask ${subtaskKey(created.id)} angelegt — ${created.title}`)
  },
  async 'subtask:list'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli subtask list <issue-id|key>'); process.exit(2) }
    const issueId = await resolveIssueId(ref)
    const list = await api('GET', `/api/backlog/${issueId}/subtasks`)
    console.log(pad('KEY', 8), pad('STATUS', 16), pad('POS', 5), pad('TITLE', 45), 'QA')
    console.log('─'.repeat(100))
    for (const st of list) {
      console.log(
        pad(subtaskKey(st.id), 8),
        pad(statusColor(st.status), 16),
        pad(st.position ?? '-', 5),
        pad(trunc(st.title || '', 43), 45),
        st.qa_criteria ? trunc(st.qa_criteria, 34) : `${ANSI.dim}-${ANSI.reset}`,
      )
    }
    console.log(`\n${list.length} Subtasks`)
  },
  async 'subtask:done'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli subtask done <ST-id|subtask-id>'); process.exit(2) }
    const id = parseSubtaskRef(ref)
    try {
      const updated = await api('PATCH', `/api/subtasks/${id}/status`, { status: 'done' })
      console.log(`✓ Subtask ${subtaskKey(updated.id)} → done`)
    } catch (e) {
      console.error(`Subtask konnte nicht auf done gesetzt werden: ${humanError(e)}`)
      process.exit(1)
    }
  },
  async 'subtask:edit'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli subtask edit <ST-id|subtask-id> [--title <text>] [--qa <text>] [--position <n>]'); process.exit(2) }
    const id = parseSubtaskRef(ref)
    const body = {}
    if (typeof flags.title === 'string') body.title = flags.title
    if (typeof flags.qa === 'string') body.qa_criteria = flags.qa
    if (flags.position != null && flags.position !== true) body.position = Number(flags.position)
    if (Object.keys(body).length === 0) {
      console.error('Mindestens eines von --title, --qa, --position erforderlich.')
      process.exit(2)
    }
    parseOrThrow(subtaskEditContract, body, 'subtask edit')   // DD-565: Client-Guard vor API
    const updated = await api('PATCH', `/api/subtasks/${id}`, body)
    console.log(`✓ Subtask ${subtaskKey(updated.id)} aktualisiert — ${updated.status}`)
  },
  async 'subtask:rm'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli subtask rm <ST-id|subtask-id> [--yes]'); process.exit(2) }
    const id = parseSubtaskRef(ref)
    if (!flags.yes) {
      console.error('Sicherheits-Guard: nutze --yes zum Loeschen eines Subtasks.')
      process.exit(2)
    }
    await api('DELETE', `/api/subtasks/${id}`)
    console.log(`✓ Subtask ${subtaskKey(id)} geloescht`)
  },

  // ---- User Stories (E01.3) — Pruefgrundlage je Issue. us_verdict {open,accepted,rejected}. ----
  async 'userstory:add'(flags) {
    const ref = flags._[0]
    const title = flags.title
    if (!ref || !title || title === true) {
      console.error('Usage: devd-cli userstory add <issue-id|key> --title <text> [--details <text>] [--qa <text>]')
      process.exit(2)
    }
    const issueId = await resolveIssueId(ref)
    const body = { title }
    if (typeof flags.details === 'string') body.details = flags.details
    if (typeof flags.qa === 'string') body.qa = flags.qa
    parseOrThrow(userStoryCreateContract, body, 'userstory add')
    const created = await api('POST', `/api/backlog/${issueId}/user-stories`, body)
    console.log(`✓ User Story ${userStoryKey(created.id)} angelegt — ${created.title}`)
  },
  async 'userstory:list'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli userstory list <issue-id|key>'); process.exit(2) }
    const issueId = await resolveIssueId(ref)
    const list = await api('GET', `/api/backlog/${issueId}/user-stories`)
    console.log(pad('KEY', 8), pad('VERDICT', 10), pad('POS', 5), pad('TITLE', 45), 'QA')
    console.log('─'.repeat(100))
    for (const us of list) {
      console.log(
        pad(userStoryKey(us.id), 8),
        pad(us.us_verdict, 10),
        pad(us.position ?? '-', 5),
        pad(trunc(us.title || '', 43), 45),
        us.qa ? trunc(us.qa, 34) : `${ANSI.dim}-${ANSI.reset}`,
      )
    }
    console.log(`\n${list.length} User Stories`)
  },
  async 'userstory:edit'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli userstory edit <US-id|id> [--title <text>] [--details <text>] [--qa <text>] [--verdict open|accepted|rejected] [--position <n>]'); process.exit(2) }
    const id = parseUserStoryRef(ref)
    const body = {}
    if (typeof flags.title === 'string') body.title = flags.title
    if (typeof flags.details === 'string') body.details = flags.details
    if (typeof flags.qa === 'string') body.qa = flags.qa
    if (typeof flags.verdict === 'string') body.us_verdict = flags.verdict
    if (flags.position != null && flags.position !== true) body.position = Number(flags.position)
    if (Object.keys(body).length === 0) {
      console.error('Mindestens eines von --title, --details, --qa, --verdict, --position erforderlich.')
      process.exit(2)
    }
    parseOrThrow(userStoryUpdateContract, body, 'userstory edit')
    const updated = await api('PATCH', `/api/user-stories/${id}`, body)
    console.log(`✓ User Story ${userStoryKey(updated.id)} aktualisiert — [${updated.us_verdict}] ${updated.title}`)
  },
  async 'userstory:verdict'(flags) {
    const ref = flags._[0]
    const verdict = flags._[1]
    if (!ref || !verdict) {
      console.error('Usage: devd-cli userstory verdict <US-id|id> <open|accepted|rejected>')
      process.exit(2)
    }
    const id = parseUserStoryRef(ref)
    const body = { us_verdict: verdict }
    parseOrThrow(userStoryVerdictContract, body, 'userstory verdict')
    const updated = await api('PATCH', `/api/user-stories/${id}/verdict`, body)
    console.log(`✓ User Story ${userStoryKey(updated.id)} → [${updated.us_verdict}]`)
  },
  async 'userstory:rm'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli userstory rm <US-id|id> [--yes]'); process.exit(2) }
    const id = parseUserStoryRef(ref)
    if (!flags.yes) {
      console.error('Sicherheits-Guard: nutze --yes zum Loeschen einer User Story.')
      process.exit(2)
    }
    await api('DELETE', `/api/user-stories/${id}`)
    console.log(`✓ User Story ${userStoryKey(id)} geloescht`)
  },

  // ---- Review ----
  async 'review:create'(flags) {
    const ref = flags._[0]
    const status = flags._[1]
    if (!ref || !status) {
      console.error('Usage: devd-cli review create <id|key> <passed|not_passed> [--comment <text>] [--comment-editor]')
      process.exit(2)
    }
    const VALID = new Set(['passed', 'not_passed'])
    if (!VALID.has(status)) {
      console.error(`status muss eines von ${[...VALID].join('|')} sein`)
      process.exit(2)
    }
    let comment = typeof flags.comment === 'string' ? flags.comment : null
    if (flags['comment-editor']) {
      const edited = editInEditor('comment', comment || '')
      if (edited !== null) comment = edited
    }
    if (status === 'not_passed' && !comment) {
      console.error('not_passed erfordert --comment <text> oder --comment-editor (PO muss Begründung liefern)')
      process.exit(2)
    }

    const issueId = await resolveIssueId(ref)
    const round = await api('POST', `/api/backlog/${issueId}/reviews`, { notes: null })
    const updated = await api('PATCH', `/api/reviews/${round.id}`, { status, comment })
    const it = await api('GET', `/api/backlog/${issueId}`)
    console.log(`✓ Review #${updated.id} (Round ${updated.round_number}) → ${updated.review_status}`)
    console.log(`  Issue ${formatIssueKey(it)}: status=${it.status}`)
  },

  // DD-662: Review eines to_review-Issues wieder öffnen (frische pending-Runde +
  // Sprint-Review-Marker zurücksetzen). Hebt die DD#81-Falle (verdictloser
  // Sprint-Review-Submit sperrt review create) ohne UI-Rework-Button auf.
  async 'review:reopen'(flags) {
    const ref = flags._[0]
    if (!ref) {
      console.error('Usage: devd-cli review reopen <id|key>')
      process.exit(2)
    }
    const issueId = await resolveIssueId(ref)
    const result = await api('POST', `/api/backlog/${issueId}/review/reopen`, {})
    const it = await api('GET', `/api/backlog/${issueId}`)
    if (result.opened) {
      console.log(`✓ Review-Runde ${result.roundNumber} neu geöffnet — ${formatIssueKey(it)} (status=${it.status})`)
    } else if (result.alreadyOpen) {
      console.log(`• Runde bereits offen — Marker zurückgesetzt — ${formatIssueKey(it)} (status=${it.status})`)
    } else {
      console.log(`• Keine geschlossene Runde — Sprint-Marker zurückgesetzt — ${formatIssueKey(it)} (status=${it.status})`)
    }
    if (result.reopenedSprintId) console.log(`  Sprint-Review-Marker (Sprint ${result.reopenedSprintId}) → offen`)
  },

  // ---- Issue-Dependencies (MEM-14) — same-project (Keys werden im aktuellen Projekt aufgelöst) ----
  async 'issue:dep'(flags) {
    const sub = flags._[0]
    const issueRef = flags._[1]
    const usage = 'Usage: devd-cli issue dep <add|list|rm> <key|id> [--on <key|id>] [--note <text>]'
    if (sub === 'list') {
      if (!issueRef) { console.error(usage); process.exit(2) }
      const issueId = await resolveIssueId(issueRef)
      const { blockers, blocked_by } = await api('GET', `/api/backlog/${issueId}/dependencies`)
      console.log(`\n${issueRef} — Abhängigkeiten`)
      console.log(`  depends on (blockers): ${blockers.length}`)
      for (const b of blockers) console.log(`    → #${b.id} [${b.status}] ${trunc(b.title, 55)}${b.note ? ` (${b.note})` : ''}  dep#${b.dep_id}`)
      console.log(`  blocked by: ${blocked_by.length}`)
      for (const b of blocked_by) console.log(`    ← #${b.id} [${b.status}] ${trunc(b.title, 55)}  dep#${b.dep_id}`)
      return
    }
    if (sub === 'add') {
      if (!issueRef || typeof flags.on !== 'string') { console.error(usage); process.exit(2) }
      const issueId = await resolveIssueId(issueRef)
      const onId = await resolveIssueId(flags.on)
      const body = { depends_on_id: Number(onId) }
      if (typeof flags.note === 'string') body.note = flags.note
      const dep = await api('POST', `/api/backlog/${issueId}/dependencies`, body)
      console.log(`✓ Dependency #${dep.id}: ${issueRef} depends on ${flags.on}`)
      return
    }
    if (sub === 'rm') {
      if (!issueRef || typeof flags.on !== 'string') { console.error(usage); process.exit(2) }
      const issueId = await resolveIssueId(issueRef)
      const onId = await resolveIssueId(flags.on)
      const { blockers } = await api('GET', `/api/backlog/${issueId}/dependencies`)
      const edge = blockers.find(b => b.id === Number(onId))
      if (!edge) { console.error(`Keine Dependency ${issueRef} → ${flags.on}`); process.exit(1) }
      await api('DELETE', `/api/dependencies/${edge.dep_id}`)
      console.log(`✓ Dependency entfernt: ${issueRef} ⇏ ${flags.on} (war dep#${edge.dep_id})`)
      return
    }
    console.error(usage); process.exit(2)
  },

  // ---- ToDos (DD-308) ----
  async 'todo:list'(flags) {
    const projectId = flags.project ? flags.project : PROJECT_ID
    const qs = flags.status ? `?status=${encodeURIComponent(flags.status)}` : ''
    const todos = await api('GET', `/api/projects/${projectId}/todos${qs}`)
    console.log(pad('ID', 5), pad('STATUS', 10), pad('POS', 5), 'LABEL')
    console.log('─'.repeat(80))
    for (const t of todos) {
      const links = t.links?.length ? ` [${t.links.length} link${t.links.length === 1 ? '' : 's'}]` : ''
      console.log(pad(t.id, 5), pad(colorStatus(t.status), 10 + 9), pad(t.position, 5), trunc(t.label, 50) + links)
    }
    console.log(`\n${todos.length} ToDos (project ${projectId})`)
  },
  async 'todo:add'(flags) {
    const label = flags._[0]
    if (!label) { console.error('Usage: devd-cli todo add "<label>" [--project <id|slug>] [--details <text>]'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const body = { label }
    if (flags.details) body.details = String(flags.details)
    parseOrThrow(todoCreateContract, body, 'todo add')   // DD-562: Client-Guard vor API
    const todo = await api('POST', `/api/projects/${projectId}/todos`, body)
    console.log(`✓ ToDo angelegt: devd:todo:${todo.id}`)
    console.log(`  position=${todo.position} status=${todo.status} label="${todo.label}"`)
  },
  async 'todo:show'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli todo show <id>'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const todos = await api('GET', `/api/projects/${projectId}/todos`)
    const t = todos.find(x => x.id === id)
    if (!t) { console.error(`ToDo ${id} nicht gefunden in Projekt ${projectId}`); process.exit(1) }
    console.log(`devd:todo:${t.id}`)
    console.log(`  Label:    ${t.label}`)
    console.log(`  Status:   ${colorStatus(t.status)}`)
    console.log(`  Position: ${t.position}`)
    if (t.details) console.log(`  Details:  ${trunc(t.details, 200)}`)
    console.log(`  Created:  ${t.created_at}`)
    console.log(`  Updated:  ${t.updated_at}`)
    if (t.links?.length) {
      console.log(`  Links (${t.links.length}):`)
      for (const l of t.links) {
        console.log(`    [${l.type}] ${l.target}`)
      }
    }
  },
  async 'todo:done'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli todo done <id>'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const updated = await api('PATCH', `/api/projects/${projectId}/todos/${id}`, { status: 'done' })
    console.log(`✓ ToDo ${id} → status=done`)
    console.log(`  label="${updated.label}"`)
  },
  async 'todo:edit'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli todo edit <id> [--title "..."] [--details-from-editor] [--status open|done|cancelled]'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const body = {}
    if (typeof flags.title === 'string') body.label = flags.title
    if (typeof flags.label === 'string') body.label = flags.label
    if (typeof flags.status === 'string') body.status = flags.status
    if (typeof flags.details === 'string') body.details = flags.details
    if (flags['details-from-editor']) {
      const edited = editInEditor('details', '')
      if (edited !== null) body.details = edited
    }
    if (Object.keys(body).length === 0) { console.error('Keine Felder zu ändern. Verwende --title/--status/--details/--details-from-editor.'); process.exit(2) }
    parseOrThrow(todoUpdateContract, body, 'todo edit')   // DD-562: Client-Guard vor API
    const updated = await api('PATCH', `/api/projects/${projectId}/todos/${id}`, body)
    console.log(`✓ ToDo ${id} aktualisiert: status=${updated.status} label="${updated.label}"`)
  },
  async 'todo:link'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli todo link <id> --spec <path> | --issue <key> | --vault <wikilink> | --url <url>'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    let type, target
    if (typeof flags.spec === 'string')  { type = 'spec';  target = flags.spec }
    else if (typeof flags.issue === 'string') { type = 'issue'; target = flags.issue }
    else if (typeof flags.vault === 'string') { type = 'vault'; target = flags.vault }
    else if (typeof flags.url === 'string')   { type = 'url';   target = flags.url }
    else { console.error('Genau einen Link-Typ angeben: --spec / --issue / --vault / --url'); process.exit(2) }
    parseOrThrow(todoLinkContract, { type, target }, 'todo link')   // DD-562: Client-Guard vor API
    const link = await api('POST', `/api/projects/${projectId}/todos/${id}/links`, { type, target })
    console.log(`✓ Link angelegt: [${link.type}] ${link.target} (position=${link.position})`)
  },
  async 'todo:delete'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli todo delete <id> --confirm'); process.exit(2) }
    if (!flags.confirm) { console.error('--confirm erforderlich (sicheres Löschen)'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    await api('DELETE', `/api/projects/${projectId}/todos/${id}`)
    console.log(`✓ ToDo ${id} gelöscht (inkl. aller verknüpften Links)`)
  },

  // ---- Project-Memory (MEM-10) — project-scoped via X-Project-Id ----
  async 'memory:add'(flags) {
    const category = flags.category
    const summary = flags._[0] || flags.summary
    if (!category || !summary) {
      console.error('Usage: devd-cli memory add "<summary>" --category <cat> [--content <text>] [--tags a,b] [--importance 1-3] [--anchor <code>] [--stability stable|volatile] [--source-type <t>] [--source-ref <r>] [--project <id|slug>]')
      process.exit(2)
    }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const body = { category, summary: String(summary) }
    if (typeof flags.content === 'string') body.content = flags.content
    if (typeof flags.tags === 'string') body.tags = flags.tags.split(',').map(s => s.trim()).filter(Boolean)
    if (flags.importance) body.importance = Number(flags.importance)
    if (flags.pinned) body.pinned = true
    if (typeof flags.anchor === 'string') body.anchor = flags.anchor
    if (typeof flags.stability === 'string') body.stability = flags.stability
    if (typeof flags['source-type'] === 'string') body.source_type = flags['source-type']
    if (typeof flags['source-ref'] === 'string') body.source_ref = flags['source-ref']
    parseOrThrow(memoryLogContract, body, 'memory add')   // DD-563: Client-Guard vor API
    const m = await api('POST', '/api/project-memories', body, projectId)
    console.log(`✓ Memory #${m.id} [${m.category}]${m.anchor ? ` anchor=${m.anchor}` : ''} (project ${projectId})`)
    console.log(`  ${m.summary}`)
  },
  async 'memory:query'(flags) {
    const q = flags._[0] || flags.q
    if (!q) { console.error('Usage: devd-cli memory query "<text>" [--category <cat>] [--limit <n>] [--project <id|slug>]'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const qs = new URLSearchParams({ q: String(q) })
    if (flags.category) qs.set('category', String(flags.category))
    if (flags.limit) qs.set('limit', String(flags.limit))
    const hits = await api('GET', `/api/project-memories/search?${qs.toString()}`, null, projectId)
    console.log(`\n${hits.length} Treffer für "${q}" (project ${projectId})`)
    for (const h of hits) {
      console.log(`  #${h.id} [${h.category}]${h.anchor ? ` ${h.anchor}` : ''} — ${trunc(h.summary, 70)}`)
      if (h.source_ref) console.log(`     src: ${h.source_ref}`)
    }
  },
  async 'memory:list'(flags) {
    const projectId = flags.project ? flags.project : PROJECT_ID
    // DD-622: Liste per Default compact (ohne content). --full / --fields full für Vollobjekte.
    const params = new URLSearchParams()
    if (flags.category) params.set('category', String(flags.category))
    if (flags.full) params.set('fields', 'full')
    else if (flags.fields) params.set('fields', String(flags.fields))
    if (flags.limit) params.set('limit', String(flags.limit))
    if (flags.offset) params.set('offset', String(flags.offset))
    const qs = params.toString() ? `?${params.toString()}` : ''
    const rows = await api('GET', `/api/project-memories${qs}`, null, projectId)
    console.log(pad('ID', 5), pad('CATEGORY', 22), pad('STAB', 9), 'SUMMARY')
    console.log('─'.repeat(80))
    for (const r of rows) {
      console.log(pad(r.id, 5), pad(r.category, 22), pad(r.stability || '-', 9), trunc(r.summary, 42))
    }
    console.log(`\n${rows.length} Memories (project ${projectId})`)
  },
  async 'memory:show'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli memory show <id> [--project <id|slug>]'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const m = await api('GET', `/api/project-memories/${id}`, null, projectId)
    console.log(`#${m.id} [${m.category}] importance=${m.importance} pinned=${m.pinned}${m.anchor ? ` anchor=${m.anchor}` : ''}${m.stability ? ` stability=${m.stability}` : ''}`)
    console.log(`  Summary: ${m.summary}`)
    if (m.content) console.log(`  Content: ${m.content}`)
    if (m.tags) console.log(`  Tags:    ${m.tags}`)
    if (m.source_type || m.source_ref) console.log(`  Source:  ${[m.source_type, m.source_ref].filter(Boolean).join(' ')}`)
    if (m.superseded_by) console.log(`  ⚠ superseded_by #${m.superseded_by}`)
    console.log(`  Created: ${m.created_at}  Updated: ${m.updated_at}`)
  },

  // ---- Project-Memory Write-Vollständigkeit (DD-625) — REST existierte, CLI+MCP gespiegelt ----
  async 'memory:update'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli memory update <id> [--summary <s>] [--content <t>] [--category <c>] [--tags a,b] [--importance 1-3] [--pinned true|false] [--anchor <code>] [--stability stable|volatile] [--source-type <t>] [--source-ref <r>] [--project <id|slug>]'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const body = memoryEditBody(flags)
    if (Object.keys(body).length === 0) { console.error('Nichts zu ändern — mindestens ein Feld-Flag angeben.'); process.exit(2) }
    parseOrThrow(memoryUpdateContract, body, 'memory update')   // DD-625: Client-Guard vor API
    const m = await api('PATCH', `/api/project-memories/${id}`, body, projectId)
    console.log(`✓ Memory #${m.id} aktualisiert [${m.category}]${m.anchor ? ` anchor=${m.anchor}` : ''} (project ${projectId})`)
    console.log(`  ${m.summary}`)
  },
  async 'memory:supersede'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli memory supersede <id> [--summary <s>] [--content <t>] [--category <c>] [--tags a,b] [--importance 1-3] [--pinned true|false] [--anchor <code>] [--stability stable|volatile] [--source-type <t>] [--source-ref <r>] [--project <id|slug>]'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const body = memoryEditBody(flags)
    parseOrThrow(memorySupersedeContract, body, 'memory supersede')   // DD-625: Client-Guard vor API
    const m = await api('POST', `/api/project-memories/${id}/supersede`, body, projectId)
    console.log(`✓ Memory #${id} superseded → neue Row #${m.id} [${m.category}]${m.anchor ? ` anchor=${m.anchor}` : ''} (project ${projectId})`)
    console.log(`  ${m.summary}`)
  },
  async 'memory:delete'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli memory delete <id> [--project <id|slug>]'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    await api('DELETE', `/api/project-memories/${id}`, null, projectId)
    console.log(`✓ Memory #${id} gelöscht (soft-delete, project ${projectId})`)
  },

  // MEM-25: Stichwort-Register (Controlled Vocabulary). Subkommandos: list | create | rename | delete.
  async 'memory:tag'(flags) {
    const sub = flags._[0] || 'list'
    const projectId = flags.project ? flags.project : PROJECT_ID
    if (sub === 'list') {
      const query = (typeof flags.query === 'string' && flags.query) || flags._[1]
      const qs = query ? `?query=${encodeURIComponent(query)}` : ''
      const rows = await api('GET', `/api/project-memory-tags${qs}`, null, projectId)
      console.log(pad('TAG', 28), pad('USES', 6), 'DESCRIPTION')
      console.log('─'.repeat(70))
      for (const r of rows) console.log(pad(r.tag, 28), pad(r.usage_count, 6), trunc(r.description || '', 34))
      console.log(`\n${rows.length} Tags im Register${query ? ` (Filter "${query}")` : ''} (project ${projectId})`)
      return
    }
    if (sub === 'create') {
      const tag = flags._[1]
      if (!tag) { console.error('Usage: devd-cli memory tag create <tag> [--desc <text>] [--project <id|slug>]'); process.exit(2) }
      const body = { tag }
      if (typeof flags.desc === 'string') body.description = flags.desc
      else if (typeof flags.description === 'string') body.description = flags.description
      const r = await api('POST', '/api/project-memory-tags', body, projectId)
      console.log(`✓ Tag '${r.tag}' ins Register (project ${projectId})`)
      return
    }
    if (sub === 'rename') {
      const oldTag = flags._[1], newTag = flags._[2]
      if (!oldTag || !newTag) { console.error('Usage: devd-cli memory tag rename <alt> <neu> [--project <id|slug>]'); process.exit(2) }
      const r = await api('POST', '/api/project-memory-tags/rename', { old: oldTag, new: newTag }, projectId)
      console.log(`✓ '${oldTag}' → '${newTag}' (${r.merged ? 'merged' : 'renamed'}, ${r.repointed} Memories repointet, project ${projectId})`)
      return
    }
    if (sub === 'delete') {
      const tag = flags._[1]
      if (!tag) { console.error('Usage: devd-cli memory tag delete <tag> [--project <id|slug>]'); process.exit(2) }
      const r = await api('DELETE', `/api/project-memory-tags/${encodeURIComponent(tag)}`, null, projectId)
      console.log(`✓ Tag '${tag}' aus Register entfernt — war an ${r.usage_count} Memories (project ${projectId})`)
      return
    }
    if (sub === 'prune') {
      const r = await api('POST', '/api/project-memory-tags/prune', {}, projectId)
      console.log(`✓ Prune: ${r.touched} Memories bereinigt (nicht-registrierte Tokens entfernt, project ${projectId})`)
      return
    }
    console.error(`Unbekanntes 'memory tag' Subkommando: ${sub}\nNutze: list | create | rename | delete | prune`)
    process.exit(2)
  },

  async 'memory:anchor'(flags) {
    const anchor = flags._[0]
    if (!anchor) { console.error('Usage: devd-cli memory anchor <anchor> [--project <id|slug>]'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const m = await api('GET', `/api/project-memories/anchor/${encodeURIComponent(String(anchor))}`, null, projectId)
    console.log(`#${m.id} [${m.category}] anchor=${m.anchor}${m.stability ? ` stability=${m.stability}` : ''}`)
    console.log(`  Summary: ${m.summary}`)
    if (m.content) console.log(`  Content: ${m.content}`)
    if (m.tags) console.log(`  Tags:    ${m.tags}`)
  },
  async 'memory:anchor-patch'(flags) {
    const anchor = flags._[0]
    if (!anchor) { console.error('Usage: devd-cli memory anchor-patch <anchor> [--summary <s>] [--content <t>] [--tags a,b] [--importance 1-3] [--pinned true|false] [--stability stable|volatile] [--source-type <t>] [--source-ref <r>] [--project <id|slug>]'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const body = memoryEditBody(flags)
    if (Object.keys(body).length === 0) { console.error('Nichts zu ändern — mindestens ein Feld-Flag angeben.'); process.exit(2) }
    parseOrThrow(memoryUpdateContract, body, 'memory anchor-patch')   // DD-625: Client-Guard vor API
    const m = await api('PATCH', `/api/project-memories/anchor/${encodeURIComponent(String(anchor))}`, body, projectId)
    console.log(`✓ Anchor ${anchor} gepatcht → Memory #${m.id} [${m.category}] (project ${projectId})`)
    console.log(`  ${m.summary}`)
  },

  // ---- Tags (DD-624) — project-scoped via X-Project-Id; spiegelt die REST-Tag-Routen ----
  async 'tag:list'(flags) {
    const projectId = flags.project ? flags.project : PROJECT_ID
    const rows = await api('GET', '/api/tags', null, projectId)
    console.log(pad('ID', 5), pad('NAME', 24), pad('COLOR', 10), 'USAGE')
    console.log('─'.repeat(60))
    for (const t of rows) console.log(pad(t.id, 5), pad(trunc(t.name, 22), 24), pad(t.color, 10), t.usage_count ?? 0)
    console.log(`\n${rows.length} Tags (project ${projectId})`)
  },
  async 'tag:create'(flags) {
    const name = flags._[0] || flags.name
    if (!name) { console.error('Usage: devd-cli tag create "<name>" [--color blue|green|peach|mauve|teal|overlay0] [--project <id|slug>]'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const body = { name: String(name) }
    if (typeof flags.color === 'string') body.color = flags.color
    parseOrThrow(tagCreateContract, body, 'tag create')   // DD-624: Client-Guard vor API
    const t = await api('POST', '/api/tags', body, projectId)
    console.log(`✓ Tag #${t.id} "${t.name}" [${t.color}] (project ${projectId})`)
  },
  async 'tag:update'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli tag update <id> [--name <n>] [--color <c>] [--project <id|slug>]'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const body = {}
    if (typeof flags.name === 'string') body.name = flags.name
    if (typeof flags.color === 'string') body.color = flags.color
    if (Object.keys(body).length === 0) { console.error('Nichts zu ändern — --name und/oder --color angeben.'); process.exit(2) }
    parseOrThrow(tagUpdateContract, body, 'tag update')   // DD-624: Client-Guard vor API
    const t = await api('PUT', `/api/tags/${id}`, body, projectId)
    console.log(`✓ Tag #${t.id} "${t.name}" [${t.color}] aktualisiert (project ${projectId})`)
  },
  async 'tag:delete'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli tag delete <id> [--project <id|slug>]'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    await api('DELETE', `/api/tags/${id}`, null, projectId)
    console.log(`✓ Tag #${id} gelöscht (inkl. aller Issue-Zuweisungen, project ${projectId})`)
  },
  async 'issue:tag-set'(flags) {
    const ref = flags._[0]
    if (!ref || !flags.tags) { console.error('Usage: devd-cli issue tag-set <id|key> --tags "a,b,c"   # vollständiger Replace; leere Liste löscht alle'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const id = await resolveIssueId(ref)
    const names = splitCsv(flags.tags)
    const { ids, missing } = names.length ? await resolveTagIds(names, projectId) : { ids: [], missing: [] }
    if (missing.length) { console.error(`Unbekannte Tags: ${missing.join(', ')} — zuerst via 'tag create' anlegen.`); process.exit(2) }
    const body = parseOrThrow(issueTagsContract, { tag_ids: ids }, 'issue tag-set')
    const r = await api('PUT', `/api/backlog/${id}/tags`, body)
    console.log(`✓ ${ref} Tags gesetzt: ${(r.tags || []).map(t => t.name).join(', ') || '(keine)'}`)
  },
  async 'issue:tag-remove'(flags) {
    const ref = flags._[0]
    if (!ref || !flags.tags) { console.error('Usage: devd-cli issue tag-remove <id|key> --tags "a,b"'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const id = await resolveIssueId(ref)
    const remove = new Set(splitCsv(flags.tags).map(s => s.toLowerCase()))
    const item = await api('GET', `/api/backlog/${id}`, null, projectId)
    const keep = (item.tags || []).filter(t => !remove.has(String(t.name).toLowerCase()))
    const body = parseOrThrow(issueTagsContract, { tag_ids: keep.map(t => t.id) }, 'issue tag-remove')
    const r = await api('PUT', `/api/backlog/${id}/tags`, body)
    console.log(`✓ ${ref} Tags jetzt: ${(r.tags || []).map(t => t.name).join(', ') || '(keine)'}`)
  },

  // ---- GF-2 Wave D / D1: Sprint + Milestone Tags (mirror issue:tag-*) ----
  async 'sprint:tag-set'(flags) {
    const ref = flags._[0]
    if (!ref || flags.tags == null) { console.error('Usage: devd-cli sprint tag-set <id|key> --tags "a,b,c"   # vollständiger Replace; leere Liste löscht alle'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const id = await resolveSprintId(ref)
    const names = splitCsv(flags.tags)
    const { ids, missing } = names.length ? await resolveTagIds(names, projectId) : { ids: [], missing: [] }
    if (missing.length) { console.error(`Unbekannte Tags: ${missing.join(', ')} — zuerst via 'tag create' anlegen.`); process.exit(2) }
    const body = parseOrThrow(sprintTagsContract, { tag_ids: ids }, 'sprint tag-set')
    const r = await api('PUT', `/api/sprints/${id}/tags`, body)
    console.log(`✓ ${ref} Tags gesetzt: ${(r.tags || []).map(t => t.name).join(', ') || '(keine)'}`)
  },
  async 'sprint:tag-remove'(flags) {
    const ref = flags._[0]
    if (!ref || !flags.tags) { console.error('Usage: devd-cli sprint tag-remove <id|key> --tags "a,b"'); process.exit(2) }
    const id = await resolveSprintId(ref)
    const remove = new Set(splitCsv(flags.tags).map(s => s.toLowerCase()))
    const cur = await api('GET', `/api/sprints/${id}/tags`)
    const keep = (cur.tags || []).filter(t => !remove.has(String(t.name).toLowerCase()))
    const body = parseOrThrow(sprintTagsContract, { tag_ids: keep.map(t => t.id) }, 'sprint tag-remove')
    const r = await api('PUT', `/api/sprints/${id}/tags`, body)
    console.log(`✓ ${ref} Tags jetzt: ${(r.tags || []).map(t => t.name).join(', ') || '(keine)'}`)
  },
  async 'sprint:tag-list'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli sprint tag-list <id|key>'); process.exit(2) }
    const id = await resolveSprintId(ref)
    const r = await api('GET', `/api/sprints/${id}/tags`)
    console.log((r.tags || []).map(t => `${t.name} (${t.color})`).join('\n') || '(keine Tags)')
  },
  async 'milestone:tag-set'(flags) {
    const id = Number(flags._[0])
    if (!id || flags.tags == null) { console.error('Usage: devd-cli milestone tag-set <id> --tags "a,b,c"   # vollständiger Replace; leere Liste löscht alle'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const names = splitCsv(flags.tags)
    const { ids, missing } = names.length ? await resolveTagIds(names, projectId) : { ids: [], missing: [] }
    if (missing.length) { console.error(`Unbekannte Tags: ${missing.join(', ')} — zuerst via 'tag create' anlegen.`); process.exit(2) }
    const body = parseOrThrow(milestoneTagsContract, { tag_ids: ids }, 'milestone tag-set')
    const r = await api('PUT', `/api/milestones/${id}/tags`, body)
    console.log(`✓ #${id} Tags gesetzt: ${(r.tags || []).map(t => t.name).join(', ') || '(keine)'}`)
  },
  async 'milestone:tag-remove'(flags) {
    const id = Number(flags._[0])
    if (!id || !flags.tags) { console.error('Usage: devd-cli milestone tag-remove <id> --tags "a,b"'); process.exit(2) }
    const remove = new Set(splitCsv(flags.tags).map(s => s.toLowerCase()))
    const cur = await api('GET', `/api/milestones/${id}/tags`)
    const keep = (cur.tags || []).filter(t => !remove.has(String(t.name).toLowerCase()))
    const body = parseOrThrow(milestoneTagsContract, { tag_ids: keep.map(t => t.id) }, 'milestone tag-remove')
    const r = await api('PUT', `/api/milestones/${id}/tags`, body)
    console.log(`✓ #${id} Tags jetzt: ${(r.tags || []).map(t => t.name).join(', ') || '(keine)'}`)
  },
  async 'milestone:tag-list'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli milestone tag-list <id>'); process.exit(2) }
    const r = await api('GET', `/api/milestones/${id}/tags`)
    console.log((r.tags || []).map(t => `${t.name} (${t.color})`).join('\n') || '(keine Tags)')
  },

  // ---- GF-2 Wave D / D2 (T01): Sprint-Dependencies (mirror milestone:dep-*) ----
  async 'sprint:dep-add'(flags) {
    const successorRef = flags._[0]
    const predecessorRef = flags['depends-on']
    if (!successorRef || !predecessorRef) { console.error('Usage: devd-cli sprint dep-add <id|key> --depends-on <vorgänger-id|key>'); process.exit(2) }
    const successorId = await resolveSprintId(successorRef)
    const predecessorId = await resolveSprintId(predecessorRef)
    const body = parseOrThrow(sprintDependencyContract, { predecessor_id: predecessorId, successor_id: successorId }, 'sprint dep-add')
    const dep = await api('POST', '/api/sprint-dependencies', body)
    console.log(`✓ Dependency #${dep.id}: #${dep.predecessor_id} (Vorgänger) → #${dep.successor_id} (Nachfolger)`)
  },
  async 'sprint:dep-list'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli sprint dep-list <id|key>'); process.exit(2) }
    const id = await resolveSprintId(ref)
    const { predecessors = [], successors = [] } = await api('GET', `/api/sprints/${id}/dependencies`)
    console.log(`Dependencies für Sprint #${id}:`)
    console.log(`\nVorgänger (müssen vorher fertig sein):`)
    if (!predecessors.length) console.log('  (keine)')
    for (const p of predecessors) console.log(`  dep#${p.dependency_id}  #${p.id} ${p.name}`)
    console.log(`\nNachfolger (warten auf diesen):`)
    if (!successors.length) console.log('  (keine)')
    for (const s of successors) console.log(`  dep#${s.dependency_id}  #${s.id} ${s.name}`)
  },
  async 'sprint:dep-remove'(flags) {
    const depId = Number(flags._[0])
    if (!depId) { console.error('Usage: devd-cli sprint dep-remove <dependency-id>   (dep#-ID aus dep-list)'); process.exit(2) }
    await api('DELETE', `/api/sprint-dependencies/${depId}`)
    console.log(`✓ Dependency #${depId} entfernt`)
  },

  // ---- Backlog Audit-Gap-Verben (DD-621) — REST existierte, CLI+MCP gespiegelt ----
  async 'issue:bulk'(flags) {
    const ids = splitCsv(flags.ids).map(Number).filter(Number.isFinite)
    const action = flags.action
    if (!ids.length || !action) { console.error('Usage: devd-cli issue bulk --ids 1,2,3 --action set_status|set_sprint|cancel|add_tags|remove_tags [--status <s>] [--sprint <id|null>] [--notes <t>] [--tags a,b] [--project <id|slug>]'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const payload = {}
    if (typeof flags.status === 'string') payload.status = flags.status
    if (flags.sprint !== undefined) payload.sprint_id = (flags.sprint === 'null' || flags.sprint === 'none') ? null : Number(flags.sprint)
    if (typeof flags.notes === 'string') payload.notes = flags.notes
    if (flags.tags) {
      const { ids: tagIds, missing } = await resolveTagIds(splitCsv(flags.tags), projectId)
      if (missing.length) { console.error(`Unbekannte Tags: ${missing.join(', ')}`); process.exit(2) }
      payload.tag_ids = tagIds
    }
    const body = parseOrThrow(backlogBulkContract, { ids, action, payload }, 'issue bulk')
    const r = await api('PATCH', '/api/backlog/bulk', body, projectId)
    console.log(`✓ bulk ${action}: ok=${(r.ok || []).length} failed=${(r.failed || []).length}`)
    for (const f of (r.failed || [])) console.log(`  ✗ #${f.id}: ${f.reason}`)
  },
  async 'issue:delete'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli issue delete <id|key> [--force]   # ohne --force → 409 (Status cancelled nutzen)'); process.exit(2) }
    const id = await resolveIssueId(ref)
    const qs = flags.force ? '?force=1' : ''
    await api('DELETE', `/api/backlog/${id}${qs}`)
    console.log(`✓ Issue ${ref} ${flags.force ? 'endgültig gelöscht' : 'gelöscht'}`)
  },
  async 'issue:move'(flags) {
    const ref = flags._[0]
    const to = flags.to
    if (!ref || !to) { console.error('Usage: devd-cli issue move <id|key> --to <project-id|slug>'); process.exit(2) }
    const id = await resolveIssueId(ref)
    const project = await resolveProject(to)
    const body = parseOrThrow(backlogMoveContract, { target_project_id: project.id }, 'issue move')
    const r = await api('POST', `/api/backlog/${id}/move`, body)
    console.log(`✓ Issue ${ref} → Projekt ${project.slug || to}${r.key ? ` (neuer Key ${r.key})` : ''}`)
  },
  async 'issue:activity'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli issue activity <id|key> [--limit <n>]'); process.exit(2) }
    const id = await resolveIssueId(ref)
    const qs = flags.limit ? `?limit=${Number(flags.limit)}` : ''
    const rows = await api('GET', `/api/backlog/${id}/activity${qs}`)
    console.log(pad('WHEN', 20), pad('AGENT', 16), pad('ACTION', 16), 'CHANGE')
    console.log('─'.repeat(96))
    for (const a of rows) console.log(pad(trunc(a.timestamp, 19), 20), pad(a.agent_id || '-', 16), pad(a.action, 16), trunc(`${a.old_value ?? ''} → ${a.new_value ?? ''}`, 40))
    console.log(`\n${rows.length} Aktivitäten`)
  },

  // ---- GF-2 Wave D / D4 (T03): Sprint-Completeness ----
  async 'sprint:completeness'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli sprint completeness <id|key>'); process.exit(2) }
    const id = await resolveSprintId(ref)
    const c = await api('GET', `/api/sprints/${id}/completeness`)
    console.log(`Sprint #${id} Completeness: ${c.issues_done}/${c.issues_total} Issues passed (${c.percent_complete}%)`)
    console.log(`  offen: ${c.issues_open}  ·  cancelled: ${c.issues_cancelled}  ·  points: ${c.points ?? 'n/a'}`)
  },

  // ---- GF-2 Wave D / D3 (T04): Activity-Read für Sprint + Milestone (mirror issue:activity) ----
  async 'sprint:activity'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli sprint activity <id|key> [--limit <n>]'); process.exit(2) }
    const id = await resolveSprintId(ref)
    const qs = flags.limit ? `?limit=${Number(flags.limit)}` : ''
    const rows = await api('GET', `/api/sprints/${id}/activity${qs}`)
    console.log(pad('WHEN', 20), pad('AGENT', 16), pad('ACTION', 16), 'CHANGE')
    console.log('─'.repeat(96))
    for (const a of rows) console.log(pad(trunc(a.timestamp, 19), 20), pad(a.agent_id || '-', 16), pad(a.action, 16), trunc(`${a.old_value ?? ''} → ${a.new_value ?? ''}`, 40))
    console.log(`\n${rows.length} Aktivitäten`)
  },
  async 'milestone:activity'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli milestone activity <id> [--limit <n>]'); process.exit(2) }
    const qs = flags.limit ? `?limit=${Number(flags.limit)}` : ''
    const rows = await api('GET', `/api/milestones/${id}/activity${qs}`)
    console.log(pad('WHEN', 20), pad('AGENT', 16), pad('ACTION', 16), 'CHANGE')
    console.log('─'.repeat(96))
    for (const a of rows) console.log(pad(trunc(a.timestamp, 19), 20), pad(a.agent_id || '-', 16), pad(a.action, 16), trunc(`${a.old_value ?? ''} → ${a.new_value ?? ''}`, 40))
    console.log(`\n${rows.length} Aktivitäten`)
  },

  // ---- SOPs (DD-530) — global (kein project_id); token-effizienter Zeilen-Edit ----
  async 'sop:list'() {
    const rows = await api('GET', '/api/sops')
    console.log(pad('KEY', 26), pad('TITLE', 42), 'UPDATED')
    console.log('─'.repeat(92))
    for (const s of rows) console.log(pad(s.sop_key, 26), pad(trunc(s.title, 40), 42), s.updated_at || '-')
    console.log(`\n${rows.length} SOPs`)
  },
  async 'sop:show'(flags) {
    const key = flags._[0]
    if (!key) { console.error('Usage: devd-cli sop show <key> [--numbered]   # --numbered zeigt Zeilennummern für sop edit'); process.exit(2) }
    const s = await api('GET', `/api/sops/${encodeURIComponent(key)}`)
    console.log(`# ${s.title}  (${s.sop_key})\n`)
    if (flags.numbered) {
      String(s.content || '').split('\n').forEach((l, i) => console.log(`${String(i + 1).padStart(4)}  ${l}`))
    } else {
      process.stdout.write((s.content || '') + '\n')
    }
  },
  async 'sop:edit'(flags) {
    const key = flags._[0]
    const op = flags.op
    const line = flags.line
    if (!key || !op || line === undefined || line === true) {
      console.error('Usage: devd-cli sop edit <key> --op patch|insert_after|insert_before|delete --line <n> [--content <text>] [--expect <line-content>]')
      process.exit(2)
    }
    // Op-Schreibweise tolerant: insert-after == insert_after (Backend nutzt Underscore).
    const body = { op: String(op).replace(/-/g, '_'), line: Number(line) }
    if (typeof flags.content === 'string') body.content = flags.content
    if (typeof flags.expect === 'string') body.expect = flags.expect
    const s = await api('PATCH', `/api/sops/${encodeURIComponent(key)}/line`, body)
    console.log(`✓ SOP '${s.sop_key}' Line-Op '${op}' @${line}`)
  },
  async 'sop:set'(flags) {
    const key = flags._[0]
    if (!key || (typeof flags.content !== 'string' && typeof flags.file !== 'string')) {
      console.error('Usage: devd-cli sop set <key> --content "<text>" | --file <path>   # Whole-Rewrite (last-write-wins)')
      process.exit(2)
    }
    const content = typeof flags.file === 'string' ? readFileSync(flags.file, 'utf8') : flags.content
    const s = await api('PUT', `/api/sops/${encodeURIComponent(key)}`, { content })
    console.log(`✓ SOP '${s.sop_key}' überschrieben (${String(content).length} Zeichen)`)
  },
  async 'sop:create'(flags) {
    const key = flags._[0]
    if (!key || typeof flags.title !== 'string' || (typeof flags.content !== 'string' && typeof flags.file !== 'string')) {
      console.error('Usage: devd-cli sop create <key> --title "<text>" --content "<text>" | --file <path> [--force]')
      console.error('  Legt eine neue SOP an. Ohne --force Fehler, wenn der Key bereits existiert (dann sop set/edit nutzen).')
      process.exit(2)
    }
    // Existenz-Guard: POST ist serverseitig ein Upsert; create darf nicht versehentlich überschreiben.
    if (!flags.force) {
      let exists = false
      try { await api('GET', `/api/sops/${encodeURIComponent(key)}`); exists = true } catch { exists = false }
      if (exists) { console.error(`SOP '${key}' existiert bereits — 'sop set'/'sop edit' nutzen oder --force.`); process.exit(2) }
    }
    const content = typeof flags.file === 'string' ? readFileSync(flags.file, 'utf8') : flags.content
    const s = await api('POST', '/api/sops', { sop_key: key, title: flags.title, content })
    console.log(`✓ SOP '${s.sop_key}' angelegt (${String(content).length} Zeichen)`)
  },

  // ---- SOP-Collections (ProjectPages T-be2, D-E) — global; benannte SOP-Gruppen + Export ----
  async 'sop-collection:list'() {
    const rows = await api('GET', '/api/sop-collections')
    console.log(pad('KEY', 26), pad('NAME', 32), 'SOPS')
    console.log('─'.repeat(70))
    for (const c of rows) console.log(pad(c.collection_key, 26), pad(trunc(c.name, 30), 32), c.sop_count)
    console.log(`\n${rows.length} Collections`)
  },
  async 'sop-collection:show'(flags) {
    const key = flags._[0]
    if (!key) { console.error('Usage: devd-cli sop-collection show <key>'); process.exit(2) }
    const c = await api('GET', `/api/sop-collections/${encodeURIComponent(key)}`)
    console.log(`# ${c.name}  (${c.collection_key})`)
    if (c.description) console.log(c.description)
    console.log(`\n${c.sops.length} SOPs:`)
    for (const s of c.sops) console.log(`  - ${pad(s.sop_key, 26)} ${trunc(s.title, 40)}`)
  },
  async 'sop-collection:create'(flags) {
    const key = flags._[0]
    if (!key || typeof flags.name !== 'string') {
      console.error('Usage: devd-cli sop-collection create <key> --name "<text>" [--description "<text>"]'); process.exit(2)
    }
    const body = { collection_key: key, name: flags.name }
    if (typeof flags.description === 'string') body.description = flags.description
    const c = await api('POST', '/api/sop-collections', body)
    console.log(`✓ Collection '${c.collection_key}' angelegt`)
  },
  async 'sop-collection:set'(flags) {
    const key = flags._[0]
    if (!key || typeof flags.sops !== 'string') {
      console.error('Usage: devd-cli sop-collection set <key> --sops "key-a,key-b,key-c"   # Replace, geordnet'); process.exit(2)
    }
    const sopKeys = flags.sops.split(',').map(s => s.trim()).filter(Boolean)
    const r = await api('PUT', `/api/sop-collections/${encodeURIComponent(key)}/items`, { sopKeys })
    console.log(`✓ Collection '${key}' Mitglieder gesetzt: ${r.sopKeys.join(', ')}`)
  },
  async 'sop-collection:export'(flags) {
    const key = flags._[0]
    if (!key) { console.error('Usage: devd-cli sop-collection export <key>   # Markdown-Bundle nach stdout'); process.exit(2) }
    const md = await api('GET', `/api/sop-collections/${encodeURIComponent(key)}/export`)
    process.stdout.write((typeof md === 'string' ? md : JSON.stringify(md)) + '\n')
  },
  // DD2-6: Sprint-Export (CSV/MD) nach stdout. Backlog-CSV bleibt entfernt (DD2-123);
  // Sprint-Export behält CSV für Tabellen-/Tracking-Tools.
  async 'sprint:export'(flags) {
    const ref = flags._[0]
    if (!ref) { console.error('Usage: devd-cli sprint export <key|id> [--format csv|md]   # nach stdout'); process.exit(2) }
    const format = typeof flags.format === 'string' ? flags.format.toLowerCase() : 'md'
    const id = await resolveSprintId(ref)
    const out = await api('GET', `/api/sprints/${id}/export?format=${encodeURIComponent(format)}`)
    process.stdout.write((typeof out === 'string' ? out : JSON.stringify(out)) + '\n')
  },

  // ---- Documents (DD2-21) — Markdown-Docs an Meilensteine/Sprints (DB-Blob).
  // Owner via --milestone <id> ODER --sprint <key|id>. show=Glow, edit=$EDITOR. ----
  async 'doc:list'(flags) {
    const o = await docOwnerBase(flags)
    const rows = await api('GET', `${o.base}/documents`)
    console.log(pad('ID', 5), pad('TITLE', 50), 'UPDATED')
    console.log('─'.repeat(78))
    for (const d of rows) console.log(pad(d.id, 5), pad(trunc(d.title, 48), 50), d.updated_at || '')
    console.log(`\n${rows.length} Dokument(e) — ${o.label}`)
  },
  async 'doc:show'(flags) {
    const docId = Number(flags._[0])
    if (!docId) { console.error('Usage: devd-cli doc show <docId> --milestone <id>|--sprint <key|id>'); process.exit(2) }
    const o = await docOwnerBase(flags)
    const d = await api('GET', `${o.base}/documents/${docId}`)
    const glow = spawnSync('glow', ['-'], { input: d.body || '', stdio: ['pipe', 'inherit', 'inherit'] })
    if (glow.error) process.stdout.write((d.body || '') + '\n')   // glow nicht installiert → roh
  },
  async 'doc:add'(flags) {
    const o = await docOwnerBase(flags)
    if (typeof flags.title !== 'string') { console.error('Usage: devd-cli doc add --milestone <id>|--sprint <key|id> --title "<t>" [--body <text>|--file <path>] [--file-path <p>]'); process.exit(2) }
    let body = ''
    if (typeof flags.body === 'string') body = flags.body
    else if (typeof flags.file === 'string') body = readFileSync(flags.file, 'utf8')
    const payload = { title: flags.title, body }
    if (typeof flags['file-path'] === 'string') payload.file_path = flags['file-path']
    const d = await api('POST', `${o.base}/documents`, payload)
    console.log(`✓ Dokument #${d.id} angelegt — ${o.label}`)
  },
  async 'doc:edit'(flags) {
    const docId = Number(flags._[0])
    if (!docId) { console.error('Usage: devd-cli doc edit <docId> --milestone <id>|--sprint <key|id>   # öffnet $EDITOR'); process.exit(2) }
    const o = await docOwnerBase(flags)
    const d = await api('GET', `${o.base}/documents/${docId}`)
    const updated = editInEditor(`doc-${docId}`, d.body || '')
    if (updated == null) { console.log('Keine Änderung — nichts gespeichert.'); return }
    const r = await api('PUT', `${o.base}/documents/${docId}`, { body: updated })
    console.log(`✓ Dokument #${r.id} aktualisiert (${updated.length} Zeichen)`)
  },
  async 'doc:delete'(flags) {
    const docId = Number(flags._[0])
    if (!docId) { console.error('Usage: devd-cli doc delete <docId> --milestone <id>|--sprint <key|id>'); process.exit(2) }
    const o = await docOwnerBase(flags)
    await api('DELETE', `${o.base}/documents/${docId}`)
    console.log(`✓ Dokument #${docId} gelöscht`)
  },

  // ---- User-Notes (ProjectPages T-be1, D-D Modell B) — project-gescopt (X-Project-Id) ----
  async 'user-note:list'(flags) {
    const projectId = flags.project ? flags.project : PROJECT_ID
    const qs = flags.search ? `?search=${encodeURIComponent(String(flags.search))}` : ''
    const rows = await api('GET', `/api/user-notes${qs}`, null, projectId)
    console.log(pad('ID', 5), pad('TITLE', 42), 'SPRINTS/ISSUES')
    console.log('─'.repeat(80))
    for (const n of rows) console.log(pad(n.id, 5), pad(trunc(n.title, 40), 42), [...(n.sprints || []), ...(n.issues || [])].join(','))
    console.log(`\n${rows.length} User-Notes (project ${projectId})`)
  },
  async 'user-note:show'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli user-note show <id> [--project <id|slug>]'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    const n = await api('GET', `/api/user-notes/${id}`, null, projectId)
    console.log(`#${n.id} ${n.title}`)
    if (n.pr_url) console.log(`  PR: ${n.pr_url}`)
    if ((n.sprints || []).length) console.log(`  Sprints: ${n.sprints.join(', ')}`)
    if ((n.issues || []).length) console.log(`  Issues:  ${n.issues.join(', ')}`)
    if (n.details) console.log(`\n${n.details}`)
  },
  async 'user-note:create'(flags) {
    const projectId = flags.project ? flags.project : PROJECT_ID
    if (typeof flags.title !== 'string') { console.error('Usage: devd-cli user-note create --title "<text>" [--details <text>] [--pr <url>] [--sprints a,b] [--issues a,b] [--project <id|slug>]'); process.exit(2) }
    const body = { title: flags.title }
    if (typeof flags.details === 'string') body.details = flags.details
    if (typeof flags.pr === 'string') body.pr_url = flags.pr
    if (typeof flags.sprints === 'string') body.sprints = flags.sprints.split(',').map(s => s.trim()).filter(Boolean)
    if (typeof flags.issues === 'string') body.issues = flags.issues.split(',').map(s => s.trim()).filter(Boolean)
    const n = await api('POST', '/api/user-notes', body, projectId)
    console.log(`✓ User-Note #${n.id} angelegt`)
  },
  async 'user-note:delete'(flags) {
    const id = Number(flags._[0])
    if (!id) { console.error('Usage: devd-cli user-note delete <id> [--project <id|slug>]'); process.exit(2) }
    const projectId = flags.project ? flags.project : PROJECT_ID
    await api('DELETE', `/api/user-notes/${id}`, null, projectId)
    console.log(`✓ User-Note #${id} gelöscht`)
  },

  async help() {
    console.log(`DevDash CLI

Projekte:
  devd-cli project list [--archived]
  devd-cli project show <id|slug>
  devd-cli project create <slug> --name <text> --prefix <PREFIX>
                                 [--color <hex>] [--description <text>] [--path <repo-path>]

Sprints (Key wie DD#20 oder globale ID):
  devd-cli sprint list [--status new|planned|in_progress|to_review|completed|cancelled]
  devd-cli sprint show <key|id>
  devd-cli sprint context <key|id> [--format json|markdown]
                                   [--screenshots [--output-dir <dir>]]
  devd-cli sprint create <name> [--goal <text>]
  devd-cli sprint start <key|id>            # new → in_progress
  devd-cli sprint review <key|id>           # in_progress → to_review
  devd-cli sprint complete <key|id> [--force]
  devd-cli sprint cancel <key|id> --notes <begründung>
  devd-cli sprint rev-results <key|id>      # PO-Review-Übersicht
  devd-cli sprint export <key|id> [--format csv|md]   # Sprint-Issues nach stdout (DD2-6)
  devd-cli sprint set-milestone <key|id> <milestone-id|none>   # DD-552
  devd-cli sprint list --no-milestone [--status <s>]           # DD-554
  devd-cli sprint update <key|id> [--name <n>] [--goal <t>] [--notes <t>]
                                  [--start-date <d>] [--end-date <d>] [--capacity <n>] [--wip-limit <n>]   # DD-626
  devd-cli sprint reorder --ids 12,9,15                        # DD-626: neue Reihenfolge (Sprint-IDs)
  devd-cli sprint delete <key|id>                             # DD-626 (409 wenn Issues zugewiesen)

Dokumente (DD2-21 — Markdown-Docs an Meilensteine/Sprints, DB-Blob):
  devd-cli doc list   --milestone <id> | --sprint <key|id>
  devd-cli doc show   <docId> --milestone <id> | --sprint <key|id>   # via Glow (Fallback: roh)
  devd-cli doc add    --milestone <id> | --sprint <key|id> --title "<t>" [--body <text>|--file <pfad>] [--file-path <p>]
  devd-cli doc edit   <docId> --milestone <id> | --sprint <key|id>   # öffnet $EDITOR auf dem Body
  devd-cli doc delete <docId> --milestone <id> | --sprint <key|id>

Milestones (numerische ID — Contract-validiert, DD-553/556):
  devd-cli milestone list [--status open|new|planned|in_progress|completed|cancelled|all]
  devd-cli milestone show <id>
  devd-cli milestone create <name> [--description <text>] [--target-date YYYY-MM-DD] [--status <s>]
  devd-cli milestone status <id> <new|planned|in_progress|completed|cancelled> [--notes <text>]
  devd-cli milestone edit <id> [--name <text>] [--description <text>] [--target-date YYYY-MM-DD]
  devd-cli milestone dep-add <id> --depends-on <id>      # Vorgänger → Nachfolger
  devd-cli milestone dep-list <id>
  devd-cli milestone dep-remove <dependency-id>
  devd-cli milestone reorder --ids 3,1,2                  # DD-627: neue Reihenfolge (Milestone-IDs)
  devd-cli milestone close <id> [--target-status <status für offene Issues>]   # DD-627: close-with-issues
  devd-cli milestone dod <id>                            # DD-627: DoD-Items listen
  devd-cli milestone dod-add <id> --label "<text>"
  devd-cli milestone dod-set <item-id> [--label <text>] [--done true|false]
  devd-cli milestone dod-reorder <id> --order 8,3,5      # DoD-Item-IDs in neuer Reihenfolge
  devd-cli milestone dod-delete <item-id>

Lost-Issues (Data-Hygiene, DD-555):
  devd-cli issue lost [--project <id|slug>]   # nicht-terminale Issues in completed Sprints

ToDos (Project-Home, DD-308 — kein Bezug zur Issue-Lifecycle):
  devd-cli todo list [--status open|done|cancelled] [--project <id|slug>]
  devd-cli todo add "<label>" [--details <text>] [--project <id|slug>]
  devd-cli todo show <id> [--project <id|slug>]
  devd-cli todo done <id>
  devd-cli todo edit <id> [--title "..."] [--status ...] [--details-from-editor]
  devd-cli todo link <id> --spec <path> | --issue <key> | --vault <wikilink> | --url <url>
  devd-cli todo delete <id> --confirm

Project-Memory (MEM-10 — projektgebundenes Wissen, FTS5, project-scoped):
  devd-cli memory add "<summary>" --category <architecture_decision|dead_end|bug_pattern|convention|external_constraint|session_log|knowledge>
                                  [--content <text>] [--tags a,b] [--importance 1-3]
                                  [--anchor <code>] [--stability stable|volatile]
                                  [--source-type <t>] [--source-ref <r>] [--project <id|slug>]
  devd-cli memory query "<text>" [--category <cat>] [--limit <n>] [--project <id|slug>]
  devd-cli memory list [--category <cat>] [--project <id|slug>]
  devd-cli memory show <id> [--project <id|slug>]
  devd-cli memory update <id> [--summary <s>] [--content <t>] [--category <c>] [--tags a,b]
                              [--importance 1-3] [--pinned true|false] [--anchor <code>]
                              [--stability stable|volatile] [--source-type <t>] [--source-ref <r>] [--project <id|slug>]
  devd-cli memory supersede <id> [<dieselben Feld-Flags wie update>]   # append-only Korrektur → neue Row
  devd-cli memory delete <id> [--project <id|slug>]                    # soft-delete
  devd-cli memory anchor <anchor> [--project <id|slug>]               # Row per D-Code lesen
  devd-cli memory anchor-patch <anchor> [<Feld-Flags>] [--project <id|slug>]

  devd-cli memory tag list [<fts>] [--query <fts>] [--project <id|slug>]   # Stichwort-Register (Controlled Vocabulary)
  devd-cli memory tag create <tag> [--desc <text>] [--project <id|slug>]   # zulässigen Tag anlegen
  devd-cli memory tag rename <alt> <neu> [--project <id|slug>]             # umbenennen + merge (Synonym-Folding)
  devd-cli memory tag delete <tag> [--project <id|slug>]

  devd-cli tag list [--project <id|slug>]
  devd-cli tag create "<name>" [--color blue|green|peach|mauve|teal|overlay0] [--project <id|slug>]
  devd-cli tag update <id> [--name <n>] [--color <c>] [--project <id|slug>]
  devd-cli tag delete <id> [--project <id|slug>]
  devd-cli issue tag-set <id|key> --tags "a,b,c"     # vollständiger Replace (leer = alle löschen)
  devd-cli issue tag-remove <id|key> --tags "a,b"    # nur genannte entfernen

Issues (Key wie DD-161 oder globale ID):
  devd-cli issue list [--sprint <key|id>] [--status <s>] [--search <q>] [--full|--fields <list>] [--limit <n>] [--offset <n>]
  devd-cli issue show <id|key>
  devd-cli issue create <title> [--type bug|feature|improvement|core] [--priority 1-5] [--description <text>]
  devd-cli issue update <id|key> [--<field> <val>] [--<field>-editor]
                                  Felder: title, type, priority, goal, background,
                                  acceptance-criteria, context-notes, relevant-files,
                                  po-notes, description, test-instruction.
                                  --<feld>-editor öffnet $EDITOR mit aktuellem Wert.
  devd-cli issue status <id|key> <status> [--notes <text>]
  devd-cli issue assign-sprint <id|key> --sprint <key|id|null|none>
                                # Assign to sprint (DD#20) or unassign (--sprint null)
  devd-cli issue dep add <key|id> --on <key|id> [--note <text>]   # MEM-14: Abhängigkeit setzen
  devd-cli issue dep list <key|id>          # blockers (depends-on) + blocked_by
  devd-cli issue bulk --ids 1,2,3 --action set_status|set_sprint|cancel|add_tags|remove_tags
                                  [--status <s>] [--sprint <id|null>] [--notes <t>] [--tags a,b]  # DD-621
  devd-cli issue delete <id|key> [--force]   # ohne --force → 409 (Status cancelled nutzen)
  devd-cli issue move <id|key> --to <project-id|slug>
  devd-cli issue activity <id|key> [--limit <n>]   # Audit-Log des Issues

  devd-cli sop list
  devd-cli sop show <key> [--numbered]              # --numbered für Zeilennummern (für sop edit)
  devd-cli sop edit <key> --op patch|insert_after|insert_before|delete --line <n> [--content <text>] [--expect <line>]
  devd-cli sop set <key> --content "<text>" | --file <path>   # Whole-Rewrite (Fallback)
  devd-cli sop create <key> --title "<text>" --content "<text>" | --file <path> [--force]   # neue SOP anlegen (Guard gegen Überschreiben)

  devd-cli issue dep rm <key|id> --on <key|id>                    # Kante entfernen

Subtasks:
  devd-cli subtask add <issue-id|key> --title <text> [--qa <text>]
                                   Ausgabe: '✓ Subtask ST-<id> angelegt — <title>'
  devd-cli subtask list <issue-id|key>
  devd-cli subtask done <ST-id|subtask-id>
  devd-cli subtask edit <ST-id|subtask-id> [--title <text>] [--qa <text>] [--position <n>]
  devd-cli subtask rm <ST-id|subtask-id> --yes

User Stories (E01 — Pruefgrundlage je Issue; us_verdict {open,accepted,rejected}):
  devd-cli userstory add <issue-id|key> --title <text> [--details <text>] [--qa <text>]
  devd-cli userstory list <issue-id|key>
  devd-cli userstory edit <US-id|id> [--title <text>] [--details <text>] [--qa <text>] [--verdict <v>] [--position <n>]
  devd-cli userstory verdict <US-id|id> <open|accepted|rejected>
  devd-cli userstory rm <US-id|id> --yes

Reviews:
  devd-cli review create <id|key> <passed|not_passed>
                          [--comment <text>] [--comment-editor]
                          # legt neue Round an + bewertet, triggert autoSet:
                          #   passed     → Issue to_review/rejected → passed
                          #   not_passed → Issue to_review/passed   → rejected
                          # not_passed → --comment Pflicht
  devd-cli review reopen <id|key>
                          # DD-662: to_review-Issue mit geschlossener Runde
                          # wieder öffnen (frische pending-Runde + Sprint-
                          # Review-Marker zurücksetzen), idempotent. Hebt die
                          # verdictlose Sprint-Submit-Sperre ohne UI auf.

Issue-Status: new | refined | planned | in_progress | to_review | passed | rejected | completed | cancelled

Sprint-Status: new → in_progress → to_review → completed (plus planned, cancelled)

Env:
  DEVD_API_URL=${API}
  DEVD_UI_URL=${DEVD_UI_URL}
  DEVD_PROJECT_ID=${PROJECT_ID}
  DEVD_API_TOKEN=${DEVD_API_TOKEN ? '(set)' : '(unset)'}
  EDITOR=${process.env.EDITOR || 'vi (default)'}
`)
  },
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h' || argv[0] === 'help') {
    return COMMANDS.help()
  }
  if (argv[0] === '--version' || argv[0] === '-v') {
    const pkgPath = new URL('../package.json', import.meta.url).pathname
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    console.log(`devd-cli v${pkg.version}`)
    return
  }
  if (argv.includes('--help') || argv.includes('-h')) {
    return COMMANDS.help()
  }
  const [resource, action, ...rest] = argv
  const key = action ? `${resource}:${action}` : resource
  const handler = COMMANDS[key]
  if (!handler) {
    console.error(`Unbekanntes Kommando: ${key}\nNutze: devd-cli help`)
    process.exit(2)
  }
  try {
    await handler(parseFlags(rest))
  } catch (e) {
    console.error(`Fehler: ${e.message}`)
    process.exit(1)
  }
}

main()
