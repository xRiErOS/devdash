// MEM-16 (MEM#6): SSTD-Slot-Architektur — SSTD vom TEXT-Blob (projects.sstd_content) auf
// 6 adressierbare Prosa-Slots. Ermöglicht gezielte Per-Slot/Per-Line-Updates statt Whole-Rewrite
// (Token-Ersparnis beim Generieren UND Lesen). Pure Funktionen ohne Express-Abhängigkeit.
// Reuse-Pattern aus projectMemories.js (Fehlerklasse, Validierung, lazy-default).
//
// Daten: project_sstd_slots (Migration 043). Slots werden lazy behandelt — fehlt eine Row,
// gilt der Slot als leer (''). renderReadAll reassembliert die 6 Slots + ZWEI Projektionen
// (Nächste Schritte ← offene project_todos; Journal ← letzte 40 session_note-Memories) und
// fällt auf projects.sstd_content (Legacy-Blob) zurück, solange alle Slots leer sind.

import { listMemories } from './projectMemories.js'
import { listTodos } from './projectTodos.js'
// DD-564: SLOT_KEYS + SLOT_LINE_OPS aus dem geteilten Zod-Contract (Single Source mit
// CLI + MCP-Spiegel). Die werfende Validierung + Messages bleiben hier in der Lib.
import { SLOT_KEYS as CONTRACT_SLOT_KEYS, SLOT_LINE_OPS as CONTRACT_SLOT_LINE_OPS } from '@devd/api-types/sstd.contracts.js'

// D02-rev3: 6 fixe Prosa-Slots. next_steps ist KEIN Slot (Projektion offener ToDos),
// Journal ist KEIN Slot (Projektion von session_note-Memories).
// DD-564: Werte aus dem Contract gesourct (Reihenfolge load-bearing für die
// `slot_key muss einer von: …`-Message), hier eingefroren für die bestehende Export-Form.
export const SLOT_KEYS = Object.freeze([...CONTRACT_SLOT_KEYS])

export const SLOT_TITLES = Object.freeze({
  architecture: 'Architektur',
  conventions: 'Konventionen',
  sprint_state: 'Sprintlage',
  roadmap: 'Roadmap',
  cross_refs: 'Cross-Refs',
  misc: 'Sonstiges',
})

// Read-All-Projektionen (D02-rev3 / D03-rev): Reihenfolge im Gesamtdokument.
export const PROJECTION_TITLES = Object.freeze({
  next_steps: 'Nächste Schritte',
  journal: 'Journal',
})

export const CONTENT_MAX = 64000
export const JOURNAL_LIMIT = 40

// D04/D06: Line-Op-Vokabular (mit MEM-16-AC abgeglichen, gespiegelt von CLI MEM-17 + MCP MEM-18).
// DD-564: aus dem geteilten Contract gesourct (Reihenfolge load-bearing für die
// `op muss einer von: …`-Message), hier eingefroren.
const OPS = Object.freeze([...CONTRACT_SLOT_LINE_OPS])

export class ProjectSlotError extends Error {
  constructor(message, { statusCode = 400, code, field } = {}) {
    super(message)
    this.name = 'ProjectSlotError'
    this.statusCode = statusCode
    this.code = code
    this.field = field
  }
}

function assertProjectExists(db, projectId) {
  const exists = db.prepare('SELECT 1 FROM projects WHERE id = ?').get(projectId)
  if (!exists) {
    throw new ProjectSlotError('Projekt existiert nicht', { statusCode: 404, code: 'PROJECT_NOT_FOUND' })
  }
}

function validateSlotKey(raw) {
  if (!SLOT_KEYS.includes(raw)) {
    throw new ProjectSlotError(
      `slot_key muss einer von: ${SLOT_KEYS.join(', ')}`,
      { code: 'SLOT_KEY_INVALID', field: 'slot_key' }
    )
  }
  return raw
}

function validateContent(raw) {
  if (raw === undefined || raw === null) return ''
  if (typeof raw !== 'string') {
    throw new ProjectSlotError('content muss ein String sein', { code: 'CONTENT_TYPE', field: 'content' })
  }
  if (raw.length > CONTENT_MAX) {
    throw new ProjectSlotError(`content darf max ${CONTENT_MAX} Zeichen lang sein`, { code: 'CONTENT_TOO_LONG', field: 'content' })
  }
  return raw
}

// content '' → 0 Zeilen (kein Phantom-Leerzeile), sonst Split an '\n'.
function toLines(content) {
  return content === '' ? [] : content.split('\n')
}

export function getSlot(db, projectId, slotKey) {
  assertProjectExists(db, projectId)
  validateSlotKey(slotKey)
  const row = db.prepare(
    'SELECT slot_key, content, updated_at FROM project_sstd_slots WHERE project_id = ? AND slot_key = ?'
  ).get(projectId, slotKey)
  return row || { slot_key: slotKey, content: '', updated_at: null }
}

export function listSlots(db, projectId) {
  assertProjectExists(db, projectId)
  const rows = db.prepare(
    'SELECT slot_key, content, updated_at FROM project_sstd_slots WHERE project_id = ?'
  ).all(projectId)
  const byKey = new Map(rows.map(r => [r.slot_key, r]))
  // Immer alle 6 Slots in fixer Reihenfolge (auch ungefüllte → leer).
  return SLOT_KEYS.map(key => byKey.get(key) || { slot_key: key, content: '', updated_at: null })
}

// Upsert, last-write-wins (D-Anforderung: Slot komplett neu schreiben).
export function setSlot(db, projectId, slotKey, content) {
  assertProjectExists(db, projectId)
  validateSlotKey(slotKey)
  const value = validateContent(content)
  db.prepare(`
    INSERT INTO project_sstd_slots (project_id, slot_key, content, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(project_id, slot_key)
    DO UPDATE SET content = excluded.content, updated_at = datetime('now')
  `).run(projectId, slotKey, value)
  return getSlot(db, projectId, slotKey)
}

// Line-Op-Engine (D04/D06): EIN parametrisiertes Verb. line ist 1-basiert (Anker-Zeile).
//   patch          → ersetzt Zeile `line`              (1..len)
//   delete         → entfernt Zeile `line`             (1..len)
//   insert_before  → neue Zeile WIRD Zeile `line`      (1..len+1; len+1 hängt an)
//   insert_after   → neue Zeile NACH Zeile `line`      (0..len; 0 stellt voran)
// expect (optional): Inhalt der Anker-Zeile muss matchen, sonst 409 (kein Write).
//   Bei Rand-Ops ohne Anker (insert_before len+1 / insert_after 0) muss expect leer/ungesetzt sein.
export function editSlotLine(db, projectId, slotKey, { op, line, content = '', expect } = {}) {
  assertProjectExists(db, projectId)
  validateSlotKey(slotKey)
  if (!OPS.includes(op)) {
    throw new ProjectSlotError(`op muss einer von: ${OPS.join(', ')}`, { code: 'OP_INVALID', field: 'op' })
  }
  const n = Number(line)
  const minLine = op === 'insert_after' ? 0 : 1
  if (!Number.isInteger(n) || n < minLine) {
    throw new ProjectSlotError(`line muss eine Ganzzahl >= ${minLine} sein`, { code: 'LINE_INVALID', field: 'line' })
  }

  const lines = toLines(getSlot(db, projectId, slotKey).content)
  // Erlaubter Höchstwert je Op: patch/delete brauchen existierende Zeile; insert darf an die Grenze.
  const maxLine = (op === 'insert_before') ? lines.length + 1
    : (op === 'insert_after') ? lines.length
    : lines.length
  if (n > maxLine || (minLine === 1 && lines.length === 0)) {
    throw new ProjectSlotError(
      `line ${n} außerhalb des Bereichs (Slot hat ${lines.length} Zeilen)`,
      { statusCode: 400, code: 'LINE_OUT_OF_RANGE', field: 'line' }
    )
  }

  if (expect !== undefined && expect !== null) {
    // Anker-Zeile: bei patch/delete/insert_before = lines[n-1]; bei insert_after = lines[n-1] (n>=1).
    const anchorIdx = op === 'insert_after' ? n - 1 : n - 1
    const current = (anchorIdx >= 0 ? lines[anchorIdx] : undefined) ?? ''
    if (current !== expect) {
      throw new ProjectSlotError(
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

  return setSlot(db, projectId, slotKey, lines.join('\n'))
}

function legacySstdContent(db, projectId) {
  const row = db.prepare('SELECT sstd_content FROM projects WHERE id = ?').get(projectId)
  return row && row.sstd_content ? row.sstd_content : null
}

export function renderNextSteps(db, projectId) {
  const todos = listTodos(db, projectId, { status: 'open' })
  if (todos.length === 0) return null
  const lines = [`## ${PROJECTION_TITLES.next_steps}`, '']
  for (const t of todos) lines.push(`- ${t.label}`)
  return lines.join('\n')
}

export function renderJournal(db, projectId) {
  const notes = listMemories(db, projectId, { category: 'session_note' }).slice(0, JOURNAL_LIMIT)
  if (notes.length === 0) return null
  const lines = [`## ${PROJECTION_TITLES.journal}`, '']
  for (const m of notes) lines.push(`- ${m.summary}`)
  return lines.join('\n')
}

// Reassembliert die 6 Slots + 2 Projektionen zum vollständigen SSTD-Markdown.
// Reihenfolge: architecture, conventions, sprint_state, [Nächste Schritte], roadmap,
// cross_refs, misc, [Journal]. Legacy-Fallback: solange alle Slots leer sind → sstd_content.
export function renderReadAll(db, projectId) {
  assertProjectExists(db, projectId)
  const slots = listSlots(db, projectId)
  const anyContent = slots.some(s => s.content.trim() !== '')
  if (!anyContent) {
    const legacy = legacySstdContent(db, projectId)
    if (legacy) return legacy
  }

  const slotByKey = new Map(slots.map(s => [s.slot_key, s]))
  const sections = []
  for (const key of SLOT_KEYS) {
    const slot = slotByKey.get(key)
    const block = [`## ${SLOT_TITLES[key]}`]
    if (slot.content.trim() !== '') block.push('', slot.content.trim())
    sections.push(block.join('\n'))
    // Nächste-Schritte-Projektion direkt nach sprint_state einfügen.
    if (key === 'sprint_state') {
      const nextSteps = renderNextSteps(db, projectId)
      if (nextSteps) sections.push(nextSteps)
    }
  }
  const journal = renderJournal(db, projectId)
  if (journal) sections.push(journal)

  return sections.join('\n\n').trim()
}
