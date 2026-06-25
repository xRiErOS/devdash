// ProjectPages T-be2 (D-E): SOP-Collections. Gruppiert SOPs (Mig 044) in benannte Sammlungen
// + Markdown-Export-Bundle. Speist SopCollectionsView (S3: collections[{id,name,sopKeys}]).
// Lib-Compute gegen createTestDb mit Migration 061 (CREATE-only, additiv).
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import {
  createCollection, listCollections, getCollection, setCollectionItems, exportCollection,
} from '../../apps/backend/src/lib/sopCollections.js'

function seedSop(db, key, title, content = '') {
  return Number(
    db.prepare("INSERT INTO sops (sop_key, title, content) VALUES (?, ?, ?)").run(key, title, content).lastInsertRowid,
  )
}

describe('T-be2 — SOP-Collections', () => {
  let db
  beforeEach(() => {
    db = createTestDb({ upToVersion: '061_v3_sop_collections.sql' })
    seedSop(db, 'issues-erfassen', 'Issues erfassen', 'Body A')
    seedSop(db, 'issue-refinement', 'Issue Refinement', 'Body B')
    seedSop(db, 'sprint-durchfuehrung', 'Sprint Durchführung', 'Body C')
  })
  afterEach(() => db.close())

  test('createCollection + listCollections liefert key/name/description + leere sopKeys', () => {
    createCollection(db, { collection_key: 'backlog-pflege', name: 'Backlog-Pflege', description: 'Pflege-SOPs' })
    const list = listCollections(db)
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      collection_key: 'backlog-pflege', name: 'Backlog-Pflege', description: 'Pflege-SOPs', sop_count: 0,
    })
    expect(list[0].sopKeys).toEqual([])
  })

  test('setCollectionItems verknüpft SOPs geordnet; listCollections zählt + liefert sopKeys', () => {
    createCollection(db, { collection_key: 'backlog-pflege', name: 'Backlog-Pflege' })
    setCollectionItems(db, 'backlog-pflege', ['issues-erfassen', 'issue-refinement'])
    const c = listCollections(db)[0]
    expect(c.sop_count).toBe(2)
    expect(c.sopKeys).toEqual(['issues-erfassen', 'issue-refinement'])
  })

  test('setCollectionItems ist Replace (ordnet neu, entfernt fehlende)', () => {
    createCollection(db, { collection_key: 'c', name: 'C' })
    setCollectionItems(db, 'c', ['issues-erfassen', 'issue-refinement'])
    setCollectionItems(db, 'c', ['sprint-durchfuehrung', 'issues-erfassen'])
    expect(listCollections(db)[0].sopKeys).toEqual(['sprint-durchfuehrung', 'issues-erfassen'])
  })

  test('getCollection liefert volle SOPs (Inhalt) in Reihenfolge; null bei unbekannt', () => {
    createCollection(db, { collection_key: 'c', name: 'C' })
    setCollectionItems(db, 'c', ['issue-refinement', 'issues-erfassen'])
    const c = getCollection(db, 'c')
    expect(c.name).toBe('C')
    expect(c.sops.map(s => s.sop_key)).toEqual(['issue-refinement', 'issues-erfassen'])
    expect(c.sops[0]).toMatchObject({ title: 'Issue Refinement', content: 'Body B' })
    expect(getCollection(db, 'fehlt')).toBeNull()
  })

  test('exportCollection bündelt Member-SOPs als Markdown (Reihenfolge, Inhalt); null bei unbekannt', () => {
    createCollection(db, { collection_key: 'c', name: 'Backlog-Pflege', description: 'Desc' })
    setCollectionItems(db, 'c', ['issues-erfassen', 'sprint-durchfuehrung'])
    const md = exportCollection(db, 'c')
    expect(md).toContain('Backlog-Pflege')
    expect(md).toContain('Issues erfassen')
    expect(md).toContain('Body A')
    expect(md).toContain('Sprint Durchführung')
    expect(md).toContain('Body C')
    expect(md.indexOf('Body A')).toBeLessThan(md.indexOf('Body C')) // Reihenfolge
    expect(exportCollection(db, 'fehlt')).toBeNull()
  })

  test('duplicate collection_key → Fehler (statusCode 409)', () => {
    createCollection(db, { collection_key: 'c', name: 'C' })
    expect(() => createCollection(db, { collection_key: 'c', name: 'C2' })).toThrow()
  })

  test('setCollectionItems mit unbekanntem sop_key → Fehler', () => {
    createCollection(db, { collection_key: 'c', name: 'C' })
    expect(() => setCollectionItems(db, 'c', ['gibts-nicht'])).toThrow()
  })
})
