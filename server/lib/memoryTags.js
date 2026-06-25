// MEM-25: memory_tags — kuratiertes, projekt-scoped Stichwort-Register für project_memories.
// Grill 2026-06-21 (PO Erik) D06-D11. Controlled Vocabulary gegen Tag-Drift.
// Pure Funktionen ohne Express-Abhängigkeit (Muster aus projectMemories.js).
//
// Enforcement-Modell (D07/D11): self-activating Grace-Period — solange ein Projekt KEINE
// Register-Tags hat, greift keine Validierung (Live-Writes überleben den Pre-Seed-Zustand).
// Sobald ≥1 Tag registriert ist, gilt Hard-Block: jeder Tag an einem Memory MUSS im Register
// sein, sonst Reject mit Top-3-FTS-Suggest.

import { ProjectMemoryError } from './projectMemories.js'

// Tag-Token: alphanumerisch beginnend, dann . _ - erlaubt, KEINE Spaces (tags an
// project_memories sind space-getrennt → ein Space würde zwei Tokens erzeugen). Max 40.
const TAG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/

const _registerCache = new WeakMap()
export function hasTagRegister(db) {
  if (_registerCache.has(db)) return _registerCache.get(db)
  const row = db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='memory_tags'`)
    .get()
  const has = !!row
  _registerCache.set(db, has)
  return has
}

function assertRegister(db) {
  if (!hasTagRegister(db)) {
    throw new ProjectMemoryError('memory_tags erfordert Migration 057', {
      statusCode: 400,
      code: 'TAG_REGISTER_UNAVAILABLE',
    })
  }
}

function assertProjectExists(db, projectId) {
  const exists = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId)
  if (!exists) {
    throw new ProjectMemoryError('Projekt existiert nicht', { statusCode: 404, code: 'PROJECT_NOT_FOUND' })
  }
}

function validateTagToken(raw) {
  if (typeof raw !== 'string') {
    throw new ProjectMemoryError('tag muss ein String sein', { code: 'TAG_TYPE', field: 'tag' })
  }
  const tag = raw.trim()
  if (!TAG_PATTERN.test(tag)) {
    throw new ProjectMemoryError(
      'tag muss alphanumerisch beginnen, ohne Leerzeichen (erlaubt . _ -, max 40 Zeichen)',
      { code: 'TAG_PATTERN', field: 'tag' }
    )
  }
  return tag
}

// Token-Set eines Space-getrennten tags-Strings (leere Tokens raus).
function tokenize(tagString) {
  if (typeof tagString !== 'string') return []
  return tagString.split(/\s+/).map(t => t.trim()).filter(Boolean)
}

function registeredTagSet(db, projectId) {
  const rows = db.prepare('SELECT tag FROM memory_tags WHERE project_id = ?').all(projectId)
  return new Set(rows.map(r => r.tag))
}

function getTagRow(db, projectId, tag) {
  return db.prepare('SELECT * FROM memory_tags WHERE project_id = ? AND tag = ?').get(projectId, tag)
}

// Idempotenz-/Test-Helfer: ist <tag> im Register?
export function getTagRowExists(db, projectId, tag) {
  return !!getTagRow(db, projectId, tag)
}

// Usage-Map: Token → Anzahl aktiver Memories, die es tragen.
function usageMap(db, projectId) {
  const rows = db
    .prepare(`SELECT tags FROM project_memories WHERE project_id = ? AND deleted_at IS NULL AND superseded_by IS NULL`)
    .all(projectId)
  const map = new Map()
  for (const r of rows) {
    for (const tok of new Set(tokenize(r.tags))) {
      map.set(tok, (map.get(tok) || 0) + 1)
    }
  }
  return map
}

export function listTags(db, projectId, { query } = {}) {
  assertRegister(db)
  assertProjectExists(db, projectId)
  let rows
  if (query && String(query).trim()) {
    const match = buildTrigramMatch(query)
    rows = match
      ? db
          .prepare(`
            SELECT t.* FROM memory_tags_fts f
            JOIN memory_tags t ON t.id = f.rowid
            WHERE memory_tags_fts MATCH ? AND t.project_id = ?
            ORDER BY bm25(memory_tags_fts)
          `)
          .all(match, projectId)
      : db
          .prepare(`SELECT * FROM memory_tags WHERE project_id = ? AND tag LIKE ? ORDER BY tag`)
          .all(projectId, `%${String(query).trim()}%`)
  } else {
    rows = db.prepare('SELECT * FROM memory_tags WHERE project_id = ? ORDER BY tag').all(projectId)
  }
  const usage = usageMap(db, projectId)
  return rows.map(r => ({ ...r, usage_count: usage.get(r.tag) || 0 }))
}

export function createTag(db, projectId, tag, { description } = {}) {
  assertRegister(db)
  assertProjectExists(db, projectId)
  const t = validateTagToken(tag)
  const desc = description == null ? '' : String(description)
  try {
    const res = db
      .prepare('INSERT INTO memory_tags (project_id, tag, description) VALUES (?, ?, ?)')
      .run(projectId, t, desc)
    return getTagRow(db, projectId, t) || { id: Number(res.lastInsertRowid), project_id: projectId, tag: t, description: desc }
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      throw new ProjectMemoryError(`tag '${t}' ist bereits im Register`, { statusCode: 409, code: 'TAG_DUPLICATE', field: 'tag' })
    }
    throw e
  }
}

export function deleteTag(db, projectId, tag) {
  assertRegister(db)
  assertProjectExists(db, projectId)
  const t = validateTagToken(tag)
  const row = getTagRow(db, projectId, t)
  if (!row) {
    throw new ProjectMemoryError(`tag '${t}' ist nicht im Register`, { statusCode: 404, code: 'TAG_NOT_FOUND', field: 'tag' })
  }
  const usage_count = usageMap(db, projectId).get(t) || 0
  db.prepare('DELETE FROM memory_tags WHERE id = ?').run(row.id)
  return { id: row.id, tag: t, usage_count }
}

// FTS5-trigram-MATCH-Query härten: als Phrase quoten, interne Quotes strippen. trigram
// braucht ≥3 Zeichen; bei kürzeren Eingaben → null (Caller fällt auf LIKE/skip zurück).
function buildTrigramMatch(raw) {
  if (typeof raw !== 'string') return null
  const cleaned = raw.replace(/"/g, '').trim()
  if (cleaned.length < 3) return null
  return `"${cleaned}"`
}

export function suggestSimilarTags(db, projectId, tag, limit = 3) {
  if (!hasTagRegister(db)) return []
  const match = buildTrigramMatch(tag)
  if (match) {
    const rows = db
      .prepare(`
        SELECT t.tag FROM memory_tags_fts f
        JOIN memory_tags t ON t.id = f.rowid
        WHERE memory_tags_fts MATCH ? AND t.project_id = ?
        ORDER BY bm25(memory_tags_fts)
        LIMIT ?
      `)
      .all(match, projectId, limit)
    if (rows.length) return rows.map(r => r.tag)
  }
  // Fallback (kurze Tags / kein Treffer): Präfix-LIKE.
  const pre = typeof tag === 'string' ? tag.trim().slice(0, 3) : ''
  if (!pre) return []
  return db
    .prepare('SELECT tag FROM memory_tags WHERE project_id = ? AND tag LIKE ? ORDER BY tag LIMIT ?')
    .all(projectId, `${pre}%`, limit)
    .map(r => r.tag)
}

// Enforcement (D07): wirft bei unbekanntem Tag, gibt den (unveränderten) normalisierten
// String bei OK zurück. Self-activating (D11): leeres Register pro Projekt → keine Prüfung.
export function validateTagsAgainstRegistry(db, projectId, tagString) {
  if (!hasTagRegister(db)) return tagString // ältere DB ohne 057
  const tokens = tokenize(tagString)
  if (tokens.length === 0) return tagString
  const registered = registeredTagSet(db, projectId)
  if (registered.size === 0) return tagString // Grace-Period: noch nicht geseedet
  const unknown = tokens.filter(t => !registered.has(t))
  if (unknown.length > 0) {
    const first = unknown[0]
    const suggestions = suggestSimilarTags(db, projectId, first, 3)
    const hint = suggestions.length ? ` Meintest du: ${suggestions.join(', ')}?` : ''
    const err = new ProjectMemoryError(
      `tag '${first}' ist nicht im Register.${hint} Anlegen via 'devd-cli memory tag create ${first}'.`,
      { code: 'TAG_NOT_REGISTERED', field: 'tags' }
    )
    // ProjectMemoryError-Konstruktor speichert nur statusCode/code/field → Extra-Felder
    // (für REST-Payload + CLI-Hinweis) nachträglich anhängen.
    err.suggestions = suggestions
    err.unknown = unknown
    throw err
  }
  return tagString
}

// Repoint: ersetzt fromToken durch toToken in allen aktiven Memories (Whole-Token, dedupe,
// Reihenfolge erhalten). Register-unabhängig (dient Synonym-Folding der Migration, T08).
export function remapTagToken(db, projectId, fromToken, toToken) {
  const from = validateTagToken(fromToken)
  const to = validateTagToken(toToken)
  const rows = db
    .prepare(`SELECT id, tags FROM project_memories WHERE project_id = ? AND deleted_at IS NULL`)
    .all(projectId)
  const upd = db.prepare('UPDATE project_memories SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
  let touched = 0
  for (const r of rows) {
    const toks = tokenize(r.tags)
    if (!toks.includes(from)) continue
    const seen = new Set()
    const next = []
    for (const tok of toks) {
      const mapped = tok === from ? to : tok
      if (seen.has(mapped)) continue
      seen.add(mapped)
      next.push(mapped)
    }
    const joined = next.join(' ')
    if (joined !== r.tags) {
      upd.run(joined, r.id)
      touched++
    }
  }
  return touched
}

// rename + merge (D09): faltet oldTag in newTag. newTag existiert → Merge (oldTag-Row weg);
// sonst Rename (oldTag-Row → newTag umbenannt). Memories werden in beiden Fällen repointet.
export function renameTag(db, projectId, oldTag, newTag) {
  assertRegister(db)
  assertProjectExists(db, projectId)
  const from = validateTagToken(oldTag)
  const to = validateTagToken(newTag)
  const oldRow = getTagRow(db, projectId, from)
  if (!oldRow) {
    throw new ProjectMemoryError(`tag '${from}' ist nicht im Register`, { statusCode: 404, code: 'TAG_NOT_FOUND', field: 'tag' })
  }
  if (from === to) return { merged: false, repointed: 0 }
  const targetExists = !!getTagRow(db, projectId, to)
  const tx = db.transaction(() => {
    const repointed = remapTagToken(db, projectId, from, to)
    if (targetExists) {
      db.prepare('DELETE FROM memory_tags WHERE id = ?').run(oldRow.id)
    } else {
      db.prepare('UPDATE memory_tags SET tag = ? WHERE id = ?').run(to, oldRow.id)
    }
    return { merged: targetExists, repointed }
  })
  return tx()
}

// Singleton-Drop (T08): entfernt aus allen aktiven Memories alle Tokens, die NICHT im
// Register stehen. Gibt { touched } zurück.
export function pruneTagsNotInRegistry(db, projectId) {
  assertRegister(db)
  assertProjectExists(db, projectId)
  const registered = registeredTagSet(db, projectId)
  const rows = db
    .prepare(`SELECT id, tags FROM project_memories WHERE project_id = ? AND deleted_at IS NULL`)
    .all(projectId)
  const upd = db.prepare('UPDATE project_memories SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
  let touched = 0
  for (const r of rows) {
    const toks = tokenize(r.tags)
    if (toks.length === 0) continue
    const kept = toks.filter(t => registered.has(t))
    const joined = kept.join(' ')
    if (joined !== r.tags) {
      upd.run(joined, r.id)
      touched++
    }
  }
  return { touched }
}
