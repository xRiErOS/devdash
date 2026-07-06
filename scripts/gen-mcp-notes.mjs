#!/usr/bin/env node
// @index
// title: gen-mcp-notes
// desc: Generiert gebündelte Domänen-Concepts im OKF Knowledge Catalogue via Zod-Introspektion
// @end
/**
 * gen-mcp-notes.mjs — generiert devd-MCP-Tool-Dokumentation aus Zod-Introspektion.
 *
 * Ziel: 1 Concept pro Domäne (gebündelt, ~19 Files) im OKF-Bundle
 * dev-wiki/cli-devdash-mcp/mcp-tool-reference. OKF-konformes Frontmatter
 * (type/title/description/tags/timestamp), danach Inline-Conformance-Scan
 * + okf-cli.py reindex. Einziges Ziel — kein Vault-Output (keine Dopplung).
 *
 * Quelle der Wahrheit: apps/cli/mcp/devd-mcp.js (server.tool(name, desc, shape, handler)).
 * Re-runnbar (idempotent) — bei MCP-Änderungen einfach erneut ausführen.
 *
 *   node scripts/gen-mcp-notes.mjs [--okf-out=<pfad>]
 *
 * Exit-Code 1 bei Conformance-Violations — kein Commit, bis "OK — 0 violations".
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { mkdirSync, writeFileSync, readdirSync, rmSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = join(__dirname, '..')
const OKF_ROOT = '/Users/erik/Obsidian/Knowledge-Catalogue'
const OKF_CLI = join(OKF_ROOT, 'okf-cli.py')
const OKF_TARGET_REL = 'dev-wiki/cli-devdash-mcp/mcp-tool-reference'
const OKF_OUT_DEFAULT = join(OKF_ROOT, OKF_TARGET_REL)

// --- 0) CLI-Args ---------------------------------------------------------------
const argv = process.argv.slice(2)
function flag(name, def) {
  const pre = `--${name}=`
  const hit = argv.find((a) => a.startsWith(pre))
  return hit ? hit.slice(pre.length) : def
}
const OKF_OUT = flag('okf-out', OKF_OUT_DEFAULT)

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
const EXPECTED_TOOLS = 111
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

function zweck(desc) {
  const flat = desc.replace(/\s+/g, ' ').replace(/^(WRITE|Read-only)\s*:?\s*/i, '').trim()
  const m = flat.match(/^(.*?[.!?])(\s|$)/)
  let s = (m ? m[1] : flat).slice(0, 180).trim()
  return s.replace(/"/g, "'")
}

// ============================================================================
// OKF: 1 Concept pro Domäne, gebündelt (~19 Files statt ~116)
// ============================================================================
const DOMAIN_SLUGS = {
  'Project Memory': 'project-memory',
  SSTD: 'sstd',
  'Projekte & Dashboard': 'projects-dashboard',
  Milestones: 'milestones',
  Sprints: 'sprints',
  Issues: 'issues',
  'User Stories & Subtasks': 'user-stories-subtasks',
  'Sub-Tasks': 'subtasks',
  Todos: 'todos',
  Tags: 'tags',
  Dokumente: 'documents',
  'User Notes': 'user-notes',
  'Session Notes': 'session-notes',
  Reviews: 'reviews',
  Planning: 'planning',
  UNZUGEORDNET: 'unassigned',
}
function domainSlug(d) {
  return DOMAIN_SLUGS[d] || d.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function renderOkfDomainNote(domain, toolsInDomain, nowIso) {
  const slug = domainSlug(domain)
  const sorted = [...toolsInDomain].sort((a, b) => a.name.localeCompare(b.name))
  const rCount = sorted.filter((t) => rwOf(t.name) === 'R').length
  const wCount = sorted.length - rCount
  const title = `MCP Tool Reference — ${domain}`
  const description = `Auto-generierte Referenz aller devd-MCP-Tools der Domäne ${domain} (${sorted.length} Tools, ${rCount} R / ${wCount} W) — Parameter, Typen, Pflichtfelder aus Zod-Introspektion.`
  const fm = [
    '---',
    'type: Reference',
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(description)}`,
    'tags:',
    '  - cli',
    '  - devdashboard',
    '  - mcp',
    `  - ${slug}`,
    `timestamp: ${nowIso}`,
    '---',
  ].join('\n')
  const overviewRows = sorted.map((t) => {
    const rw = rwOf(t.name)
    const inter = interactionsOf(t.name).join(', ')
    const acts = activitiesOf(t.name).join(', ') || '—'
    return `| \`${t.name}\` | ${rw} | ${inter} | ${acts} | ${zweck(t.desc)} |`
  })
  const overview = [
    '| Tool | RW | Interaktion | Aktivität | Zweck |',
    '| ---- | -- | ----------- | --------- | ----- |',
    ...overviewRows,
  ].join('\n')
  const sections = sorted
    .map((t) =>
      [
        `### \`${t.name}\``,
        '',
        t.desc.trim() || '_(keine Beschreibung im Server hinterlegt)_',
        '',
        '#### Flags/Settings',
        '',
        flagsTable(t.shape),
      ].join('\n'),
    )
    .join('\n')
  const body = [
    '',
    'Auto-generiert via `scripts/gen-mcp-notes.mjs` aus `apps/cli/mcp/devd-mcp.js` (Zod-Introspektion). **Nicht von Hand editieren** — Änderungen werden beim nächsten Lauf überschrieben.',
    '',
    '## Übersicht',
    '',
    overview,
    '',
    '## Tools',
    '',
    sections,
  ].join('\n')
  return { slug, content: fm + '\n' + body + '\n' }
}

// --- Inline OKF §9-Conformance-Scan (SPEC.md-Minimalcheck) --------------------
const RESERVED = new Set(['index.md', 'log.md'])
const FORBIDDEN_CHARS = /[#^[\]|\\/:?*"<>%]/
function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return null
  return m[1]
}
function scanOkfConformance(dir) {
  const violations = []
  for (const fn of readdirSync(dir)) {
    if (!fn.endsWith('.md') || RESERVED.has(fn.toLowerCase())) continue
    const slug = fn.slice(0, -3)
    if (FORBIDDEN_CHARS.test(slug)) {
      violations.push(`${fn}: filename contains forbidden char`)
      continue
    }
    const text = readFileSync(join(dir, fn), 'utf8')
    const fmBlock = splitFrontmatter(text)
    if (fmBlock === null) {
      violations.push(`${fn}: no parseable YAML frontmatter block`)
      continue
    }
    const hasType = /^type:\s*\S+/m.test(fmBlock)
    const hasTitle = /^title:\s*\S+/m.test(fmBlock)
    const hasDescription = /^description:\s*\S+/m.test(fmBlock)
    const hasTags = /^tags:\s*$/m.test(fmBlock) || /^tags:\s*\[/m.test(fmBlock)
    const hasTimestamp = /^timestamp:\s*\S+/m.test(fmBlock)
    if (!hasType) violations.push(`${fn}: missing/empty type`)
    if (!hasTitle) violations.push(`${fn}: missing title`)
    if (!hasDescription) violations.push(`${fn}: missing description`)
    if (!hasTags) violations.push(`${fn}: missing tags`)
    if (!hasTimestamp) violations.push(`${fn}: missing timestamp`)
  }
  return violations
}

function runOkf() {
  const nowIso = new Date().toISOString()
  mkdirSync(OKF_OUT, { recursive: true })
  // alte generierte Domänen-Concepts entfernen (idempotent), index.md/log.md schonen
  for (const f of readdirSync(OKF_OUT)) {
    if (f.endsWith('.md') && !RESERVED.has(f.toLowerCase())) rmSync(join(OKF_OUT, f))
  }

  const byDomain = new Map()
  for (const t of tools) {
    const dom = domainOf(t.name)
    if (!byDomain.has(dom)) byDomain.set(dom, [])
    byDomain.get(dom).push(t)
  }

  for (const [dom, list] of byDomain) {
    const { slug, content } = renderOkfDomainNote(dom, list, nowIso)
    writeFileSync(join(OKF_OUT, `${slug}.md`), content)
  }

  if (!existsSync(join(OKF_OUT, 'index.md'))) {
    writeFileSync(
      join(OKF_OUT, 'index.md'),
      '# MCP Tool Reference\n\nAuto-generierte, nach Domäne gebündelte Referenz aller devd-MCP-Tools (Parameter, Typen, Pflichtfelder). Quelle: `scripts/gen-mcp-notes.mjs` im DeveloperDashboard-Projekt.\n',
    )
  }

  // reindex (marker-bounded Contents-Liste aktuell halten)
  try {
    execFileSync('python3', [OKF_CLI, 'reindex', OKF_TARGET_REL, '--init'], { cwd: OKF_ROOT, stdio: 'inherit' })
  } catch (e) {
    console.error('FAIL: okf-cli.py reindex fehlgeschlagen:', e.message)
    process.exit(1)
  }

  // Conformance-Scan-Gate — kein Commit vor "OK — 0 violations"
  const violations = scanOkfConformance(OKF_OUT)
  if (violations.length > 0) {
    console.error(`FAIL — ${violations.length} violations:`)
    for (const v of violations) console.error(`  - ${v}`)
    console.error('Kein Commit, bis "OK — 0 violations".')
    process.exit(1)
  }
  console.log(`OK — 0 violations`)
  console.log(`OK: ${byDomain.size} Domänen-Concepts (${tools.length} Tools) → ${OKF_OUT}`)
  console.log('Domänen:', [...byDomain.keys()].sort().map((d) => `${d}=${byDomain.get(d).length}`).join('  '))
}

runOkf()
