// MEM-23 (MEM#8): SOP-Entität — SOPs als DevDashboard-Entität in der DB (global, SOP-D02).
// Pure Funktionen ohne Express-Abhängigkeit. Reuse-Pattern aus projectMemories.js
// (Fehlerklasse mit statusCode/code/field). Daten: sops + sop_triggers (Migration 044).
//
// SOP-D01 DB-Master (DB ist die Schreib-/Lesequelle), SOP-D02 nur global (KEIN project_id),
// SOP-D03 Trigger-Map in der DB (Lifecycle-Aktion → SOP-Rows). Der Vault-Import (Cutover) ist
// ein Einmal-/Re-Run-Upsert; danach ist die DB Master, Vault-SOPs read-only.

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export const SOP_KEY_RE = /^[a-z0-9-]+$/
export const CONTENT_MAX = 200000
export const TITLE_MAX = 200

// Cutover-Mapping: Vault-Dateiname → stabiler sop_key (Acceptance MEM-23).
// Die ersten 7 sind die in der Acceptance geforderten Keys; sstd-slots-befuellen ist additiv
// (existiert seit MEM#6 als reale SOP) und schadet nicht — Import überspringt fehlende Dateien.
export const SOP_FILES = Object.freeze({
  'SOP - Sprint Durchfuehrung.md': 'sprint-durchfuehrung',
  'SOP - Sprintplanung.md': 'sprintplanung',
  'SOP - Issues erfassen.md': 'issues-erfassen',
  'SOP - Issue Refinement.md': 'issue-refinement',
  'SOP - Issue ad hoc bearbeiten.md': 'issue-ad-hoc',
  'SOP - Set-Up starten.md': 'set-up-starten',
  'SOP - User-Input-Datei anlegen.md': 'user-input-datei',
  'SOP - SSTD-Slots befüllen (Population-Prompt).md': 'sstd-slots-befuellen',
})

// Trigger-Defaults gemäß Bestand SOP_TRIGGERS (bin/devd-cli.js:71), normalisiert auf sop_keys.
// position = Reihenfolge im Bundle. issue:create = erst Erfassen, dann Refinement (logische Folge).
export const DEFAULT_TRIGGERS = Object.freeze({
  'sprint:start': ['sprint-durchfuehrung'],
  'sprint:create': ['sprintplanung'],
  'issue:create': ['issues-erfassen', 'issue-refinement'],
})

export class SopError extends Error {
  constructor(message, { statusCode = 400, code, field } = {}) {
    super(message)
    this.name = 'SopError'
    this.statusCode = statusCode
    this.code = code
    this.field = field
  }
}

function validateSopKey(raw) {
  if (typeof raw !== 'string' || !SOP_KEY_RE.test(raw)) {
    throw new SopError('sop_key muss aus [a-z0-9-] bestehen', { code: 'SOP_KEY_INVALID', field: 'sop_key' })
  }
  return raw
}

function validateTitle(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new SopError('title darf nicht leer sein', { code: 'TITLE_REQUIRED', field: 'title' })
  }
  if (raw.length > TITLE_MAX) {
    throw new SopError(`title darf max ${TITLE_MAX} Zeichen lang sein`, { code: 'TITLE_TOO_LONG', field: 'title' })
  }
  return raw
}

function validateContent(raw) {
  if (raw === undefined || raw === null) return ''
  if (typeof raw !== 'string') {
    throw new SopError('content muss ein String sein', { code: 'CONTENT_TYPE', field: 'content' })
  }
  if (raw.length > CONTENT_MAX) {
    throw new SopError(`content darf max ${CONTENT_MAX} Zeichen lang sein`, { code: 'CONTENT_TOO_LONG', field: 'content' })
  }
  return raw
}

export function getSop(db, sopKey) {
  const row = db.prepare(
    'SELECT id, sop_key, title, content, source_path, created_at, updated_at FROM sops WHERE sop_key = ?'
  ).get(sopKey)
  if (!row) {
    throw new SopError(`SOP '${sopKey}' nicht gefunden`, { statusCode: 404, code: 'SOP_NOT_FOUND', field: 'sop_key' })
  }
  return row
}

// Liste = Metadaten ohne content (bandbreitenschonend). Voll-Inhalt via getSop / getSopsByTrigger.
export function listSops(db) {
  return db.prepare(
    'SELECT id, sop_key, title, source_path, created_at, updated_at FROM sops ORDER BY sop_key'
  ).all()
}

// Upsert nach sop_key (insert-or-update). Idempotent — Re-Run aktualisiert content/title/source_path.
export function upsertSop(db, { sop_key, title, content = '', source_path = null } = {}) {
  validateSopKey(sop_key)
  validateTitle(title)
  const value = validateContent(content)
  db.prepare(`
    INSERT INTO sops (sop_key, title, content, source_path, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(sop_key) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      source_path = excluded.source_path,
      updated_at = datetime('now')
  `).run(sop_key, title, value, source_path)
  return getSop(db, sop_key)
}

// PUT-Schreibpfad (DB-Master-Edit): erfordert existierende SOP (404 sonst). Setzt title und/oder content.
export function editSop(db, sopKey, { title, content } = {}) {
  getSop(db, sopKey) // wirft 404 wenn fehlt
  const sets = []
  const vals = []
  if (title !== undefined) { validateTitle(title); sets.push('title = ?'); vals.push(title) }
  if (content !== undefined) { validateContent(content); sets.push('content = ?'); vals.push(content) }
  if (sets.length === 0) return getSop(db, sopKey)
  sets.push("updated_at = datetime('now')")
  vals.push(sopKey)
  db.prepare(`UPDATE sops SET ${sets.join(', ')} WHERE sop_key = ?`).run(...vals)
  return getSop(db, sopKey)
}

// DD-530: token-effizienter Zeilen-Patch auf dem SOP-content.
// Statt den ganzen (bis 200k) content per PUT zurückzuschreiben, adressiert dies eine einzelne
// Zeile. op patch|delete brauchen eine existierende Zeile; insert_before/after fügen relativ ein.
// expect guarded die Anker-Zeile → 409 bei Mismatch (kein Write), genau wie das SSTD-Slot-Modell.
export const SOP_LINE_OPS = ['patch', 'insert_after', 'insert_before', 'delete']

function toSopLines(content) {
  return String(content ?? '').split('\n')
}

export function editSopLine(db, sopKey, { op, line, content = '', expect } = {}) {
  validateSopKey(sopKey)
  if (!SOP_LINE_OPS.includes(op)) {
    throw new SopError(`op muss einer von: ${SOP_LINE_OPS.join(', ')}`, { code: 'OP_INVALID', field: 'op' })
  }
  const n = Number(line)
  const minLine = op === 'insert_after' ? 0 : 1
  if (!Number.isInteger(n) || n < minLine) {
    throw new SopError(`line muss eine Ganzzahl >= ${minLine} sein`, { code: 'LINE_INVALID', field: 'line' })
  }
  const sop = getSop(db, sopKey) // wirft 404 wenn fehlt
  const lines = toSopLines(sop.content)
  const maxLine = (op === 'insert_before') ? lines.length + 1
    : (op === 'insert_after') ? lines.length
    : lines.length
  if (n > maxLine || (minLine === 1 && lines.length === 0)) {
    throw new SopError(
      `line ${n} außerhalb des Bereichs (SOP hat ${lines.length} Zeilen)`,
      { statusCode: 400, code: 'LINE_OUT_OF_RANGE', field: 'line' }
    )
  }
  if (expect !== undefined && expect !== null) {
    const current = (n - 1 >= 0 ? lines[n - 1] : undefined) ?? ''
    if (current !== expect) {
      throw new SopError(
        `Zeile ${n} entspricht nicht dem erwarteten Inhalt (--expect)`,
        { statusCode: 409, code: 'LINE_EXPECT_MISMATCH', field: 'expect' }
      )
    }
  }
  const value = validateContent(content)
  if (op === 'patch') lines[n - 1] = value
  else if (op === 'delete') lines.splice(n - 1, 1)
  else if (op === 'insert_before') lines.splice(n - 1, 0, value)
  else if (op === 'insert_after') lines.splice(n, 0, value)
  return editSop(db, sopKey, { content: lines.join('\n') })
}

// Trigger-Resolution (SOP-D03): getriggerte SOP-Rows (mit content) für eine Lifecycle-Aktion,
// geordnet via position. Quelle für das MEM-24-Bundle. Leeres Array, wenn kein Trigger gemappt.
export function getSopsByTrigger(db, triggerKey) {
  return db.prepare(`
    SELECT s.id, s.sop_key, s.title, s.content, t.position
    FROM sop_triggers t
    JOIN sops s ON s.id = t.sop_id
    WHERE t.trigger_key = ?
    ORDER BY t.position, s.sop_key
  `).all(triggerKey)
}

// Trigger setzen/aktualisieren (idempotent via UNIQUE(trigger_key, sop_id)).
export function setTrigger(db, triggerKey, sopKey, position = 0) {
  if (typeof triggerKey !== 'string' || triggerKey.trim() === '') {
    throw new SopError('trigger_key darf nicht leer sein', { code: 'TRIGGER_KEY_REQUIRED', field: 'trigger_key' })
  }
  const sop = db.prepare('SELECT id FROM sops WHERE sop_key = ?').get(sopKey)
  if (!sop) {
    throw new SopError(`SOP '${sopKey}' nicht gefunden`, { statusCode: 404, code: 'SOP_NOT_FOUND', field: 'sop_key' })
  }
  db.prepare(`
    INSERT INTO sop_triggers (trigger_key, sop_id, position)
    VALUES (?, ?, ?)
    ON CONFLICT(trigger_key, sop_id) DO UPDATE SET position = excluded.position
  `).run(triggerKey, sop.id, position)
}

// Einmal-Import (Cutover) + Re-Run: liest Vault-SOPs aus `dir`, upsertet sie und seedet die
// Trigger-Map. Idempotent: zweiter Lauf überschreibt content statt zu duplizieren. Fehlende Dateien
// werden übersprungen (kein Fehler). Reine fs-Funktion → testbar gegen ein Fixture-Verzeichnis.
export function importSopsFromDir(db, dir, { files = SOP_FILES, triggers = DEFAULT_TRIGGERS } = {}) {
  const imported = []
  for (const [file, key] of Object.entries(files)) {
    const full = join(dir, file)
    if (!existsSync(full)) continue
    const content = readFileSync(full, 'utf8')
    const title = file.replace(/\.md$/, '')
    upsertSop(db, { sop_key: key, title, content, source_path: file })
    imported.push(key)
  }
  for (const [triggerKey, keys] of Object.entries(triggers)) {
    keys.forEach((key, i) => {
      const exists = db.prepare('SELECT 1 FROM sops WHERE sop_key = ?').get(key)
      if (exists) setTrigger(db, triggerKey, key, i)
    })
  }
  return { imported, triggers: Object.keys(triggers) }
}
