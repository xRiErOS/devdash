// DD2-141 (Sub: DD2-92/95/96) — Single-Source-Serialisierung des Sprint-Kontext-Markdown
// für devd_sprint_context. Pure Funktion ohne Express-/DB-Abhängigkeit: erhält den Sprint
// + die bereits angereicherten Items (user_stories, dependencies) und rendert den
// LLM-tauglichen Markdown-Payload. Ein gemeinsamer additiver Pfad verhindert Drift zwischen
// den drei Sub-Issues (Epic-Vorgabe: nicht drei getrennte Render-Pfade).

const PRIORITY_LABEL = { 1: 'critical', 2: 'high', 3: 'medium', 4: 'low', 5: 'trivial' }

// blockers = worauf dieses Issue wartet; blocked_by = was auf dieses Issue wartet.
function renderIssueDependencies(lines, deps) {
  if (!deps) return
  const blockers = Array.isArray(deps.blockers) ? deps.blockers : []
  const blocked_by = Array.isArray(deps.blocked_by) ? deps.blocked_by : []
  if (!blockers.length && !blocked_by.length) return
  lines.push(`\n**Dependencies:**`)
  for (const d of blockers) lines.push(`- blockt-auf #${d.id} ${d.title}${d.status ? ` (${d.status})` : ''}`)
  for (const d of blocked_by) lines.push(`- blockiert #${d.id} ${d.title}${d.status ? ` (${d.status})` : ''}`)
}

function renderSprintDependencies(lines, deps) {
  if (!deps) return
  const predecessors = Array.isArray(deps.predecessors) ? deps.predecessors : []
  const successors = Array.isArray(deps.successors) ? deps.successors : []
  if (!predecessors.length && !successors.length) return
  lines.push(`\n**Sprint Dependencies:**`)
  for (const s of predecessors) lines.push(`- nach Sprint #${s.id} ${s.name}`)
  for (const s of successors) lines.push(`- vor Sprint #${s.id} ${s.name}`)
}

export function buildSprintContextMarkdown(sprint, items = []) {
  const lines = []
  lines.push(`# Sprint: ${sprint.key || sprint.id} — ${sprint.name}`)
  lines.push(`**Status:** ${sprint.status}  **Dates:** ${sprint.start_date || '—'} → ${sprint.end_date || '—'}  **Capacity:** ${sprint.capacity || '—'}`)
  if (sprint.goal) lines.push(`\n**Goal:** ${sprint.goal}`)
  if (sprint.notes) lines.push(`\n**Notes:** ${sprint.notes}`)
  // DD2-92: Sprint-Dependencies additiv direkt unter dem Sprint-Header.
  renderSprintDependencies(lines, sprint.dependencies)

  lines.push(`\n## Issues (${items.length})`)
  for (const i of items) {
    lines.push(`\n### ${i.key || i.id}: ${i.title}`)
    lines.push(`**Type:** ${i.type}  **Status:** ${i.status}  **Priority:** ${PRIORITY_LABEL[i.priority] || i.priority}`)
    if (i.goal) lines.push(`\n**Goal:** ${i.goal}`)
    if (i.background) lines.push(`\n**Background:** ${i.background}`)
    if (i.context_notes) lines.push(`\n**Context / Acceptance:**\n${i.context_notes}`)
    if (i.relevant_files) lines.push(`\n**Relevant files:** ${i.relevant_files}`)
    // DD2-96: User-Stories inkl. QA (Pruefgrundlage).
    if (Array.isArray(i.user_stories) && i.user_stories.length) {
      lines.push(`\n**User Stories (${i.user_stories.length}):**`)
      for (const us of i.user_stories) {
        lines.push(`- [${us.us_verdict}] ${us.key} ${us.title}${us.qa ? ` — QA: ${us.qa}` : ''}`)
      }
    }
    // DD2-92: Issue-Dependencies (blockers/blocked_by).
    renderIssueDependencies(lines, i.dependencies)
    if (i.review_status) lines.push(`\n**Review:** ${i.review_status}${i.review_comment ? ` — ${i.review_comment}` : ''}`)
    if (i.po_notes) lines.push(`\n**PO notes:** ${i.po_notes}`)
  }
  return lines.join('\n')
}
