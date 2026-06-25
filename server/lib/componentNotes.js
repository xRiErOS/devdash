// DD-273 (M3-S02 T01): component_notes Helper — CRUD für persistente Debug-Mode-Notes.
// Eigener Lifecycle (kein Issue-Lifecycle). UNIQUE pro (project_id, slug) aktiv.
// Slug-Schema laut Wiki 40.01: <bereich>.<sub>.<element>, kebab-case.
// Pure Funktionen ohne Express-Abhängigkeit. Reuse-Pattern aus projectTodos.js.

// SLUG_MIN=2 weil Regex Start+End-Anker je 1 Zeichen verlangt
// (`[a-z0-9]` start + optional middle + `[a-z0-9]` end = min 2 Zeichen).
export const SLUG_MIN = 2
export const SLUG_MAX = 200
export const CONTENT_MAX = 16000
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/

export class ComponentNoteError extends Error {
  constructor(message, { statusCode = 400, code, field } = {}) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.field = field
  }
}

function assertProjectExists(db, projectId) {
  const exists = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId)
  if (!exists) {
    throw new ComponentNoteError('Projekt existiert nicht', { statusCode: 404, code: 'PROJECT_NOT_FOUND' })
  }
}

function validateSlug(raw) {
  if (typeof raw !== 'string') {
    throw new ComponentNoteError('slug muss ein String sein', { code: 'SLUG_TYPE', field: 'slug' })
  }
  const slug = raw.trim()
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) {
    throw new ComponentNoteError(
      `slug muss ${SLUG_MIN}-${SLUG_MAX} Zeichen lang sein`,
      { code: 'SLUG_LENGTH', field: 'slug' }
    )
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw new ComponentNoteError(
      'slug muss kebab-case-Tokens mit Punkt-Trennzeichen sein (Wiki 40.01)',
      { code: 'SLUG_PATTERN', field: 'slug' }
    )
  }
  return slug
}

function validateContent(raw) {
  if (raw === undefined || raw === null) return ''
  if (typeof raw !== 'string') {
    throw new ComponentNoteError('content muss ein String sein', { code: 'CONTENT_TYPE', field: 'content' })
  }
  if (raw.length > CONTENT_MAX) {
    throw new ComponentNoteError(
      `content darf max ${CONTENT_MAX} Zeichen lang sein`,
      { code: 'CONTENT_TOO_LONG', field: 'content' }
    )
  }
  return raw
}

export function listNotes(db, projectId) {
  assertProjectExists(db, projectId)
  return db.prepare(`
    SELECT id, project_id, slug, content, created_at, updated_at
    FROM component_notes
    WHERE project_id = ? AND deleted_at IS NULL
    ORDER BY updated_at DESC
  `).all(projectId)
}

export function getNote(db, projectId, slugRaw) {
  assertProjectExists(db, projectId)
  const slug = validateSlug(slugRaw)
  const row = db.prepare(`
    SELECT id, project_id, slug, content, created_at, updated_at
    FROM component_notes
    WHERE project_id = ? AND slug = ? AND deleted_at IS NULL
  `).get(projectId, slug)
  return row || null
}

export function upsertNote(db, projectId, slugRaw, contentRaw) {
  assertProjectExists(db, projectId)
  const slug = validateSlug(slugRaw)
  const content = validateContent(contentRaw)

  const tx = db.transaction(() => {
    const existing = db.prepare(`
      SELECT id FROM component_notes
      WHERE project_id = ? AND slug = ? AND deleted_at IS NULL
    `).get(projectId, slug)

    if (existing) {
      db.prepare(`
        UPDATE component_notes
        SET content = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(content, existing.id)
      return existing.id
    }

    const result = db.prepare(`
      INSERT INTO component_notes (project_id, slug, content)
      VALUES (?, ?, ?)
    `).run(projectId, slug, content)
    return Number(result.lastInsertRowid)
  })

  const id = tx()
  return db.prepare(`
    SELECT id, project_id, slug, content, created_at, updated_at
    FROM component_notes
    WHERE id = ?
  `).get(id)
}

export function deleteNote(db, projectId, slugRaw) {
  assertProjectExists(db, projectId)
  const slug = validateSlug(slugRaw)
  const existing = db.prepare(`
    SELECT id FROM component_notes
    WHERE project_id = ? AND slug = ? AND deleted_at IS NULL
  `).get(projectId, slug)
  if (!existing) {
    throw new ComponentNoteError('Note nicht gefunden', { statusCode: 404, code: 'NOTE_NOT_FOUND' })
  }
  db.prepare(`
    UPDATE component_notes
    SET deleted_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(existing.id)
  return { id: existing.id, slug }
}
