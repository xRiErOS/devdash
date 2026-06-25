// DD-565: Status-Vokabular Single Source aus dem Contract (statt hart abgetippt).
import { SUBTASK_STATUSES } from '../../contracts/subtask.contracts.js'

export class SubtaskValidationError extends Error {
  constructor(message, status = 422) {
    super(message)
    this.name = 'SubtaskValidationError'
    this.status = status
  }
}

function normalizeText(value) {
  if (value === undefined) return undefined
  if (value === null) return null
  const text = String(value).trim()
  return text.length ? text : null
}

function requireTitle(value) {
  const title = normalizeText(value)
  if (!title) throw new SubtaskValidationError('title ist Pflichtfeld', 400)
  return title
}

export function listSubtasks(db, backlogId) {
  return db.prepare(`
    SELECT id, backlog_id, title, qa_criteria, status, position, created_at, updated_at, completed_at
    FROM subtasks
    WHERE backlog_id = ?
    ORDER BY position ASC, id ASC
  `).all(backlogId)
}

export function getSubtask(db, id) {
  return db.prepare(`
    SELECT id, backlog_id, title, qa_criteria, status, position, created_at, updated_at, completed_at
    FROM subtasks
    WHERE id = ?
  `).get(id)
}

export function createSubtask(db, backlogId, payload = {}) {
  const parent = db.prepare('SELECT id FROM backlog WHERE id = ?').get(backlogId)
  if (!parent) throw new SubtaskValidationError('Backlog item not found', 404)

  const title = requireTitle(payload.title)
  const qaCriteria = normalizeText(payload.qa_criteria)
  const position = payload.position === undefined || payload.position === null
    ? 0
    : Number(payload.position)
  if (!Number.isInteger(position)) throw new SubtaskValidationError('position must be an integer', 400)

  const status = payload.status || 'open'
  if (status !== 'open') throw new SubtaskValidationError('status darf beim Anlegen nur open sein', 400)

  const result = db.prepare(`
    INSERT INTO subtasks (backlog_id, title, qa_criteria, status, position)
    VALUES (?, ?, ?, 'open', ?)
  `).run(backlogId, title, qaCriteria, position)
  return getSubtask(db, result.lastInsertRowid)
}

export function updateSubtask(db, id, payload = {}) {
  const existing = getSubtask(db, id)
  if (!existing) throw new SubtaskValidationError('Subtask not found', 404)

  const sets = ['updated_at = CURRENT_TIMESTAMP']
  const values = []
  if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
    sets.push('title = ?')
    values.push(requireTitle(payload.title))
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'qa_criteria')) {
    sets.push('qa_criteria = ?')
    values.push(normalizeText(payload.qa_criteria))
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'position')) {
    const position = Number(payload.position)
    if (!Number.isInteger(position)) throw new SubtaskValidationError('position must be an integer', 400)
    sets.push('position = ?')
    values.push(position)
  }

  if (sets.length > 1) {
    values.push(id)
    db.prepare(`UPDATE subtasks SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  }
  return getSubtask(db, id)
}

export function setSubtaskStatus(db, id, status) {
  const existing = getSubtask(db, id)
  if (!existing) throw new SubtaskValidationError('Subtask not found', 404)
  if (!SUBTASK_STATUSES.includes(status)) {
    throw new SubtaskValidationError('status muss open oder done sein', 400)
  }
  if (status === 'done' && !normalizeText(existing.qa_criteria)) {
    throw new SubtaskValidationError('qa_criteria ist Pflicht für done', 422)
  }

  db.prepare(`
    UPDATE subtasks
    SET status = ?,
        updated_at = CURRENT_TIMESTAMP,
        completed_at = CASE WHEN ? = 'done' THEN CURRENT_TIMESTAMP ELSE NULL END
    WHERE id = ?
  `).run(status, status, id)
  return getSubtask(db, id)
}

export function deleteSubtask(db, id) {
  const result = db.prepare('DELETE FROM subtasks WHERE id = ?').run(id)
  if (result.changes === 0) throw new SubtaskValidationError('Subtask not found', 404)
  return { ok: true, deleted_id: Number(id) }
}

/**
 * DD-45 R04: Batch-Reorder fuer Sub-Tasks.
 * Setzt Positionen normalisiert (10, 20, 30, ...) gemaess der uebergebenen
 * id-Reihenfolge. Validiert, dass alle ids zum Parent backlogId gehoeren und
 * die Mengen identisch sind (kein verstecktes Add/Delete).
 */
export function reorderSubtasks(db, backlogId, orderedIds) {
  const parent = db.prepare('SELECT id FROM backlog WHERE id = ?').get(backlogId)
  if (!parent) throw new SubtaskValidationError('Backlog item not found', 404)
  if (!Array.isArray(orderedIds)) {
    throw new SubtaskValidationError('orderedIds muss ein Array sein', 400)
  }
  const ids = orderedIds.map(v => Number(v))
  if (ids.some(v => !Number.isInteger(v) || v <= 0)) {
    throw new SubtaskValidationError('orderedIds enthaelt ungueltige id', 400)
  }
  if (new Set(ids).size !== ids.length) {
    throw new SubtaskValidationError('orderedIds enthaelt Duplikate', 400)
  }
  const existing = db.prepare('SELECT id FROM subtasks WHERE backlog_id = ?').all(backlogId)
  const existingIds = new Set(existing.map(r => r.id))
  if (existingIds.size !== ids.length || ids.some(id => !existingIds.has(id))) {
    throw new SubtaskValidationError('orderedIds muss alle Subtask-ids des Parents enthalten', 400)
  }
  const stmt = db.prepare(`
    UPDATE subtasks SET position = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND backlog_id = ?
  `)
  const tx = db.transaction((ids) => {
    ids.forEach((id, idx) => stmt.run((idx + 1) * 10, id, backlogId))
  })
  tx(ids)
  return listSubtasks(db, backlogId)
}
