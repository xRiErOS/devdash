// DD-392 — per-project public_capture flag.
//
// server/api.js does not export its Express app (listen() on import), so we
// reproduce the SQL the handlers use against an in-memory DB with all migrations
// applied (incl. 046). Covers: migration adds the column with default 0; the
// by-slug capture endpoint resolves only public projects; list-minimal is
// filtered to public_capture=1 on the capture host; the PUT 0/1 coercion.

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { createTestDb, listMigrations } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'

// Reproduces GET /api/projects/by-slug/:slug/capture (server/api.js, DD-392/DD-456).
// onCaptureHost mirrors the host filter: issues.* resolves only public_capture=1,
// trusted hosts (devdash.* behind Authelia, localhost, tailnet) resolve ALL.
function bySlugCapture(db, slug, { onCaptureHost = true } = {}) {
  return db.prepare(`
    SELECT id, name, prefix, slug, color
    FROM projects
    WHERE LOWER(slug) = LOWER(?) AND archived = 0 ${onCaptureHost ? 'AND public_capture = 1' : ''}
  `).get(String(slug || ''))
}

// Reproduces GET /api/projects/list-minimal (server/api.js, DD-392).
function listMinimal(db, { onCaptureHost }) {
  return db.prepare(`
    SELECT id, name, prefix, slug, color
    FROM projects
    WHERE archived = 0 ${onCaptureHost ? 'AND public_capture = 1' : ''}
    ORDER BY name
  `).all()
}

let db
beforeEach(() => {
  // upToVersion beyond the highest real migration → apply ALL (incl. 046).
  db = createTestDb({ upToVersion: '999' })
  // public project (e.g. SPF for external testers) + private project.
  seedProject(db, { id: 2, slug: 'devd', name: 'DevD', prefix: 'DD' })
  seedProject(db, { id: 9, slug: 'spf', name: 'Sproutling', prefix: 'SPF' })
  db.prepare('UPDATE projects SET public_capture = 1 WHERE id = ?').run(9)
})
afterEach(() => db?.close())

describe('migration 046', () => {
  test('046 is present in the migrations dir', () => {
    expect(listMigrations()).toContain('046_v3_projects_public_capture.sql')
  })

  test('projects.public_capture exists and defaults to 0', () => {
    const cols = db.prepare('PRAGMA table_info(projects)').all().map(c => c.name)
    expect(cols).toContain('public_capture')
    expect(db.prepare('SELECT public_capture FROM projects WHERE id = 2').get().public_capture).toBe(0)
  })
})

describe('by-slug capture endpoint SQL', () => {
  test('resolves a public project', () => {
    const row = bySlugCapture(db, 'spf')
    expect(row).toMatchObject({ id: 9, slug: 'spf', prefix: 'SPF' })
  })

  test('does NOT resolve a private project (→ 404 upstream)', () => {
    expect(bySlugCapture(db, 'devd')).toBeUndefined()
  })

  test('does NOT resolve an unknown slug', () => {
    expect(bySlugCapture(db, 'nope')).toBeUndefined()
  })

  test('is case-insensitive for the public project', () => {
    expect(bySlugCapture(db, 'SPF')).toMatchObject({ id: 9 })
  })

  test('does not leak an archived public project', () => {
    db.prepare('UPDATE projects SET archived = 1 WHERE id = 9').run()
    expect(bySlugCapture(db, 'spf')).toBeUndefined()
  })
})

describe('DD-456 — by-slug on trusted (non-capture) host resolves ALL projects', () => {
  test('resolves a PRIVATE project on a non-capture host', () => {
    const row = bySlugCapture(db, 'devd', { onCaptureHost: false })
    expect(row).toMatchObject({ id: 2, slug: 'devd', prefix: 'DD' })
  })

  test('still resolves the public project on a non-capture host', () => {
    expect(bySlugCapture(db, 'spf', { onCaptureHost: false })).toMatchObject({ id: 9 })
  })

  test('still 404s an unknown slug on a non-capture host', () => {
    expect(bySlugCapture(db, 'nope', { onCaptureHost: false })).toBeUndefined()
  })

  test('still does not leak an archived project on a non-capture host', () => {
    db.prepare('UPDATE projects SET archived = 1 WHERE id = 2').run()
    expect(bySlugCapture(db, 'devd', { onCaptureHost: false })).toBeUndefined()
  })
})

describe('list-minimal host filtering', () => {
  test('capture host returns ONLY public projects', () => {
    const rows = listMinimal(db, { onCaptureHost: true })
    expect(rows.map(r => r.slug)).toEqual(['spf'])
  })

  test('non-capture host returns the full list', () => {
    const rows = listMinimal(db, { onCaptureHost: false })
    expect(rows.map(r => r.slug).sort()).toEqual(['devd', 'spf'])
  })
})

describe('public_capture write coercion (PUT /api/projects/:id)', () => {
  test('accepts 0/1 and toggles', () => {
    db.prepare('UPDATE projects SET public_capture = ? WHERE id = 2').run(1)
    expect(db.prepare('SELECT public_capture FROM projects WHERE id = 2').get().public_capture).toBe(1)
    db.prepare('UPDATE projects SET public_capture = ? WHERE id = 2').run(0)
    expect(db.prepare('SELECT public_capture FROM projects WHERE id = 2').get().public_capture).toBe(0)
  })
})
