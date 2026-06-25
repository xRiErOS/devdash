// ProjectPages T-be1 (D-D, Modell B): session_notes — NEUE separate Rich-Entity (user-verfasste
// Notizen für SessionNotesWidget). KEIN Ersatz des SSTD-Auto-Journals (project_memories
// cat=session_note bleibt). Pure Funktionen ohne Express (Muster sops.js / projectMemories.js).
// Daten: session_notes + session_notes_fts (Migration 062). project-gescopt (project_id).

import { TITLE_MAX, DETAILS_MAX } from '@devd/api-types/sessionNote.contracts.js'

export class SessionNoteError extends Error {
  constructor(message, { statusCode = 400, code, field } = {}) {
    super(message)
    this.name = 'SessionNoteError'
    this.statusCode = statusCode
    this.code = code
    this.field = field
  }
}

function validateTitle(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new SessionNoteError('title darf nicht leer sein', { code: 'TITLE_REQUIRED', field: 'title' })
  }
  if (raw.length > TITLE_MAX) {
    throw new SessionNoteError(`title darf max ${TITLE_MAX} Zeichen lang sein`, { code: 'TITLE_TOO_LONG', field: 'title' })
  }
  return raw
}

function validateDetails(raw) {
  if (raw === undefined || raw === null) return ''
  if (typeof raw !== 'string') {
    throw new SessionNoteError('details muss ein String sein', { code: 'DETAILS_TYPE', field: 'details' })
  }
  if (raw.length > DETAILS_MAX) {
    throw new SessionNoteError(`details darf max ${DETAILS_MAX} Zeichen lang sein`, { code: 'DETAILS_TOO_LONG', field: 'details' })
  }
  return raw
}

function validateKeyArray(raw, field) {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw) || raw.some(x => typeof x !== 'string')) {
    throw new SessionNoteError(`${field} muss ein String-Array sein`, { code: 'KEY_ARRAY_TYPE', field })
  }
  return raw
}

function validatePrUrl(raw) {
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw !== 'string') {
    throw new SessionNoteError('pr_url muss ein String sein', { code: 'PR_URL_TYPE', field: 'pr_url' })
  }
  return raw
}

// DB-Row → API-Shape (JSON-Arrays geparst).
function hydrate(row) {
  if (!row) return null
  return {
    ...row,
    sprints: JSON.parse(row.sprints || '[]'),
    issues: JSON.parse(row.issues || '[]'),
  }
}

export function createSessionNote(db, projectId, { title, details, pr_url, sprints, issues } = {}) {
  const t = validateTitle(title)
  const d = validateDetails(details)
  const pr = validatePrUrl(pr_url)
  const sp = JSON.stringify(validateKeyArray(sprints, 'sprints'))
  const is = JSON.stringify(validateKeyArray(issues, 'issues'))
  const result = db.prepare(
    'INSERT INTO session_notes (project_id, title, details, pr_url, sprints, issues) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(projectId, t, d, pr, sp, is)
  return getSessionNote(db, projectId, Number(result.lastInsertRowid))
}

// Liste neueste zuerst (id DESC), project-gescopt. search → FTS über title+details.
export function listSessionNotes(db, projectId, { search } = {}) {
  const q = typeof search === 'string' ? search.trim() : ''
  let rows
  if (q) {
    rows = db.prepare(`
      SELECT n.* FROM session_notes n
      JOIN session_notes_fts f ON f.rowid = n.id
      WHERE n.project_id = ? AND session_notes_fts MATCH ?
      ORDER BY n.id DESC
    `).all(projectId, ftsQuery(q))
  } else {
    rows = db.prepare('SELECT * FROM session_notes WHERE project_id = ? ORDER BY id DESC').all(projectId)
  }
  return rows.map(hydrate)
}

// FTS5-Query härten: Sonderzeichen entschärfen, Prefix-Match je Token (analog projectMemories).
function ftsQuery(raw) {
  const tokens = raw.replace(/["()*]/g, ' ').split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return '""'
  return tokens.map(t => `"${t}"*`).join(' ')
}

export function getSessionNote(db, projectId, id) {
  const row = db.prepare('SELECT * FROM session_notes WHERE id = ? AND project_id = ?').get(id, projectId)
  return hydrate(row)
}

export function updateSessionNote(db, projectId, id, patch = {}) {
  const existing = db.prepare('SELECT * FROM session_notes WHERE id = ? AND project_id = ?').get(id, projectId)
  if (!existing) {
    throw new SessionNoteError(`session_note ${id} nicht gefunden`, { statusCode: 404, code: 'NOTE_NOT_FOUND', field: 'id' })
  }
  const fields = []
  const params = []
  if (patch.title !== undefined) { fields.push('title = ?'); params.push(validateTitle(patch.title)) }
  if (patch.details !== undefined) { fields.push('details = ?'); params.push(validateDetails(patch.details)) }
  if (patch.pr_url !== undefined) { fields.push('pr_url = ?'); params.push(validatePrUrl(patch.pr_url)) }
  if (patch.sprints !== undefined) { fields.push('sprints = ?'); params.push(JSON.stringify(validateKeyArray(patch.sprints, 'sprints'))) }
  if (patch.issues !== undefined) { fields.push('issues = ?'); params.push(JSON.stringify(validateKeyArray(patch.issues, 'issues'))) }
  if (fields.length === 0) {
    throw new SessionNoteError('Kein aktualisierbares Feld übergeben', { code: 'EMPTY_PATCH' })
  }
  fields.push("updated_at = datetime('now')")
  params.push(id, projectId)
  db.prepare(`UPDATE session_notes SET ${fields.join(', ')} WHERE id = ? AND project_id = ?`).run(...params)
  return getSessionNote(db, projectId, id)
}

export function deleteSessionNote(db, projectId, id) {
  const result = db.prepare('DELETE FROM session_notes WHERE id = ? AND project_id = ?').run(id, projectId)
  return result.changes > 0
}
