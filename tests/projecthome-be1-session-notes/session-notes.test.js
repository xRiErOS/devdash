// ProjectPages T-be1 (D-D, Modell B): session_notes als NEUE separate Rich-Entity.
// NICHT Ersatz des SSTD-Auto-Journals (das bleibt project_memories cat=session_note) —
// eigene Tabelle für user-verfasste Notizen (title/details≤500/pr_url/sprints[]/issues[]),
// speist SessionNotesWidget (S2). Kein Daten-Move, kein Journal-Rewiring (PO-Entscheidung B).
// Lib gegen createTestDb mit Migration 062 (CREATE-only + FTS, additiv).
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import {
  createSessionNote, listSessionNotes, getSessionNote, updateSessionNote, deleteSessionNote,
} from '../../server/lib/sessionNotes.js'

describe('T-be1 — session_notes (Modell B)', () => {
  let db
  beforeEach(() => {
    db = createTestDb({ upToVersion: '062_v3_session_notes.sql' })
    seedProject(db) // id=2
  })
  afterEach(() => db.close())

  test('create + get: Felder + Arrays round-trip', () => {
    const n = createSessionNote(db, 2, {
      title: 'S2 TodoWidget realisiert', details: 'Body', pr_url: 'https://x/pull/148',
      sprints: ['DD#47'], issues: ['DD-678', 'GF-433'],
    })
    expect(n.id).toBeGreaterThan(0)
    const got = getSessionNote(db, 2, n.id)
    expect(got).toMatchObject({
      title: 'S2 TodoWidget realisiert', details: 'Body', pr_url: 'https://x/pull/148',
    })
    expect(got.sprints).toEqual(['DD#47'])
    expect(got.issues).toEqual(['DD-678', 'GF-433'])
  })

  test('Defaults: details/sprints/issues optional', () => {
    const n = createSessionNote(db, 2, { title: 'Nur Titel' })
    const got = getSessionNote(db, 2, n.id)
    expect(got.details).toBe('')
    expect(got.pr_url).toBeNull()
    expect(got.sprints).toEqual([])
    expect(got.issues).toEqual([])
  })

  test('list: neueste zuerst, project-scoped', () => {
    const other = seedProject(db, { id: 3, slug: 'mybaby', name: 'MBT', prefix: 'MBT' })
    createSessionNote(db, other, { title: 'fremd' })
    createSessionNote(db, 2, { title: 'A' })
    createSessionNote(db, 2, { title: 'B' })
    const rows = listSessionNotes(db, 2)
    expect(rows.map(r => r.title)).toEqual(['B', 'A']) // DESC by id
  })

  test('list mit search → FTS über title+details', () => {
    createSessionNote(db, 2, { title: 'TodoWidget realisiert', details: 'x' })
    createSessionNote(db, 2, { title: 'Anderes', details: 'enthält todowidget im body' })
    createSessionNote(db, 2, { title: 'Irrelevant', details: 'nichts' })
    const hits = listSessionNotes(db, 2, { search: 'todowidget' })
    expect(hits.length).toBe(2)
  })

  test('update: Teil-Patch + Array-Update', () => {
    const n = createSessionNote(db, 2, { title: 'alt', issues: ['DD-1'] })
    const up = updateSessionNote(db, 2, n.id, { title: 'neu', issues: ['DD-2', 'DD-3'] })
    expect(up.title).toBe('neu')
    expect(up.issues).toEqual(['DD-2', 'DD-3'])
    expect(getSessionNote(db, 2, n.id).title).toBe('neu')
  })

  test('delete entfernt; get → null', () => {
    const n = createSessionNote(db, 2, { title: 'weg' })
    expect(deleteSessionNote(db, 2, n.id)).toBe(true)
    expect(getSessionNote(db, 2, n.id)).toBeNull()
  })

  test('project-scope: get/update/delete fremder Note schlägt fehl bzw. null', () => {
    const other = seedProject(db, { id: 3, slug: 'mybaby', name: 'MBT', prefix: 'MBT' })
    const n = createSessionNote(db, other, { title: 'fremd' })
    expect(getSessionNote(db, 2, n.id)).toBeNull()
    expect(deleteSessionNote(db, 2, n.id)).toBe(false)
  })

  test('Validierung: title Pflicht, details ≤500', () => {
    expect(() => createSessionNote(db, 2, { title: '' })).toThrow()
    expect(() => createSessionNote(db, 2, { title: 'ok', details: 'x'.repeat(501) })).toThrow()
    expect(() => createSessionNote(db, 2, { title: 'ok', sprints: 'nope' })).toThrow()
  })
})
