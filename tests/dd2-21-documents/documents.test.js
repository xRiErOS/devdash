// DD2-21: Dokumenten-Subsystem (Markdown-Docs an Meilensteine/Sprints, DB-Blob).
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject, seedMilestones, TEST_PROJECT_ID } from '../_fixtures/seed.js'
import {
  createDocument, listDocuments, listAllDocuments, getDocument, updateDocument, deleteDocument,
  DocumentError, DOCUMENT_STATUS,
} from '../../apps/backend/src/lib/documents.js'
import { milestoneDeletePreview, cascadeDeleteSprints, sprintDocumentCount } from '../../apps/backend/src/lib/cascadeDelete.js'

// DD2-167 Rework: Pin auf Migration 070 (status-Spalte). Seed-Status im neuen
// Vokabular (DD2-155): Milestone 'new', Sprint 'in_progress' — ältere Werte
// ('planning'/'active') werden ab 069 per CHECK/Trigger abgelehnt.
const MIG = '070_v3_dd2_167_doc_note_status.sql'

describe('DD2-21 — documents (DB-Blob, milestone/sprint owner)', () => {
  let db, logDir, milestoneId, sprintId

  beforeEach(() => {
    db = createTestDb({ upToVersion: MIG })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-dd221-'))
    ;[milestoneId] = seedMilestones(db, [{ name: 'M1', target_date: '2026-12-31', status: 'new' }])
    const r = db.prepare("INSERT INTO sprints (name, status, project_id, project_number, milestone_id) VALUES ('S1','in_progress',?,1,?)")
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

  // DD2-167 Rework: status-Lifecycle (Migration 070).
  test('status: Default active, setzen + patchen, Whitelist erzwungen', () => {
    const def = createDocument(db, { type: 'milestone', id: milestoneId }, { title: 'def' })
    expect(def.status).toBe('active')
    const draft = createDocument(db, { type: 'milestone', id: milestoneId }, { title: 'd', status: 'draft' })
    expect(draft.status).toBe('draft')
    const up = updateDocument(db, { type: 'milestone', id: milestoneId }, draft.id, { status: 'archived' })
    expect(up.status).toBe('archived')
    expect(() => createDocument(db, { type: 'milestone', id: milestoneId }, { title: 'x', status: 'bogus' })).toThrow(DocumentError)
    expect(DOCUMENT_STATUS).toEqual(['draft', 'active', 'archived'])
  })

  // DD2-163 Rework: projektweite Doc-Liste (entitätsübergreifend) mit owner_type/owner_name.
  test('listAllDocuments: alle Docs des Projekts, Owner aufgelöst, id DESC', () => {
    createDocument(db, { type: 'milestone', id: milestoneId }, { title: 'm-doc' })
    createDocument(db, { type: 'sprint', id: sprintId }, { title: 's-doc' })
    const all = listAllDocuments(db, TEST_PROJECT_ID)
    expect(all.map(r => r.title)).toEqual(['s-doc', 'm-doc'])
    const byTitle = Object.fromEntries(all.map(r => [r.title, r]))
    expect(byTitle['m-doc']).toMatchObject({ owner_type: 'milestone', owner_name: 'M1' })
    expect(byTitle['s-doc']).toMatchObject({ owner_type: 'sprint', owner_name: 'S1' })
  })
})
