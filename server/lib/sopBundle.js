// MEM-24 (MEM#8): SOP-Bundling — eine Bundle-Quelle für CLI UND MCP (REST liefert beide).
// SOP-D04: Bundle = SOP-Volltext (getriggerte SOPs aus DB) + kompakter Sprint-Header
// (goal/dates) + Issue-Tabelle (Key/Titel/Status/Prio/blocked_by). Dependencies zeigen dem
// Agenten sofort die Build-Reihenfolge (was zuerst fertig sein muss). Bewusst lean: KEINE vollen
// Issue-Bodies, KEIN SSTD-Dump (on-demand via devd_issue_show / sstd show).
//
// Pure Funktionen ohne Express-Abhängigkeit. Ersetzt printSOPContext (filesystem, nur-CLI, DD-214).
// `rendered` (Markdown) wird server-seitig erzeugt → CLI + MCP geben garantiert identischen Output.

import { getSopsByTrigger } from './sops.js'

const PRIORITY_LABEL = { 1: 'critical', 2: 'high', 3: 'medium', 4: 'low', 5: 'trivial' }
const SEP = '─'.repeat(72)

function issueKey(prefix, projectNumber, fallbackId) {
  return (prefix && projectNumber != null) ? `${prefix}-${projectNumber}` : String(fallbackId)
}

// Sprint per Key ("MEM#8") oder numerischer id auflösen, projekt-gescopt.
function resolveSprint(db, sprintRef, projectId) {
  if (sprintRef === undefined || sprintRef === null || sprintRef === '') return null
  const ref = String(sprintRef)
  let row
  if (ref.includes('#')) {
    const num = Number(ref.split('#')[1])
    if (!Number.isInteger(num)) return null
    row = db.prepare(`
      SELECT s.*, p.prefix AS project_prefix
      FROM sprints s LEFT JOIN projects p ON p.id = s.project_id
      WHERE s.project_id = ? AND s.project_number = ?
    `).get(projectId, num)
  } else if (/^\d+$/.test(ref)) {
    row = db.prepare(`
      SELECT s.*, p.prefix AS project_prefix
      FROM sprints s LEFT JOIN projects p ON p.id = s.project_id
      WHERE s.id = ?
    `).get(Number(ref))
  }
  if (!row) return null
  row.key = (row.project_prefix && row.project_number != null)
    ? `${row.project_prefix}#${row.project_number}`
    : String(row.id)
  return row
}

// blocked_by = Issues, auf die dieses Issue wartet (depends_on → muss zuerst fertig sein).
// Quelle: issue_dependencies (MEM-14). Liefert die Issue-Keys, geordnet wie die Sprint-Tabelle.
function blockerKeys(db, issueId) {
  const rows = db.prepare(`
    SELECT b.project_number, p.prefix AS project_prefix, b.id
    FROM issue_dependencies d
    JOIN backlog b ON b.id = d.depends_on_id
    LEFT JOIN projects p ON p.id = b.project_id
    WHERE d.issue_id = ?
    ORDER BY b.priority, b.id
  `).all(issueId)
  return rows.map(r => issueKey(r.project_prefix, r.project_number, r.id))
}

function sprintIssues(db, sprintId) {
  const items = db.prepare(`
    SELECT b.id, b.title, b.status, b.priority, b.project_number, p.prefix AS project_prefix
    FROM backlog b LEFT JOIN projects p ON p.id = b.project_id
    WHERE b.assigned_sprint = ?
    ORDER BY b.priority, b.id
  `).all(sprintId)
  return items.map(i => ({
    key: issueKey(i.project_prefix, i.project_number, i.id),
    title: i.title,
    status: i.status,
    priority: i.priority,
    priority_label: PRIORITY_LABEL[i.priority] || String(i.priority),
    blocked_by: blockerKeys(db, i.id),
  }))
}

// Strukturiertes Bundle. trigger optional (dann keine SOPs), sprint optional (dann kein Header/Tabelle).
export function buildSopBundle(db, { trigger = null, sprint = null, projectId = null } = {}) {
  const sops = trigger ? getSopsByTrigger(db, trigger) : []
  let sprintObj = null
  let issues = []
  const sp = resolveSprint(db, sprint, projectId)
  if (sp) {
    sprintObj = {
      key: sp.key || String(sp.id),
      name: sp.name,
      goal: sp.goal || null,
      start_date: sp.start_date || null,
      end_date: sp.end_date || null,
      status: sp.status,
    }
    issues = sprintIssues(db, sp.id)
  }
  return { trigger, sops, sprint: sprintObj, issues }
}

// Markdown-Render — identisch konsumiert von CLI (print) und MCP (text-content).
export function renderSopBundle(bundle) {
  const lines = []
  for (const sop of bundle.sops) {
    lines.push(SEP)
    lines.push(`## Relevant SOP: ${sop.title}`)
    lines.push(SEP)
    lines.push((sop.content || '').trim())
    lines.push(SEP)
    lines.push('')
  }
  if (bundle.sprint) {
    const s = bundle.sprint
    lines.push(`## Sprint: ${s.key} — ${s.name}`)
    lines.push(`**Status:** ${s.status}  **Dates:** ${s.start_date || '—'} → ${s.end_date || '—'}`)
    if (s.goal) lines.push(`**Goal:** ${s.goal}`)
    lines.push('')
    lines.push(`### Issues (${bundle.issues.length})`)
    if (bundle.issues.length > 0) {
      lines.push('')
      lines.push('| Key | Titel | Status | Prio | blocked_by |')
      lines.push('|-----|-------|--------|------|------------|')
      for (const i of bundle.issues) {
        const blocked = i.blocked_by.length ? i.blocked_by.join(', ') : '—'
        lines.push(`| ${i.key} | ${i.title} | ${i.status} | ${i.priority_label} | ${blocked} |`)
      }
    }
  }
  return lines.join('\n').trim()
}
