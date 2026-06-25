// MEM-11 (MEM#5): SSTD-Snapshot-Rendering aus project_memories-Rows.
// Aggregiert aktive Rows zu Markdown (UI/CLI-Anzeige + @import-Snapshot).
// renderSplitSnapshot trennt stabilen Prefix (Cache warm) vom volatilen Task-Segment
// → Prompt-Caching-Schutz (SSTD I03 / MEM-13). Baut auf projectMemories.listMemories (active-only).

import { listMemories } from './projectMemories.js'

const CATEGORY_TITLES = {
  architecture_decision: 'Entscheidungen',
  convention: 'Konventionen',
  external_constraint: 'Externe Constraints',
  bug_pattern: 'Bug-Patterns',
  dead_end: 'Sackgassen',
  session_note: 'Session-Notizen',
}

const CATEGORY_ORDER = [
  'architecture_decision',
  'convention',
  'external_constraint',
  'bug_pattern',
  'dead_end',
  'session_note',
]

// Markdown-Snapshot aktiver Rows (deleted + superseded sind via listMemories bereits raus),
// optional gefiltert nach stability und/oder category. Gruppiert nach Kategorie.
export function renderSnapshot(db, projectId, { stability, category } = {}) {
  let rows = listMemories(db, projectId)
  if (stability) rows = rows.filter(r => r.stability === stability)
  if (category) rows = rows.filter(r => r.category === category)
  if (rows.length === 0) return ''

  const byCat = new Map()
  for (const r of rows) {
    if (!byCat.has(r.category)) byCat.set(r.category, [])
    byCat.get(r.category).push(r)
  }

  const lines = []
  for (const cat of CATEGORY_ORDER) {
    const items = byCat.get(cat)
    if (!items || items.length === 0) continue
    lines.push(`## ${CATEGORY_TITLES[cat] || cat}`)
    lines.push('')
    for (const r of items) {
      const prefix = r.anchor ? `**${r.anchor}** — ` : ''
      const tail = r.content ? ` — ${r.content}` : ''
      const tags = r.tags ? `  _(${r.tags})_` : ''
      lines.push(`- ${prefix}${r.summary}${tail}${tags}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

// Zwei getrennte @import-Snapshots: stabiler Prefix + volatiles Task-Segment (Cache-Split).
export function renderSplitSnapshot(db, projectId) {
  return {
    stable: renderSnapshot(db, projectId, { stability: 'stable' }),
    volatile: renderSnapshot(db, projectId, { stability: 'volatile' }),
  }
}
