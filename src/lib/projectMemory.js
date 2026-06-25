// MEM-15: pure Helfer für die project_memories-UI (vitest-testbar, ohne React/DOM).
// Spiegelt das Backend-Schema (Migration 041/042) für Labels + REST-Pfadbau.

export const CATEGORIES = [
  'architecture_decision',
  'dead_end',
  'bug_pattern',
  'convention',
  'external_constraint',
  'session_note',
]

export const CATEGORY_LABELS = {
  architecture_decision: 'Entscheidung',
  dead_end: 'Sackgasse',
  bug_pattern: 'Bug-Pattern',
  convention: 'Konvention',
  external_constraint: 'Externe Constraint',
  session_note: 'Session-Notiz',
}

export const CATEGORY_COLORS = {
  architecture_decision: 'var(--mauve)',
  dead_end: 'var(--red)',
  bug_pattern: 'var(--peach)',
  convention: 'var(--blue)',
  external_constraint: 'var(--yellow)',
  session_note: 'var(--hint)',
}

export const STABILITIES = ['volatile', 'stable']

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category
}

// tags akzeptiert Array oder String (komma-/space-getrennt) → bereinigtes Array.
export function parseTags(input) {
  if (Array.isArray(input)) return input.map((t) => String(t).trim()).filter(Boolean)
  if (typeof input !== 'string') return []
  return input.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean)
}

// Liefert den REST-Pfad: leere Query → Liste (/api/project-memories),
// nicht-leere Query → FTS5-Search (/api/project-memories/search). category optional.
export function buildMemoriesPath({ q = '', category = '' } = {}) {
  const query = (q || '').trim()
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (query) {
    params.set('q', query)
    return `/api/project-memories/search?${params.toString()}`
  }
  const qs = params.toString()
  return qs ? `/api/project-memories?${qs}` : '/api/project-memories'
}
