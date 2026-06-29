// DD2-21: Dokumenten-Subsystem (Markdown-Dokumente an Meilensteine/Sprints).
// Pure Funktionen ohne Express (Muster userNotes.js / projectMemories.js).
// Daten: documents (Migration 067). Owner = genau ein Meilenstein ODER Sprint.
// Storage = DB-Blob (body); file_path optionaler Hinweis (D02).

import { TITLE_MAX, BODY_MAX } from '@devd/api-types/document.contracts.js'

export class DocumentError extends Error {
  constructor(message, { statusCode = 400, code, field } = {}) {
    super(message)
    this.name = 'DocumentError'
    this.statusCode = statusCode
    this.code = code
    this.field = field
  }
}

// owner = { type: 'milestone' | 'sprint', id: number } → Spaltenname + Wert.
function ownerColumn(owner) {
  if (!owner || (owner.type !== 'milestone' && owner.type !== 'sprint')) {
    throw new DocumentError('Owner muss milestone oder sprint sein', { code: 'OWNER_INVALID', field: 'owner' })
  }
  return owner.type === 'milestone' ? 'milestone_id' : 'sprint_id'
}

function validateTitle(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new DocumentError('title darf nicht leer sein', { code: 'TITLE_REQUIRED', field: 'title' })
  }
  if (raw.length > TITLE_MAX) {
    throw new DocumentError(`title darf max ${TITLE_MAX} Zeichen lang sein`, { code: 'TITLE_TOO_LONG', field: 'title' })
  }
  return raw
}

function validateBody(raw) {
  if (raw === undefined || raw === null) return ''
  if (typeof raw !== 'string') {
    throw new DocumentError('body muss ein String sein', { code: 'BODY_TYPE', field: 'body' })
  }
  if (raw.length > BODY_MAX) {
    throw new DocumentError(`body darf max ${BODY_MAX} Zeichen lang sein`, { code: 'BODY_TOO_LONG', field: 'body' })
  }
  return raw
}

function validateFilePath(raw) {
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw !== 'string') {
    throw new DocumentError('file_path muss ein String sein', { code: 'FILE_PATH_TYPE', field: 'file_path' })
  }
  return raw
}

export function createDocument(db, owner, { title, body, file_path } = {}) {
  const col = ownerColumn(owner)
  const t = validateTitle(title)
  const b = validateBody(body)
  const fp = validateFilePath(file_path)
  const result = db.prepare(
    `INSERT INTO documents (${col}, title, body, file_path) VALUES (?, ?, ?, ?)`,
  ).run(owner.id, t, b, fp)
  return getDocument(db, owner, Number(result.lastInsertRowid))
}

// Liste neueste zuerst (id DESC), owner-gescopt.
export function listDocuments(db, owner) {
  const col = ownerColumn(owner)
  return db.prepare(`SELECT * FROM documents WHERE ${col} = ? ORDER BY id DESC`).all(owner.id)
}

export function getDocument(db, owner, id) {
  const col = ownerColumn(owner)
  return db.prepare(`SELECT * FROM documents WHERE id = ? AND ${col} = ?`).get(id, owner.id) || null
}

export function updateDocument(db, owner, id, patch = {}) {
  const col = ownerColumn(owner)
  const existing = db.prepare(`SELECT id FROM documents WHERE id = ? AND ${col} = ?`).get(id, owner.id)
  if (!existing) {
    throw new DocumentError(`document ${id} nicht gefunden`, { statusCode: 404, code: 'DOC_NOT_FOUND', field: 'id' })
  }
  const fields = []
  const params = []
  if (patch.title !== undefined) { fields.push('title = ?'); params.push(validateTitle(patch.title)) }
  if (patch.body !== undefined) { fields.push('body = ?'); params.push(validateBody(patch.body)) }
  if (patch.file_path !== undefined) { fields.push('file_path = ?'); params.push(validateFilePath(patch.file_path)) }
  if (fields.length === 0) {
    throw new DocumentError('Kein aktualisierbares Feld übergeben', { code: 'EMPTY_PATCH' })
  }
  fields.push("updated_at = datetime('now')")
  params.push(id, owner.id)
  db.prepare(`UPDATE documents SET ${fields.join(', ')} WHERE id = ? AND ${col} = ?`).run(...params)
  return getDocument(db, owner, id)
}

export function deleteDocument(db, owner, id) {
  const col = ownerColumn(owner)
  const result = db.prepare(`DELETE FROM documents WHERE id = ? AND ${col} = ?`).run(id, owner.id)
  return result.changes > 0
}
