// DD-280 (M3-S01 T03) — todo_links CRUD-Helper. Pure-Funktion ohne Express.
//
// Vier Link-Typen (DD#39 D07):
//   spec   — Relativer Pfad in repo_path (Path-Traversal-reject)
//   issue  — Issue-Key Pattern z.B. DD-123, MBT-42
//   vault  — Wikilink-String OHNE [[...]] (UI ergänzt Brackets)
//   url    — http:// oder https:// URL
//
// Position via API-Layer atomar (MAX+1 in Transaction, analog ProjectTodos).

import { resolve as pathResolve, isAbsolute } from 'path'
// DD-562: Link-Typ-Enum-Werte sind Single Source in contracts/todo.contracts.js
// (geteilt mit CLI-Guard + MCP-Enum). Set-Reihenfolge = Array-Reihenfolge → die
// LINK_TYPE_INVALID-Message ([...LINK_TYPES].join(', ')) bleibt 1:1.
import { TODO_LINK_TYPES } from '@devd/api-types/todo.contracts.js'

export const LINK_TYPES = new Set(TODO_LINK_TYPES)
export const TARGET_MAX = 2000
const ISSUE_PATTERN = /^[A-Z]{2,6}-\d+$/
const URL_PATTERN = /^https?:\/\//i

export class TodoLinkError extends Error {
  constructor(message, { statusCode = 400, code, field } = {}) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.field = field
  }
}

function validateType(value) {
  if (typeof value !== 'string' || !LINK_TYPES.has(value)) {
    throw new TodoLinkError(
      `type muss einer von [${[...LINK_TYPES].join(', ')}] sein`,
      { code: 'LINK_TYPE_INVALID', field: 'type' }
    )
  }
  return value
}

function validateTargetCommon(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TodoLinkError('target ist Pflichtfeld', { code: 'LINK_TARGET_REQUIRED', field: 'target' })
  }
  if (value.length > TARGET_MAX) {
    throw new TodoLinkError(
      `target darf max ${TARGET_MAX} Zeichen lang sein`,
      { code: 'LINK_TARGET_TOO_LONG', field: 'target' }
    )
  }
}

/**
 * Validates the link target per type and returns the normalized value.
 * For type=spec: ensures target is below repo_path (path-traversal reject).
 */
export function validateLinkTarget(type, target, { repoPath = null } = {}) {
  validateTargetCommon(target)
  if (type === 'url') {
    if (!URL_PATTERN.test(target)) {
      throw new TodoLinkError(
        'target muss mit http:// oder https:// beginnen',
        { code: 'LINK_TARGET_INVALID_URL', field: 'target' }
      )
    }
    return target.trim()
  }
  if (type === 'issue') {
    const trimmed = target.trim()
    if (!ISSUE_PATTERN.test(trimmed)) {
      throw new TodoLinkError(
        'target muss Issue-Key wie "DD-123" oder "MBT-42" sein',
        { code: 'LINK_TARGET_INVALID', field: 'target' }
      )
    }
    return trimmed
  }
  if (type === 'spec') {
    const trimmed = target.trim()
    if (isAbsolute(trimmed) || trimmed.includes('..')) {
      // Stricter Pre-Check ohne repoPath: reject absolutes und parent-traversal.
      throw new TodoLinkError(
        'target enthält absoluten Pfad oder ".." (path-traversal)',
        { code: 'LINK_TARGET_PATH_TRAVERSAL', field: 'target' }
      )
    }
    if (repoPath) {
      const resolved = pathResolve(repoPath, trimmed)
      const normalizedRepo = pathResolve(repoPath)
      if (!resolved.startsWith(normalizedRepo + '/') && resolved !== normalizedRepo) {
        throw new TodoLinkError(
          'target liegt außerhalb des repo_path',
          { code: 'LINK_TARGET_PATH_TRAVERSAL', field: 'target' }
        )
      }
    }
    return trimmed
  }
  if (type === 'vault') {
    const trimmed = target.trim()
    if (trimmed.includes('[[') || trimmed.includes(']]')) {
      throw new TodoLinkError(
        'target darf keine [[/]]-Brackets enthalten — wird UI-seitig ergänzt',
        { code: 'LINK_TARGET_INVALID', field: 'target' }
      )
    }
    return trimmed
  }
  return target
}

function getRepoPathForProject(db, todoId) {
  const row = db.prepare(`
    SELECT p.repo_path FROM project_todos t
    JOIN projects p ON p.id = t.project_id
    WHERE t.id = ?
  `).get(todoId)
  return row?.repo_path || null
}

/**
 * Inserts a new link for a todo. position = MAX+1 atomar in Transaction.
 */
export function addTodoLink(db, todoId, body = {}, { repoPath } = {}) {
  const todo = db.prepare('SELECT id FROM project_todos WHERE id = ?').get(todoId)
  if (!todo) throw new TodoLinkError('ToDo not found', { statusCode: 404, code: 'NOT_FOUND' })

  const type = validateType(body.type)
  // Resolve repoPath from DB if not passed explicitly (request-layer convenience).
  const effectiveRepoPath = repoPath ?? getRepoPathForProject(db, todoId)
  const target = validateLinkTarget(type, body.target, { repoPath: effectiveRepoPath })

  const tx = db.transaction(() => {
    const maxPos = db.prepare(
      'SELECT COALESCE(MAX(position), 0) AS p FROM todo_links WHERE todo_id = ?'
    ).get(todoId).p
    const position = maxPos + 1
    const res = db.prepare(
      `INSERT INTO todo_links (todo_id, type, target, position) VALUES (?, ?, ?, ?)`
    ).run(todoId, type, target, position)
    return Number(res.lastInsertRowid)
  })
  const id = tx()
  return db.prepare('SELECT * FROM todo_links WHERE id = ?').get(id)
}

/**
 * Deletes a single link by id.
 */
export function removeTodoLink(db, linkId) {
  const res = db.prepare('DELETE FROM todo_links WHERE id = ?').run(linkId)
  if (res.changes === 0) throw new TodoLinkError('Link not found', { statusCode: 404, code: 'NOT_FOUND' })
  return true
}
