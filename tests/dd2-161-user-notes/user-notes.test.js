// DD2-161 (ehem. ProjectPages T-be1): user_notes als separate Rich-Entity (vormals session_notes).
// NICHT Ersatz des SSTD-Auto-Logbuchs (das bleibt project_memories cat=session_log, DD2-19) —
// eigene Tabelle für user-verfasste Notizen (title/details≤500/pr_url/sprints[]/issues[]),
// speist UserNotesWidget. Tabelle war leer → reiner Rename (Migration 066, DROP+CREATE).
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import {
  createUserNote, listUserNotes, getUserNote, updateUserNote, deleteUserNote,
  UserNoteError, USER_NOTE_STATUS,
} from '../../apps/backend/src/lib/userNotes.js'

describe('DD2-161 — user_notes (Rename von session_notes)', () => {
  let db
  beforeEach(() => {
    // DD2-168 Rework: Pin auf Migration 070 (status-Spalte) statt 066.
    db = createTestDb({ upToVersion: '070_v3_dd2_167_doc_note_status.sql' })
    seedProject(db) // id=2
  })
  afterEach(() => db.close())

  test('Migration 066: user_notes existiert, session_notes ist weg', () => {
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('user_notes','session_notes')`).all().map(r => r.name)
    expect(tables).toContain('user_notes')
    expect(tables).not.toContain('session_notes')
  })

  test('create + get: Felder + Arrays round-trip', () => {
    const n = createUserNote(db, 2, {
      title: 'S2 TodoWidget realisiert', details: 'Body', pr_url: 'https://x/pull/148',
      sprints: ['DD2#22'], issues: ['DD2-161', 'GF-433'],
    })
    expect(n.id).toBeGreaterThan(0)
    const got = getUserNote(db, 2, n.id)
    expect(got).toMatchObject({
      title: 'S2 TodoWidget realisiert', details: 'Body', pr_url: 'https://x/pull/148',
    })
    expect(got.sprints).toEqual(['DD2#22'])
    expect(got.issues).toEqual(['DD2-161', 'GF-433'])
  })

  test('Defaults: details/sprints/issues optional', () => {
    const n = createUserNote(db, 2, { title: 'Nur Titel' })
    const got = getUserNote(db, 2, n.id)
    expect(got.details).toBe('')
    expect(got.pr_url).toBeNull()
    expect(got.sprints).toEqual([])
    expect(got.issues).toEqual([])
  })

  test('list: neueste zuerst, project-scoped', () => {
    const other = seedProject(db, { id: 3, slug: 'mybaby', name: 'MBT', prefix: 'MBT' })
    createUserNote(db, other, { title: 'fremd' })
    createUserNote(db, 2, { title: 'A' })
    createUserNote(db, 2, { title: 'B' })
    const rows = listUserNotes(db, 2)
    expect(rows.map(r => r.title)).toEqual(['B', 'A']) // DESC by id
  })

  test('list mit search → FTS über title+details', () => {
    createUserNote(db, 2, { title: 'TodoWidget realisiert', details: 'x' })
    createUserNote(db, 2, { title: 'Anderes', details: 'enthält todowidget im body' })
    createUserNote(db, 2, { title: 'Irrelevant', details: 'nichts' })
    const hits = listUserNotes(db, 2, { search: 'todowidget' })
    expect(hits.length).toBe(2)
  })

  test('update: Teil-Patch + Array-Update', () => {
    const n = createUserNote(db, 2, { title: 'alt', issues: ['DD2-1'] })
    const up = updateUserNote(db, 2, n.id, { title: 'neu', issues: ['DD2-2', 'DD2-3'] })
    expect(up.title).toBe('neu')
    expect(up.issues).toEqual(['DD2-2', 'DD2-3'])
    expect(getUserNote(db, 2, n.id).title).toBe('neu')
  })

  test('delete entfernt; get → null', () => {
    const n = createUserNote(db, 2, { title: 'weg' })
    expect(deleteUserNote(db, 2, n.id)).toBe(true)
    expect(getUserNote(db, 2, n.id)).toBeNull()
  })

  test('project-scope: get/update/delete fremder Note schlägt fehl bzw. null', () => {
    const other = seedProject(db, { id: 3, slug: 'mybaby', name: 'MBT', prefix: 'MBT' })
    const n = createUserNote(db, other, { title: 'fremd' })
    expect(getUserNote(db, 2, n.id)).toBeNull()
    expect(deleteUserNote(db, 2, n.id)).toBe(false)
  })

  test('Validierung: title Pflicht, details ≤500', () => {
    expect(() => createUserNote(db, 2, { title: '' })).toThrow()
    expect(() => createUserNote(db, 2, { title: 'ok', details: 'x'.repeat(501) })).toThrow()
    expect(() => createUserNote(db, 2, { title: 'ok', sprints: 'nope' })).toThrow()
  })

  // DD2-168 Rework: status-Lifecycle (Migration 070).
  test('status: Default active, setzen + patchen, Whitelist erzwungen', () => {
    expect(createUserNote(db, 2, { title: 'def' }).status).toBe('active')
    const d = createUserNote(db, 2, { title: 'd', status: 'draft' })
    expect(d.status).toBe('draft')
    expect(updateUserNote(db, 2, d.id, { status: 'archived' }).status).toBe('archived')
    expect(() => createUserNote(db, 2, { title: 'x', status: 'bogus' })).toThrow(UserNoteError)
    expect(USER_NOTE_STATUS).toEqual(['draft', 'active', 'archived'])
  })
})
