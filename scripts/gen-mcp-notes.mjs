#!/usr/bin/env node
/**
 * gen-mcp-notes.mjs — generiert pro devd-MCP-Tool eine Obsidian-Note
 * (Bases-taugliches Frontmatter + Flags-Tabelle aus dem Zod-Input-Schema)
 * plus eine Index-Note mit Counts je Domäne und einer Lücken-Sektion.
 *
 * Quelle der Wahrheit: apps/cli/mcp/devd-mcp.js (server.tool(name, desc, shape, handler)).
 * Re-runnbar — bei MCP-Änderungen einfach erneut ausführen.
 *
 *   node scripts/gen-mcp-notes.mjs [zielordner]
 *
 * Default-Ziel: der Vault-Ordner devd-MCP (s. OUT_DEFAULT).
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { mkdirSync, writeFileSync, readdirSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = join(__dirname, '..')
const OUT_DEFAULT =
  '/Users/erik/Obsidian/Vault/300 PROJECTS/DD_DevDashboard/DD-PO-Lokal/devd-MCP'
const OUT = process.argv[2] || OUT_DEFAULT

// --- 1) Interception: server.tool aufzeichnen, connect neutralisieren ---------
const tools = []
McpServer.prototype.tool = function (name, desc, shape) {
  tools.push({ name, desc: desc ?? '', shape: shape ?? {} })
  return this
}
McpServer.prototype.connect = async () => {} // top-level await server.connect() entschärfen

await import(join(REPO, 'apps/cli/mcp/devd-mcp.js'))

// Tool-Count-Guard (DD2-219): tolerant statt hartem process.exit.
// EXPECTED_TOOLS ist ein Drift-Indikator, kein Hard-Stop — bei bewussten
// MCP-Änderungen (Tool hinzu/entfernt) läuft der Generator weiter und
// dokumentiert die reale Zahl. Nur eine leere Liste (Import fehlgeschlagen,
// nichts erfasst) bleibt ein echter Abbruch.
const EXPECTED_TOOLS = 119
if (tools.length === 0) {
  console.error('FAIL: 0 Tools erfasst — devd-mcp.js-Import lieferte keine server.tool-Calls. Abbruch.')
  process.exit(1)
}
if (tools.length !== EXPECTED_TOOLS) {
  console.warn(
    `WARN: ${tools.length} Tools erfasst, erwartet ${EXPECTED_TOOLS} (Drift) — fahre tolerant fort. ` +
    `Bei bewusster MCP-Änderung EXPECTED_TOOLS anpassen.`,
  )
}

// --- 2) Domäne via geordnetem Prefix-Match (spezifisch zuerst) ----------------
const DOMAIN_RULES = [
  [/^project_memory_/, 'Project Memory'],
  [/^memory_tag_/, 'Project Memory'],
  [/^project_sstd_/, 'SSTD'],
  [/^sstd_/, 'SSTD'],
  [/^project_/, 'Projekte & Dashboard'],
  [/^backlog_/, 'Projekte & Dashboard'],
  [/^dashboard_/, 'Projekte & Dashboard'],
  [/^dependencies_/, 'Projekte & Dashboard'],
  [/^milestone_dod_/, 'Milestones'],
  [/^milestone_/, 'Milestones'],
  [/^sprint_/, 'Sprints'],
  [/^issue_/, 'Issues'],
  [/^user_story_/, 'User Stories & Subtasks'],
  [/^subtask_/, 'Sub-Tasks'],
  [/^todo_/, 'Todos'],
  [/^tag_/, 'Tags'],
  [/^sop_collection_/, 'SOPs'],
  [/^sop_/, 'SOPs'],
  [/^document_/, 'Dokumente'],
  [/^user_note_/, 'User Notes'],
  [/^session_note_/, 'Session Notes'],
  [/^review_/, 'Reviews'],
  [/^planning_/, 'Planning'],
]
function domainOf(name) {
  const stem = name.replace(/^devd_/, '')
  for (const [re, dom] of DOMAIN_RULES) if (re.test(stem)) return dom
  return 'UNZUGEORDNET'
}

// --- 3) RW: Read vs Write aus Tool-Namen (letzter sinnvoller Token) -----------
const READ_TOKENS = new Set([
  'list', 'show', 'get', 'query', 'activity', 'context', 'completeness',
  'graph', 'home', 'bundle', 'export', 'results', 'lost', 'prompt',
])
function rwOf(name) {
  const stem = name.replace(/^devd_/, '')
  const last = stem.split('_').pop()
  return READ_TOKENS.has(last) ? 'R' : 'W'
}

// --- 4) Interaktion (Multi-Value, finites Vokabular) --------------------------
function interactionsOf(name) {
  const s = name.replace(/^devd_/, '')
  const set = new Set()
  if (/_dep_/.test(s)) set.add('Dependencies')
  if (/(^|_)tag(_|s$|$)/.test(s) && !/^tag_/.test(s)) set.add('Tags')
  if (/^tag_/.test(s)) set.add(/_list$/.test(s) ? null : null) // tag_* eigene Domäne, Interaktion s.u.
  if (/_list$/.test(s)) { set.add('Query'); set.add('List') }
  if (/_(show|get)$/.test(s)) set.add('Query')
  if (/_query$/.test(s)) set.add('Query')
  if (/_(create|add|log)$/.test(s) || /bulk_create/.test(s)) set.add('Create')
  if (/_(update|edit|patch|set|supersede|slot_edit|slot_set|anchor_patch)$/.test(s)) set.add('Update')
  if (/_(delete|remove|prune)$/.test(s)) set.add('Delete')
  if (/(^|_)bulk/.test(s)) set.add('Bulk')
  if (/_(status|start|cancel|close|done|verdict|reopen)$/.test(s)) set.add('Status')
  if (/_move$/.test(s)) set.add('Move')
  if (/_reorder$/.test(s)) set.add('Order')
  if (/_activity$/.test(s)) set.add('Activity')
  if (/(_review$|_rev_results$|^review_)/.test(s)) set.add('Review')
  if (/(_export$|_bundle$)/.test(s)) set.add('Export')
  if (/_link$/.test(s)) set.add('Link')
  if (/^user_story_|^subtask_|_dod_/.test(s)) set.add('Refinement')
  set.delete(null)
  if (set.size === 0) set.add('Query') // Fallback (z.B. planning_prompt, *_context)
  return [...set]
}

// --- 4b) Aktivität (PO-Workflow-Phase, Multi-Value) ---------------------------
// Orthogonal zu Domäne (Entity) + Interaktion (Verb). Meta-Tooling (Memory, SSTD,
// Session Notes, SOPs, Component Notes, project_list/show) bleibt bewusst leer.
function activitiesOf(name) {
  const s = name.replace(/^devd_/, '')
  const a = new Set()
  const add = (...x) => x.forEach((v) => a.add(v))
  if (/^issue_/.test(s)) {
    if (/^issue_(create|create_full|bulk_create|move|delete|tag_set|tag_remove)$/.test(s)) add('Backlog')
    if (/^issue_(list|show)$/.test(s)) add('Backlog', 'Sprintplanung')
    if (/^issue_dep_/.test(s)) add('Backlog', 'Sprintplanung')
    if (s === 'issue_bulk') add('Backlog', 'Sprintplanung')
    if (s === 'issue_update') add('Backlog', 'Refinement')
    if (s === 'issue_status') add('Refinement', 'Sprintplanung', 'Sprintdurchführung')
    if (s === 'issue_assign_sprint') add('Sprintplanung')
    if (s === 'issue_activity') add('Sprintdurchführung')
    if (s === 'issue_lost') add('Sprintdurchführung', 'Sprint-Review')
  }
  if (/^user_story_/.test(s)) add(s === 'user_story_verdict' ? 'Sprint-Review' : 'Refinement')
  if (/^subtask_/.test(s)) add(s === 'subtask_done' ? 'Sprintdurchführung' : 'Refinement')
  if (/^sprint_/.test(s)) {
    // DA2: Sprint-Struktur (anlegen/ordnen/verknüpfen) = Roadmapplanung, nicht Sprintplanung
    if (/^sprint_(create|update|list|show|delete|reorder|set_milestone)$/.test(s) || /^sprint_dep_/.test(s) || /^sprint_tag_/.test(s))
      add('Roadmapplanung')
    if (/^sprint_(start|cancel|context|completeness|activity)$/.test(s)) add('Sprintdurchführung')
    if (/^sprint_(review|rev_results)$/.test(s)) add('Sprint-Review')
  }
  if (/^milestone_/.test(s)) add('Roadmapplanung') // DA1: Roadmap = Meilensteine (+ Sprints), dod inkl.
  if (/^review_/.test(s)) add('Sprint-Review')
  if (/^tag_/.test(s)) add('Backlog')
  if (/^todo_/.test(s)) add('Backlog')
  if (s === 'dependencies_graph') add('Roadmapplanung', 'Sprintplanung')
  if (s === 'backlog_export') add('Backlog', 'Sprintplanung') // DA4
  if (s === 'dashboard_home') add('Sprintdurchführung')
  if (s === 'planning_prompt') add('Sprintplanung', 'Roadmapplanung')
  return [...a]
}

// --- 5) Zod-Schema → Flags-Tabelle -------------------------------------------
function jsonType(prop) {
  if (!prop) return '—'
  if (prop.type) return prop.type
  if (prop.enum) return 'enum'
  if (prop.anyOf || prop.oneOf) {
    const parts = (prop.anyOf || prop.oneOf).map((p) => p.type || (p.enum ? 'enum' : '?'))
    const nullable = parts.includes('null')
    const real = parts.filter((t) => t !== 'null')
    return (real.join('/') || '?') + (nullable ? ' (nullable)' : '')
  }
  return '?'
}
function enumDefault(prop) {
  if (!prop) return ''
  const bits = []
  const en = prop.enum || (prop.anyOf || prop.oneOf || []).flatMap((p) => p.enum || [])
  if (en && en.length) bits.push('Enum: ' + en.map((e) => `\`${e}\``).join(', '))
  if (prop.default !== undefined) bits.push('Default: `' + JSON.stringify(prop.default) + '`')
  return bits.join('<br>')
}
function flagsTable(shape) {
  let js
  try {
    js = z.toJSONSchema(z.object(shape), { unrepresentable: 'any' })
  } catch {
    js = null
  }
  const keys = Object.keys(shape)
  if (keys.length === 0) return '_Keine Parameter._\n'
  const required = new Set((js && js.required) || [])
  const props = (js && js.properties) || {}
  const rows = keys.map((k) => {
    let prop = props[k]
    if (!prop) {
      try {
        prop = z.toJSONSchema(shape[k], { unrepresentable: 'any' })
      } catch {
        prop = null
      }
    }
    const desc = (prop && prop.description ? prop.description : '').replace(/\|/g, '\\|').replace(/\n+/g, ' ')
    return `| \`${k}\` | ${jsonType(prop)} | ${required.has(k) ? 'ja' : '–'} | ${enumDefault(prop) || '–'} | ${desc || '–'} |`
  })
  return (
    '| Param | Typ | Pflicht | Enum/Default | Beschreibung |\n' +
    '| ----- | --- | ------- | ------------ | ------------ |\n' +
    rows.join('\n') +
    '\n'
  )
}

// --- 6) Note rendern ----------------------------------------------------------
function zweck(desc) {
  const flat = desc.replace(/\s+/g, ' ').replace(/^(WRITE|Read-only)\s*:?\s*/i, '').trim()
  const m = flat.match(/^(.*?[.!?])(\s|$)/)
  let s = (m ? m[1] : flat).slice(0, 180).trim()
  return s.replace(/"/g, "'")
}
function yamlList(arr) {
  return '[' + arr.join(', ') + ']'
}
function renderNote(t) {
  const dom = domainOf(t.name)
  const rw = rwOf(t.name)
  const inter = interactionsOf(t.name)
  const acts = activitiesOf(t.name)
  const readHint =
    rw === 'R' && /_list$/.test(t.name)
      ? '\n## Hinweise\n\n- List-Tool: kann bei großen Mengen viel Kontext erzeugen — Filter (status/type/sprint/search) gezielt setzen.\n'
      : ''
  const fm = [
    '---',
    `Tool: ${t.name}`,
    `RW: ${rw}`,
    `Zweck: ${JSON.stringify(zweck(t.desc))}`,
    `Domäne: ${dom}`,
    `Interaktion: ${yamlList(inter)}`,
    `Aktivität: ${yamlList(acts)}`,
    'tags:',
    '  - t/Note',
    '---',
  ].join('\n')
  const body = [
    '',
    t.desc.trim() || '_(keine Beschreibung im Server hinterlegt)_',
    '',
    '## Flags/Settings',
    '',
    flagsTable(t.shape),
    readHint,
  ].join('\n')
  return { dom, rw, acts, fm: fm + '\n' + body }
}

// --- 7) Schreiben -------------------------------------------------------------
mkdirSync(OUT, { recursive: true })
// alte generierte Notes entfernen (idempotent), Index + manuelle Dateien schonen wir explizit
for (const f of readdirSync(OUT)) {
  if (f.startsWith('devd_') && f.endsWith('.md')) rmSync(join(OUT, f))
}

const ACTIVITIES = ['Backlog', 'Refinement', 'Sprintplanung', 'Roadmapplanung', 'Sprintdurchführung', 'Sprint-Review']
const byDomain = new Map()
const byActivity = new Map(ACTIVITIES.map((a) => [a, 0]))
let unassigned = 0
let noActivity = 0
for (const t of tools) {
  const { dom, rw, acts, fm } = renderNote(t)
  if (dom === 'UNZUGEORDNET') unassigned++
  writeFileSync(join(OUT, `${t.name}.md`), fm)
  if (!byDomain.has(dom)) byDomain.set(dom, [])
  byDomain.get(dom).push({ name: t.name, rw })
  if (acts.length === 0) noActivity++
  for (const a of acts) byActivity.set(a, (byActivity.get(a) || 0) + 1)
}

// --- 8) Index-Note ------------------------------------------------------------
const domains = [...byDomain.keys()].sort()
const indexLines = [
  '---',
  'Beschreibung: Index der devd-MCP Tool-Notes — Counts je Domäne + identifizierte Lücken',
  'tags:',
  '  - t/Note',
  '---',
  '',
  `Generiert via \`scripts/gen-mcp-notes.mjs\` aus \`apps/cli/mcp/devd-mcp.js\`. **${tools.length} Tools**.`,
  '',
  '## Counts je Domäne',
  '',
  '| Domäne | Tools | R | W |',
  '| ------ | ----- | - | - |',
]
for (const d of domains) {
  const list = byDomain.get(d)
  const r = list.filter((x) => x.rw === 'R').length
  const w = list.filter((x) => x.rw === 'W').length
  indexLines.push(`| ${d} | ${list.length} | ${r} | ${w} |`)
}
indexLines.push(`| **Summe** | **${tools.length}** | | |`)
indexLines.push('')
indexLines.push('## Abdeckung je Aktivität (PO-Workflow)')
indexLines.push('')
indexLines.push('Multi-Value — ein Tool kann mehrere Phasen bedienen, Summe > 128 möglich.')
indexLines.push('')
indexLines.push('| Aktivität | Tools |')
indexLines.push('| --------- | ----- |')
for (const a of ACTIVITIES) indexLines.push(`| ${a} | ${byActivity.get(a)} |`)
indexLines.push(`| _(ohne — Meta-Tooling)_ | ${noActivity} |`)
indexLines.push('')
indexLines.push('## Lücken (→ DD2-Backlog)')
indexLines.push('')
indexLines.push('Gefundene MCP-Schwächen werden als DD2-Issues (`type=improvement`) erfasst — nicht hier dupliziert (diese Datei wird regeneriert). Bekannt:')
indexLines.push('')
indexLines.push('- `devd_backlog_export`: erzwingt manuelles Filtern, liefert `planned` mit (= sprintgebunden), Format `csv` LLM-unfreundlich → Default `new,refined` + `md/json/yaml`. **DD2-123**')
indexLines.push('- _(weitere via Gap-Analyse beim Durchgehen der Notes erfassen)_')
indexLines.push('')
writeFileSync(join(OUT, '_devd-MCP-Index.md'), indexLines.join('\n') + '\n')

console.log(`OK: ${tools.length} Tool-Notes + Index → ${OUT}`)
console.log('Domänen:', domains.map((d) => `${d}=${byDomain.get(d).length}`).join('  '))
if (unassigned) console.error(`WARN: ${unassigned} Tools UNZUGEORDNET — Domain-Regeln prüfen.`)
