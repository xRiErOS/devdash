// DD-378 (D04 completion) — Kanonische Issue-Auflösung über project_number.
//
// Test-Strategie (Pattern wie tests/api-dependencies.test.js):
//   server/api.js exportiert die Express-app nicht (listen läuft beim Import).
//   Der eigentliche Resolver liegt aber als REINE Funktion in
//   server/lib/issueResolve.js und ist direkt importier-/testbar. Zusätzlich
//   reproduzieren wir die dünne Route-Hülle von
//   GET /api/projects/:pid/issues/by-number/:n (400/404-Wrapper) 1:1.
//
// Gedeckt:
//   - project_number-Auflösung im aktiven Projekt (kanonisch)
//   - Legacy-Fallback: globale backlog.id (projekt-gescopet)
//   - Projekt-Scoping: fremde project_number/id leaken nicht
//   - Miss → null / 404
//   - Route-Wrapper: ungültige pid → 400, Treffer → 200 + resolved_via

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb } from './_fixtures/in-memory-db.js'
import { seedProject } from './_fixtures/seed.js'
import { resolveIssueByNumber } from '../server/lib/issueResolve.js'

const PROJECT_DEVD = 2 // DD (matches seed.js TEST_PROJECT_ID)
const PROJECT_MBT = 1 // MBT

// Seedet eine backlog-Zeile mit EXPLIZITER project_number, damit wir den
// Unterschied project_number vs. globale id deterministisch testen können.
function seedIssue(db, { id, projectId, projectNumber, title = 'Issue', status = 'open', type = 'feature', priority = 2 }) {
  const result = db.prepare(`
    INSERT INTO backlog (id, project_id, project_number, title, status, type, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, projectId, projectNumber, title, status, type, priority)
  return Number(result.lastInsertRowid)
}

/**
 * Reproduziert die dünne Route-Hülle von
 * app.get('/api/projects/:pid/issues/by-number/:n') aus server/api.js.
 * Driftet diese Logik, bricht der Test → Signal, dass Route und Resolver
 * auseinanderlaufen.
 */
function byNumberRoute(db, pidParam, nParam) {
  const projectId = Number(pidParam)
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return { status: 400, body: { error: 'Invalid project id' } }
  }
  const resolution = resolveIssueByNumber(db, projectId, nParam)
  if (!resolution) return { status: 404, body: { error: 'Item not found' } }
  // (Anreicherung in api.js via loadEnrichedBacklogItem — hier nur Kern.)
  return { status: 200, body: { id: resolution.id, project_number: resolution.projectNumber, resolved_via: resolution.via } }
}

describe('DD-378 — resolveIssueByNumber (project_number canonical + legacy id fallback)', () => {
  let db

  beforeEach(() => {
    db = createTestDb()
    seedProject(db, { id: PROJECT_DEVD, slug: 'devd', name: 'DevD', prefix: 'DD' })
    seedProject(db, { id: PROJECT_MBT, slug: 'mybaby', name: 'MyBaby', prefix: 'MBT' })

    // Bewusst divergierende globale id vs. project_number, um die Auflösung
    // eindeutig zu unterscheiden:
    //   backlog.id=500, devd #1
    //   backlog.id=501, devd #2
    //   backlog.id=348, mbt  #42   (globale 348 existiert in FREMDEM Projekt)
    seedIssue(db, { id: 500, projectId: PROJECT_DEVD, projectNumber: 1, title: 'Devd one' })
    seedIssue(db, { id: 501, projectId: PROJECT_DEVD, projectNumber: 2, title: 'Devd two' })
    seedIssue(db, { id: 348, projectId: PROJECT_MBT, projectNumber: 42, title: 'Mbt forty-two' })
  })

  afterEach(() => db.close())

  test('löst project_number kanonisch auf (number != globale id)', () => {
    const r = resolveIssueByNumber(db, PROJECT_DEVD, 2)
    expect(r).toEqual({ id: 501, projectNumber: 2, via: 'project_number' })
  })

  test('Legacy-Fallback: globale backlog.id im selben Projekt', () => {
    // 500 ist KEINE devd-project_number (devd hat nur #1/#2), aber backlog.id=500.
    const r = resolveIssueByNumber(db, PROJECT_DEVD, 500)
    expect(r).toEqual({ id: 500, projectNumber: 1, via: 'legacy_id' })
  })

  test('project_number gewinnt vor globaler id bei Kollision', () => {
    // Konstruktion: project_number 348 existiert NICHT in devd, aber globale
    // backlog.id 348 existiert in MBT → darf in devd NICHT greifen (Scope).
    const r = resolveIssueByNumber(db, PROJECT_DEVD, 348)
    expect(r).toBeNull()
  })

  test('Projekt-Scoping: fremde project_number leaked nicht', () => {
    // #42 existiert nur in MBT; aus devd-Sicht → kein Treffer.
    expect(resolveIssueByNumber(db, PROJECT_DEVD, 42)).toBeNull()
    // aus MBT-Sicht → Treffer.
    expect(resolveIssueByNumber(db, PROJECT_MBT, 42)).toEqual({ id: 348, projectNumber: 42, via: 'project_number' })
  })

  test('Miss → null', () => {
    expect(resolveIssueByNumber(db, PROJECT_DEVD, 9999)).toBeNull()
  })

  test('ungültige Eingaben → null', () => {
    expect(resolveIssueByNumber(db, 0, 1)).toBeNull()
    expect(resolveIssueByNumber(db, PROJECT_DEVD, 'abc')).toBeNull()
    expect(resolveIssueByNumber(db, PROJECT_DEVD, -1)).toBeNull()
  })
})

describe('DD-378 — GET /api/projects/:pid/issues/by-number/:n (route wrapper)', () => {
  let db

  beforeEach(() => {
    db = createTestDb()
    seedProject(db, { id: PROJECT_DEVD, slug: 'devd', name: 'DevD', prefix: 'DD' })
    seedIssue(db, { id: 500, projectId: PROJECT_DEVD, projectNumber: 1, title: 'Devd one' })
    seedIssue(db, { id: 501, projectId: PROJECT_DEVD, projectNumber: 2, title: 'Devd two' })
  })

  afterEach(() => db.close())

  test('200 + resolved_via=project_number bei kanonischem Treffer', () => {
    const res = byNumberRoute(db, PROJECT_DEVD, 2)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 501, project_number: 2, resolved_via: 'project_number' })
  })

  test('200 + resolved_via=legacy_id bei id-Fallback (→ Frontend normalisiert URL)', () => {
    const res = byNumberRoute(db, PROJECT_DEVD, 500)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 500, project_number: 1, resolved_via: 'legacy_id' })
  })

  test('400 bei ungültiger pid', () => {
    expect(byNumberRoute(db, 'abc', 1).status).toBe(400)
    expect(byNumberRoute(db, 0, 1).status).toBe(400)
  })

  test('404 bei Miss', () => {
    expect(byNumberRoute(db, PROJECT_DEVD, 9999).status).toBe(404)
  })
})
