// DD-45 R03 + R11 — extrahierter Schreibpfad fuer PUT /api/backlog/:id.
// Garantiert, dass `null` Werte Felder wirklich leeren (kein COALESCE-Fallback).
// In api.js gekapselt, damit die Schreibsemantik testbar wird ohne Express-Listener.

import { ISSUE_TYPES as VALID_TYPES } from '@devd/api-types/backlog.contracts.js'

export class BacklogUpdateError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'BacklogUpdateError'
    this.status = status
  }
}

// Felder, die explizit auf null gesetzt werden duerfen (R03 — null-clearing).
const NULLABLE_FIELDS = [
  'milestone',
  'plugin_key',
  'goal',
  'background',
  'context_notes',
  'relevant_files',
  'po_notes',
]

export function applyBacklogUpdate(db, id, body = {}) {
  const item = db.prepare('SELECT * FROM backlog WHERE id = ?').get(id)
  if (!item) throw new BacklogUpdateError('Item not found', 404)

  if (body.type && !VALID_TYPES.includes(body.type)) {
    throw new BacklogUpdateError(`type muss einer von ${VALID_TYPES.join('|')} sein`, 400)
  }

  const setParts = []
  const values = []
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k)

  if (has('title') && body.title != null) {
    const trimmed = String(body.title).trim()
    if (trimmed === '') throw new BacklogUpdateError('title darf nicht leer sein', 400)
    setParts.push('title = ?'); values.push(trimmed)
  }
  if (has('type') && body.type) {
    setParts.push('type = ?'); values.push(body.type)
  }
  if (has('priority') && body.priority != null) {
    setParts.push('priority = ?'); values.push(Number(body.priority))
  }
  for (const field of NULLABLE_FIELDS) {
    if (has(field)) {
      setParts.push(`${field} = ?`)
      values.push(body[field] === '' ? null : body[field])
    }
  }

  if (setParts.length > 0) {
    values.push(id)
    db.prepare(`UPDATE backlog SET ${setParts.join(', ')} WHERE id = ?`).run(...values)
  }
  return db.prepare('SELECT * FROM backlog WHERE id = ?').get(id)
}
