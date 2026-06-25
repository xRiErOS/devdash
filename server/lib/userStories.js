// E01.2 (GF-2 Backend-Epic): DB-backed CRUD fuer user_stories. Mirrors server/lib/subtasks.js.
// Verdict-Vokabular Single Source aus dem Contract (statt hart abgetippt).
// Backend-B02: Spalte heisst us_verdict (NICHT verdict). D09: qa = per-US-Pruefgrundlage
// (loest issue-level acceptance_criteria + test_instruction ab).
import { USER_STORY_VERDICTS } from '../../contracts/userStory.contracts.js'

export class UserStoryValidationError extends Error {
  constructor(message, status = 422) {
    super(message)
    this.name = 'UserStoryValidationError'
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
  if (!title) throw new UserStoryValidationError('title ist Pflichtfeld', 400)
  return title
}

// key = generiert (US-<id>, analog ST-<id>). In SQL projiziert, damit der Frontend-Vertrag
// (issue.user_stories[].key) ohne JS-Map bedient wird.
const SELECT_COLS = `
  id, backlog_id, ('US-' || id) AS key, title, details, qa, us_verdict, position,
  created_at, updated_at
`

export function listUserStories(db, backlogId) {
  return db.prepare(`
    SELECT ${SELECT_COLS}
    FROM user_stories
    WHERE backlog_id = ?
    ORDER BY position ASC, id ASC
  `).all(backlogId)
}

export function getUserStory(db, id) {
  return db.prepare(`SELECT ${SELECT_COLS} FROM user_stories WHERE id = ?`).get(id)
}

export function createUserStory(db, backlogId, payload = {}) {
  const parent = db.prepare('SELECT id FROM backlog WHERE id = ?').get(backlogId)
  if (!parent) throw new UserStoryValidationError('Backlog item not found', 404)

  const title = requireTitle(payload.title)
  const details = normalizeText(payload.details)
  const qa = normalizeText(payload.qa)
  const position = payload.position === undefined || payload.position === null
    ? 0
    : Number(payload.position)
  if (!Number.isInteger(position)) throw new UserStoryValidationError('position must be an integer', 400)

  const result = db.prepare(`
    INSERT INTO user_stories (backlog_id, title, details, qa, us_verdict, position)
    VALUES (?, ?, ?, ?, 'open', ?)
  `).run(backlogId, title, details, qa, position)
  return getUserStory(db, result.lastInsertRowid)
}

export function updateUserStory(db, id, payload = {}) {
  const existing = getUserStory(db, id)
  if (!existing) throw new UserStoryValidationError('User story not found', 404)

  const sets = ['updated_at = CURRENT_TIMESTAMP']
  const values = []
  if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
    sets.push('title = ?')
    values.push(requireTitle(payload.title))
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'details')) {
    sets.push('details = ?')
    values.push(normalizeText(payload.details))
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'qa')) {
    sets.push('qa = ?')
    values.push(normalizeText(payload.qa))
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'position')) {
    const position = Number(payload.position)
    if (!Number.isInteger(position)) throw new UserStoryValidationError('position must be an integer', 400)
    sets.push('position = ?')
    values.push(position)
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'us_verdict')) {
    if (!USER_STORY_VERDICTS.includes(payload.us_verdict)) {
      throw new UserStoryValidationError(`us_verdict muss einer von ${USER_STORY_VERDICTS.join('|')} sein`, 400)
    }
    sets.push('us_verdict = ?')
    values.push(payload.us_verdict)
  }

  if (sets.length > 1) {
    values.push(id)
    db.prepare(`UPDATE user_stories SET ${sets.join(', ')} WHERE id = ?`).run(...values)
  }
  return getUserStory(db, id)
}

export function setUserStoryVerdict(db, id, us_verdict) {
  const existing = getUserStory(db, id)
  if (!existing) throw new UserStoryValidationError('User story not found', 404)
  if (!USER_STORY_VERDICTS.includes(us_verdict)) {
    throw new UserStoryValidationError(`us_verdict muss einer von ${USER_STORY_VERDICTS.join('|')} sein`, 400)
  }
  db.prepare(`
    UPDATE user_stories SET us_verdict = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(us_verdict, id)
  return getUserStory(db, id)
}

export function deleteUserStory(db, id) {
  const result = db.prepare('DELETE FROM user_stories WHERE id = ?').run(id)
  if (result.changes === 0) throw new UserStoryValidationError('User story not found', 404)
  return { ok: true, deleted_id: Number(id) }
}
