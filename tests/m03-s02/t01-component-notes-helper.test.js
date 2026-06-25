import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject, TEST_PROJECT_ID } from '../_fixtures/seed.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'
import {
  listNotes,
  getNote,
  upsertNote,
  deleteNote,
  ComponentNoteError,
} from '../../server/lib/componentNotes.js'

describe('T01 — componentNotes Helper (DD-273 Wiki 40.03)', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-cn-'))
    for (const m of [
      '029_v3_milestone_target_date_required.sql',
      '033_v3_milestone_deferred.sql',
      '038_v3_milestones_status_lifecycle.sql',
      '039_v3_milestones_spec_path.sql',
      '040_v3_component_notes.sql',
    ]) {
      applyMigration(db, m, { logDir })
    }
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('upsertNote legt neuen Eintrag an', () => {
    const note = upsertNote(db, TEST_PROJECT_ID, 'project-home.tabs.overview', '# Titel\nInhalt')
    expect(note.slug).toBe('project-home.tabs.overview')
    expect(note.content).toBe('# Titel\nInhalt')
    expect(note.id).toBeGreaterThan(0)
  })

  test('upsertNote aktualisiert existierenden Eintrag in-place', () => {
    const first = upsertNote(db, TEST_PROJECT_ID, 'foo.bar.baz', 'alt')
    const second = upsertNote(db, TEST_PROJECT_ID, 'foo.bar.baz', 'neu')
    expect(second.id).toBe(first.id)
    expect(second.content).toBe('neu')
  })

  test('getNote returnt null wenn nicht vorhanden', () => {
    expect(getNote(db, TEST_PROJECT_ID, 'gibts.nicht.hier')).toBeNull()
  })

  test('getNote returnt persistierten Eintrag', () => {
    upsertNote(db, TEST_PROJECT_ID, 'a.b.c', 'hallo')
    const note = getNote(db, TEST_PROJECT_ID, 'a.b.c')
    expect(note.content).toBe('hallo')
  })

  test('listNotes ignoriert soft-deleted Einträge', () => {
    upsertNote(db, TEST_PROJECT_ID, 'a.b.c', 'eins')
    upsertNote(db, TEST_PROJECT_ID, 'd.e.f', 'zwei')
    deleteNote(db, TEST_PROJECT_ID, 'd.e.f')
    const list = listNotes(db, TEST_PROJECT_ID)
    expect(list).toHaveLength(1)
    expect(list[0].slug).toBe('a.b.c')
  })

  test('deleteNote macht Slug erneut beschreibbar', () => {
    upsertNote(db, TEST_PROJECT_ID, 'reuse.slot.x', 'alt')
    deleteNote(db, TEST_PROJECT_ID, 'reuse.slot.x')
    const note = upsertNote(db, TEST_PROJECT_ID, 'reuse.slot.x', 'neu')
    expect(note.content).toBe('neu')
  })

  test('deleteNote auf nicht-existenten Slug → 404 Error', () => {
    expect(() => deleteNote(db, TEST_PROJECT_ID, 'nope.x.y')).toThrow(ComponentNoteError)
  })

  test('Slug-Validierung: ungültiges Format wird abgelehnt', () => {
    expect(() => upsertNote(db, TEST_PROJECT_ID, 'INVALID UPPER', 'x')).toThrow(/kebab/i)
    expect(() => upsertNote(db, TEST_PROJECT_ID, '.start-dot', 'x')).toThrow(ComponentNoteError)
    expect(() => upsertNote(db, TEST_PROJECT_ID, 'end-dot.', 'x')).toThrow(ComponentNoteError)
  })

  test('Slug-Validierung: single-char Slug wird abgelehnt (Pattern verlangt ≥2)', () => {
    expect(() => upsertNote(db, TEST_PROJECT_ID, 'a', 'x')).toThrow(/2-200|kebab/i)
    expect(() => upsertNote(db, TEST_PROJECT_ID, '1', 'x')).toThrow(/2-200|kebab/i)
  })

  test('Slug-Validierung: 2-Zeichen-Slug (Minimum) wird akzeptiert', () => {
    expect(() => upsertNote(db, TEST_PROJECT_ID, 'ab', 'x')).not.toThrow()
  })

  test('Slug-Validierung: gültige Dot-Notation wird akzeptiert', () => {
    expect(() => upsertNote(db, TEST_PROJECT_ID, 'a-b.c-d.e-f', 'ok')).not.toThrow()
    expect(() => upsertNote(db, TEST_PROJECT_ID, 'todo-detail-modal.title', 'ok')).not.toThrow()
  })

  test('Content-Limit (16k) wird durchgesetzt', () => {
    const tooLong = 'x'.repeat(16001)
    expect(() => upsertNote(db, TEST_PROJECT_ID, 'over.size.x', tooLong)).toThrow(/max/i)
  })

  test('Project-Existenz wird geprüft', () => {
    expect(() => upsertNote(db, 99999, 'a.b.c', 'x')).toThrow(/Projekt/i)
  })

  test('Cascade-Delete: Project-Delete entfernt Notes', () => {
    upsertNote(db, TEST_PROJECT_ID, 'a.b.c', 'x')
    db.pragma('foreign_keys = ON')
    db.prepare('DELETE FROM projects WHERE id = ?').run(TEST_PROJECT_ID)
    const rows = db.prepare('SELECT * FROM component_notes').all()
    expect(rows).toHaveLength(0)
  })
})
