// MEM-16 (MEM#6): SSTD-Slot-Architektur — SSTD vom TEXT-Blob auf 6 adressierbare Prosa-Slots.
// Lib-Ebene: getSlot/listSlots/setSlot (last-write-wins), Line-Op-Engine (replace/insert/delete
// + optionaler --expect-Guard → 409) und renderReadAll mit ZWEI Projektionen
// (Nächste Schritte ← offene project_todos nach sprint_state; Journal ← letzte 40 session_notes
// am Ende) + Legacy-Fallback auf projects.sstd_content. Decision-Log MEM#6 D01-D07.
// Baut auf Migration 043 (project_sstd_slots), 041/042 (project_memories), 037 (project_todos).

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'
import { createMemory } from '../../server/lib/projectMemories.js'
import { insertTodo } from '../../server/lib/projectTodos.js'
import {
  SLOT_KEYS,
  getSlot,
  listSlots,
  setSlot,
  editSlotLine,
  renderReadAll,
  ProjectSlotError,
} from '../../server/lib/sstdSlots.js'

const PROJECT_ID = 7

describe('MEM-16 — SSTD-Slots: schema + lib + line-ops + read-all', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db, { id: PROJECT_ID, slug: 'memory-system', name: 'Memory System', prefix: 'MEM' })
    logDir = mkdtempSync(join(tmpdir(), 'devd-mem16-'))
    applyMigration(db, '037_v3_project_todos.sql', { logDir })
    applyMigration(db, '041_v3_project_memories.sql', { logDir })
    applyMigration(db, '042_v3_project_memory_anchor_stability.sql', { logDir })
    applyMigration(db, '043_v3_sstd_slots.sql', { logDir })
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('Migration 043 legt project_sstd_slots an; SLOT_KEYS = 6 fixe Keys', () => {
    const cols = db.prepare(`PRAGMA table_info(project_sstd_slots)`).all().map(c => c.name)
    expect(cols).toEqual(expect.arrayContaining(['project_id', 'slot_key', 'content', 'updated_at']))
    expect(SLOT_KEYS).toEqual(['architecture', 'conventions', 'sprint_state', 'roadmap', 'cross_refs', 'misc'])
  })

  test('getSlot liefert lazy leeren Slot, wenn keine Row existiert', () => {
    const slot = getSlot(db, PROJECT_ID, 'architecture')
    expect(slot.slot_key).toBe('architecture')
    expect(slot.content).toBe('')
    expect(slot.updated_at).toBeNull()
  })

  test('listSlots gibt alle 6 Slots in fixer Reihenfolge zurück (auch ungefüllte)', () => {
    setSlot(db, PROJECT_ID, 'roadmap', 'Q3-Ziele')
    const slots = listSlots(db, PROJECT_ID)
    expect(slots.map(s => s.slot_key)).toEqual(SLOT_KEYS)
    expect(slots.find(s => s.slot_key === 'roadmap').content).toBe('Q3-Ziele')
    expect(slots.find(s => s.slot_key === 'architecture').content).toBe('')
  })

  test('setSlot ist last-write-wins (überschreibt bestehenden Inhalt)', () => {
    setSlot(db, PROJECT_ID, 'conventions', 'erste Fassung')
    const updated = setSlot(db, PROJECT_ID, 'conventions', 'zweite Fassung')
    expect(updated.content).toBe('zweite Fassung')
    expect(getSlot(db, PROJECT_ID, 'conventions').content).toBe('zweite Fassung')
  })

  test('ungültiger slot_key wirft ProjectSlotError', () => {
    expect(() => setSlot(db, PROJECT_ID, 'bugs', 'x')).toThrow(ProjectSlotError)
    expect(() => getSlot(db, PROJECT_ID, 'next_steps')).toThrow(ProjectSlotError)
  })

  test('editSlotLine patch ersetzt genau eine Zeile', () => {
    setSlot(db, PROJECT_ID, 'architecture', 'Zeile A\nZeile B\nZeile C')
    const r = editSlotLine(db, PROJECT_ID, 'architecture', { op: 'patch', line: 2, content: 'Zeile B neu' })
    expect(r.content).toBe('Zeile A\nZeile B neu\nZeile C')
  })

  test('editSlotLine --expect-Guard: Mismatch → 409', () => {
    setSlot(db, PROJECT_ID, 'architecture', 'Zeile A\nZeile B')
    try {
      editSlotLine(db, PROJECT_ID, 'architecture', { op: 'patch', line: 2, content: 'x', expect: 'FALSCH' })
      throw new Error('sollte werfen')
    } catch (e) {
      expect(e).toBeInstanceOf(ProjectSlotError)
      expect(e.statusCode).toBe(409)
      expect(e.code).toBe('LINE_EXPECT_MISMATCH')
    }
    // Inhalt bleibt unverändert
    expect(getSlot(db, PROJECT_ID, 'architecture').content).toBe('Zeile A\nZeile B')
  })

  test('editSlotLine --expect-Guard: Match → erlaubt', () => {
    setSlot(db, PROJECT_ID, 'architecture', 'Zeile A\nZeile B')
    const r = editSlotLine(db, PROJECT_ID, 'architecture', { op: 'patch', line: 1, content: 'Zeile A neu', expect: 'Zeile A' })
    expect(r.content).toBe('Zeile A neu\nZeile B')
  })

  test('editSlotLine insert_before fügt mittig ein (schiebt nach unten)', () => {
    setSlot(db, PROJECT_ID, 'roadmap', 'eins\ndrei')
    const r = editSlotLine(db, PROJECT_ID, 'roadmap', { op: 'insert_before', line: 2, content: 'zwei' })
    expect(r.content).toBe('eins\nzwei\ndrei')
  })

  test('editSlotLine insert_before line=len+1 hängt an', () => {
    setSlot(db, PROJECT_ID, 'roadmap', 'eins')
    const r = editSlotLine(db, PROJECT_ID, 'roadmap', { op: 'insert_before', line: 2, content: 'zwei' })
    expect(r.content).toBe('eins\nzwei')
  })

  test('editSlotLine insert_after fügt nach der Anker-Zeile ein', () => {
    setSlot(db, PROJECT_ID, 'roadmap', 'eins\ndrei')
    const r = editSlotLine(db, PROJECT_ID, 'roadmap', { op: 'insert_after', line: 1, content: 'zwei' })
    expect(r.content).toBe('eins\nzwei\ndrei')
  })

  test('editSlotLine insert_after line=0 stellt voran', () => {
    setSlot(db, PROJECT_ID, 'roadmap', 'eins')
    const r = editSlotLine(db, PROJECT_ID, 'roadmap', { op: 'insert_after', line: 0, content: 'null' })
    expect(r.content).toBe('null\neins')
  })

  test('editSlotLine delete entfernt eine Zeile', () => {
    setSlot(db, PROJECT_ID, 'roadmap', 'eins\nzwei\ndrei')
    const r = editSlotLine(db, PROJECT_ID, 'roadmap', { op: 'delete', line: 2 })
    expect(r.content).toBe('eins\ndrei')
  })

  test('editSlotLine out-of-range → 400 LINE_OUT_OF_RANGE', () => {
    setSlot(db, PROJECT_ID, 'roadmap', 'eins')
    try {
      editSlotLine(db, PROJECT_ID, 'roadmap', { op: 'patch', line: 5, content: 'x' })
      throw new Error('sollte werfen')
    } catch (e) {
      expect(e).toBeInstanceOf(ProjectSlotError)
      expect(e.statusCode).toBe(400)
      expect(e.code).toBe('LINE_OUT_OF_RANGE')
    }
  })

  test('editSlotLine ungültige op → 400 OP_INVALID', () => {
    setSlot(db, PROJECT_ID, 'roadmap', 'eins')
    expect(() => editSlotLine(db, PROJECT_ID, 'roadmap', { op: 'frobnicate', line: 1, content: 'x' }))
      .toThrow(ProjectSlotError)
  })

  test('renderReadAll enthält alle 6 Slot-Überschriften in fixer Reihenfolge', () => {
    setSlot(db, PROJECT_ID, 'architecture', 'Express + SQLite')
    setSlot(db, PROJECT_ID, 'conventions', 'Catppuccin-Tokens')
    const md = renderReadAll(db, PROJECT_ID)
    const iArch = md.indexOf('Architektur')
    const iConv = md.indexOf('Konventionen')
    const iSprint = md.indexOf('Sprintlage')
    const iRoad = md.indexOf('Roadmap')
    expect(iArch).toBeGreaterThanOrEqual(0)
    expect(iArch).toBeLessThan(iConv)
    expect(iConv).toBeLessThan(iSprint)
    expect(iSprint).toBeLessThan(iRoad)
    expect(md).toContain('Express + SQLite')
  })

  test('renderReadAll projiziert offene ToDos als "Nächste Schritte" nach Sprintlage, vor Roadmap', () => {
    setSlot(db, PROJECT_ID, 'sprint_state', 'Sprint MEM#6 aktiv')
    setSlot(db, PROJECT_ID, 'roadmap', 'Q3')
    insertTodo(db, PROJECT_ID, { label: 'MEM-16 bauen' })
    insertTodo(db, PROJECT_ID, { label: 'Board-Review', status: 'done' }) // darf NICHT erscheinen
    const md = renderReadAll(db, PROJECT_ID)
    expect(md).toContain('Nächste Schritte')
    expect(md).toContain('MEM-16 bauen')
    expect(md).not.toContain('Board-Review')
    const iSprint = md.indexOf('Sprintlage')
    const iNext = md.indexOf('Nächste Schritte')
    const iRoad = md.indexOf('Roadmap')
    expect(iSprint).toBeLessThan(iNext)
    expect(iNext).toBeLessThan(iRoad)
  })

  test('renderReadAll projiziert session_notes als "Journal" am Ende', () => {
    setSlot(db, PROJECT_ID, 'architecture', 'Kopf')
    createMemory(db, PROJECT_ID, { category: 'session_note', summary: 'Heute MEM-16 begonnen' })
    const md = renderReadAll(db, PROJECT_ID)
    expect(md).toContain('Journal')
    expect(md).toContain('Heute MEM-16 begonnen')
    expect(md.indexOf('Journal')).toBeGreaterThan(md.indexOf('Architektur'))
  })

  test('renderReadAll: Journal begrenzt auf 40 Einträge', () => {
    for (let i = 1; i <= 45; i++) {
      createMemory(db, PROJECT_ID, { category: 'session_note', summary: `Eintrag ${i}` })
    }
    const md = renderReadAll(db, PROJECT_ID)
    const count = (md.match(/Eintrag \d+/g) || []).length
    expect(count).toBe(40)
  })

  test('renderReadAll: Legacy-Fallback gibt sstd_content zurück, solange alle Slots leer sind', () => {
    db.prepare('UPDATE projects SET sstd_content = ? WHERE id = ?').run('# Alte SSTD\n\nLegacy-Blob', PROJECT_ID)
    const md = renderReadAll(db, PROJECT_ID)
    expect(md).toBe('# Alte SSTD\n\nLegacy-Blob')
  })

  test('renderReadAll: sobald ein Slot befüllt ist, wird NICHT mehr der Legacy-Blob genutzt', () => {
    db.prepare('UPDATE projects SET sstd_content = ? WHERE id = ?').run('LEGACY', PROJECT_ID)
    setSlot(db, PROJECT_ID, 'architecture', 'Neuer Slot-Inhalt')
    const md = renderReadAll(db, PROJECT_ID)
    expect(md).not.toContain('LEGACY')
    expect(md).toContain('Neuer Slot-Inhalt')
  })
})
