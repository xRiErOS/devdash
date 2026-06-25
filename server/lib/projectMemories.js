// MEM-9 (MEM#5): project_memories Helper — projektgebundenes Memory als Master.
// Entkoppelt vom globalen ~/.claude/memory.db. FTS5-first (NAS-tauglich, kein Ollama/sqlite-vec).
// Append-only: Korrektur via supersedeMemory (kein stilles Überschreiben). Soft-Delete via deleted_at.
// Pure Funktionen ohne Express-Abhängigkeit. Reuse-Pattern aus componentNotes.js / projectTodos.js.

// DD-563 (Sprint DD#78, Triplet 4/6): Kategorie-Enum als Single Source aus dem Contract.
// Reihenfolge load-bearing — die `category muss eine von: ${CATEGORIES.join(', ')}`-Message
// hängt daran. Re-Export als CATEGORIES erhält die bestehende Lib-API (tests/mem15, REST).
import { MEMORY_CATEGORIES } from '../../contracts/project-memory.contracts.js'

export const CATEGORIES = Object.freeze([...MEMORY_CATEGORIES])

// MEM-25: Tag-Register-Enforcement (D07). Lazy import via Funktion vermeidet harte
// Top-Level-Zyklus-Auswertung (memoryTags importiert ProjectMemoryError von hier zurück).
// Beide nutzen einander nur zur Aufrufzeit → ESM-Live-Bindings sind sicher.
import { validateTagsAgainstRegistry } from './memoryTags.js'

export const SUMMARY_MAX = 500
export const CONTENT_MAX = 64000
export const TAGS_MAX = 1000

// anchor + stability: MEM-11 (Migration 042). Auf älteren DBs ohne 042 nicht vorhanden →
// hasGranularityCols() schaltet sie konditional zu, damit der Helper migrationsunabhängig bleibt.
const BASE_COLS = [
  'id', 'project_id', 'category', 'summary', 'content', 'tags', 'importance', 'pinned',
  'source_type', 'source_ref', 'superseded_by', 'created_at', 'updated_at', 'deleted_at',
]
const GRAN_COLS = ['anchor', 'stability']

let _granCache = new WeakMap()
function hasGranularityCols(db) {
  if (_granCache.has(db)) return _granCache.get(db)
  const cols = db.prepare(`PRAGMA table_info(project_memories)`).all().map(c => c.name)
  const has = GRAN_COLS.every(c => cols.includes(c))
  _granCache.set(db, has)
  return has
}

function selectCols(db, alias = '') {
  const cols = hasGranularityCols(db) ? [...BASE_COLS, ...GRAN_COLS] : [...BASE_COLS]
  return cols.map(c => (alias ? `${alias}.${c}` : c)).join(', ')
}

export class ProjectMemoryError extends Error {
  constructor(message, { statusCode = 400, code, field } = {}) {
    super(message)
    this.name = 'ProjectMemoryError'
    this.statusCode = statusCode
    this.code = code
    this.field = field
  }
}

function assertProjectExists(db, projectId) {
  const exists = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId)
  if (!exists) {
    throw new ProjectMemoryError('Projekt existiert nicht', { statusCode: 404, code: 'PROJECT_NOT_FOUND' })
  }
}

function validateCategory(raw) {
  if (!CATEGORIES.includes(raw)) {
    throw new ProjectMemoryError(
      `category muss eine von: ${CATEGORIES.join(', ')}`,
      { code: 'CATEGORY_INVALID', field: 'category' }
    )
  }
  return raw
}

function validateSummary(raw) {
  if (typeof raw !== 'string') {
    throw new ProjectMemoryError('summary muss ein String sein', { code: 'SUMMARY_TYPE', field: 'summary' })
  }
  const summary = raw.trim()
  if (summary.length === 0) {
    throw new ProjectMemoryError('summary darf nicht leer sein', { code: 'SUMMARY_EMPTY', field: 'summary' })
  }
  if (summary.length > SUMMARY_MAX) {
    throw new ProjectMemoryError(`summary darf max ${SUMMARY_MAX} Zeichen lang sein`, { code: 'SUMMARY_TOO_LONG', field: 'summary' })
  }
  return summary
}

function validateText(raw, { field, max }) {
  if (raw === undefined || raw === null) return ''
  if (typeof raw !== 'string') {
    throw new ProjectMemoryError(`${field} muss ein String sein`, { code: `${field.toUpperCase()}_TYPE`, field })
  }
  if (raw.length > max) {
    throw new ProjectMemoryError(`${field} darf max ${max} Zeichen lang sein`, { code: `${field.toUpperCase()}_TOO_LONG`, field })
  }
  return raw
}

// tags akzeptiert Array oder String → normalisiert auf Space-getrennten String (FTS-tauglich).
function normalizeTags(raw) {
  if (raw === undefined || raw === null) return ''
  if (Array.isArray(raw)) {
    return validateText(raw.map(t => String(t).trim()).filter(Boolean).join(' '), { field: 'tags', max: TAGS_MAX })
  }
  return validateText(String(raw), { field: 'tags', max: TAGS_MAX })
}

// DD-459 (Bug): Tool-Call-Serialisierungs-Leak abwehren. Manche MCP-Clients hängen bei
// fehlgeschlagenem Parameter-Parsing den Rest des Tool-Calls (inkl. `</content>` +
// `<parameter name="tags">…`) an den content-String an, statt tags als eigenes Feld zu
// senden — content trägt dann das Artefakt, die tags-Spalte bleibt leer (Incident
// 2026-06-02, project_memories 163/164 in Sproutling). Der Server kann fremde Clients
// nicht zwingen, sauber zu serialisieren → Defense-in-Depth: das Artefakt aus content
// strippen und ein darin geleaktes tags-Feld rekonstruieren.
//
// Signatur des Leaks: ein `</content>`, dem (ggf. nach Whitespace) ein `<parameter name=`
// Block folgt. Reine User-Prosa endet praktisch nie so — der Lookahead disambiguiert
// gegen legitime Erwähnungen von `</content>` im Fließtext.
const CONTENT_ARTIFACT_RE = /<\/content>\s*(?=<parameter\s+name=)/i

function recoverLeakedTags(junk) {
  const m = junk.match(/<parameter\s+name="tags">\s*([\s\S]*?)\s*(?:<\/parameter>|<parameter\s+name=|$)/i)
  if (!m) return null
  const raw = m[1].trim()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(t => String(t))
  } catch { /* kein JSON-Array → als roher String behandeln */ }
  return raw
}

// Liefert { content, tags } — content vom Artefakt befreit, tags = rekonstruierte Tags
// (oder undefined, wenn kein Artefakt / kein tags-Leak gefunden).
function sanitizeContentArtifact(raw) {
  if (typeof raw !== 'string') return { content: raw, tags: undefined }
  const idx = raw.search(CONTENT_ARTIFACT_RE)
  if (idx === -1) return { content: raw, tags: undefined }
  const cleaned = raw.slice(0, idx).replace(/\s+$/, '')
  const recovered = recoverLeakedTags(raw.slice(idx))
  return { content: cleaned, tags: recovered ?? undefined }
}

// tags gilt als „nicht gesetzt", wenn undefined/null/Leerstring/leeres Array — nur dann
// dürfen aus content rekonstruierte Tags greifen (explizite tags des Callers haben Vorrang).
function tagsAreEmpty(raw) {
  if (raw === undefined || raw === null) return true
  if (Array.isArray(raw)) return raw.length === 0
  if (typeof raw === 'string') return raw.trim() === ''
  return false
}

function validateImportance(raw) {
  if (raw === undefined || raw === null) return 2
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 1 || n > 3) {
    throw new ProjectMemoryError('importance muss 1 (hoch), 2 (normal) oder 3 (niedrig) sein', { code: 'IMPORTANCE_RANGE', field: 'importance' })
  }
  return n
}

function validatePinned(raw) {
  if (raw === undefined || raw === null) return 0
  return raw === true || raw === 1 || raw === '1' ? 1 : 0
}

const ANCHOR_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/
function validateAnchor(raw) {
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw !== 'string') {
    throw new ProjectMemoryError('anchor muss ein String sein', { code: 'ANCHOR_TYPE', field: 'anchor' })
  }
  const anchor = raw.trim()
  if (!ANCHOR_PATTERN.test(anchor)) {
    throw new ProjectMemoryError('anchor muss alphanumerisch beginnen (erlaubt . _ -, max 40 Zeichen)', { code: 'ANCHOR_PATTERN', field: 'anchor' })
  }
  return anchor
}

function validateStability(raw) {
  if (raw === undefined || raw === null) return 'volatile'
  if (raw !== 'stable' && raw !== 'volatile') {
    throw new ProjectMemoryError("stability muss 'stable' oder 'volatile' sein", { code: 'STABILITY_INVALID', field: 'stability' })
  }
  return raw
}

// Ein aktiver Anchor pro Projekt. Gelöschte/superseded Rows zählen nicht.
function assertAnchorFree(db, projectId, anchor, exceptId = null) {
  if (!anchor) return
  const row = db.prepare(`
    SELECT id FROM project_memories
    WHERE project_id = ? AND anchor = ? AND deleted_at IS NULL AND superseded_by IS NULL
  `).get(projectId, anchor)
  if (row && row.id !== exceptId) {
    throw new ProjectMemoryError(`anchor '${anchor}' ist bereits aktiv vergeben`, { statusCode: 409, code: 'ANCHOR_DUPLICATE', field: 'anchor' })
  }
}

function assertGranularity(db) {
  if (!hasGranularityCols(db)) {
    throw new ProjectMemoryError('anchor/stability erfordern Migration 042', { statusCode: 400, code: 'GRANULARITY_UNAVAILABLE' })
  }
}

function rowById(db, id) {
  return db.prepare(`SELECT ${selectCols(db)} FROM project_memories WHERE id = ?`).get(id)
}

// FTS5-MATCH gegen Sonderzeichen härten: in Tokens splitten, jedes als Phrase quoten.
// Verhindert FTS5-Syntax-Fehler bei User-Eingaben wie `C:\temp`, `"`, `AND`, `*`.
function buildMatchQuery(raw) {
  if (typeof raw !== 'string') return null
  const tokens = raw.match(/[\p{L}\p{N}_]+/gu)
  if (!tokens || tokens.length === 0) return null
  return tokens.map(t => `"${t}"`).join(' ')
}

export function listMemories(db, projectId, { category, includeSuperseded = false } = {}) {
  assertProjectExists(db, projectId)
  const clauses = ['project_id = ?', 'deleted_at IS NULL']
  const params = [projectId]
  if (!includeSuperseded) clauses.push('superseded_by IS NULL')
  if (category !== undefined && category !== null) {
    clauses.push('category = ?')
    params.push(validateCategory(category))
  }
  return db.prepare(`
    SELECT ${selectCols(db)} FROM project_memories
    WHERE ${clauses.join(' AND ')}
    ORDER BY pinned DESC, updated_at DESC
  `).all(...params)
}

export function getMemory(db, projectId, id) {
  assertProjectExists(db, projectId)
  const row = db.prepare(`
    SELECT ${selectCols(db)} FROM project_memories
    WHERE id = ? AND project_id = ? AND deleted_at IS NULL
  `).get(id, projectId)
  return row || null
}

export function createMemory(db, projectId, input = {}) {
  assertProjectExists(db, projectId)
  const category = validateCategory(input.category)
  const summary = validateSummary(input.summary)
  // DD-459: content vom Tool-Call-Artefakt befreien, geleakte tags rekonstruieren —
  // VOR validateText, damit das Artefakt nicht erst die Längenprüfung reißt.
  const sani = sanitizeContentArtifact(input.content)
  const content = validateText(sani.content, { field: 'content', max: CONTENT_MAX })
  const tags = validateTagsAgainstRegistry(db, projectId, normalizeTags(
    sani.tags !== undefined && tagsAreEmpty(input.tags) ? sani.tags : input.tags
  ))
  const importance = validateImportance(input.importance)
  const pinned = validatePinned(input.pinned)
  const source_type = input.source_type ?? null
  const source_ref = input.source_ref ?? null

  const cols = ['project_id', 'category', 'summary', 'content', 'tags', 'importance', 'pinned', 'source_type', 'source_ref']
  const vals = [projectId, category, summary, content, tags, importance, pinned, source_type, source_ref]

  if (hasGranularityCols(db)) {
    const anchor = validateAnchor(input.anchor)
    const stability = validateStability(input.stability)
    assertAnchorFree(db, projectId, anchor)
    cols.push('anchor', 'stability')
    vals.push(anchor, stability)
  } else if (input.anchor != null || input.stability != null) {
    assertGranularity(db)
  }

  const result = db.prepare(`
    INSERT INTO project_memories (${cols.join(', ')})
    VALUES (${cols.map(() => '?').join(', ')})
  `).run(...vals)
  return rowById(db, Number(result.lastInsertRowid))
}

export function updateMemory(db, projectId, id, fields = {}) {
  const existing = getMemory(db, projectId, id)
  if (!existing) {
    throw new ProjectMemoryError('Memory nicht gefunden', { statusCode: 404, code: 'MEMORY_NOT_FOUND' })
  }
  const sets = []
  const params = []
  if (fields.category !== undefined) { sets.push('category = ?'); params.push(validateCategory(fields.category)) }
  if (fields.summary !== undefined) { sets.push('summary = ?'); params.push(validateSummary(fields.summary)) }
  let recoveredTags
  if (fields.content !== undefined) {
    // DD-459: gleiche Artefakt-Abwehr wie createMemory.
    const sani = sanitizeContentArtifact(fields.content)
    sets.push('content = ?'); params.push(validateText(sani.content, { field: 'content', max: CONTENT_MAX }))
    recoveredTags = sani.tags
  }
  if (fields.tags !== undefined) {
    sets.push('tags = ?'); params.push(validateTagsAgainstRegistry(db, projectId, normalizeTags(fields.tags)))
  } else if (recoveredTags !== undefined) {
    // tags nicht explizit gesetzt, aber aus dem content-Artefakt rekonstruiert.
    sets.push('tags = ?'); params.push(validateTagsAgainstRegistry(db, projectId, normalizeTags(recoveredTags)))
  }
  if (fields.importance !== undefined) { sets.push('importance = ?'); params.push(validateImportance(fields.importance)) }
  if (fields.pinned !== undefined) { sets.push('pinned = ?'); params.push(validatePinned(fields.pinned)) }
  if (fields.source_type !== undefined) { sets.push('source_type = ?'); params.push(fields.source_type ?? null) }
  if (fields.source_ref !== undefined) { sets.push('source_ref = ?'); params.push(fields.source_ref ?? null) }
  if (fields.anchor !== undefined) {
    assertGranularity(db)
    const anchor = validateAnchor(fields.anchor)
    assertAnchorFree(db, projectId, anchor, id)
    sets.push('anchor = ?'); params.push(anchor)
  }
  if (fields.stability !== undefined) {
    assertGranularity(db)
    sets.push('stability = ?'); params.push(validateStability(fields.stability))
  }
  if (sets.length === 0) return existing

  sets.push('updated_at = CURRENT_TIMESTAMP')
  params.push(id)
  db.prepare(`UPDATE project_memories SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  return rowById(db, id)
}

export function deleteMemory(db, projectId, id) {
  const existing = getMemory(db, projectId, id)
  if (!existing) {
    throw new ProjectMemoryError('Memory nicht gefunden', { statusCode: 404, code: 'MEMORY_NOT_FOUND' })
  }
  db.prepare(`UPDATE project_memories SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id)
  return { id, project_id: projectId }
}

// MEM-11: addressierbare Row über stabilen Anchor (z.B. D-Code "D01").
export function getMemoryByAnchor(db, projectId, anchor) {
  assertProjectExists(db, projectId)
  if (!hasGranularityCols(db)) return null
  const a = validateAnchor(anchor)
  if (!a) return null
  const row = db.prepare(`
    SELECT ${selectCols(db)} FROM project_memories
    WHERE project_id = ? AND anchor = ? AND deleted_at IS NULL AND superseded_by IS NULL
  `).get(projectId, a)
  return row || null
}

// MEM-11: Section-Patch — aktualisiert NUR die eine Anchor-Row (kein Full-SSTD-Rewrite).
export function patchByAnchor(db, projectId, anchor, fields = {}) {
  const existing = getMemoryByAnchor(db, projectId, anchor)
  if (!existing) {
    throw new ProjectMemoryError(`Kein aktiver Memory-Eintrag mit anchor '${anchor}'`, { statusCode: 404, code: 'ANCHOR_NOT_FOUND', field: 'anchor' })
  }
  return updateMemory(db, projectId, existing.id, fields)
}

// Append-only-Korrektur: neue Row anlegen, alte auf superseded_by zeigen lassen (kein Overwrite).
export function supersedeMemory(db, projectId, id, newFields = {}) {
  const existing = getMemory(db, projectId, id)
  if (!existing) {
    throw new ProjectMemoryError('Memory nicht gefunden', { statusCode: 404, code: 'MEMORY_NOT_FOUND' })
  }
  const merged = {
    category: newFields.category ?? existing.category,
    summary: newFields.summary ?? existing.summary,
    content: newFields.content ?? existing.content,
    tags: newFields.tags ?? existing.tags,
    importance: newFields.importance ?? existing.importance,
    pinned: newFields.pinned ?? existing.pinned,
    source_type: newFields.source_type ?? existing.source_type,
    source_ref: newFields.source_ref ?? existing.source_ref,
  }
  const tx = db.transaction(() => {
    const fresh = createMemory(db, projectId, merged)
    db.prepare(`UPDATE project_memories SET superseded_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(fresh.id, id)
    return fresh
  })
  return tx()
}

export function searchMemories(db, projectId, query, { category, limit = 25 } = {}) {
  assertProjectExists(db, projectId)
  const match = buildMatchQuery(query)
  if (!match) return []
  const clauses = [
    'project_memories_fts MATCH ?',
    'm.project_id = ?',
    'm.deleted_at IS NULL',
    'm.superseded_by IS NULL',
  ]
  const params = [match, projectId]
  if (category !== undefined && category !== null) {
    clauses.push('m.category = ?')
    params.push(validateCategory(category))
  }
  const lim = Number.isInteger(limit) && limit > 0 ? limit : 25
  params.push(lim)
  return db.prepare(`
    SELECT ${selectCols(db, 'm')},
           bm25(project_memories_fts) AS rank
    FROM project_memories_fts
    JOIN project_memories m ON m.id = project_memories_fts.rowid
    WHERE ${clauses.join(' AND ')}
    ORDER BY m.pinned DESC, rank, m.updated_at DESC
    LIMIT ?
  `).all(...params)
}
