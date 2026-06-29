// DD2-21: Dokumenten-Subsystem (Markdown-Docs an Meilensteine/Sprints, DB-Blob).
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject, seedMilestones, TEST_PROJECT_ID } from '../_fixtures/seed.js'
import {
  createDocument, listDocuments, getDocument, updateDocument, deleteDocument, DocumentError,
} from '../../apps/backend/src/lib/documents.js'
import { milestoneDeletePreview, cascadeDeleteSprints, sprintDocumentCount } from '../../apps/backend/src/lib/cascadeDelete.js'

const MIG = '067_v3_dd2_21_documents.sql'

describe('DD2-21 — documents (DB-Blob, milestone/sprint owner)', () => {
  let db, logDir, milestoneId, sprintId

  beforeEach(() => {
    db = createTestDb({ upToVersion: MIG })
    seedProject(db)
    // archon_runs wurde von Migration 006 gedroppt (Archon deferred) — Stub, damit
    // cascadeDeleteSprints es räumen kann (Muster aus tests/dd2-cascade-delete).
    db.exec('CREATE TABLE IF NOT EXISTS archon_runs (id INTEGER PRIMARY KEY, sprint_id INTEGER)')
    logDir = mkdtempSync(join(tmpdir(), 'devd-dd221-'))
    ;[milestoneId] = seedMilestones(db, [{ name: 'M1', target_date: '2026-12-31', status: 'planning' }])
    const r = db.prepare("INSERT INTO sprints (name, status, project_id, project_number, milestone_id) VALUES ('S1','active',?,1,?)")
      .run(TEST_PROJECT_ID, milestoneId)
    sprintId = Number(r.lastInsertRowid)
  })
  afterEach(() => { db.close(); rmSync(logDir, { recursive: true, force: true }) })

  test('Migration 067: documents-Tabelle + Indizes', () => {
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='documents'").all()).toHaveLength(1)
    const idx = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='documents' AND name NOT LIKE 'sqlite_%'").all().map(r => r.name)
    expect(idx).toEqual(expect.arrayContaining(['idx_documents_milestone', 'idx_documents_sprint']))
  })

  test('CRUD für Meilenstein-Owner', () => {
    const doc = createDocument(db, { type: 'milestone', id: milestoneId }, { title: 'Plan', body: '# Markdown', file_path: 'docs/plan.md' })
    expect(doc.id).toBeGreaterThan(0)
    expect(doc.milestone_id).toBe(milestoneId)
    expect(doc.sprint_id).toBeNull()
    const got = getDocument(db, { type: 'milestone', id: milestoneId }, doc.id)
    expect(got).toMatchObject({ title: 'Plan', body: '# Markdown', file_path: 'docs/plan.md' })
    const up = updateDocument(db, { type: 'milestone', id: milestoneId }, doc.id, { body: '# Neu' })
    expect(up.body).toBe('# Neu')
    expect(deleteDocument(db, { type: 'milestone', id: milestoneId }, doc.id)).toBe(true)
    expect(getDocument(db, { type: 'milestone', id: milestoneId }, doc.id)).toBeNull()
  })

  test('CRUD für Sprint-Owner + Liste DESC', () => {
    createDocument(db, { type: 'sprint', id: sprintId }, { title: 'A' })
    createDocument(db, { type: 'sprint', id: sprintId }, { title: 'B' })
    const rows = listDocuments(db, { type: 'sprint', id: sprintId })
    expect(rows.map(r => r.title)).toEqual(['B', 'A'])
    expect(rows.every(r => r.sprint_id === sprintId && r.milestone_id === null)).toBe(true)
  })

  test('Owner-Scope: Meilenstein-Doc nicht über Sprint-Owner sichtbar', () => {
    const doc = createDocument(db, { type: 'milestone', id: milestoneId }, { title: 'nur Meilenstein' })
    expect(getDocument(db, { type: 'sprint', id: sprintId }, doc.id)).toBeNull()
    expect(deleteDocument(db, { type: 'sprint', id: sprintId }, doc.id)).toBe(false)
  })

  test('CHECK: genau ein Owner (weder beides noch keins)', () => {
    expect(() => db.prepare('INSERT INTO documents (title) VALUES (?)').run('kein owner')).toThrow()
    expect(() => db.prepare('INSERT INTO documents (milestone_id, sprint_id, title) VALUES (?,?,?)').run(milestoneId, sprintId, 'beide')).toThrow()
  })

  test('Validierung: title Pflicht, ungültiger Owner-Typ', () => {
    expect(() => createDocument(db, { type: 'milestone', id: milestoneId }, { title: '' })).toThrow(DocumentError)
    expect(() => createDocument(db, { type: 'bogus', id: 1 }, { title: 'x' })).toThrow(DocumentError)
  })

  test('Cascade: Sprint löschen entfernt seine Dokumente (FK ON DELETE CASCADE)', () => {
    createDocument(db, { type: 'sprint', id: sprintId }, { title: 'sprint-doc' })
    expect(sprintDocumentCount(db, sprintId)).toBe(1)
    db.transaction(() => cascadeDeleteSprints(db, [sprintId]))()
    expect(db.prepare('SELECT COUNT(*) c FROM documents WHERE sprint_id = ?').get(sprintId).c).toBe(0)
  })

  test('milestoneDeletePreview zählt Meilenstein- + Sprint-Dokumente', () => {
    createDocument(db, { type: 'milestone', id: milestoneId }, { title: 'm-doc' })
    createDocument(db, { type: 'sprint', id: sprintId }, { title: 's-doc1' })
    createDocument(db, { type: 'sprint', id: sprintId }, { title: 's-doc2' })
    const p = milestoneDeletePreview(db, milestoneId)
    expect(p.documents).toBe(3)
  })
})
