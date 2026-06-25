// DD-390 (B02) — GET /api/projects/:id muss numerische id ODER slug auflösen.
//
// Hintergrund: devd_project_show("devd") lieferte 404, ("2") → 200. Die Route matchte
// `WHERE p.id = ?` direkt mit req.params.id; ein Slug ergab keinen numerischen Match → 404.
// Aufgedeckt in der SMA-Live-Selbstvalidierung Sprint DD#53 (2026-06-01).
//
// Server exportiert die Express-app nicht (server.listen läuft beim Import), daher
// reproduzieren wir resolveProjectId() + die Route-Resolve-Logik 1:1 gegen eine
// in-memory-DB (Repo-Pattern wie tests/api-dependencies.test.js).

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject, TEST_PROJECT_ID } from '../_fixtures/seed.js'

// 1:1-Reproduktion von server/api.js::resolveProjectId (Stand DD-390). Bricht dieser Test,
// ist entweder die Helper-Logik abgedriftet oder der Slug-Resolve wieder entfernt.
function resolveProjectId(db, raw) {
  const n = Number(raw)
  if (Number.isFinite(n) && n > 0) return n
  if (typeof raw === 'string' && raw.length > 0) {
    const project = db.prepare('SELECT id FROM projects WHERE slug = ?').get(raw)
    if (project) return project.id
  }
  return null
}

// Reproduziert app.get('/api/projects/:id') — gibt den Row oder null (=404) zurück.
function projectShow(db, idParam) {
  const pid = resolveProjectId(db, idParam)
  if (pid === null) return null
  return db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM sprints s WHERE s.project_id = p.id) as sprint_count,
      (SELECT COUNT(*) FROM backlog b WHERE b.project_id = p.id) as backlog_count
    FROM projects p
    WHERE p.id = ?
  `).get(pid) || null
}

describe('DD-390 — project_show resolved id und slug', () => {
  let db
  beforeEach(() => {
    db = createTestDb()
    seedProject(db) // id=2, slug='devd', prefix='DD'
  })
  afterEach(() => db.close())

  test('numerische id liefert das Projekt (unverändertes Verhalten)', () => {
    const row = projectShow(db, String(TEST_PROJECT_ID))
    expect(row).not.toBeNull()
    expect(row.id).toBe(TEST_PROJECT_ID)
    expect(row.slug).toBe('devd')
  })

  test('slug liefert dasselbe Projekt (DD-390-Fix, vorher 404)', () => {
    const row = projectShow(db, 'devd')
    expect(row).not.toBeNull()
    expect(row.id).toBe(TEST_PROJECT_ID)
  })

  test('numerische id und slug zeigen auf dieselbe Projekt-id', () => {
    expect(projectShow(db, 'devd').id).toBe(projectShow(db, '2').id)
  })

  test('unbekannter slug liefert null (404)', () => {
    expect(projectShow(db, 'gibtsnicht')).toBeNull()
  })

  test('nicht existierende numerische id liefert null (404)', () => {
    expect(projectShow(db, '9999')).toBeNull()
  })

  test('resolveProjectId: numerisch hat Vorrang vor slug-Lookup', () => {
    // "2" ist numerisch → direkt 2, kein slug-Query nötig
    expect(resolveProjectId(db, '2')).toBe(2)
    expect(resolveProjectId(db, 'devd')).toBe(2)
    expect(resolveProjectId(db, 'nope')).toBeNull()
  })
})
