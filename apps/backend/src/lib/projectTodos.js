// DD-280 (M3-S01 T03): Project-Home ToDo CRUD + Reorder Helper.
// D-T08-01 (DD#39 Mockup-Review v2): status TEXT 'open'|'done'|'cancelled' — eigener
// Lifecycle, NICHT Issue-Lifecycle. Position via API-Layer (MAX+1 atomar in Transaction).
//
// Pure Funktionen ohne Express-Abhängigkeit. Reuse-Pattern aus milestoneDodItems.js.

// DD-562: Status-Enum-Werte sind Single Source in contracts/todo.contracts.js
// (geteilt mit CLI-Guard + MCP-Enum). Set-Reihenfolge = Array-Reihenfolge → die
// STATUS_INVALID-Message ([...TODO_STATUSES].join(', ')) bleibt 1:1.
import { TODO_STATUSES as TODO_STATUS_VALUES } from '@devd/api-types/todo.contracts.js'

export const TODO_STATUSES = new Set(TODO_STATUS_VALUES)
export const LABEL_MIN = 1
export const LABEL_MAX = 280
export const DETAILS_MAX = 8000

export class ProjectTodoError extends Error {
  constructor(message, { statusCode = 400, code, field } = {}) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.field = field
  }
}

function validateLabel(value, { required = true } = {}) {
  if (value === undefined) {
    if (required) throw new ProjectTodoError('label ist Pflichtfeld', { code: 'LABEL_REQUIRED', field: 'label' })
    return undefined
  }
  if (value === null) throw new ProjectTodoError('label darf nicht null sein', { code: 'LABEL_REQUIRED', field: 'label' })
  if (typeof value !== 'string') throw new ProjectTodoError('label muss String sein', { code: 'LABEL_INVALID', field: 'label' })
  const trimmed = value.trim()
  if (trimmed.length < LABEL_MIN) throw new ProjectTodoError('label darf nicht leer sein', { code: 'LABEL_REQUIRED', field: 'label' })
  if (trimmed.length > LABEL_MAX) {
    throw new ProjectTodoError(`label darf max ${LABEL_MAX} Zeichen lang sein`, { code: 'LABEL_TOO_LONG', field: 'label' })
  }
  return trimmed
}

function validateDetails(value) {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw new ProjectTodoError('details muss String sein', { code: 'DETAILS_INVALID', field: 'details' })
  if (value.length > DETAILS_MAX) {
    throw new ProjectTodoError(`details darf max ${DETAILS_MAX} Zeichen lang sein`, { code: 'DETAILS_TOO_LONG', field: 'details' })
  }
  return value
}

function validateStatus(value) {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !TODO_STATUSES.has(value)) {
    throw new ProjectTodoError(
      `status muss einer von [${[...TODO_STATUSES].join(', ')}] sein`,
      { code: 'STATUS_INVALID', field: 'status' }
    )
  }
  return value
}

function assertProjectExists(db, projectId) {
  const exists = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId)
  if (!exists) {
    throw new ProjectTodoError('Projekt existiert nicht', { statusCode: 404, code: 'PROJECT_NOT_FOUND' })
  }
}

// DD-363: completed_at kommt erst mit Migration 045. Produktiv ist die Spalte immer da;
// einzelne Tests bauen das Schema aber nur bis 037 auf. Spalten-Presence einmal je DB
// detektieren, damit listTodos/insertTodo auf beiden Schema-Ständen funktionieren.
const _completedAtCache = new WeakMap()
function hasCompletedAt(db) {
  if (_completedAtCache.has(db)) return _completedAtCache.get(db)
  const present = db.prepare(`PRAGMA table_info(project_todos)`).all().some(c => c.name === 'completed_at')
  _completedAtCache.set(db, present)
  return present
}

/**
 * Listet alle ToDos eines Projekts inkl. nested links.
 * Optionaler Status-Filter.
 *
 * @returns Array<{id, project_id, label, details, status, position, created_at, updated_at, links}>
 */
export function listTodos(db, projectId, { status } = {}) {
  assertProjectExists(db, projectId)
  const validatedStatus = validateStatus(status)
  const params = [projectId]
  let where = 'project_id = ?'
  if (validatedStatus) {
    where += ' AND status = ?'
    params.push(validatedStatus)
  }
  const completedCol = hasCompletedAt(db) ? ', completed_at' : ''
  const todos = db.prepare(
    `SELECT id, project_id, label, details, status, position, created_at, updated_at${completedCol}
     FROM project_todos WHERE ${where} ORDER BY position ASC`
  ).all(...params)
  if (todos.length === 0) return []
  const links = db.prepare(
    `SELECT id, todo_id, type, target, position, created_at FROM todo_links
     WHERE todo_id IN (${todos.map(() => '?').join(',')}) ORDER BY position ASC`
  ).all(...todos.map(t => t.id))
  const byTodo = new Map(todos.map(t => [t.id, { ...t, links: [] }]))
  for (const link of links) {
    const t = byTodo.get(link.todo_id)
    if (t) t.links.push(link)
  }
  return todos.map(t => byTodo.get(t.id))
}

/**
 * Erstellt ein neues ToDo. position = MAX+1 atomar in Transaction.
 */
export function insertTodo(db, projectId, body = {}) {
  assertProjectExists(db, projectId)
  const label = validateLabel(body.label, { required: true })
  const details = validateDetails(body.details)
  const status = validateStatus(body.status) || 'open'

  const tx = db.transaction(() => {
    const maxPos = db.prepare(
      'SELECT COALESCE(MAX(position), 0) AS p FROM project_todos WHERE project_id = ?'
    ).get(projectId).p
    const position = maxPos + 1
    // DD-363: Edge-Case — wird ein ToDo direkt als 'done' angelegt, completed_at mitschreiben.
    let res
    if (hasCompletedAt(db)) {
      const completedAtExpr = status === 'done' ? "datetime('now')" : 'NULL'
      res = db.prepare(
        `INSERT INTO project_todos (project_id, label, details, status, position, completed_at)
         VALUES (?, ?, ?, ?, ?, ${completedAtExpr})`
      ).run(projectId, label, details, status, position)
    } else {
      res = db.prepare(
        `INSERT INTO project_todos (project_id, label, details, status, position)
         VALUES (?, ?, ?, ?, ?)`
      ).run(projectId, label, details, status, position)
    }
    return Number(res.lastInsertRowid)
  })
  const id = tx()
  const row = db.prepare('SELECT * FROM project_todos WHERE id = ?').get(id)
  return { ...row, links: [] }
}

/**
 * Aktualisiert label/status/details eines ToDos. updated_at wird auf NOW gesetzt.
 */
export function patchTodo(db, todoId, body = {}) {
  const existing = db.prepare('SELECT * FROM project_todos WHERE id = ?').get(todoId)
  if (!existing) throw new ProjectTodoError('ToDo not found', { statusCode: 404, code: 'NOT_FOUND' })

  const sets = []
  const vals = []

  if (Object.prototype.hasOwnProperty.call(body, 'label')) {
    const label = validateLabel(body.label, { required: false })
    if (label !== undefined) {
      sets.push('label = ?')
      vals.push(label)
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, 'details')) {
    sets.push('details = ?')
    vals.push(validateDetails(body.details))
  }
  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    const status = validateStatus(body.status)
    sets.push('status = ?')
    vals.push(status)
    // DD-363: completed_at-Lifecycle an Status koppeln.
    //   → done (von nicht-done): completed_at = jetzt
    //   → nicht-done (von done): completed_at = NULL
    //   done→done: completed_at unverändert (kein Set)
    if (hasCompletedAt(db)) {
      if (status === 'done' && existing.status !== 'done') {
        sets.push("completed_at = datetime('now')")
      } else if (status !== 'done' && existing.status === 'done') {
        sets.push('completed_at = NULL')
      }
    }
  }
  if (sets.length === 0) return existing

  sets.push("updated_at = datetime('now')")
  vals.push(todoId)
  db.prepare(`UPDATE project_todos SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
  return db.prepare('SELECT * FROM project_todos WHERE id = ?').get(todoId)
}

/**
 * Löscht ein ToDo. CASCADE entfernt alle todo_links automatisch.
 */
export function deleteTodo(db, todoId) {
  const res = db.prepare('DELETE FROM project_todos WHERE id = ?').run(todoId)
  if (res.changes === 0) throw new ProjectTodoError('ToDo not found', { statusCode: 404, code: 'NOT_FOUND' })
  return true
}

/**
 * Setzt die Reihenfolge der ToDos eines Projekts. orderedIds muss EXAKT die existierenden
 * IDs enthalten — Validation + UPDATE in einer Transaction (Race-Safe).
 */
export function reorderTodos(db, projectId, orderedIds) {
  assertProjectExists(db, projectId)
  if (!Array.isArray(orderedIds)) {
    throw new ProjectTodoError('order muss ein Array sein', { code: 'ORDER_NOT_ARRAY', field: 'order' })
  }
  const tx = db.transaction(() => {
    const current = db.prepare(
      'SELECT id FROM project_todos WHERE project_id = ? ORDER BY position ASC'
    ).all(projectId).map(r => r.id)
    if (orderedIds.length !== current.length) {
      throw new ProjectTodoError(
        `order muss alle ${current.length} ToDos enthalten (geliefert: ${orderedIds.length})`,
        { code: 'ORDER_MISMATCH', field: 'order' }
      )
    }
    const currentSet = new Set(current)
    for (const id of orderedIds) {
      if (!currentSet.has(id)) {
        throw new ProjectTodoError(
          `ID ${id} gehört nicht zu Projekt ${projectId}`,
          { code: 'ORDER_MISMATCH', field: 'order' }
        )
      }
    }
    const upd = db.prepare('UPDATE project_todos SET position = ?, updated_at = datetime(\'now\') WHERE id = ?')
    let updated = 0
    for (let i = 0; i < orderedIds.length; i++) {
      const result = upd.run(i + 1, orderedIds[i])
      updated += result.changes
    }
    return updated
  })
  return tx()
}
