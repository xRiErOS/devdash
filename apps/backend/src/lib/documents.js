// DD2-21: Dokumenten-Subsystem (Markdown-Dokumente an Meilensteine/Sprints).
// Pure Funktionen ohne Express (Muster userNotes.js / projectMemories.js).
// Daten: documents (Migration 067). Owner = genau ein Meilenstein ODER Sprint.
// Storage = DB-Blob (body); file_path optionaler Hinweis (D02).

import { TITLE_MAX, BODY_MAX } from '@devd/api-types/document.contracts.js'

// DD2-167: schlanker Status-Lifecycle (kein Issue-/Sprint-Lifecycle). Whitelist hier
// in der Lib (werfende Autorität) statt aus dem Contract importiert — der Backend-Lauf
// im Worktree resolved @devd/api-types bare gegen die Main-Pakete (node_modules-Symlink),
// ein neuer Contract-Export käme dort nicht an. Spiegel in document.contracts.js (Schema-Doku).
export const DOCUMENT_STATUS = ['draft', 'active', 'archived']

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

// validateStatus akzeptiert nur die Whitelist; undefined → Default 'active' (Create)
// bzw. Skip (Update behandelt undefined als „nicht ändern" davor).
function validateStatus(raw) {
  if (raw === undefined || raw === null || raw === '') return 'active'
  if (!DOCUMENT_STATUS.includes(raw)) {
    throw new DocumentError(`status muss eines von ${DOCUMENT_STATUS.join('|')} sein`, { code: 'STATUS_INVALID', field: 'status' })
  }
  return raw
}

export function createDocument(db, owner, { title, body, file_path, status } = {}) {
  const col = ownerColumn(owner)
  const t = validateTitle(title)
  const b = validateBody(body)
  const fp = validateFilePath(file_path)
  const st = validateStatus(status)
  const result = db.prepare(
    `INSERT INTO documents (${col}, title, body, file_path, status) VALUES (?, ?, ?, ?, ?)`,
  ).run(owner.id, t, b, fp, st)
  return getDocument(db, owner, Number(result.lastInsertRowid))
}

// Liste neueste zuerst (id DESC), owner-gescopt.
export function listDocuments(db, owner) {
  const col = ownerColumn(owner)
  return db.prepare(`SELECT * FROM documents WHERE ${col} = ? ORDER BY id DESC`).all(owner.id)
}

// DD2-163 (Rework): projektweite Liste ALLER Dokumente (entitätsübergreifend) für den
// globalen Docs-Browser. Owner-Typ + Owner-Name werden über JOIN auf milestones/sprints
// aufgelöst und als owner_type/owner_name mitgeliefert. Scope = Dokumente, deren
// Meilenstein ODER Sprint zum Projekt gehört (Sprints tragen selbst project_id, Mig. 003).
export function listAllDocuments(db, projectId) {
  return db.prepare(`
    SELECT d.*,
      CASE WHEN d.milestone_id IS NOT NULL THEN 'milestone' ELSE 'sprint' END AS owner_type,
      COALESCE(m.name, s.name) AS owner_name
    FROM documents d
    LEFT JOIN milestones m ON d.milestone_id = m.id
    LEFT JOIN sprints   s ON d.sprint_id    = s.id
    WHERE m.project_id = ? OR s.project_id = ?
    ORDER BY d.id DESC
  `).all(projectId, projectId)
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
  if (patch.status !== undefined) { fields.push('status = ?'); params.push(validateStatus(patch.status)) }
  if (fields.length === 0) {
    throw new DocumentError('Kein aktualisierbares Feld übergeben', { code: 'EMPTY_PATCH' })
  }
  fields.push("updated_at = datetime('now')")
  params.push(id, owner.id)
  db.prepare(`UPDATE documents SET ${fields.join(', ')} WHERE id = ? AND ${col} = ?`).run(...params)
  return getDocument(db, owner, id)
}

// moveDocument hängt ein Dokument von owner (Quelle, path-verifiziert) auf target
// (Ziel-Meilenstein/-Sprint) um — DD2-243. Setzt die eine Owner-Spalte, räumt die
// andere. target-Existenz wird vom Caller (_resolveDocOwner) verifiziert, nicht hier.
export function moveDocument(db, owner, id, target) {
  const col = ownerColumn(owner)
  const existing = db.prepare(`SELECT id FROM documents WHERE id = ? AND ${col} = ?`).get(id, owner.id)
  if (!existing) {
    throw new DocumentError(`document ${id} nicht gefunden`, { statusCode: 404, code: 'DOC_NOT_FOUND', field: 'id' })
  }
  const targetCol = ownerColumn(target)
  const milestoneId = targetCol === 'milestone_id' ? target.id : null
  const sprintId = targetCol === 'sprint_id' ? target.id : null
  db.prepare(
    `UPDATE documents SET milestone_id = ?, sprint_id = ?, updated_at = datetime('now') WHERE id = ? AND ${col} = ?`,
  ).run(milestoneId, sprintId, id, owner.id)
  return getDocument(db, target, id)
}

export function deleteDocument(db, owner, id) {
  const col = ownerColumn(owner)
  const result = db.prepare(`DELETE FROM documents WHERE id = ? AND ${col} = ?`).run(id, owner.id)
  return result.changes > 0
}
