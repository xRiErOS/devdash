import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb, appliedMigrations } from '../_fixtures/in-memory-db.js'
import { seedProject, TEST_PROJECT_ID } from '../_fixtures/seed.js'
import { applyMigration } from '../../apps/backend/src/lib/migrationRunner.js'

const MIG_065 = '065_v3_dd2_19_memory_categories.sql'

// DD2-19: MEMORY_CATEGORIES +knowledge, session_note -> session_log.
describe('DD2-19 — Migration 065 memory categories', () => {
  let db
  let logDir

  beforeEach(() => {
    // Voller Schemastand bis 064 (enthält 041 project_memories).
    db = createTestDb({ upToVersion: '064_v3_dd2_131_drop_backlog_description.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-m065-'))
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  function insertMemory(category, summary, extra = {}) {
    const r = db.prepare(`
      INSERT INTO project_memories (project_id, category, summary, content, tags, superseded_by, anchor, stability)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(TEST_PROJECT_ID, category, summary, extra.content ?? '', extra.tags ?? '',
      extra.superseded_by ?? null, extra.anchor ?? null, extra.stability ?? 'volatile')
    return Number(r.lastInsertRowid)
  }

  test('vor 065: session_note gültig, session_log + knowledge vom CHECK abgelehnt', () => {
    expect(() => insertMemory('session_note', 'altes Journal')).not.toThrow()
    expect(() => insertMemory('session_log', 'darf noch nicht')).toThrow()
    expect(() => insertMemory('knowledge', 'darf noch nicht')).toThrow()
  })

  test('065 migriert session_note -> session_log, erhält Daten + superseded-Kette', () => {
    const oldId = insertMemory('session_note', 'Logbuch-Eintrag', { content: 'Detail ÄÖÜ', tags: 'sprint' })
    const supId = insertMemory('session_note', 'neuere Version')
    // alten Eintrag durch neueren ersetzen (self-FK)
    db.prepare('UPDATE project_memories SET superseded_by = ? WHERE id = ?').run(supId, oldId)
    const archId = insertMemory('architecture_decision', 'unverändert')

    applyMigration(db, MIG_065, { logDir })
    expect(appliedMigrations(db)).toContain(MIG_065)

    const rows = db.prepare('SELECT id, category, summary, content, superseded_by FROM project_memories ORDER BY id').all()
    expect(rows.find(r => r.id === oldId)).toMatchObject({ category: 'session_log', content: 'Detail ÄÖÜ', superseded_by: supId })
    expect(rows.find(r => r.id === supId)).toMatchObject({ category: 'session_log' })
    expect(rows.find(r => r.id === archId)).toMatchObject({ category: 'architecture_decision' })

    // FK-Integrität sauber
    expect(db.prepare('PRAGMA foreign_key_check').all()).toHaveLength(0)
  })

  test('065 erhält anchor + stability (042-Spalten) + anchor-unique-Index', () => {
    const id = insertMemory('architecture_decision', 'D01-Regel', { anchor: 'D01', stability: 'stable' })
    applyMigration(db, MIG_065, { logDir })

    const row = db.prepare('SELECT anchor, stability FROM project_memories WHERE id = ?').get(id)
    expect(row).toMatchObject({ anchor: 'D01', stability: 'stable' })

    // Anchor-unique-Index aus 042 muss nach dem Recreate wieder greifen.
    const idx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_project_memories_anchor_active'").all()
    expect(idx).toHaveLength(1)
    expect(() => insertMemory('convention', 'Duplikat-Anchor', { anchor: 'D01', stability: 'stable' })).toThrow()
  })

  test('nach 065: knowledge + session_log gültig, session_note abgelehnt', () => {
    applyMigration(db, MIG_065, { logDir })
    expect(() => insertMemory('knowledge', 'generisches Wissen')).not.toThrow()
    expect(() => insertMemory('session_log', 'KI-Logbuch')).not.toThrow()
    expect(() => insertMemory('session_note', 'alter Name tot')).toThrow()
  })

  test('nach 065: FTS-Suche funktioniert weiter (Trigger + rebuild)', () => {
    const id = insertMemory('session_note', 'Suchbarer Begriff Xylophon')
    applyMigration(db, MIG_065, { logDir })
    // Trigger auf neuer Tabelle: neue Zeile muss indexiert werden
    const id2 = insertMemory('knowledge', 'Frisches Wissen Zeppelin')
    const hitOld = db.prepare("SELECT rowid FROM project_memories_fts WHERE project_memories_fts MATCH 'Xylophon'").all()
    const hitNew = db.prepare("SELECT rowid FROM project_memories_fts WHERE project_memories_fts MATCH 'Zeppelin'").all()
    expect(hitOld.map(r => r.rowid)).toContain(id)
    expect(hitNew.map(r => r.rowid)).toContain(id2)
  })
})
